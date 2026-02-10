import { create } from 'zustand';

export type View = 'inbox' | 'sent' | 'email';

interface ComposeState {
  isOpen: boolean;
  to: string;
  subject: string;
  body: string;
  replyToId: string | null;
}

interface UIState {
  currentView: View;
  
  compose: ComposeState;
  
  isAssistantOpen: boolean;
  
  setView: (view: View) => void;
  
  openCompose: (prefill?: Partial<ComposeState>) => void;
  closeCompose: () => void;
  updateCompose: (update: Partial<ComposeState>) => void;
  resetCompose: () => void;
  
  toggleAssistant: () => void;
  setAssistantOpen: (open: boolean) => void;
}

const defaultCompose: ComposeState = {
  isOpen: false,
  to: '',
  subject: '',
  body: '',
  replyToId: null,
};

export const useUIStore = create<UIState>((set) => ({
  currentView: 'inbox',
  compose: defaultCompose,
  isAssistantOpen: true,
  
  setView: (currentView) => set({ currentView }),
  
  openCompose: (prefill = {}) => set(() => ({
    compose: { ...defaultCompose, ...prefill, isOpen: true },
  })),
  
  closeCompose: () => set((state) => ({
    compose: { ...state.compose, isOpen: false },
  })),
  
  updateCompose: (update) => set((state) => ({
    compose: { ...state.compose, ...update },
  })),
  
  resetCompose: () => set({ compose: defaultCompose }),
  
  toggleAssistant: () => set((state) => ({
    isAssistantOpen: !state.isAssistantOpen,
  })),
  
  setAssistantOpen: (isAssistantOpen) => set({ isAssistantOpen }),
}));
