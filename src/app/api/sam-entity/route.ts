import { NextRequest, NextResponse } from 'next/server';

// SAM.gov Entity API configuration
const SAM_BASE_URL = process.env.SAM_BASE_URL || 'https://api.sam.gov';
const SAM_ENTITY_ENDPOINT = '/entity-information/v3/entities';

// Rate limiting for SAM.gov API
const SAM_RATE_LIMIT_WINDOW = 60000; // 1 minute
const SAM_RATE_LIMIT_MAX_REQUESTS = 100;
const samRateLimitMap = new Map<string, { count: number; timestamp: number }>();

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
 * Search SAM.gov entities
 */
async function searchSAMEntities(
  filters: {
    entityName?: string;
    ueiSAM?: string;
    cageCode?: string;
    duns?: string;
    state?: string;
    city?: string;
    zipCode?: string;
    limit?: number;
    offset?: number;
  },
  samApiKey: string
): Promise<any[]> {
  const params = new URLSearchParams();
  
  // Add search parameters
  if (filters.entityName) {
    params.append('entityName', filters.entityName);
  }
  
  if (filters.ueiSAM) {
    params.append('ueiSAM', filters.ueiSAM);
  }
  
  if (filters.cageCode) {
    params.append('cageCode', filters.cageCode);
  }
  
  if (filters.duns) {
    params.append('duns', filters.duns);
  }
  
  if (filters.state) {
    params.append('state', filters.state);
  }
  
  if (filters.city) {
    params.append('city', filters.city);
  }
  
  if (filters.zipCode) {
    params.append('zipCode', filters.zipCode);
  }
  
  params.append('limit', Math.min(filters.limit || 50, 100).toString());
  params.append('offset', (filters.offset || 0).toString());
  
  // Add default parameters
  params.append('includeCount', 'true');
  params.append('format', 'json');
  
  const url = `${SAM_BASE_URL}${SAM_ENTITY_ENDPOINT}?${params.toString()}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-API-Key': samApiKey,
      'Accept': 'application/json',
    },
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SAM.gov Entity API error: ${response.status} ${response.statusText} - ${error}`);
  }
  
  const data = await response.json();
  
  // Transform SAM.gov response to our format
  return data.entityData?.map((entity: any) => ({
    ueiSAM: entity.ueiSAM,
    entityName: entity.entityName,
    cageCode: entity.cageCode,
    duns: entity.duns,
    entityStructure: entity.entityStructure,
    businessTypes: entity.businessTypes,
    registrationStatus: entity.registrationStatus,
    registrationDate: entity.registrationDate,
    lastUpdated: entity.lastUpdated,
    expirationDate: entity.expirationDate,
    address: entity.address,
    pointOfContact: entity.pointOfContact,
    samStatus: entity.samStatus,
    exclusionStatus: entity.exclusionStatus,
    hasDelinquentFederalDebt: entity.hasDelinquentFederalDebt,
    hasExclusions: entity.hasExclusions,
    hasSuspensions: entity.hasSuspensions,
    hasDebarments: entity.hasDebarments,
    hasIneligibilities: entity.hasIneligibilities,
    hasAdministrativeAgreements: entity.hasAdministrativeAgreements,
    hasSettlementAgreements: entity.hasSettlementAgreements,
    hasVoluntaryExclusions: entity.hasVoluntaryExclusions,
    hasProtests: entity.hasProtests,
    hasDisputes: entity.hasDisputes,
    hasAppeals: entity.hasAppeals,
    hasLitigation: entity.hasLitigation,
    hasBankruptcy: entity.hasBankruptcy,
    hasTaxDelinquencies: entity.hasTaxDelinquencies,
    hasEnvironmentalViolations: entity.hasEnvironmentalViolations,
    hasLaborViolations: entity.hasLaborViolations,
    hasSafetyViolations: entity.hasSafetyViolations,
    hasQualityViolations: entity.hasQualityViolations,
    hasPerformanceIssues: entity.hasPerformanceIssues,
    hasFinancialIssues: entity.hasFinancialIssues,
    hasComplianceIssues: entity.hasComplianceIssues,
    hasOtherIssues: entity.hasOtherIssues,
  })) || [];
}

/**
 * Main SAM entity search API handler
 */
export async function GET(req: NextRequest) {
  // Check rate limit
  if (!checkSAMRateLimit(req)) {
    return NextResponse.json({ 
      error: 'Rate limit exceeded. Please try again later.' 
    }, { status: 429 });
  }
  
  try {
    const { searchParams } = new URL(req.url);
    const entityName = searchParams.get('entityName');
    const ueiSAM = searchParams.get('ueiSAM');
    const cageCode = searchParams.get('cageCode');
    const duns = searchParams.get('duns');
    const state = searchParams.get('state');
    const city = searchParams.get('city');
    const zipCode = searchParams.get('zipCode');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');
    const samApiKey = searchParams.get('samApiKey');
    
    // Validate required parameters
    if (!samApiKey) {
      return NextResponse.json({ 
        error: 'SAM API key is required' 
      }, { status: 400 });
    }
    
    // Build search filters
    const filters = {
      entityName: entityName || undefined,
      ueiSAM: ueiSAM || undefined,
      cageCode: cageCode || undefined,
      duns: duns || undefined,
      state: state || undefined,
      city: city || undefined,
      zipCode: zipCode || undefined,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    };
    
    // Search SAM.gov entities
    const entities = await searchSAMEntities(filters, samApiKey);
    
    // Build response
    const response = {
      entities,
      totalRecords: entities.length,
      limit: filters.limit || 50,
      offset: filters.offset || 0,
    };
    
    // Return response
    return NextResponse.json({
      success: true,
      data: response,
      timestamp: Date.now(),
    }, { status: 200 });
    
  } catch (error) {
    console.error('SAM entity search API error:', error);
    
    // Return appropriate error response
    if (error instanceof Error) {
      return NextResponse.json({ 
        error: error.message,
        timestamp: Date.now(),
      }, { status: 500 });
    } else {
      return NextResponse.json({ 
        error: 'An unexpected error occurred',
        timestamp: Date.now(),
      }, { status: 500 });
    }
  }
}

export { SAM_RATE_LIMIT_WINDOW, SAM_RATE_LIMIT_MAX_REQUESTS }; 