import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { EmailListItem } from './EmailListItem';
import { Pagination } from '@/components/ui/Pagination';
import { useMailStore, useUIStore, type PaginationState } from '@/store';
import { mailService } from '@/services/mailService';
import { Inbox } from 'lucide-react';

interface EmailListProps {
  emails: Array<{
    id: string;
    threadId: string;
    from: string;
    to: string;
    subject: string;
    snippet: string;
    body: string;
    date: string;
    isRead: boolean;
    labels: string[];
  }>;
  isLoading?: boolean;
  pagination?: PaginationState;
  onPageChange?: (page: number) => void;
}

export function EmailList({ emails, isLoading, pagination, onPageChange }: EmailListProps) {
  const { selectedEmail, setSelectedEmail, setLoadingEmail } = useMailStore();
  const { setView } = useUIStore();



  const handleSelectEmail = async (emailId: string) => {
    setLoadingEmail(true);
    try {
      const email = await mailService.getEmail(emailId);
      setSelectedEmail(email);
      setView('email');
    } catch (error) {
      console.error('Failed to load email:', error);
    } finally {
      setLoadingEmail(false);
    }
  };

  if (isLoading && emails.length === 0) {
    return (
      <div className="space-y-2 p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-start gap-3 p-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Inbox className="h-12 w-12 mb-4 opacity-50" />
        <p>No emails found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full">
      <ScrollArea className="flex-1 w-full">
        <div className="divide-y divide-border w-full">
          {emails.map((email) => (
            <EmailListItem
              key={email.id}
              email={email}
              isSelected={selectedEmail?.id === email.id}
              onClick={() => handleSelectEmail(email.id)}
            />
          ))}
        </div>
      </ScrollArea>

      {onPageChange && pagination && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          onPageChange={onPageChange}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
