import { NextApiRequest, NextApiResponse } from 'next';
import { LLMProvider, LLMMessage, LLMResponse } from '@/types';

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20;
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();

// LLM Provider configurations
const LLM_CONFIGS = {
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    chatEndpoint: '/chat/completions',
    headers: (apiKey: string) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }),
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com/v1',
    chatEndpoint: '/messages',
    headers: (apiKey: string) => ({
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    }),
  },
  huggingface: {
    baseUrl: 'https://api-inference.huggingface.co/models',
    chatEndpoint: '', // Will be constructed per model
    headers: (apiKey: string) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }),
  },
};

// System prompt for SAM.gov expertise
const SYSTEM_PROMPT = `You are OpenSAM AI, an expert assistant for SAM.gov (System for Award Management) government contracting opportunities. Your expertise includes:

- Government contracting processes and terminology
- SAM.gov opportunity analysis and search
- Contract award history and trends
- NAICS codes and industry classifications
- Set-aside programs and small business categories
- Federal procurement regulations (FAR)
- Proposal writing and past performance evaluation

When users ask about contracting opportunities, provide detailed, accurate information. If you need to search for specific opportunities, indicate that you'll search SAM.gov data. Always prioritize accuracy and compliance with federal regulations.

Keep responses concise but comprehensive, and always consider the business context of government contracting.`;

/**
 * Rate limiting middleware
 */
function checkRateLimit(req: NextApiRequest): boolean {
  const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  
  const clientData = rateLimitMap.get(clientIp as string);
  
  if (!clientData) {
    rateLimitMap.set(clientIp as string, { count: 1, timestamp: now });
    return true;
  }
  
  // Reset if window has passed
  if (now - clientData.timestamp > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(clientIp as string, { count: 1, timestamp: now });
    return true;
  }
  
  // Check if limit exceeded
  if (clientData.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  // Increment count
  clientData.count++;
  return true;
}

/**
 * Format messages for OpenAI API
 */
function formatOpenAIMessages(messages: LLMMessage[]): any[] {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }))
  ];
}

/**
 * Format messages for Anthropic API
 */
function formatAnthropicMessages(messages: LLMMessage[]): any {
  const userMessages = messages.filter(msg => msg.role !== 'system');
  return {
    system: SYSTEM_PROMPT,
    messages: userMessages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }))
  };
}

/**
 * Format messages for Hugging Face API
 */
function formatHuggingFaceMessages(messages: LLMMessage[]): any {
  const conversationText = messages.map(msg => {
    const prefix = msg.role === 'user' ? 'Human: ' : 'Assistant: ';
    return prefix + msg.content;
  }).join('\n\n');
  
  return {
    inputs: `${SYSTEM_PROMPT}\n\n${conversationText}\n\nAssistant:`,
    parameters: {
      max_new_tokens: 1000,
      temperature: 0.7,
      return_full_text: false,
    }
  };
}

/**
 * Call OpenAI API
 */
