import { Injectable } from '@nestjs/common';
import Groq from 'groq-sdk';
import { ChatCompletionMessageParam, ChatCompletionTool } from 'groq-sdk/resources/chat/completions';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface ChatResponse {
  type: 'text' | 'tool_calls' | 'done';
  content?: string;
  tool_calls?: ToolCall[];
}

@Injectable()
export class ChatService {
  private groq: Groq;
  private model = 'moonshotai/kimi-k2-instruct-0905';

  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }

  private getSystemPrompt(context?: Record<string, any>): string {
    // Concise system prompt optimized for token efficiency
    let prompt = `Email assistant. Execute tools for email actions.

Context fields: view (inbox/sent/email), page, pages, total, selected (current email), emails (n=position, s=subject, f=from), filter.

Rules:
1. Use context.view to know current folder
2. Use context.emails list to find emails by position or subject
3. For reply+send requests, use replyToEmail with send=true in a single call
4. Execute multi-step requests tool by tool
5. Be concise`;

    if (context) {
      // Use minified JSON to save tokens
      prompt += `\n\nContext: ${JSON.stringify(context)}`;
    }

    return prompt;
  }

  async *streamChat(
    messages: ChatMessage[],
    context: Record<string, any>,
    tools: ChatCompletionTool[],
  ): AsyncGenerator<ChatResponse> {
    const systemMessage: ChatCompletionMessageParam = {
      role: 'system',
      content: this.getSystemPrompt(context),
    };

    const groqMessages: ChatCompletionMessageParam[] = [
      systemMessage,
      ...messages.map((m) => {
        if (m.role === 'tool') {
          return {
            role: 'tool' as const,
            content: m.content,
            tool_call_id: m.tool_call_id!,
          };
        }
        if (m.role === 'assistant' && m.tool_calls) {
          return {
            role: 'assistant' as const,
            content: m.content || null,
            tool_calls: m.tool_calls,
          };
        }
        return {
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
        };
      }),
    ];

    const stream = await this.groq.chat.completions.create({
      model: this.model,
      messages: groqMessages,
      tools,
      tool_choice: 'auto',
      stream: true,
    });

    let accumulatedContent = '';
    let toolCalls: ToolCall[] = [];
    const toolCallsMap: Map<number, { id: string; name: string; arguments: string }> = new Map();

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      // Handle text content
      if (delta?.content) {
        accumulatedContent += delta.content;
        yield { type: 'text', content: delta.content };
      }

      // Handle tool calls
      if (delta?.tool_calls) {
        for (const toolCall of delta.tool_calls) {
          const index = toolCall.index;
          
          if (!toolCallsMap.has(index)) {
            toolCallsMap.set(index, {
              id: toolCall.id || '',
              name: toolCall.function?.name || '',
              arguments: '',
            });
          }

          const existing = toolCallsMap.get(index)!;
          if (toolCall.id) existing.id = toolCall.id;
          if (toolCall.function?.name) existing.name = toolCall.function.name;
          if (toolCall.function?.arguments) existing.arguments += toolCall.function.arguments;
        }
      }
    }

    // Convert accumulated tool calls
    for (const [_, tc] of toolCallsMap) {
      if (tc.id && tc.name) {
        try {
          toolCalls.push({
            id: tc.id,
            name: tc.name,
            arguments: tc.arguments ? JSON.parse(tc.arguments) : {},
          });
        } catch {
          toolCalls.push({
            id: tc.id,
            name: tc.name,
            arguments: {},
          });
        }
      }
    }

    if (toolCalls.length > 0) {
      yield { type: 'tool_calls', tool_calls: toolCalls };
    }

    yield { type: 'done' };
  }
}
