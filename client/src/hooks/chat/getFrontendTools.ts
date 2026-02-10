import { useNavigationTools } from './useNavigationTools';
import { useEmailTools } from './useEmailTools';
import { useFilterTools } from './useFilterTools';
import { usePaginationTools } from './usePaginationTools';
import type { FrontendTool, ToolDefinition, ToolCall } from '@/types/tools';

export function getFrontendTools(): {
  definitions: ToolDefinition[];
  executeToolCall: (toolCall: ToolCall) => Promise<string>;
} {
  const allTools: FrontendTool[] = [
    ...useNavigationTools(),
    ...useEmailTools(),
    ...useFilterTools(),
    ...usePaginationTools(),
  ];
  
  const definitions: ToolDefinition[] = allTools.map(t => t.definition);
  
  const handlerMap = new Map<string, (args: Record<string, unknown>) => Promise<string>>();
  for (const tool of allTools) {
    handlerMap.set(tool.definition.function.name, tool.handler);
  }
  
  const executeToolCall = async (toolCall: ToolCall): Promise<string> => {
    const handler = handlerMap.get(toolCall.name);
    if (!handler) {
      return `Unknown action: ${toolCall.name}`;
    }
    return handler(toolCall.arguments);
  };
  
  return {
    definitions,
    executeToolCall,
  };
}
