import api from './api';
import type { Email, EmailFilter, PaginationState } from '@/store/mailStore';

interface PaginatedEmailResponse {
  emails: Email[];
  pagination: PaginationState;
  nextPageToken?: string;
}

export const mailService = {
  async getInbox(
    filter?: EmailFilter,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<PaginatedEmailResponse> {
    const params = new URLSearchParams();
    if (filter?.query) params.set('query', filter.query);
    if (filter?.sender) params.set('sender', filter.sender);
    if (filter?.dateFrom) params.set('dateFrom', filter.dateFrom);
    if (filter?.dateTo) params.set('dateTo', filter.dateTo);
    if (filter?.isUnread) params.set('unread', 'true');
    params.set('page', page.toString());
    params.set('pageSize', pageSize.toString());
    
    const response = await api.get(`/mail/inbox?${params.toString()}`);
    return response.data;
  },
  
  async getSent(
    page: number = 1,
    pageSize: number = 20,
  ): Promise<PaginatedEmailResponse> {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('pageSize', pageSize.toString());
    
    const response = await api.get(`/mail/sent?${params.toString()}`);
    return response.data;
  },
  
  async getEmail(id: string): Promise<Email> {
    const response = await api.get(`/mail/${id}`);
    return response.data;
  },
  
  async sendEmail(to: string, subject: string, body: string): Promise<Email> {
    const response = await api.post('/mail/send', { to, subject, body });
    return response.data;
  },
  
  async replyToEmail(id: string, subject: string, body: string, to: string): Promise<Email> {
    const response = await api.post(`/mail/reply/${id}`, { to, subject, body });
    return response.data;
  },
  
  async searchEmails(query: string): Promise<Email[]> {
    const response = await api.get(`/mail/search?q=${encodeURIComponent(query)}`);
    return response.data.emails;
  },
  
  async setupWatch(): Promise<{ historyId: string; expiration: string }> {
    const response = await api.post('/mail/watch');
    return response.data;
  },
};

export default mailService;
