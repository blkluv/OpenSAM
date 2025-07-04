#!/usr/bin/env node

const https = require('https');

// Test configuration
const SAM_BASE_URL = 'https://api.sam.gov';
const SAM_OPPORTUNITIES_ENDPOINT = '/opportunities/v2/search';
const SAM_ENTITY_ENDPOINT = '/entity-information/v3/entities';

function makeRequest(url, options, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    
    if (body) {
      req.write(body);
    }
    
    req.end();
  });
}

async function testSAMOpportunities(samApiKey) {
  console.log('\n🔍 Testing SAM.gov Opportunities API...');
  
  if (!samApiKey) {
    console.log('❌ No SAM API key provided');
    return false;
  }

  try {
    // SAM.gov requires postedFrom and postedTo dates in MM/dd/yyyy format
    const today = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(today.getMonth() - 1);
    
    const formatDate = (date) => {
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = date.getFullYear();
      return `${month}/${day}/${year}`;
    };
    
    const params = new URLSearchParams({
      q: 'software',
      postedFrom: formatDate(oneMonthAgo),
      postedTo: formatDate(today),
      limit: '5',
      includeCount: 'true',
      format: 'json'
    });

    const url = new URL(`${SAM_BASE_URL}${SAM_OPPORTUNITIES_ENDPOINT}?${params.toString()}`);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'X-API-Key': samApiKey,
        'Accept': 'application/json'
      }
    };

    const response = await makeRequest(url, options);
    
    if (response.status === 200) {
      console.log('✅ SAM.gov Opportunities API is working!');
      console.log(`📊 Found ${response.data.totalRecords || 0} opportunities`);
      if (response.data.opportunitiesData) {
        console.log(`📋 Sample opportunities: ${response.data.opportunitiesData.length}`);
        response.data.opportunitiesData.slice(0, 2).forEach((opp, i) => {
          console.log(`  ${i + 1}. ${opp.title?.substring(0, 60)}...`);
        });
      }
      return true;
    } else if (response.status === 401) {
      console.log('❌ Invalid SAM API key (401 Unauthorized)');
      console.log('💡 Check your SAM.gov API key and ensure it has the correct permissions');
      return false;
    } else if (response.status === 429) {
      console.log('⚠️  Rate limited (429 Too Many Requests)');
      console.log('💡 This usually means the key is valid but you\'ve hit rate limits');
      return true;
    } else {
      console.log(`❌ API error (${response.status})`);
      console.log('Response:', response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
    return false;
  }
}

async function testSAMEntities(samApiKey) {
  console.log('\n🔍 Testing SAM.gov Entity API...');
  
  if (!samApiKey) {
    console.log('❌ No SAM API key provided');
    return false;
  }

  try {
    // Entity API has different parameter names
    const params = new URLSearchParams({
      registrationStatus: 'ACTIVE',
      size: '5',
      format: 'json'
    });

    const url = new URL(`${SAM_BASE_URL}${SAM_ENTITY_ENDPOINT}?${params.toString()}`);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'X-API-Key': samApiKey,
        'Accept': 'application/json'
      }
    };

    const response = await makeRequest(url, options);
    
    if (response.status === 200) {
      console.log('✅ SAM.gov Entity API is working!');
      console.log(`📊 Found ${response.data.totalRecords || 0} entities`);
      if (response.data.entityData) {
        console.log(`📋 Sample entities: ${response.data.entityData.length}`);
        response.data.entityData.slice(0, 2).forEach((entity, i) => {
          console.log(`  ${i + 1}. ${entity.entityName} (${entity.ueiSAM})`);
        });
      }
      return true;
    } else if (response.status === 401) {
      console.log('❌ Invalid SAM API key (401 Unauthorized)');
      return false;
    } else if (response.status === 429) {
      console.log('⚠️  Rate limited (429 Too Many Requests)');
      return true;
    } else {
      console.log(`❌ API error (${response.status})`);
      console.log('Response:', response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
    return false;
  }
}

