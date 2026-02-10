import { useUIStore, useMailStore } from '@/store';
import { mailService } from '@/services/mailService';
import { createTool } from '@/lib/createTool';
import type { FrontendTool } from '@/types/tools';

export function usePaginationTools(): FrontendTool[] {
  return [
    createTool(
      'nextPage',
      'Go to the next page of emails',
      {},
      [],
      async () => {
        const uiStore = useUIStore.getState();
        const currentView = uiStore.currentView;
        const pagination = currentView === 'sent' 
          ? useMailStore.getState().sentPagination 
          : useMailStore.getState().inboxPagination;
        
        if (pagination.currentPage >= pagination.totalPages) {
          return `Already on the last page (page ${pagination.currentPage} of ${pagination.totalPages})`;
        }
        
        const nextPage = pagination.currentPage + 1;
        try {
          if (currentView === 'sent') {
            const response = await mailService.getSent(nextPage, 20);
            useMailStore.getState().setSent(response.emails, response.pagination);
            return `Moved to page ${nextPage} of ${response.pagination.totalPages}. Showing ${response.emails.length} sent emails.`;
          } else {
            const filter = useMailStore.getState().activeFilter;
            const response = await mailService.getInbox(filter, nextPage, 20);
            useMailStore.getState().setInbox(response.emails, response.pagination);
            return `Moved to page ${nextPage} of ${response.pagination.totalPages}. Showing ${response.emails.length} emails.`;
          }
        } catch (error) {
          return `Failed to go to next page: ${error}`;
        }
      }
    ),
    
    createTool(
      'previousPage',
      'Go to the previous page of emails',
      {},
      [],
      async () => {
        const uiStore = useUIStore.getState();
        const currentView = uiStore.currentView;
        const pagination = currentView === 'sent' 
          ? useMailStore.getState().sentPagination 
          : useMailStore.getState().inboxPagination;
        
        if (pagination.currentPage <= 1) {
          return `Already on the first page`;
        }
        
        const prevPage = pagination.currentPage - 1;
        try {
          if (currentView === 'sent') {
            const response = await mailService.getSent(prevPage, 20);
            useMailStore.getState().setSent(response.emails, response.pagination);
            return `Moved to page ${prevPage} of ${response.pagination.totalPages}. Showing ${response.emails.length} sent emails.`;
          } else {
            const filter = useMailStore.getState().activeFilter;
            const response = await mailService.getInbox(filter, prevPage, 20);
            useMailStore.getState().setInbox(response.emails, response.pagination);
            return `Moved to page ${prevPage} of ${response.pagination.totalPages}. Showing ${response.emails.length} emails.`;
          }
        } catch (error) {
          return `Failed to go to previous page: ${error}`;
        }
      }
    ),
    
    createTool(
      'goToPage',
      'Go to a specific page number of emails',
      {
        page: {
          type: 'number',
          description: 'The page number to navigate to (1-indexed)',
        },
      },
      ['page'],
      async (args) => {
        const targetPage = args.page as number;
        const uiStore = useUIStore.getState();
        const currentView = uiStore.currentView;
        const pagination = currentView === 'sent' 
          ? useMailStore.getState().sentPagination 
          : useMailStore.getState().inboxPagination;
        
        if (targetPage < 1 || targetPage > pagination.totalPages) {
          return `Invalid page number. Please choose between 1 and ${pagination.totalPages}`;
        }
        
        try {
          if (currentView === 'sent') {
            const response = await mailService.getSent(targetPage, 20);
            useMailStore.getState().setSent(response.emails, response.pagination);
            return `Moved to page ${targetPage} of ${response.pagination.totalPages}. Showing ${response.emails.length} sent emails.`;
          } else {
            const filter = useMailStore.getState().activeFilter;
            const response = await mailService.getInbox(filter, targetPage, 20);
            useMailStore.getState().setInbox(response.emails, response.pagination);
            return `Moved to page ${targetPage} of ${response.pagination.totalPages}. Showing ${response.emails.length} emails.`;
          }
        } catch (error) {
          return `Failed to go to page ${targetPage}: ${error}`;
        }
      }
    ),
  ];
}
