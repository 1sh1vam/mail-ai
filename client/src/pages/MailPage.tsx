import { useEffect, useRef, useCallback } from "react";
import { AppLayout } from "@/components/layout";
import { EmailList, EmailDetail, ComposeEmail, FilterBar } from "@/components/mail";
import { ChatPanel } from "@/components/chat";
import { useUIStore } from "@/store";
import { useRealTimeSync, useEmails } from "@/hooks";

export function MailPage() {
  const { currentView } = useUIStore();
  const { 
    displayedEmails, 
    sent,
    isLoadingInbox, 
    isLoadingSent, 
    inboxPagination,
    sentPagination,
    fetchInbox, 
    fetchSent, 
    goToInboxPage,
    goToSentPage,
  } = useEmails();
  
  const hasFetchedInbox = useRef(false);
  const hasFetchedSent = useRef(false);

  useRealTimeSync();

  useEffect(() => {
    if (hasFetchedInbox.current) return;
    hasFetchedInbox.current = true;
    fetchInbox();
  }, [fetchInbox]);

  useEffect(() => {
    if (currentView === 'sent' && !hasFetchedSent.current && sent.length === 0) {
      hasFetchedSent.current = true;
      fetchSent();
    }
  }, [currentView, sent.length, fetchSent]);

  const handleFilterChange = useCallback(() => {
    fetchInbox(1);
  }, [fetchInbox]);

  const renderContent = () => {
    switch (currentView) {
      case "inbox":
        return (
          <div className="flex flex-col h-full">
            <FilterBar onFilterChange={handleFilterChange} />
            <div className="flex-1 min-h-0">
              <EmailList
                emails={displayedEmails}
                isLoading={isLoadingInbox}
                pagination={inboxPagination}
                onPageChange={goToInboxPage}
              />
            </div>
          </div>
        );
      case "sent":
        return (
          <EmailList
            emails={sent}
            isLoading={isLoadingSent}
            pagination={sentPagination}
            onPageChange={goToSentPage}
          />
        );
      case "email":
        return <EmailDetail />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen">
      <div className="flex-1 min-w-0">
        <AppLayout>
          {renderContent()}
        </AppLayout>
      </div>
      <ChatPanel />
      <ComposeEmail />
    </div>
  );
}

