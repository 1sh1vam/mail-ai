import { Controller, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  CopilotRuntime,
  copilotRuntimeNestEndpoint,
  GroqAdapter,
} from '@copilotkit/runtime';

@Controller('copilotkit')
export class CopilotKitController {
  private runtime: CopilotRuntime;
  private serviceAdapter: GroqAdapter;

  constructor() {
    // CopilotKit v1.4.0 uses groq-sdk directly without agent framework
    // Let CopilotKit create the Groq client internally (uses GROQ_API_KEY env var)
    this.serviceAdapter = new GroqAdapter({ 
      model: 'moonshotai/kimi-k2-instruct-0905',
    });

    this.runtime = new CopilotRuntime({
      actions: [],
    });
  }

  @Post()
  async handleRequest(@Req() req: Request, @Res() res: Response) {
    const handler = copilotRuntimeNestEndpoint({
      runtime: this.runtime,
      serviceAdapter: this.serviceAdapter,
      endpoint: '/copilotkit',
    });

    return handler(req, res);
  }
}