async function testEnhancedSearch(samApiKey) {
  console.log('\n🔍 Testing Enhanced Search Features...');
  
  if (!samApiKey) {
    console.log('❌ No SAM API key provided');
    return false;
  }

  try {
    // Test with enhanced parameters
    const today = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(today.getMonth() - 1);
    
    const formatDate = (date) => {
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = date.getFullYear();
      return `${month}/${day}/${year}`;
    };
    
    const params = new URLSearchParams({
      q: 'cybersecurity',
      naicsCode: '541511',
      state: 'VA',
      postedFrom: formatDate(oneMonthAgo),
      postedTo: formatDate(today),
      limit: '3',
      includeCount: 'true',
      format: 'json'
    });

    const url = new URL(`${SAM_BASE_URL}${SAM_OPPORTUNITIES_ENDPOINT}?${params.toString()}`);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'X-API-Key': samApiKey,
        'Accept': 'application/json'
      }
    };

    const response = await makeRequest(url, options);
    
    if (response.status === 200) {
      console.log('✅ Enhanced search is working!');
      console.log(`📊 Found ${response.data.totalRecords || 0} opportunities with filters`);
      
      if (response.data.opportunitiesData && response.data.opportunitiesData.length > 0) {
        const opp = response.data.opportunitiesData[0];
        console.log('📋 Sample opportunity details:');
        console.log(`  Title: ${opp.title?.substring(0, 80)}...`);
        console.log(`  NAICS: ${opp.naicsCode} - ${opp.naicsDescription}`);
        console.log(`  State: ${opp.placeOfPerformance?.state?.name || 'N/A'}`);
        console.log(`  Type: ${opp.type}`);
        console.log(`  Set-Aside: ${opp.typeOfSetAsideDescription || 'N/A'}`);
        console.log(`  Active: ${opp.active}`);
        console.log(`  Response Deadline: ${opp.responseDeadLine || 'N/A'}`);
      }
      return true;
    } else {
      console.log(`❌ Enhanced search error (${response.status})`);
      return false;
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
    return false;
  }
}

async function testLocalAPI(samApiKey) {
  console.log('\n🔍 Testing Local OpenSAM API...');
  
  if (!samApiKey) {
    console.log('❌ No SAM API key provided');
    return false;
  }

  try {
    // Use fetch for local API testing
    const today = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(today.getMonth() - 1);
    
    const formatDate = (date) => {
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = date.getFullYear();
      return `${month}/${day}/${year}`;
    };
    
    const params = new URLSearchParams({
      q: 'test',
      startDate: formatDate(oneMonthAgo),
      endDate: formatDate(today),
      limit: '3',
      samApiKey: samApiKey
    });

    const response = await fetch(`http://localhost:3000/api/sam-search?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Local OpenSAM API is working!');
      console.log(`📊 Response: ${JSON.stringify(data, null, 2)}`);
      return true;
    } else {
      console.log(`❌ Local API error (${response.status})`);
      console.log('Response:', data);
      return false;
    }
  } catch (error) {
    console.log('❌ Local API error:', error.message);
    console.log('💡 Make sure your development server is running: npm run dev');
    return false;
  }
}

async function main() {
  console.log('🚀 OpenSAM AI - SAM.gov API Tester\n');
  
  // Get SAM API key from environment or command line
  const samApiKey = process.env.SAM_API_KEY || process.argv[2];
  
  if (!samApiKey) {
    console.log('Usage: node test-sam-api.js [SAM_API_KEY]');
    console.log('\nOr set environment variable:');
    console.log('export SAM_API_KEY=your_sam_api_key_here');
    console.log('\nExample:');
    console.log('node test-sam-api.js 7wIwFnyhrowPMylCYE8XVjFm92tEEDkytXFkitJU');
    return;
  }

  console.log('🔑 Using SAM API key:', samApiKey.substring(0, 10) + '...');

  const results = {};
  
  // Test all SAM.gov functionality
  results.opportunities = await testSAMOpportunities(samApiKey);
  results.entities = await testSAMEntities(samApiKey);
  results.enhanced = await testEnhancedSearch(samApiKey);
  results.local = await testLocalAPI(samApiKey);

  console.log('\n📋 Summary:');
  console.log(`Opportunities API: ${results.opportunities ? '✅ Working' : '❌ Failed'}`);
  console.log(`Entity API: ${results.entities ? '✅ Working' : '❌ Failed'}`);
  console.log(`Enhanced Search: ${results.enhanced ? '✅ Working' : '❌ Failed'}`);
  console.log(`Local OpenSAM API: ${results.local ? '✅ Working' : '❌ Failed'}`);

  if (results.opportunities && results.entities) {
    console.log('\n🎉 Your SAM.gov API key is working perfectly!');
    console.log('You can now use all the enhanced features in OpenSAM AI.');
  } else {
    console.log('\n⚠️  Some features may not be working. Check your API key permissions.');
  }
}

main().catch(console.error); 