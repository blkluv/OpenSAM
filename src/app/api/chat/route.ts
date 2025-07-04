import { NextRequest, NextResponse } from 'next/server';
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
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }),
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com/v1',
    chatEndpoint: '/completions', // corrected endpoint to /completions
    headers: (apiKey: string) => ({
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    }),
  },
  huggingface: {
    baseUrl: 'https://api-inference.huggingface.co/models',
    chatEndpoint: '', // constructed per model in callHuggingFace
    headers: (apiKey: string) => ({
      Authorization: `Bearer ${apiKey}`,
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
function checkRateLimit(req: NextRequest): boolean {
  const clientIp =
    (req.headers.get('x-forwarded-for')?.split(',')[0].trim()) ||
    req.headers.get('x-real-ip') ||
    'unknown';
  const now = Date.now();

  const clientData = rateLimitMap.get(clientIp);

  if (!clientData) {
    rateLimitMap.set(clientIp, { count: 1, timestamp: now });
    return true;
  }

  if (now - clientData.timestamp > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(clientIp, { count: 1, timestamp: now });
    return true;
  }

  if (clientData.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  // Increment count and update map
  rateLimitMap.set(clientIp, { count: clientData.count + 1, timestamp: clientData.timestamp });
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
    })),
  ];
}

/**
 * Format messages for Anthropic API
 */
function formatAnthropicMessages(messages: LLMMessage[]): any {
  // Anthropic expects prompt as a single string combining all messages
  // We'll format as "Human:" and "Assistant:" and append system prompt at start

  const conversation = messages
    .filter(msg => msg.role !== 'system')
    .map(msg => (msg.role === 'assistant' ? `Assistant: ${msg.content}` : `Human: ${msg.content}`))
    .join('\n\n');

  return {
    prompt: `${SYSTEM_PROMPT}\n\n${conversation}\n\nAssistant:`,
    model: '', // will be set by caller
    max_tokens_to_sample: 1000, // default, override if needed
    temperature: 0.7,
    stop_sequences: ['\nHuman:'],
  };
}

/**
 * Format messages for Hugging Face API
 */
function formatHuggingFaceMessages(messages: LLMMessage[]): any {
  const conversationText = messages
    .map(msg => {
      const prefix = msg.role === 'user' ? 'Human: ' : 'Assistant: ';
      return prefix + msg.content;
    })
    .join('\n\n');

  return {
    inputs: `${SYSTEM_PROMPT}\n\n${conversationText}\n\nAssistant:`,
    parameters: {
      max_new_tokens: 1000,
      temperature: 0.7,
      return_full_text: false,
    },
  };
}

/**
 * Call OpenAI API
 */
async function callOpenAI(
  messages: LLMMessage[],
  model: string,
  apiKey: string,
  temperature = 0.7,
  maxTokens = 1000
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
    const error = await response.json().catch(() => ({}));
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
  temperature = 0.7,
  maxTokens = 1000
): Promise<LLMResponse> {
  const config = LLM_CONFIGS.anthropic;

  const anthropicPayload = formatAnthropicMessages(messages);
  anthropicPayload.model = model;
  anthropicPayload.temperature = temperature;
  anthropicPayload.max_tokens_to_sample = maxTokens;

  const response = await fetch(`${config.baseUrl}${config.chatEndpoint}`, {
    method: 'POST',
    headers: config.headers(apiKey),
    body: JSON.stringify(anthropicPayload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();

  return {
    content: data.completion,
    usage: {
      prompt_tokens: data.usage?.prompt_tokens || 0,
      completion_tokens: data.usage?.completion_tokens || 0,
      total_tokens: (data.usage?.prompt_tokens || 0) + (data.usage?.completion_tokens || 0),
    },
    model: data.model || model,
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
  temperature = 0.7,
  maxTokens = 1000
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
    const error = await response.json().catch(() => ({}));
    throw new Error(`Hugging Face API error: ${error.error || response.statusText}`);
  }

  const data = await response.json();

  return {
    content: Array.isArray(data) ? data[0].generated_text : data.generated_text,
    usage: {
      prompt_tokens: 0, // Hugging Face does not provide token counts
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
export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    if (!checkRateLimit(req)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await req.json();

    const {
      provider = 'openai',
      model,
      messages,
      temperature = 0.7,
      maxTokens = 1000,
      apiKey,
    } = body;

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 400 });
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Missing or invalid messages array' }, { status: 400 });
    }

    if (!model) {
      return NextResponse.json({ error: 'Missing model parameter' }, { status: 400 });
    }

    let result: LLMResponse;

    switch (provider.toLowerCase()) {
      case 'openai':
        result = await callOpenAI(messages, model, apiKey, temperature, maxTokens);
        break;
      case 'anthropic':
        result = await callAnthropic(messages, model, apiKey, temperature, maxTokens);
        break;
      case 'huggingface':
        result = await callHuggingFace(messages, model, apiKey, temperature, maxTokens);
        break;
      default:
        return NextResponse.json({ error: `Unsupported provider: ${provider}` }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
