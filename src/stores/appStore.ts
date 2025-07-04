import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { 
  AppState, 
  LLMConfig, 
  LLMProvider, 
  ChatSession, 
  ChatMessage, 
  SAMOpportunity, 
  SAMSearchFilters, 
  UploadedFile 
} from '@/types';
import { generateId, generateUUID, encryptData, decryptData, generateEncryptionKey } from '@/lib/utils';

// Default LLM configuration
const DEFAULT_LLM_CONFIG: LLMConfig = {
  provider: 'openai',
  model: 'gpt-4o-mini',
  apiKey: '',
  temperature: 0.7,
  maxTokens: 2000,
};

// Initial state
const initialState: Partial<AppState> = {
  llmConfig: DEFAULT_LLM_CONFIG,
  llmProviders: {
    openai: { 
      models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'] 
    },
    anthropic: { 
      models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku', 'claude-2.1'] 
    },
    huggingface: { 
      models: ['microsoft/DialoGPT-large', 'mistralai/Mistral-7B-Instruct-v0.2', 'meta-llama/Llama-2-7b-chat-hf'] 
    },
  },
  currentSession: null,
  chatSessions: [],
  isStreaming: false,
  searchResults: [],
  searchFilters: {
    keyword: '',
    active: true,
    limit: 50,
    offset: 0,
  },
  searchQuery: '',
  isSearching: false,
  favorites: [],
  uploadedFiles: [],
  isUploading: false,
  uploadProgress: 0,
  sidebarOpen: true,
  currentView: 'chat',
  theme: 'light',
  samApiKey: '',
  encryptionKey: '',
  settings: {
    autoSave: true,
    notifications: true,
    analytics: false,
  },
};

// Store interface with actions
interface AppStore extends AppState {
  // LLM Actions
  setLLMConfig: (config: Partial<LLMConfig>) => void;
  setLLMProvider: (provider: LLMProvider) => void;
  setLLMModel: (model: string) => void;
  setLLMApiKey: (apiKey: string) => void;
  validateLLMConfig: () => Promise<boolean>;
  
  // Chat Actions
  createChatSession: (title?: string) => ChatSession;
  setCurrentSession: (session: ChatSession | null) => void;
  updateSession: (sessionId: string, updates: Partial<ChatSession>) => void;
  deleteSession: (sessionId: string) => void;
  addMessageToSession: (sessionId: string, message: ChatMessage) => void;
  updateMessageInSession: (sessionId: string, messageId: string, updates: Partial<ChatMessage>) => void;
  clearAllSessions: () => void;
  setIsStreaming: (isStreaming: boolean) => void;
  
  // Search Actions
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: SAMOpportunity[]) => void;
  setSearchFilters: (filters: Partial<SAMSearchFilters>) => void;
  setIsSearching: (isSearching: boolean) => void;
  addToFavorites: (opportunityId: string) => void;
  removeFromFavorites: (opportunityId: string) => void;
  toggleFavorite: (opportunityId: string) => void;
  clearSearchResults: () => void;
  
  // Upload Actions
  addUploadedFile: (file: UploadedFile) => void;
  updateUploadedFile: (fileId: string, updates: Partial<UploadedFile>) => void;
  removeUploadedFile: (fileId: string) => void;
  setIsUploading: (isUploading: boolean) => void;
  setUploadProgress: (progress: number) => void;
  clearAllUploads: () => void;
  
  // UI Actions
  setSidebarOpen: (open: boolean) => void;
  setCurrentView: (view: 'chat' | 'search' | 'forecast' | 'upload') => void;
  setTheme: (theme: 'light' | 'dark') => void;
  
  // Settings Actions
  setSamApiKey: (apiKey: string) => void;
  setEncryptionKey: (key: string) => void;
  updateSettings: (settings: Partial<AppState['settings']>) => void;
  
  // Utility Actions
  resetStore: () => void;
  exportData: () => string;
  importData: (data: string) => void;
  initializeStore: () => void;
}