async function callOpenAI(
  messages: LLMMessage[], 
  model: string, 
  apiKey: string,
  temperature: number = 0.7,
  maxTokens: number = 1000
): Promise<LLMResponse> {
  const config = LLM_CONFIGS.openai;
  
  const payload = {
    model,
    messages: formatOpenAIMessages(messages),
    temperature,
    max_tokens: maxTokens,
    stream: false,
  };
  
  const response = await fetch(`${config.baseUrl}${config.chatEndpoint}`, {
    method: 'POST',
    headers: config.headers(apiKey),
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }
  
  const data = await response.json();
  
  return {
    content: data.choices[0].message.content,
    usage: data.usage,
    model: data.model,
    provider: 'openai',
  };
}

/**
 * Call Anthropic API
 */
async function callAnthropic(
  messages: LLMMessage[], 
  model: string, 
  apiKey: string,
  temperature: number = 0.7,
  maxTokens: number = 1000
): Promise<LLMResponse> {
  const config = LLM_CONFIGS.anthropic;
  
  const payload = {
    model,
    max_tokens: maxTokens,
    temperature,
    ...formatAnthropicMessages(messages),
  };
  
  const response = await fetch(`${config.baseUrl}${config.chatEndpoint}`, {
    method: 'POST',
    headers: config.headers(apiKey),
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`);
  }
  
  const data = await response.json();
  
  return {
    content: data.content[0].text,
    usage: {
      prompt_tokens: data.usage.input_tokens,
      completion_tokens: data.usage.output_tokens,
      total_tokens: data.usage.input_tokens + data.usage.output_tokens,
    },
    model: data.model,
    provider: 'anthropic',
  };
}

/**
 * Call Hugging Face API
 */
async function callHuggingFace(
  messages: LLMMessage[], 
  model: string, 
  apiKey: string,
  temperature: number = 0.7,
  maxTokens: number = 1000
): Promise<LLMResponse> {
  const config = LLM_CONFIGS.huggingface;
  
  const payload = formatHuggingFaceMessages(messages);
  payload.parameters.temperature = temperature;
  payload.parameters.max_new_tokens = maxTokens;
  
  const response = await fetch(`${config.baseUrl}/${model}`, {
    method: 'POST',
    headers: config.headers(apiKey),
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Hugging Face API error: ${error.error || response.statusText}`);
  }
  
  const data = await response.json();
  
  return {
    content: Array.isArray(data) ? data[0].generated_text : data.generated_text,
    usage: {
      prompt_tokens: 0, // HF doesn't provide token counts
      completion_tokens: 0,
      total_tokens: 0,
    },
    model,
    provider: 'huggingface',
  };
}

/**
 * Main chat API handler
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Check rate limit
  if (!checkRateLimit(req)) {
    return res.status(429).json({ 
      error: 'Rate limit exceeded. Please try again later.' 
    });
  }
  
  try {
    const { model, messages, context } = req.body;
    
    // Validate input
    if (!model || !messages || !Array.isArray(messages)) {
      return res.status(400).json({ 
        error: 'Invalid request. Model and messages are required.' 
      });
    }
    
    // Parse provider and model
    const [provider, modelName] = model.split(':');
    
    if (!provider || !modelName) {
      return res.status(400).json({ 
        error: 'Invalid model format. Use "provider:model" format.' 
      });
    }
    
    // Validate provider
    if (!['openai', 'anthropic', 'huggingface'].includes(provider)) {
      return res.status(400).json({ 
        error: 'Invalid provider. Supported providers: openai, anthropic, huggingface.' 
      });
    }
    
    // Get API key from headers or context
    const apiKey = req.headers.authorization?.replace('Bearer ', '') || 
                  context?.apiKey;
    
    if (!apiKey) {
      return res.status(401).json({ 
        error: 'API key is required.' 
      });
    }
    
    // Test mode for validation
    if (context?.test) {
      return res.status(200).json({ 
        success: true, 
        message: 'API key validation successful' 
      });
    }
    
    // Call appropriate LLM provider
    let response: LLMResponse;
    
    switch (provider as LLMProvider) {
      case 'openai':
        response = await callOpenAI(
          messages, 
          modelName, 
          apiKey, 
          context?.temperature, 
          context?.maxTokens
        );
        break;
        
      case 'anthropic':
        response = await callAnthropic(
          messages, 
          modelName, 
          apiKey, 
          context?.temperature, 
          context?.maxTokens
        );
        break;
        
      case 'huggingface':
        response = await callHuggingFace(
          messages, 
          modelName, 
          apiKey, 
          context?.temperature, 
          context?.maxTokens
        );
        break;
        
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
    
    // Return response
    res.status(200).json({
      success: true,
      data: response,
      timestamp: Date.now(),
    });
    
  } catch (error) {
    console.error('Chat API error:', error);
    
    // Return appropriate error response
    if (error instanceof Error) {
      res.status(500).json({ 
        error: error.message,
        timestamp: Date.now(),
      });
    } else {
      res.status(500).json({ 
        error: 'An unexpected error occurred',
        timestamp: Date.now(),
      });
    }
  }
}

// Export rate limit configuration for testing
export { RATE_LIMIT_WINDOW, RATE_LIMIT_MAX_REQUESTS };