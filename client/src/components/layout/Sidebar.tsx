import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useUIStore } from '@/store';
import { 
  Inbox, 
  Send, 
  PenSquare, 
  Mail,
  Bot,
} from 'lucide-react';

export function Sidebar() {
  const { currentView, setView, openCompose, isAssistantOpen, toggleAssistant } = useUIStore();

  const navItems = [
    { id: 'inbox' as const, label: 'Inbox', icon: Inbox },
    { id: 'sent' as const, label: 'Sent', icon: Send },
  ];

  return (
    <div className="flex h-full w-64 flex-col bg-sidebar-background border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-4">
        <Mail className="h-6 w-6 text-sidebar-primary" />
        <span className="text-lg font-semibold text-sidebar-foreground">AI Mail</span>
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Compose Button */}
      <div className="p-4">
        <Button 
          onClick={() => openCompose()}
          className="w-full gap-2"
          size="lg"
        >
          <PenSquare className="h-4 w-4" />
          Compose
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </ScrollArea>

      <Separator className="bg-sidebar-border" />

      {/* Assistant Toggle */}
      <div className="p-4">
        <Button
          variant={isAssistantOpen ? 'secondary' : 'outline'}
          onClick={toggleAssistant}
          className="w-full gap-2"
        >
          <Bot className="h-4 w-4" />
          AI Assistant
        </Button>
      </div>
    </div>
  );
}
