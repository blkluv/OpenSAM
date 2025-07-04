/**
 * OpenSAM AI Dashboard Type Definitions
 * Comprehensive type system for the application
 */

// LLM Provider Types
export type LLMProvider = 'openai' | 'anthropic' | 'huggingface';

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: number;
  id?: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
  provider: LLMProvider;
}

// SAM.gov Types
export interface SAMOpportunity {
  id: string;
  noticeId: string;
  title: string;
  description: string;
  synopsis: string;
  type: string;
  baseType: string;
  archiveType: string;
  archiveDate: string;
  typeOfSetAsideDescription: string;
  typeOfSetAside: string;
  responseDeadLine: string;
  naicsCode: string;
  naicsDescription: string;
  classificationCode: string;
  active: boolean;
  
  // Enhanced award information
  award?: {
    date: string;
    number: string;
    amount: number;
    awardeeUeiSAM: string;
    awardee: string;
    awardeeAddress?: string;
    contractNumber?: string;
    contractVehicle?: string;
    fundingSource?: string;
  };
  
  // Enhanced contact information
  pointOfContact?: Array<{
    fax: string;
    type: string;
    email: string;
    phone: string;
    title: string;
    fullName: string;
  }>;
  
  // Enhanced location information
  placeOfPerformance?: {
    streetAddress: string;
    city: {
      code: string;
      name: string;
    };
    state: {
      code: string;
      name: string;
    };
    zip: string;
    country: {
      code: string;
      name: string;
    };
  };
  
  organizationType: string;
  officeAddress?: {
    zipcode: string;
    city: string;
    countryCode: string;
    state: string;
  };
  
  // Enhanced links and attachments
  links?: Array<{
    rel: string;
    href: string;
    title?: string;
    type?: string;
  }>;
  attachments?: Array<{
    name: string;
    url: string;
    size?: number;
    type?: string;
  }>;
  
  // Enhanced metadata
  uiLink: string;
  relevanceScore?: number;
  isFavorite?: boolean;
  tags?: string[];
  
  // New fields
  estimatedValue?: number;
  contractVehicle?: string;
  fundingSource?: string;
  entityName?: string;
  hasAttachments?: boolean;
  awardStatus?: 'pending' | 'awarded' | 'cancelled';
  lastModified?: string;
  solicitationNumber?: string;
}

export interface SAMSearchFilters {
  keyword?: string;
  startDate?: string;
  endDate?: string;
  naicsCode?: string;
  state?: string;
  agency?: string;
  type?: string;
  setAside?: string;
  active?: boolean;
  limit?: number;
  offset?: number;
  // New enhanced filters
  entityName?: string;
  contractVehicle?: string;
  estimatedValue?: {
    min?: number;
    max?: number;
  };
  fundingSource?: string;
  classificationCode?: string;
  responseDeadline?: {
    from?: string | undefined;
    to?: string | undefined;
  };
  awardStatus?: 'pending' | 'awarded' | 'cancelled';
  hasAttachments?: boolean;
}

export interface SAMSearchResponse {
  opportunities: SAMOpportunity[];
  totalRecords: number;
  limit: number;
  offset: number;
  facets?: {
    naicsCodes: Array<{ code: string; count: number }>;
    states: Array<{ code: string; count: number }>;
    agencies: Array<{ name: string; count: number }>;
    types: Array<{ type: string; count: number }>;
  };
}

// Chat Types
export interface ChatMessage extends LLMMessage {
  id: string;
  isTyping?: boolean;
  attachments?: UploadedFile[];
  samResults?: SAMOpportunity[];
  error?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  llmConfig: LLMConfig;
}

// Upload Types
export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string;
  uploadedAt: number;
  processed: boolean;
  embeddings?: number[];
  metadata?: {
    pages?: number;
    wordCount?: number;
    summary?: string;
    extractedData?: Record<string, any>;
  };
}

// Chart Types
export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
  category?: string;
}

export interface ForecastData {
  historical: ChartDataPoint[];
  predicted: ChartDataPoint[];
  confidence?: {
    upper: ChartDataPoint[];
    lower: ChartDataPoint[];
  };
}

// Application State Types
export interface AppState {
  // LLM Configuration
  llmConfig: LLMConfig;
  llmProviders: {
    openai: { models: string[] };
    anthropic: { models: string[] };
    huggingface: { models: string[] };
  };
  
  // Chat State
  currentSession: ChatSession | null;
  chatSessions: ChatSession[];
  isStreaming: boolean;
  
  // Search State
  searchResults: SAMOpportunity[];
  searchFilters: SAMSearchFilters;
  searchQuery: string;
  isSearching: boolean;
  favorites: string[];
  
  // Upload State
  uploadedFiles: UploadedFile[];
  isUploading: boolean;
  uploadProgress: number;
  
  // UI State
  sidebarOpen: boolean;
  currentView: 'chat' | 'search' | 'forecast' | 'upload';
  theme: 'light' | 'dark';
  
  // Settings
  samApiKey: string;
  encryptionKey: string;
  settings: {
    autoSave: boolean;
    notifications: boolean;
    analytics: boolean;
  };
}

// API Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// Embedding Types
export interface EmbeddingRequest {
  text: string;
  model?: string;
  provider: LLMProvider;
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  usage?: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

// Utility Types
export interface KeyValuePair {
  key: string;
  value: string;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

// Component Props Types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
}

export interface ErrorState {
  error: string | null;
  code?: string;
  retry?: () => void;
}

// Analytics Types
export interface AnalyticsEvent {
  name: string;
  category: string;
  properties?: Record<string, any>;
  timestamp: number;
}

// Notification Types
export interface NotificationItem {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  actions?: Array<{
    label: string;
    action: () => void;
    primary?: boolean;
  }>;
}

// Export utility type helpers
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type NonNullable<T> = T extends null | undefined ? never : T;