// Create the store
export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // LLM Actions
      setLLMConfig: (config) => 
        set((state) => ({
          llmConfig: { ...state.llmConfig, ...config },
        })),
      
      setLLMProvider: (provider) => 
        set((state) => ({
          llmConfig: { 
            ...state.llmConfig, 
            provider,
            model: state.llmProviders[provider].models[0] || '',
          },
        })),
      
      setLLMModel: (model) => 
        set((state) => ({
          llmConfig: { ...state.llmConfig, model },
        })),
      
      setLLMApiKey: (apiKey) => 
        set((state) => ({
          llmConfig: { ...state.llmConfig, apiKey },
        })),
      
      validateLLMConfig: async () => {
        const { llmConfig } = get();
        if (!llmConfig.apiKey || !llmConfig.model) return false;
        
        try {
          // Test API call with minimal request
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: `${llmConfig.provider}:${llmConfig.model}`,
              messages: [{ role: 'user', content: 'test' }],
              context: { test: true }
            }),
          });
          
          return response.ok;
        } catch {
          return false;
        }
      },
      
      // Chat Actions
      createChatSession: (title) => {
        const session: ChatSession = {
          id: generateUUID(),
          title: title || 'New Chat',
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          llmConfig: get().llmConfig,
        };
        
        set((state) => ({
          chatSessions: [...state.chatSessions, session],
          currentSession: session,
        }));
        
        return session;
      },
      
      setCurrentSession: (session) => 
        set({ currentSession: session }),
      
      updateSession: (sessionId, updates) => 
        set((state) => ({
          chatSessions: state.chatSessions.map(session =>
            session.id === sessionId 
              ? { ...session, ...updates, updatedAt: Date.now() }
              : session
          ),
          currentSession: state.currentSession?.id === sessionId
            ? { ...state.currentSession, ...updates, updatedAt: Date.now() }
            : state.currentSession,
        })),
      
      deleteSession: (sessionId) => 
        set((state) => ({
          chatSessions: state.chatSessions.filter(s => s.id !== sessionId),
          currentSession: state.currentSession?.id === sessionId ? null : state.currentSession,
        })),
      
      addMessageToSession: (sessionId, message) => 
        set((state) => ({
          chatSessions: state.chatSessions.map(session =>
            session.id === sessionId 
              ? { 
                  ...session, 
                  messages: [...session.messages, message],
                  updatedAt: Date.now(),
                }
              : session
          ),
          currentSession: state.currentSession?.id === sessionId
            ? { 
                ...state.currentSession,
                messages: [...state.currentSession.messages, message],
                updatedAt: Date.now(),
              }
            : state.currentSession,
        })),
      
      updateMessageInSession: (sessionId, messageId, updates) => 
        set((state) => ({
          chatSessions: state.chatSessions.map(session =>
            session.id === sessionId 
              ? { 
                  ...session, 
                  messages: session.messages.map(msg =>
                    msg.id === messageId ? { ...msg, ...updates } : msg
                  ),
                  updatedAt: Date.now(),
                }
              : session
          ),
          currentSession: state.currentSession?.id === sessionId
            ? { 
                ...state.currentSession,
                messages: state.currentSession.messages.map(msg =>
                  msg.id === messageId ? { ...msg, ...updates } : msg
                ),
                updatedAt: Date.now(),
              }
            : state.currentSession,
        })),
      
      clearAllSessions: () => 
        set({ chatSessions: [], currentSession: null }),
      
      setIsStreaming: (isStreaming) => 
        set({ isStreaming }),
      
      // Search Actions
      setSearchQuery: (query) => 
        set({ searchQuery: query }),
      
      setSearchResults: (results) => 
        set({ searchResults: results }),
      
      setSearchFilters: (filters) => 
        set((state) => ({
          searchFilters: { ...state.searchFilters, ...filters },
        })),
      
      setIsSearching: (isSearching) => 
        set({ isSearching }),
      
      addToFavorites: (opportunityId) => 
        set((state) => ({
          favorites: [...state.favorites, opportunityId],
        })),
      
      removeFromFavorites: (opportunityId) => 
        set((state) => ({
          favorites: state.favorites.filter(id => id !== opportunityId),
        })),
      
      toggleFavorite: (opportunityId) => 
        set((state) => ({
          favorites: state.favorites.includes(opportunityId)
            ? state.favorites.filter(id => id !== opportunityId)
            : [...state.favorites, opportunityId],
        })),
      
      clearSearchResults: () => 
        set({ searchResults: [] }),
      
      // Upload Actions
      addUploadedFile: (file) => 
        set((state) => ({
          uploadedFiles: [...state.uploadedFiles, file],
        })),
      
      updateUploadedFile: (fileId, updates) => 
        set((state) => ({
          uploadedFiles: state.uploadedFiles.map(file =>
            file.id === fileId ? { ...file, ...updates } : file
          ),
        })),
      
      removeUploadedFile: (fileId) => 
        set((state) => ({
          uploadedFiles: state.uploadedFiles.filter(f => f.id !== fileId),
        })),
      
      setIsUploading: (isUploading) => 
        set({ isUploading }),
      
      setUploadProgress: (progress) => 
        set({ uploadProgress: progress }),
      
      clearAllUploads: () => 
        set({ uploadedFiles: [] }),
      
      // UI Actions
      setSidebarOpen: (open) => 
        set({ sidebarOpen: open }),
      
      setCurrentView: (view) => 
        set({ currentView: view }),
      
      setTheme: (theme) => 
        set({ theme }),
      
      // Settings Actions
      setSamApiKey: (apiKey) => {
        const { encryptionKey } = get();
        const encryptedKey = encryptionKey ? encryptData(apiKey, encryptionKey) : apiKey;
        set({ samApiKey: encryptedKey });
      },
      
      setEncryptionKey: (key) => 
        set({ encryptionKey: key }),
      
      updateSettings: (settings) => 
        set((state) => ({
          settings: { ...state.settings, ...settings },
        })),
      
      // Utility Actions
      resetStore: () => 
        set(initialState),
      
      exportData: () => {
        const state = get();
        const exportData = {
          chatSessions: state.chatSessions,
          uploadedFiles: state.uploadedFiles,
          favorites: state.favorites,
          settings: state.settings,
          searchFilters: state.searchFilters,
        };
        return JSON.stringify(exportData, null, 2);
      },
      
      importData: (data) => {
        try {
          const importedData = JSON.parse(data);
          set((state) => ({
            ...state,
            ...importedData,
          }));
        } catch (error) {
          console.error('Failed to import data:', error);
        }
      },
      
      initializeStore: () => {
        const state = get();
        
        // Generate encryption key if not present
        if (!state.encryptionKey) {
          const key = generateEncryptionKey();
          set({ encryptionKey: key });
        }
        
        // Validate and update LLM config
        if (!state.llmConfig.apiKey) {
          // Try to load from localStorage if available
          try {
            const savedKey = localStorage.getItem('opensam-llm-key');
            if (savedKey && state.encryptionKey) {
              const decryptedKey = decryptData(savedKey, state.encryptionKey);
              set((state) => ({
                llmConfig: { ...state.llmConfig, apiKey: decryptedKey },
              }));
            }
          } catch {
            // Ignore decryption errors
          }
        }
      },
    }),
    {
      name: 'opensam-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        llmConfig: {
          ...state.llmConfig,
          apiKey: '', // Don't persist API key in localStorage
        },
        chatSessions: state.chatSessions,
        favorites: state.favorites,
        searchFilters: state.searchFilters,
        uploadedFiles: state.uploadedFiles.map(file => ({
          ...file,
          content: '', // Don't persist file content
        })),
        settings: state.settings,
        theme: state.theme,
        currentView: state.currentView,
        encryptionKey: state.encryptionKey,
      }),
    }
  )
);

// Selectors for optimized component re-renders
export const useCurrentSession = () => useAppStore((state) => state.currentSession);
export const useChatSessions = () => useAppStore((state) => state.chatSessions);
export const useLLMConfig = () => useAppStore((state) => state.llmConfig);
export const useSearchResults = () => useAppStore((state) => state.searchResults);
export const useSearchFilters = () => useAppStore((state) => state.searchFilters);
export const useUploadedFiles = () => useAppStore((state) => state.uploadedFiles);
export const useUIState = () => useAppStore((state) => ({
  sidebarOpen: state.sidebarOpen,
  currentView: state.currentView,
  theme: state.theme,
}));
export const useFavorites = () => useAppStore((state) => state.favorites);
export const useSettings = () => useAppStore((state) => state.settings);

// Initialize store on first load
if (typeof window !== 'undefined') {
  useAppStore.getState().initializeStore();
}