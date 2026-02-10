import type { FrontendTool, ToolParameter } from '@/hooks/chat/types';

/**
 * Factory to create a FrontendTool definition + handler pair.
 */
export function createTool(
  name: string,
  description: string,
  parameters: Record<string, ToolParameter>,
  required: string[] = [],
  handler: (args: Record<string, unknown>) => Promise<string>
): FrontendTool {
  return {
    definition: {
      type: 'function',
      function: {
        name,
        description,
        parameters: {
          type: 'object',
          properties: parameters,
          required,
        },
      },
    },
    handler,
  };
}
