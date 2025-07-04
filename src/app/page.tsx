'use client';

import React, { useState, useEffect } from 'react';
import { 
  MessageCircle, 
  Search, 
  TrendingUp, 
  Upload, 
  Settings, 
  Menu, 
  X,
  Bot,
  Key,
  ChevronDown,
  Star,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useAppStore, useUIState, useLLMConfig } from '@/stores/appStore';
import { cn } from '@/lib/utils';

// Navigation items
const navigationItems = [
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'forecast', label: 'Forecast', icon: TrendingUp },
  { id: 'upload', label: 'Upload', icon: Upload },
];

// Main Dashboard Component
export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
  
  const { sidebarOpen, currentView, theme } = useUIState();
  const llmConfig = useLLMConfig();
  const { 
    setSidebarOpen, 
    setCurrentView, 
    setLLMProvider, 
    setLLMModel, 
    setLLMApiKey,
    validateLLMConfig 
  } = useAppStore();

  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize store and validate configuration
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate initialization
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Handle API key setup
  const handleApiKeySetup = async (provider: string, apiKey: string) => {
    try {
      setLLMApiKey(apiKey);
      const isValid = await validateLLMConfig();
      if (isValid) {
        setApiKeyDialogOpen(false);
      } else {
        alert('Invalid API key. Please check your key and try again.');
      }
    } catch (error) {
      console.error('Failed to validate API key:', error);
      alert('Failed to validate API key. Please try again.');
    }
  };

  // Loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-opensam-black mx-auto mb-4"></div>
          <h2 className="text-xl font-medium text-opensam-black">Loading OpenSAM AI...</h2>
          <p className="text-opensam-gray-600 mt-2">Initializing dashboard components</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-opensam-white border-r border-opensam-gray-200 transform transition-transform duration-300 ease-in-out",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-opensam-gray-200">
            <div className="flex items-center space-x-2">
              <Bot className="h-8 w-8 text-opensam-black" />
              <h1 className="text-lg font-bold text-opensam-black">OpenSAM AI</h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigationItems.map(item => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.id}
                  variant={currentView === item.id ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setCurrentView(item.id as any)}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Button>
              );
            })}
          </nav>

          {/* LLM Configuration */}
          <div className="p-4 border-t border-opensam-gray-200">
            <div className="space-y-2">
              <label className="text-sm font-medium text-opensam-gray-700">
                LLM Provider
              </label>
              <Select
                value={llmConfig.provider}
                onValueChange={(value) => setLLMProvider(value as any)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="huggingface">Hugging Face</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setApiKeyDialogOpen(true)}
              >
                <Key className="h-4 w-4 mr-2" />
                {llmConfig.apiKey ? 'Update API Key' : 'Set API Key'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={cn(
        "transition-all duration-300 ease-in-out",
        sidebarOpen ? "lg:ml-64" : "ml-0"
      )}>
        {/* Header */}
        <header className="bg-opensam-white border-b border-opensam-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-semibold text-opensam-black capitalize">
              {currentView}
            </h2>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="hidden sm:flex items-center space-x-2 text-sm text-opensam-gray-600">
              <div className={cn(
                "w-2 h-2 rounded-full",
                llmConfig.apiKey ? "bg-green-500" : "bg-red-500"
              )} />
              <span>
                {llmConfig.apiKey ? `${llmConfig.provider} connected` : 'No API key'}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="p-6">
          {currentView === 'chat' && <ChatView />}
          {currentView === 'search' && <SearchView />}
          {currentView === 'forecast' && <ForecastView />}
          {currentView === 'upload' && <UploadView />}
        </main>
      </div>

      {/* API Key Dialog */}
      {apiKeyDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-opensam-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Configure API Key</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-opensam-gray-700 mb-1">
                  Provider
                </label>
                <Select value={llmConfig.provider} onValueChange={(value) => setLLMProvider(value as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                    <SelectItem value="huggingface">Hugging Face</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-opensam-gray-700 mb-1">
                  API Key
                </label>
                <Input
                  type="password"
                  placeholder="Enter your API key"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleApiKeySetup(llmConfig.provider, e.currentTarget.value);
                    }
                  }}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setApiKeyDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const input = document.querySelector('input[type="password"]') as HTMLInputElement;
                    if (input?.value) {
                      handleApiKeySetup(llmConfig.provider, input.value);
                    }
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Chat View Component
function ChatView() {
  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageCircle className="h-5 w-5 mr-2" />
            AI Chat Assistant
          </CardTitle>
          <CardDescription>
            Ask questions about SAM.gov opportunities, get insights, and explore contract data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-96 border border-opensam-gray-200 rounded-lg p-4 bg-opensam-gray-50">
              <div className="flex items-center justify-center h-full text-opensam-gray-500">
                <div className="text-center">
                  <Bot className="h-12 w-12 mx-auto mb-2 text-opensam-gray-400" />
                  <p>Start a conversation with the AI assistant</p>
                  <p className="text-sm mt-1">Try asking about recent contract opportunities or market trends</p>
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <Input
                placeholder="Ask about SAM.gov opportunities..."
                className="flex-1"
              />
              <Button>Send</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Search View Component
function SearchView() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="h-5 w-5 mr-2" />
            Semantic Search
          </CardTitle>
          <CardDescription>
            Search SAM.gov opportunities using natural language queries.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex space-x-2">
              <Input
                placeholder="Search for opportunities... (e.g., 'AI software development contracts')"
                className="flex-1"
              />
              <Button>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              <Button variant="outline" size="sm">
                <Star className="h-4 w-4 mr-2" />
                Favorites
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-opensam-gray-500 py-12">
            <Search className="h-12 w-12 mx-auto mb-4 text-opensam-gray-400" />
            <p className="text-lg">No search results yet</p>
            <p className="text-sm mt-1">Enter a search query to find relevant opportunities</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Forecast View Component
function ForecastView() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Market Forecast
          </CardTitle>
          <CardDescription>
            Analyze trends and forecast future opportunities based on historical data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-opensam-black">1,234</div>
                  <div className="text-sm text-opensam-gray-600">Active Opportunities</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-opensam-black">$45.2M</div>
                  <div className="text-sm text-opensam-gray-600">Total Value</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-opensam-black">+12%</div>
                  <div className="text-sm text-opensam-gray-600">Growth Rate</div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="h-64 border border-opensam-gray-200 rounded-lg p-4 bg-opensam-gray-50">
            <div className="flex items-center justify-center h-full text-opensam-gray-500">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 mx-auto mb-2 text-opensam-gray-400" />
                <p>Forecast charts will appear here</p>
                <p className="text-sm mt-1">Upload historical data to generate predictions</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Upload View Component
function UploadView() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Upload className="h-5 w-5 mr-2" />
            Document Upload
          </CardTitle>
          <CardDescription>
            Upload past performance documents, proposals, and other files for AI analysis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-opensam-gray-300 rounded-lg p-12 text-center">
              <Upload className="h-12 w-12 mx-auto mb-4 text-opensam-gray-400" />
              <h3 className="text-lg font-medium text-opensam-black mb-2">
                Drop files here or click to browse
              </h3>
              <p className="text-opensam-gray-600 mb-4">
                Supports PDF, CSV, and text files up to 10MB
              </p>
              <Button>
                Choose Files
              </Button>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-opensam-black">Recent Uploads</h4>
              <div className="text-opensam-gray-500 text-sm">
                No files uploaded yet
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}