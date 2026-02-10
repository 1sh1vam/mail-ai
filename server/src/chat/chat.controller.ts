import { Controller, Post, Body, Res, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { ChatService, ChatMessage } from './chat.service';
import type { ChatCompletionTool } from 'groq-sdk/resources/chat/completions';

interface ChatRequest {
  messages: ChatMessage[];
  context: Record<string, any>;
  tools: ChatCompletionTool[];
}

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async chat(@Body() body: ChatRequest, @Res() res: Response) {
    const { messages, context, tools } = body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(HttpStatus.BAD_REQUEST).json({ 
        error: 'Messages array is required' 
      });
    }

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    try {
      for await (const chunk of this.chatService.streamChat(messages, context || {}, tools || [])) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
    } catch (error) {
      console.error('Chat error:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`);
    }

    res.end();
  }
}
