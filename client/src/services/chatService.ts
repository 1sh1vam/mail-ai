import type { ToolCall } from '@/hooks/chat';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  isStreaming?: boolean;
}

export interface StreamCallbacks {
  onMessageStart: (id: string) => void;
  onMessageUpdate: (id: string, content: string) => void;
  onMessageComplete: (id: string, content: string, toolCalls?: ToolCall[]) => void;
}

export interface StreamResult {
  content: string;
  toolCalls: ToolCall[];
}

export interface ChatRequestPayload {
  messages: Array<{
    role: string;
    content: string;
    tool_call_id?: string;
    tool_calls?: ChatMessage['tool_calls'];
  }>;
  context: Record<string, unknown>;
  tools: unknown[];
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Stream a chat response from the LLM API.
 */
async function streamChatResponse(
  payload: ChatRequestPayload,
  callbacks: StreamCallbacks,
): Promise<StreamResult> {
  const response = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let assistantContent = '';
  let toolCalls: ToolCall[] = [];

  const assistantId = crypto.randomUUID();
  callbacks.onMessageStart(assistantId);

  // Parse the SSE stream
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if (data === '[DONE]') continue;

      try {
        const parsed = JSON.parse(data);

        if (parsed.type === 'text' && parsed.content) {
          assistantContent += parsed.content;
          callbacks.onMessageUpdate(assistantId, assistantContent);
        } else if (parsed.type === 'tool_calls' && parsed.tool_calls) {
          toolCalls = parsed.tool_calls;
        }
      } catch {
        // Ignore malformed SSE chunks
      }
    }
  }

  callbacks.onMessageComplete(
    assistantId,
    assistantContent,
    toolCalls.length > 0 ? toolCalls : undefined,
  );

  return { content: assistantContent, toolCalls };
}

export const chatService = {
  streamChatResponse,
};
