import { useUIStore, useMailStore } from '@/store';
import { mailService } from '@/services/mailService';
import { createTool } from '@/lib/createTool';
import type { FrontendTool } from '@/types/tools';

export function useNavigationTools(): FrontendTool[] {
  return [
    createTool(
      'navigateTo',
      'Navigate to inbox or sent folder',
      {
        view: {
          type: 'string',
          description: 'The view to navigate to',
          enum: ['inbox', 'sent'],
        },
      },
      ['view'],
      async (args) => {
        const view = args.view as 'inbox' | 'sent';
        const uiStore = useUIStore.getState();
        const mailStore = useMailStore.getState();
        
        uiStore.setView(view);
        mailStore.setSelectedEmail(null);
        
        try {
          if (view === 'sent') {
            const response = await mailService.getSent(1, 20);
            useMailStore.getState().setSent(response.emails, response.pagination);
            const emailList = response.emails.slice(0, 5).map((e, i) => 
              `${i + 1}. "${e.subject}" to ${e.to}`
            ).join('\n');
            return `Navigated to sent. Found ${response.emails.length} emails:\n${emailList}`;
          } else {
            const response = await mailService.getInbox({}, 1, 20);
            useMailStore.getState().setInbox(response.emails, response.pagination);
            const emailList = response.emails.slice(0, 5).map((e, i) => 
              `${i + 1}. "${e.subject}" from ${e.from}`
            ).join('\n');
            return `Navigated to inbox. Found ${response.emails.length} emails:\n${emailList}`;
          }
        } catch (error) {
          return `Navigated to ${view} but failed to load emails: ${error}`;
        }
      }
    ),
    
    createTool(
      'clearSearch',
      'Clear search/filter and show all emails',
      {},
      [],
      async () => {
        const mailStore = useMailStore.getState();
        mailStore.clearFilter();
        
        try {
          const response = await mailService.getInbox({}, 1, 20);
          useMailStore.getState().setInbox(response.emails, response.pagination);
          return `Cleared search. Showing ${response.emails.length} emails`;
        } catch (error) {
          return `Failed to clear: ${error}`;
        }
      }
    ),
  ];
}
