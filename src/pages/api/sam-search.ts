import { NextApiRequest, NextApiResponse } from 'next';
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
function checkSAMRateLimit(req: NextApiRequest): boolean {
  const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
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
  // Check cache first
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
  
  // Cache the result
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
  
  // Add search parameters
  if (filters.keyword) {
    params.append('q', filters.keyword);
  }
  
  if (filters.startDate) {
    params.append('postedFrom', filters.startDate);
  }
  
  if (filters.endDate) {
    params.append('postedTo', filters.endDate);
  }
  
  if (filters.naicsCode) {
    params.append('naicsCode', filters.naicsCode);
  }
  
  if (filters.state) {
    params.append('state', filters.state);
  }
  
  if (filters.agency) {
    params.append('agency', filters.agency);
  }
  
  if (filters.type) {
    params.append('noticeType', filters.type);
  }
  
  if (filters.setAside) {
    params.append('setAside', filters.setAside);
  }
  
  if (filters.active !== undefined) {
    params.append('active', filters.active.toString());
  }
  
  params.append('limit', Math.min(filters.limit || 50, 100).toString());
  params.append('offset', (filters.offset || 0).toString());
  
  // Add default parameters
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
  
  // Transform SAM.gov response to our format
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
    relevanceScore: 0, // Will be calculated if semantic search is used
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
  if (!query.trim()) {
    return opportunities;
  }
  
  try {
    // Generate embeddings for the search query
    const queryEmbeddings = await generateEmbeddings(query, provider, apiKey);
    
    // Generate embeddings for each opportunity and calculate similarity
    const opportunitiesWithScores = await Promise.all(
      opportunities.map(async (opportunity) => {
        const text = `${opportunity.title} ${opportunity.description} ${opportunity.synopsis}`;
        const opportunityEmbeddings = await generateEmbeddings(text, provider, apiKey);
        
        const similarity = cosineSimilarity(queryEmbeddings, opportunityEmbeddings);
        
        return {
          ...opportunity,
          relevanceScore: similarity,
        };
      })
    );
    
    // Sort by relevance score (descending) and return top results
    return opportunitiesWithScores
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
      .slice(0, 25); // Return top 25 most relevant
      
  } catch (error) {
    console.error('Semantic search error:', error);
    // Fall back to original results if semantic search fails
    return opportunities;
  }
}

/**
 * Main SAM search API handler
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Check rate limit
  if (!checkSAMRateLimit(req)) {
    return res.status(429).json({ 
      error: 'Rate limit exceeded. Please try again later.' 
    });
  }
  
  try {
    const {
      q: keyword,
      startDate,
      endDate,
      naicsCode,
      state,
      agency,
      type,
      setAside,
      active,
      limit,
      offset,
      semantic,
      provider = 'openai',
      samApiKey,
    } = req.query;
    
    // Validate required parameters
    if (!samApiKey) {
      return res.status(400).json({ 
        error: 'SAM API key is required' 
      });
    }
    
    // Build search filters
    const filters: SAMSearchFilters = {
      keyword: keyword as string,
      startDate: startDate as string,
      endDate: endDate as string,
      naicsCode: naicsCode as string,
      state: state as string,
      agency: agency as string,
      type: type as string,
      setAside: setAside as string,
      active: active ? active === 'true' : undefined,
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0,
    };
    
    // Create cache key
    const cacheKey = JSON.stringify(filters);
    
    // Check cache first
    const cachedResult = searchResultsCache.get(cacheKey);
    if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_DURATION) {
      return res.status(200).json({
        success: true,
        data: cachedResult.data,
        cached: true,
        timestamp: Date.now(),
      });
    }
    
    // Search SAM.gov
    const opportunities = await searchSAMOpportunities(filters, samApiKey as string);
    
    // Perform semantic search if requested and query is provided
    let finalOpportunities = opportunities;
    if (semantic === 'true' && keyword) {
      const llmApiKey = req.headers.authorization?.replace('Bearer ', '');
      if (llmApiKey) {
        finalOpportunities = await performSemanticSearch(
          opportunities,
          keyword,
          provider as string,
          llmApiKey
        );
      }
    }
    
    // Build response
    const response: SAMSearchResponse = {
      opportunities: finalOpportunities,
      totalRecords: opportunities.length,
      limit: filters.limit || 50,
      offset: filters.offset || 0,
      facets: {
        naicsCodes: [],
        states: [],
        agencies: [],
        types: [],
      },
    };
    
    // Cache the result
    searchResultsCache.set(cacheKey, { data: response, timestamp: Date.now() });
    
    // Return response
    res.status(200).json({
      success: true,
      data: response,
      timestamp: Date.now(),
    });
    
  } catch (error) {
    console.error('SAM search API error:', error);
    
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

// Cleanup function to remove old cache entries
setInterval(() => {
  const now = Date.now();
  
  // Clean embedding cache (keep last 1000 entries)
  if (embeddingCache.size > 1000) {
    const entries = Array.from(embeddingCache.entries());
    embeddingCache.clear();
    entries.slice(-500).forEach(([key, value]) => {
      embeddingCache.set(key, value);
    });
  }
  
  // Clean search results cache
  for (const [key, value] of searchResultsCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      searchResultsCache.delete(key);
    }
  }
}, 5 * 60 * 1000); // Run every 5 minutes

export { SAM_RATE_LIMIT_WINDOW, SAM_RATE_LIMIT_MAX_REQUESTS };