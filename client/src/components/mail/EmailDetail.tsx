import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMailStore, useUIStore } from '@/store';
import { ArrowLeft, Reply, Forward, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export function EmailDetail() {
  const { selectedEmail, setSelectedEmail } = useMailStore();
  const { setView, openCompose } = useUIStore();

  if (!selectedEmail) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Select an email to view
      </div>
    );
  }

  const handleBack = () => {
    setSelectedEmail(null);
    setView('inbox');
  };

  const handleReply = () => {
    const senderMatch = selectedEmail.from.match(/<(.+?)>/) || [null, selectedEmail.from];
    const replyTo = senderMatch[1] || selectedEmail.from;

    openCompose({
      to: replyTo,
      subject: `Re: ${selectedEmail.subject}`,
      replyToId: selectedEmail.id,
    });
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'PPpp');
    } catch {
      return dateString;
    }
  };

  const getSenderName = (from: string) => {
    const match = from.match(/^([^<]+)/);
    return match ? match[1].trim() : from;
  };

  const getInitials = (from: string) => {
    const name = getSenderName(from);
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border p-4">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1" />

        <Button variant="ghost" size="icon" onClick={handleReply}>
          <Reply className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon">
          <Forward className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Email Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {/* Subject */}
          <h1 className="text-2xl font-semibold mb-4">
            {selectedEmail.subject || '(No subject)'}
          </h1>

          {/* Sender Info */}
          <div className="flex items-start gap-4 mb-6">
            <Avatar className="h-12 w-12">
              <AvatarFallback>{getInitials(selectedEmail.from)}</AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">{getSenderName(selectedEmail.from)}</span>
                  <span className="text-sm text-muted-foreground ml-2">
                    &lt;{selectedEmail.from.match(/<(.+?)>/)?.[1] || selectedEmail.from}&gt;
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatDate(selectedEmail.date)}
                </span>
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                To: {selectedEmail.to}
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Body */}
          <div 
            className="prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: selectedEmail.body }}
          />
        </div>
      </ScrollArea>

      {/* Quick Reply */}
      <div className="border-t border-border p-4">
        <Button onClick={handleReply} className="gap-2">
          <Reply className="h-4 w-4" />
          Reply
        </Button>
      </div>
    </div>
  );
}
