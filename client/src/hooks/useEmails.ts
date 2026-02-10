import { useCallback, useRef } from 'react';
import { useMailStore } from '@/store';
import { mailService } from '@/services/mailService';

export function useEmails() {
  const {
    inbox,
    sent,
    searchResults,
    isLoadingInbox,
    isLoadingSent,
    inboxPagination,
    sentPagination,
    setInbox,
    setSent,
    setLoadingInbox,
    setLoadingSent,
    setInboxPage,
    setSentPage,
  } = useMailStore();

  // Prevent duplicate requests
  const inboxFetchingRef = useRef(false);
  const sentFetchingRef = useRef(false);

  const fetchInbox = useCallback(async (page: number = 1) => {
    if (inboxFetchingRef.current) {
      console.log('[useEmails] fetchInbox: Already fetching, skipping');
      return;
    }
    
    // Get the LATEST filter from store to avoid stale closure
    const { activeFilter, inboxPagination: pagination } = useMailStore.getState();
    
    console.log('[useEmails] fetchInbox: Starting fetch for page', page, 'with filter:', activeFilter);
    inboxFetchingRef.current = true;
    setLoadingInbox(true);
    
    try {
      const response = await mailService.getInbox(
        activeFilter,
        page,
        pagination.pageSize,
      );
      console.log('[useEmails] fetchInbox: Got response', response);
      console.log('[useEmails] fetchInbox: Pagination data', response.pagination);
      setInbox(response.emails, response.pagination);
    } catch (error) {
      console.error('[useEmails] Failed to fetch inbox:', error);
    } finally {
      inboxFetchingRef.current = false;
      setLoadingInbox(false);
    }
  }, [setInbox, setLoadingInbox]);

  const fetchSent = useCallback(async (page: number = 1) => {
    if (sentFetchingRef.current) return;
    
    const { sentPagination: pagination } = useMailStore.getState();
    
    console.log('[useEmails] fetchSent: Starting fetch for page', page);
    sentFetchingRef.current = true;
    setLoadingSent(true);
    
    try {
      const response = await mailService.getSent(page, pagination.pageSize);
      console.log('[useEmails] fetchSent: Got response', response);
      setSent(response.emails, response.pagination);
    } catch (error) {
      console.error('[useEmails] Failed to fetch sent:', error);
    } finally {
      sentFetchingRef.current = false;
      setLoadingSent(false);
    }
  }, [setSent, setLoadingSent]);

  const goToInboxPage = useCallback((page: number) => {
    console.log('[useEmails] goToInboxPage: Navigating to page', page);
    setInboxPage(page);
    fetchInbox(page);
  }, [setInboxPage, fetchInbox]);

  const goToSentPage = useCallback((page: number) => {
    console.log('[useEmails] goToSentPage: Navigating to page', page);
    setSentPage(page);
    fetchSent(page);
  }, [setSentPage, fetchSent]);

  const goToPreviousPage = useCallback((type: 'inbox' | 'sent') => {
    const state = useMailStore.getState();
    if (type === 'inbox' && state.inboxPagination.currentPage > 1) {
      goToInboxPage(state.inboxPagination.currentPage - 1);
    } else if (type === 'sent' && state.sentPagination.currentPage > 1) {
      goToSentPage(state.sentPagination.currentPage - 1);
    }
  }, [goToInboxPage, goToSentPage]);

  const goToNextPage = useCallback((type: 'inbox' | 'sent') => {
    const state = useMailStore.getState();
    if (type === 'inbox' && state.inboxPagination.currentPage < state.inboxPagination.totalPages) {
      goToInboxPage(state.inboxPagination.currentPage + 1);
    } else if (type === 'sent' && state.sentPagination.currentPage < state.sentPagination.totalPages) {
      goToSentPage(state.sentPagination.currentPage + 1);
    }
  }, [goToInboxPage, goToSentPage]);

  // Get displayed emails based on context
  const displayedEmails = searchResults.length > 0 ? searchResults : inbox;

  return {
    inbox,
    sent,
    displayedEmails,
    isLoadingInbox,
    isLoadingSent,
    inboxPagination,
    sentPagination,
    fetchInbox,
    fetchSent,
    goToInboxPage,
    goToSentPage,
    goToPreviousPage,
    goToNextPage,
  };
}
