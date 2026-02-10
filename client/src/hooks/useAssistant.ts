import { useCallback } from 'react';
import { useChatStore, type ChatMessage } from '@/store/chatStore';
import { chatService, type ChatRequestPayload } from '@/services/chatService';
import { getFrontendTools, type ToolCall } from '@/hooks/chat';
import { useMailStore } from '@/store/mailStore';
import { useUIStore } from '@/store/uiStore';

const MAX_ITERATIONS = 5;
const MAX_HISTORY = 10;

/**
 * Build a compact context snapshot from current app state.
 * Gives the LLM awareness of what the user is looking at.
 */
function buildContext() {
  const mailState = useMailStore.getState();
  const uiState = useUIStore.getState();

  const currentView = uiState.currentView;
  const emails = currentView === 'sent' ? mailState.sent : mailState.inbox;
  const pagination =
    currentView === 'sent' ? mailState.sentPagination : mailState.inboxPagination;

  return {
    view: currentView,
    page: pagination.currentPage,
    pages: pagination.totalPages,
    total: pagination.totalEmails,
    selected: mailState.selectedEmail
      ? {
          id: mailState.selectedEmail.id,
          subject: mailState.selectedEmail.subject.slice(0, 60),
        }
      : null,
    emails: emails.map((e, i) => ({
      n: i + 1,
      s: e.subject.slice(0, 50),
      f: e.from.split('<')[0].trim().slice(0, 20),
    })),
    filter:
      mailState.activeFilter?.query ||
      mailState.activeFilter?.datePreset ||
      null,
  };
}

/** Truncate and clean messages for the API payload. */
function prepareMessagesForAPI(messages: ChatMessage[]): ChatRequestPayload['messages'] {
  return messages.slice(-MAX_HISTORY).map((m) => ({
    role: m.role,
    content: m.role === 'user' ? m.content.slice(0, 500) : m.content,
    tool_call_id: m.tool_call_id,
    tool_calls: m.tool_calls,
  }));
}

/** Create a user message object. */
function createUserMessage(content: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role: 'user',
    content,
  };
}

/** Create a tool-result message object. */
function createToolResultMessage(toolCallId: string, result: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role: 'tool',
    content: result,
    tool_call_id: toolCallId,
  };
}

/** Execute a batch of tool calls and push results into the store. */
async function executeToolCalls(
  toolCalls: ToolCall[],
  addMessage: (msg: ChatMessage) => void,
) {
  const { executeToolCall } = getFrontendTools();

  for (const toolCall of toolCalls) {
    const result = await executeToolCall(toolCall);
    addMessage(createToolResultMessage(toolCall.id, result));
  }
}

/**
 * Orchestrates the full assistant conversation flow:
 * sending messages, streaming responses, executing tool calls,
 * and looping until the LLM has no more actions to take.
 */
export function useAssistant() {
  const messages = useChatStore((s) => s.messages);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const error = useChatStore((s) => s.error);

  const {
    addMessage,
    updateMessage,
    completeMessage,
    setStreaming,
    setError,
    clearMessages,
  } = useChatStore();

  /**
   * Send a user message and run the agentic loop:
   *  1. Add the user message to state
   *  2. Stream the LLM response
   *  3. If the LLM requests tool calls → execute them → repeat from step 2
   *  4. Stop when no tool calls are returned or MAX_ITERATIONS is reached
   */
  const sendMessage = useCallback(
    async (content: string) => {
      // 1. Add user message & start streaming
      const userMessage = createUserMessage(content);
      addMessage(userMessage);
      setStreaming(true);
      setError(null);

      // Wire up stream callbacks to store actions
      const callbacks = {
        onMessageStart: (id: string) => {
          addMessage({ id, role: 'assistant', content: '', isStreaming: true });
        },
        onMessageUpdate: (id: string, text: string) => {
          updateMessage(id, text);
        },
        onMessageComplete: (id: string, text: string, tcs?: ToolCall[]) => {
          completeMessage(id, text, tcs);
        },
      };

      try {
        // 2. Agentic loop
        for (let i = 0; i < MAX_ITERATIONS; i++) {
          const currentMessages = useChatStore.getState().messages;
          const { definitions } = getFrontendTools();

          const payload: ChatRequestPayload = {
            messages: prepareMessagesForAPI(currentMessages),
            context: buildContext(),
            tools: definitions,
          };

          const { toolCalls } = await chatService.streamChatResponse(
            payload,
            callbacks,
          );

          // No tool calls → conversation turn is complete
          if (toolCalls.length === 0) break;

          // 3. Execute tools & push results to store
          await executeToolCalls(toolCalls, addMessage);

          // Small delay before the next iteration to let UI settle
          await new Promise((r) => setTimeout(r, 100));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setStreaming(false);
      }
    },
    [addMessage, updateMessage, completeMessage, setStreaming, setError],
  );

  return { messages, isStreaming, error, sendMessage, clearMessages };
}
