import { useUIStore, useMailStore } from '@/store';
import { mailService } from '@/services/mailService';
import { createTool } from '@/lib/createTool';
import type { FrontendTool } from '@/types/tools';


export function useEmailTools(): FrontendTool[] {
  return [
    createTool(
      'searchEmails',
      'Search for emails with a query',
      {
        query: {
          type: 'string',
          description: 'The search query (keywords, from:sender, subject:text)',
        },
      },
      ['query'],
      async (args) => {
        const query = args.query as string;
        const mailStore = useMailStore.getState();
        mailStore.setFilter({ query });
        
        try {
          const response = await mailService.getInbox({ query }, 1, 20);
          useMailStore.getState().setInbox(response.emails, response.pagination);
          const emailList = response.emails.slice(0, 5).map((e, i) => 
            `${i + 1}. "${e.subject}" from ${e.from}`
          ).join('\n');
          return `Found ${response.emails.length} emails matching "${query}":\n${emailList}`;
        } catch (error) {
          return `Search failed: ${error}`;
        }
      }
    ),
    
    createTool(
      'openEmail',
      'Open a specific email by position, ID, or subject match',
      {
        emailId: {
          type: 'string',
          description: 'The ID of the email to open',
        },
        position: {
          type: 'number',
          description: 'The position in the email list (1 for first, 2 for second, etc.)',
        },
        subject: {
          type: 'string',
          description: 'Text to match in the email subject (partial match, case-insensitive)',
        },
      },
      [],
      async (args) => {
        const position = args.position as number | undefined;
        const emailId = args.emailId as string | undefined;
        const subjectMatch = args.subject as string | undefined;
        
        const uiStore = useUIStore.getState();
        const currentView = uiStore.currentView;
        const emails = currentView === 'sent' 
          ? useMailStore.getState().sent 
          : useMailStore.getState().inbox;
        let email = null;
        
        if (emailId) {
          email = emails.find(e => e.id === emailId);
        } else if (subjectMatch) {
          email = emails.find(e => 
            e.subject.toLowerCase().includes(subjectMatch.toLowerCase())
          );
        } else if (position && position > 0 && position <= emails.length) {
          email = emails[position - 1];
        }
        
        if (email) {
          useMailStore.getState().setSelectedEmail(email);
          uiStore.setView('email');
          return `Opened email: "${email.subject}" ${currentView === 'sent' ? 'to' : 'from'} ${currentView === 'sent' ? email.to : email.from}`;
        }
        return `Email not found in ${currentView}. Available emails: ${emails.slice(0, 3).map(e => `"${e.subject}"`).join(', ')}`;
      }
    ),
    
    createTool(
      'composeEmail',
      'Open compose dialog to write a new email',
      {
        to: {
          type: 'string',
          description: 'The recipient email address',
        },
        subject: {
          type: 'string',
          description: 'The email subject',
        },
        body: {
          type: 'string',
          description: 'The email body content',
        },
      },
      [],
      async (args) => {
        const to = args.to as string | undefined;
        const subject = args.subject as string | undefined;
        const body = args.body as string | undefined;
        
        useUIStore.getState().openCompose({ 
          to: to || '', 
          subject: subject || '', 
          body: body || '' 
        });
        return 'Compose dialog opened';
      }
    ),
    
    createTool(
      'sendEmail',
      'Send an email immediately (shows compose then sends)',
      {
        to: {
          type: 'string',
          description: 'The recipient email address (required)',
        },
        subject: {
          type: 'string',
          description: 'The email subject (required)',
        },
        body: {
          type: 'string',
          description: 'The email body content (required)',
        },
      },
      ['to', 'subject', 'body'],
      async (args) => {
        const to = args.to as string;
        const subject = args.subject as string;
        const body = args.body as string;
        
        if (!to || !subject || !body) {
          return 'Cannot send email: recipient, subject, and body are all required';
        }
        
        const uiStore = useUIStore.getState();
        
        // First, open compose dialog to show the email being composed
        uiStore.openCompose({ to, subject, body });
        
        // Wait a moment for user to see the compose dialog
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        try {
          await mailService.sendEmail(to, subject, body);
          uiStore.resetCompose();
          return `✅ Email sent successfully to ${to} with subject "${subject}"`;
        } catch (error) {
          return `❌ Failed to send email: ${error}. The compose dialog is still open so you can retry.`;
        }
      }
    ),
    
    createTool(
      'replyToEmail',
      'Reply to the currently opened email. Set send=true to send immediately.',
      {
        body: {
          type: 'string',
          description: 'The reply message content',
        },
        send: {
          type: 'boolean',
          description: 'If true, send the reply immediately. If false or omitted, just open compose dialog.',
        },
      },
      [],
      async (args) => {
        const selectedEmail = useMailStore.getState().selectedEmail;
        if (!selectedEmail) {
          return 'No email is currently open to reply to';
        }

        const replyBody = args.body as string | undefined;
        const shouldSend = args.send as boolean | undefined;
        const subject = `Re: ${selectedEmail.subject}`;
        const to = selectedEmail.from;

        if (shouldSend) {
          if (!replyBody) {
            return 'Cannot send reply: body is required when send=true';
          }

          // Show compose briefly so user sees what's being sent
          const uiStore = useUIStore.getState();
          uiStore.openCompose({ to, subject, body: replyBody, replyToId: selectedEmail.id });
          await new Promise(resolve => setTimeout(resolve, 1500));

          try {
            await mailService.replyToEmail(selectedEmail.id, subject, replyBody, to);
            uiStore.resetCompose();
            return `✅ Reply sent to ${to} for "${selectedEmail.subject}"`;
          } catch (error) {
            return `❌ Failed to send reply: ${error}. Compose dialog is still open so you can retry.`;
          }
        }

        // Default: just open compose
        useUIStore.getState().openCompose({
          to,
          subject,
          body: replyBody || '',
          replyToId: selectedEmail.id,
        });
        return `Reply to "${selectedEmail.subject}" opened. User can review and send manually.`;
      }
    ),
    
    createTool(
      'showUnreadEmails',
      'Filter to show only unread emails',
      {},
      [],
      async () => {
        useMailStore.getState().setFilter({ isUnread: true });
        
        try {
          const response = await mailService.getInbox({ isUnread: true }, 1, 20);
          useMailStore.getState().setInbox(response.emails, response.pagination);
          return `Showing ${response.emails.length} unread emails`;
        } catch (error) {
          return `Failed to filter: ${error}`;
        }
      }
    ),
  ];
}
