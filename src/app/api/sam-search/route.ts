import { NextRequest, NextResponse } from 'next/server';
import { SAMOpportunity, SAMSearchFilters, SAMSearchResponse, EmbeddingRequest, EmbeddingResponse } from '@/types';
import { cosineSimilarity } from '@/lib/utils';

// SAM.gov API configuration
const SAM_BASE_URL = process.env.SAM_BASE_URL || 'https://api.sam.gov';
const SAM_OPPORTUNITIES_ENDPOINT = '/opportunities/v2/search';

// Rate limiting for SAM.gov API
const SAM_RATE_LIMIT_WINDOW = 60000; // 1 minute
const SAM_RATE_LIMIT_MAX_REQUESTS = 100;
const samRateLimitMap = new Map<string, { count: number; timestamp: number }>();

// Cache for embeddings and search results
const embeddingCache = new Map<string, number[]>();
const searchResultsCache = new Map<string, { data: SAMSearchResponse; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Rate limiting for SAM.gov API calls
 */
function checkSAMRateLimit(req: NextRequest): boolean {
  const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const now = Date.now();

  const clientData = samRateLimitMap.get(clientIp as string);

  if (!clientData) {
    samRateLimitMap.set(clientIp as string, { count: 1, timestamp: now });
    return true;
  }

  // Reset if window has passed
  if (now - clientData.timestamp > SAM_RATE_LIMIT_WINDOW) {
    samRateLimitMap.set(clientIp as string, { count: 1, timestamp: now });
    return true;
  }

  // Check if limit exceeded
  if (clientData.count >= SAM_RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  // Increment count
  clientData.count++;
  return true;
}

/**
 * Generate embeddings for text using the configured LLM provider
 */
async function generateEmbeddings(text: string, provider: string = 'openai', apiKey: string): Promise<number[]> {
  const cacheKey = `${provider}:${text}`;
  if (embeddingCache.has(cacheKey)) {
    return embeddingCache.get(cacheKey)!;
  }

  let embeddings: number[];

  switch (provider) {
    case 'openai':
      embeddings = await generateOpenAIEmbeddings(text, apiKey);
      break;
    case 'huggingface':
      embeddings = await generateHuggingFaceEmbeddings(text, apiKey);
      break;
    default:
      throw new Error(`Embedding provider ${provider} not supported`);
  }

  embeddingCache.set(cacheKey, embeddings);
  return embeddings;
}

/**
 * Generate embeddings using OpenAI API
 */
async function generateOpenAIEmbeddings(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI Embeddings API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Generate embeddings using Hugging Face API
 */
async function generateHuggingFaceEmbeddings(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch('https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: text,
      options: {
        wait_for_model: true,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Hugging Face Embeddings API error: ${error.error || response.statusText}`);
  }

  const data = await response.json();
  return Array.isArray(data[0]) ? data[0] : data;
}

/**
 * Search SAM.gov opportunities
 */
async function searchSAMOpportunities(
  filters: SAMSearchFilters,
  samApiKey: string
): Promise<SAMOpportunity[]> {
  const params = new URLSearchParams();

  if (filters.keyword) params.append('q', filters.keyword);
  if (filters.startDate) params.append('postedFrom', filters.startDate);
  if (filters.endDate) params.append('postedTo', filters.endDate);
  if (filters.naicsCode) params.append('naicsCode', filters.naicsCode);
  if (filters.state) params.append('state', filters.state);
  if (filters.agency) params.append('agency', filters.agency);
  if (filters.type) params.append('noticeType', filters.type);
  if (filters.setAside) params.append('setAside', filters.setAside);
  if (filters.active !== undefined) params.append('active', filters.active.toString());
  if (filters.entityName) params.append('entityName', filters.entityName);
  if (filters.contractVehicle) params.append('contractVehicle', filters.contractVehicle);
  if (filters.classificationCode) params.append('classificationCode', filters.classificationCode);
  if (filters.fundingSource) params.append('fundingSource', filters.fundingSource);
  if (filters.responseDeadline?.from) params.append('responseDeadlineFrom', filters.responseDeadline.from);
  if (filters.responseDeadline?.to) params.append('responseDeadlineTo', filters.responseDeadline.to);
  if (filters.estimatedValue?.min) params.append('estimatedValueMin', filters.estimatedValue.min.toString());
  if (filters.estimatedValue?.max) params.append('estimatedValueMax', filters.estimatedValue.max.toString());
  if (filters.hasAttachments) params.append('hasAttachments', 'true');

  params.append('limit', Math.min(filters.limit || 50, 100).toString());
  params.append('offset', (filters.offset || 0).toString());
  params.append('includeCount', 'true');
  params.append('format', 'json');

  const url = `${SAM_BASE_URL}${SAM_OPPORTUNITIES_ENDPOINT}?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-API-Key': samApiKey,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SAM.gov API error: ${response.status} ${response.statusText} - ${error}`);
  }

  const data = await response.json();

  return data.opportunitiesData?.map((opportunity: any) => ({
    id: opportunity.noticeId || opportunity.solicitationNumber,
    noticeId: opportunity.noticeId,
    title: opportunity.title,
    description: opportunity.description || '',
    synopsis: opportunity.synopsis || '',
    type: opportunity.type,
    baseType: opportunity.baseType,
    archiveType: opportunity.archiveType,
    archiveDate: opportunity.archiveDate,
    typeOfSetAsideDescription: opportunity.typeOfSetAsideDescription,
    typeOfSetAside: opportunity.typeOfSetAside,
    responseDeadLine: opportunity.responseDeadLine,
    naicsCode: opportunity.naicsCode,
    naicsDescription: opportunity.naicsDescription,
    classificationCode: opportunity.classificationCode,
    active: opportunity.active,
    award: opportunity.award,
    pointOfContact: opportunity.pointOfContact,
    placeOfPerformance: opportunity.placeOfPerformance,
    organizationType: opportunity.organizationType,
    officeAddress: opportunity.officeAddress,
    links: opportunity.links,
    uiLink: opportunity.uiLink,
    relevanceScore: 0,
    isFavorite: false,
    tags: [],
  })) || [];
}

/**
 * Perform semantic search on opportunities
 */
async function performSemanticSearch(
  opportunities: SAMOpportunity[],
  query: string,
  provider: string,
  apiKey: string
): Promise<SAMOpportunity[]> {
  const queryEmbedding = await generateEmbeddings(query, provider, apiKey);

  return opportunities
    .map((opportunity) => {
      const textToEmbed = `${opportunity.title} ${opportunity.description}`;
      const embedding = embeddingCache.get(textToEmbed) || null;

      if (!embedding) {
        return { ...opportunity, relevanceScore: 0 };
      }

      const score = cosineSimilarity(queryEmbedding, embedding);

      return { ...opportunity, relevanceScore: score };
    })
    .filter((opportunity) => opportunity.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * API route handler
 */
export async function GET(req: NextRequest) {
  try {
    // Rate limiting check
    if (!checkSAMRateLimit(req)) {
      return new NextResponse(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse query params
    const url = new URL(req.url);
    const keyword = url.searchParams.get('keyword') || '';
    const provider = url.searchParams.get('provider') || 'openai';
    const samApiKey = process.env.SAM_API_KEY || '';

    if (!samApiKey) {
      return new NextResponse(JSON.stringify({ error: 'Missing SAM API key' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Example: Construct filters from query params (expand as needed)
    const filters: SAMSearchFilters = {
      keyword,
      limit: 50,
    };

    // Check cache
    const cacheKey = JSON.stringify(filters);
    const cached = searchResultsCache.get(cacheKey);
    const now = Date.now();
    if (cached && now - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json(cached.data);
    }

    // Fetch SAM opportunities
    const opportunities = await searchSAMOpportunities(filters, samApiKey);

    // Semantic search if keyword provided
    let results = opportunities;
    if (keyword.trim()) {
      const openAIKey = process.env.OPENAI_API_KEY || '';
      const hfKey = process.env.HUGGINGFACE_API_KEY || '';
      const embeddingApiKey = provider === 'openai' ? openAIKey : hfKey;

      results = await performSemanticSearch(opportunities, keyword, provider, embeddingApiKey);
    }

    const responsePayload: SAMSearchResponse = {
      totalCount: results.length,
      opportunities: results,
    };

    searchResultsCache.set(cacheKey, { data: responsePayload, timestamp: now });

    return NextResponse.json(responsePayload);
  } catch (error) {
    return new NextResponse(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
