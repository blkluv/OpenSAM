#!/usr/bin/env node

const https = require('https');

// Test configuration
const TESTS = {
  openai: {
    url: 'https://api.openai.com/v1/models',
    headers: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    })
  },
  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    headers: (apiKey) => ({
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    }),
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'test' }]
    })
  },
  huggingface: {
    url: 'https://api-inference.huggingface.co/models/microsoft/DialoGPT-large',
    headers: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }),
    body: JSON.stringify({
      inputs: 'test',
      parameters: { max_new_tokens: 10 }
    })
  }
};

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

async function testAPIKey(provider, apiKey) {
  console.log(`\n🔍 Testing ${provider.toUpperCase()} API key...`);
  
  if (!apiKey || apiKey.trim() === '') {
    console.log('❌ No API key provided');
    return false;
  }

  const test = TESTS[provider];
  if (!test) {
    console.log('❌ Unknown provider');
    return false;
  }

  try {
    const url = new URL(test.url);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: provider === 'anthropic' || provider === 'huggingface' ? 'POST' : 'GET',
      headers: test.headers(apiKey)
    };

    const response = await makeRequest(url, options, test.body);
    
    if (response.status === 200 || response.status === 201) {
      console.log('✅ API key is valid!');
      if (provider === 'openai' && response.data.data) {
        console.log(`📊 Available models: ${response.data.data.length}`);
      }
      return true;
    } else if (response.status === 401) {
      console.log('❌ Invalid API key (401 Unauthorized)');
      console.log('💡 Check your API key format and ensure it has the correct permissions');
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

async function main() {
  console.log('🚀 OpenSAM AI - API Key Tester\n');
  
  // Get API keys from command line arguments and environment variables
  const args = process.argv.slice(2);
  const apiKeys = {};
  
  // Check environment variables first
  if (process.env.OPENAI_API_KEY) {
    apiKeys.openai = process.env.OPENAI_API_KEY;
    console.log('🔍 Found OpenAI API key in environment variables');
  }
  
  if (process.env.ANTHROPIC_API_KEY) {
    apiKeys.anthropic = process.env.ANTHROPIC_API_KEY;
    console.log('🔍 Found Anthropic API key in environment variables');
  }
  
  if (process.env.HUGGINGFACE_API_KEY) {
    apiKeys.huggingface = process.env.HUGGINGFACE_API_KEY;
    console.log('🔍 Found Hugging Face API key in environment variables');
  }
  
  // Override with command line arguments if provided
  for (let i = 0; i < args.length; i += 2) {
    if (args[i].startsWith('--')) {
      const provider = args[i].slice(2);
      const key = args[i + 1];
      if (key) {
        apiKeys[provider] = key;
        console.log(`🔍 Using ${provider} API key from command line`);
      }
    }
  }

  if (Object.keys(apiKeys).length === 0) {
    console.log('Usage: node test-api-keys.js --openai YOUR_KEY --anthropic YOUR_KEY --huggingface YOUR_KEY');
    console.log('\nOr set environment variables:');
    console.log('OPENAI_API_KEY=sk-...');
    console.log('ANTHROPIC_API_KEY=sk-ant-...');
    console.log('HUGGINGFACE_API_KEY=hf_...');
    console.log('\nExample:');
    console.log('node test-api-keys.js --openai sk-... --anthropic sk-ant-...');
    return;
  }

  const results = {};
  
  for (const [provider, key] of Object.entries(apiKeys)) {
    results[provider] = await testAPIKey(provider, key);
  }

  console.log('\n📋 Summary:');
  for (const [provider, isValid] of Object.entries(results)) {
    console.log(`${provider}: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
  }
}

main().catch(console.error); 