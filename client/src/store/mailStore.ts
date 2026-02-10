import { create } from 'zustand';

export interface Email {
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
}

export interface EmailFilter {
  query?: string;
  sender?: string;
  dateFrom?: string;
  dateTo?: string;
  isUnread?: boolean;
  datePreset?: 'today' | 'week' | 'month' | null;
}

export interface PaginationState {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalEmails: number;
}

interface MailState {
  inbox: Email[];
  sent: Email[];
  searchResults: Email[];
  
  selectedEmail: Email | null;
  
  isLoadingInbox: boolean;
  isLoadingSent: boolean;
  isLoadingEmail: boolean;
  isSending: boolean;
  
  activeFilter: EmailFilter;
  
  inboxPagination: PaginationState;
  sentPagination: PaginationState;
  
  inboxNextToken: string | null;
  sentNextToken: string | null;
  
  setInbox: (emails: Email[], pagination?: Partial<PaginationState>, nextToken?: string | null) => void;
  appendInbox: (emails: Email[], nextToken?: string | null) => void;
  setSent: (emails: Email[], pagination?: Partial<PaginationState>, nextToken?: string | null) => void;
  setSearchResults: (emails: Email[]) => void;
  setSelectedEmail: (email: Email | null) => void;
  addNewEmail: (email: Email) => void;
  updateEmail: (emailId: string, update: Partial<Email>) => void;
  setFilter: (filter: EmailFilter) => void;
  clearFilter: () => void;
  
  setInboxPage: (page: number) => void;
  setSentPage: (page: number) => void;
  
  setLoadingInbox: (loading: boolean) => void;
  setLoadingSent: (loading: boolean) => void;
  setLoadingEmail: (loading: boolean) => void;
  setSending: (sending: boolean) => void;
}

const defaultPagination: PaginationState = {
  currentPage: 1,
  totalPages: 1,
  pageSize: 20,
  totalEmails: 0,
};

export const useMailStore = create<MailState>((set, get) => ({
  inbox: [],
  sent: [],
  searchResults: [],
  selectedEmail: null,
  isLoadingInbox: false,
  isLoadingSent: false,
  isLoadingEmail: false,
  isSending: false,
  activeFilter: {},
  inboxPagination: { ...defaultPagination },
  sentPagination: { ...defaultPagination },
  inboxNextToken: null,
  sentNextToken: null,
  
  setInbox: (emails, pagination = {}, nextToken = null) => set({ 
    inbox: emails, 
    inboxPagination: { ...get().inboxPagination, ...pagination },
    inboxNextToken: nextToken,
    isLoadingInbox: false,
  }),
  
  appendInbox: (emails, nextToken = null) => set((state) => ({ 
    inbox: [...state.inbox, ...emails], 
    inboxNextToken: nextToken,
    isLoadingInbox: false,
  })),
  
  setSent: (emails, pagination = {}, nextToken = null) => set({ 
    sent: emails, 
    sentPagination: { ...get().sentPagination, ...pagination },
    sentNextToken: nextToken,
    isLoadingSent: false,
  }),
  
  setSearchResults: (emails) => set({ searchResults: emails }),
  
  setSelectedEmail: (email) => set({ selectedEmail: email }),
  
  addNewEmail: (email) => set((state) => ({
    inbox: [email, ...state.inbox],
    inboxPagination: { 
      ...state.inboxPagination, 
      totalEmails: state.inboxPagination.totalEmails + 1 
    },
  })),
  
  updateEmail: (emailId, update) => set((state) => ({
    inbox: state.inbox.map((e) => 
      e.id === emailId ? { ...e, ...update } : e
    ),
    selectedEmail: state.selectedEmail?.id === emailId 
      ? { ...state.selectedEmail, ...update } 
      : state.selectedEmail,
  })),
  
  setFilter: (filter) => set({ 
    activeFilter: filter,
    inboxPagination: { ...get().inboxPagination, currentPage: 1 },
  }),
  
  clearFilter: () => set({ 
    activeFilter: {}, 
    searchResults: [],
    inboxPagination: { ...get().inboxPagination, currentPage: 1 },
  }),
  
  setInboxPage: (page) => set((state) => ({
    inboxPagination: { ...state.inboxPagination, currentPage: page },
  })),
  
  setSentPage: (page) => set((state) => ({
    sentPagination: { ...state.sentPagination, currentPage: page },
  })),
  
  setLoadingInbox: (isLoadingInbox) => set({ isLoadingInbox }),
  setLoadingSent: (isLoadingSent) => set({ isLoadingSent }),
  setLoadingEmail: (isLoadingEmail) => set({ isLoadingEmail }),
  setSending: (isSending) => set({ isSending }),
}));
