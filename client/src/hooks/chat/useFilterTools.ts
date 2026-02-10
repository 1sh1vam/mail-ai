import { useMailStore } from '@/store';
import { mailService } from '@/services/mailService';
import { createTool } from '@/lib/createTool';
import type { FrontendTool } from '@/types/tools';

function formatDateForFilter(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

export function useFilterTools(): FrontendTool[] {
  return [
    createTool(
      'filterEmails',
      'Filter emails by date preset, custom date range, or unread status',
      {
        datePreset: {
          type: 'string',
          description: 'Quick date filter: "today", "week" (last 7 days), "month" (last 30 days)',
          enum: ['today', 'week', 'month'],
        },
        dateFrom: {
          type: 'string',
          description: 'Custom start date in YYYY/MM/DD format',
        },
        dateTo: {
          type: 'string',
          description: 'Custom end date in YYYY/MM/DD format',
        },
        isUnread: {
          type: 'boolean',
          description: 'Filter to only unread emails',
        },
      },
      [],
      async (args) => {
        const datePreset = args.datePreset as 'today' | 'week' | 'month' | undefined;
        let dateFrom = args.dateFrom as string | undefined;
        const dateTo = args.dateTo as string | undefined;
        const isUnread = args.isUnread as boolean | undefined;
        
        // Compute dateFrom from preset if provided
        if (datePreset) {
          const today = new Date();
          switch (datePreset) {
            case 'today':
              dateFrom = formatDateForFilter(today);
              break;
            case 'week':
              const weekAgo = new Date(today);
              weekAgo.setDate(today.getDate() - 7);
              dateFrom = formatDateForFilter(weekAgo);
              break;
            case 'month':
              const monthAgo = new Date(today);
              monthAgo.setDate(today.getDate() - 30);
              dateFrom = formatDateForFilter(monthAgo);
              break;
          }
        }
        
        const filter = {
          dateFrom,
          dateTo,
          isUnread,
          datePreset: datePreset || null,
        };
        
        useMailStore.getState().setFilter(filter);
        
        try {
          const response = await mailService.getInbox(filter, 1, 20);
          useMailStore.getState().setInbox(response.emails, response.pagination);
          const presetLabel = datePreset === 'today' ? 'today' : 
                             datePreset === 'week' ? 'last 7 days' : 
                             datePreset === 'month' ? 'last 30 days' : 'custom range';
          const emailList = response.emails.slice(0, 5).map((e, i) => 
            `${i + 1}. "${e.subject}" from ${e.from}`
          ).join('\n');
          return `Showing ${response.emails.length} emails from ${presetLabel}${isUnread ? ' (unread only)' : ''}:\n${emailList}`;
        } catch (error) {
          return `Filter failed: ${error}`;
        }
      }
    ),
  ];
}
