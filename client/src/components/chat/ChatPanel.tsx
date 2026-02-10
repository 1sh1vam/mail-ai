import { useState, useRef, useEffect } from 'react';
import { useAssistant } from '@/hooks/useAssistant';
import type { ChatMessage } from '@/store/chatStore';
import { useUIStore } from '@/store/uiStore';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare, 
  Send, 
  ChevronLeft,
  Bot,
  User,
  Loader2,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const isTool = message.role === 'tool';
  const isAssistant = message.role === 'assistant';
  
  if (isTool) {
    return (
      <div className="flex items-start gap-2 px-3 py-1">
        <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
          <Wrench className="h-3 w-3" />
          <span>{message.content}</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className={cn(
      "flex items-start gap-2 px-3 py-2",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      <div className={cn(
        "flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center",
        isUser ? "bg-primary" : "bg-muted"
      )}>
        {isUser ? (
          <User className="h-4 w-4 text-primary-foreground" />
        ) : (
          <Bot className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <div className={cn(
        "max-w-[80%] rounded-lg px-3 py-2 text-sm",
        isUser 
          ? "bg-primary text-primary-foreground" 
          : "bg-muted text-foreground"
      )}>
        {message.content || (message.isStreaming && (
          <Loader2 className="h-4 w-4 animate-spin" />
        ))}
        {isAssistant && message.tool_calls && message.tool_calls.length > 0 && (
          <div className="mt-2 text-xs opacity-70 border-t pt-1">
            {message.tool_calls.map(tc => (
              <div key={tc.id} className="flex items-center gap-1">
                <Wrench className="h-3 w-3" />
                {tc.function.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ChatPanel() {
  const { messages, isStreaming, error, sendMessage, clearMessages } = useAssistant();
  const { isAssistantOpen, toggleAssistant } = useUIStore();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);
  
  // Focus input when panel opens
  useEffect(() => {
    if (isAssistantOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAssistantOpen]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    
    sendMessage(input.trim());
    setInput('');
  };
  
  if (!isAssistantOpen) {
    return (
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-lg z-50"
        onClick={toggleAssistant}
      >
        <MessageSquare className="h-5 w-5" />
      </Button>
    );
  }
  
  return (
    <div className="w-80 border-l bg-background flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <span className="font-medium">Mail Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearMessages}
              className="text-xs h-7"
            >
              Clear
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleAssistant}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Messages */}
      <ScrollArea className="flex-1 py-2" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground">
            <Bot className="h-10 w-10 mb-3 opacity-50" />
            <p className="text-sm font-medium">Hi! I'm your mail assistant.</p>
            <p className="text-xs mt-1">
              Try "show my inbox" or "search for emails from John"
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
          </div>
        )}
        
        {error && (
          <div className="mx-3 mt-2 p-2 bg-destructive/10 text-destructive text-xs rounded">
            {error}
          </div>
        )}
      </ScrollArea>
      
      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            className="flex-1 px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={isStreaming}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!input.trim() || isStreaming}
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
