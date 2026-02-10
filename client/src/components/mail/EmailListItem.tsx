import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { Email } from '@/store/mailStore';
import { formatDistanceToNow } from 'date-fns';

interface EmailListItemProps {
  email: Email;
  isSelected?: boolean;
  onClick: () => void;
}

export function EmailListItem({ email, isSelected, onClick }: EmailListItemProps) {
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
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
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-3 p-4 text-left transition-colors border-b border-border',
        isSelected
          ? 'bg-accent'
          : 'hover:bg-muted/50',
        !email.isRead && 'bg-primary/5'
      )}
    >
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarFallback className={cn(!email.isRead && 'bg-primary text-primary-foreground')}>
          {getInitials(email.from)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            'truncate text-sm flex-1 min-w-0',
            !email.isRead && 'font-semibold'
          )}>
            {getSenderName(email.from)}
          </span>
          <span className="text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap">
            {formatDate(email.date)}
          </span>
        </div>

        <div className={cn(
          'truncate text-sm mt-0.5',
          !email.isRead ? 'font-medium text-foreground' : 'text-muted-foreground'
        )}>
          {email.subject || '(No subject)'}
        </div>

        <div className="truncate text-xs text-muted-foreground mt-1">
          {email.snippet}
        </div>
      </div>

      {!email.isRead && (
        <Badge variant="default" className="shrink-0 h-2 w-2 p-0 rounded-full" />
      )}
    </button>
  );
}
