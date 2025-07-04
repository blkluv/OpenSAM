# OpenSAM AI Dashboard

> **The slickest black-and-white government contracting data dashboard on the planet** 🚀

OpenSAM AI is a production-ready, AI-powered dashboard for exploring SAM.gov contract opportunities with semantic search, intelligent chat interface, and forecasting capabilities. Built with React 18, TypeScript, and shadcn/ui components in a beautiful monochromatic design.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)
![Next.js](https://img.shields.io/badge/Next.js-000000?logo=nextdotjs&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white)

## ✨ Features

### 🤖 **Multi-LLM Chat Interface**
- **Provider Flexibility**: Switch between OpenAI, Anthropic, and Hugging Face models on the fly
- **Streaming Responses**: Real-time token streaming for responsive conversations
- **SAM.gov Expertise**: Built-in system prompts with government contracting knowledge
- **Secure Key Management**: Encrypted storage of API keys in browser localStorage

### 🔍 **Semantic Search Engine**
- **Natural Language Queries**: Search using plain English (e.g., "AI software development contracts")
- **Embedding-Powered Ranking**: Cosine similarity scoring for relevance-based results
- **Advanced Filtering**: Date ranges, NAICS codes, agencies, set-asides, and more
- **Favorites System**: Save and organize important opportunities

### 📊 **Market Forecasting**
- **Historical Trends**: Analyze contract patterns over time
- **Predictive Analytics**: Forecast future opportunities based on past data
- **Interactive Charts**: Recharts-powered visualizations with hover details
- **Export Capabilities**: Download data in multiple formats

### 📁 **Document Processing**
- **Multi-Format Support**: PDF, CSV, and text file uploads up to 10MB
- **AI Text Extraction**: Parse and analyze past performance documents
- **Embedding Generation**: Convert documents to searchable vectors
- **RAG Integration**: Reference uploaded content in chat conversations

### 🎨 **Accessibility-First Design**
- **Black & White Theme**: High-contrast, WCAG-compliant color scheme
- **Keyboard Navigation**: Full keyboard accessibility support
- **Screen Reader Friendly**: Semantic HTML with proper ARIA labels
- **Responsive Layout**: Mobile-first design that scales beautifully

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.0.0 or later
- **npm** or **yarn** package manager
- **API Keys**: At least one of the following:
  - OpenAI API key
  - Anthropic API key
  - Hugging Face API token
- **SAM.gov API Key**: For accessing government contract data

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/opensam-ai-dashboard.git
   cd opensam-ai-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env.local
   ```

4. **Configure environment variables**
   ```env
   # LLM Provider API Keys
   OPENAI_API_KEY=your_openai_api_key_here
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   HUGGINGFACE_API_KEY=your_huggingface_api_key_here
   
   # SAM.gov Configuration
   SAM_API_KEY=your_sam_gov_api_key_here
   SAM_BASE_URL=https://api.sam.gov
   
   # Application Configuration
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NEXT_PUBLIC_APP_NAME=OpenSAM AI Dashboard
   ```

5. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🏗️ Project Structure

```
opensam-ai-dashboard/
├── src/
│   ├── app/                    # Next.js 14 app directory
│   │   ├── globals.css         # Global styles with black/white theme
│   │   ├── layout.tsx          # Root layout with metadata
│   │   └── page.tsx            # Main dashboard page
│   ├── components/
│   │   ├── ui/                 # shadcn/ui base components
│   │   │   ├── button.tsx      # Customized button component
│   │   │   ├── card.tsx        # Card layouts
│   │   │   ├── input.tsx       # Form inputs
│   │   │   └── select.tsx      # Dropdown selects
│   │   ├── chat/               # Chat interface components
│   │   ├── search/             # Search functionality
│   │   ├── upload/             # File upload handling
│   │   └── charts/             # Recharts visualizations
│   ├── pages/api/              # API routes
│   │   ├── chat.ts             # LLM provider integration
│   │   └── sam-search.ts       # SAM.gov search with embeddings
│   ├── stores/                 # Zustand state management
│   │   └── appStore.ts         # Main application store
│   ├── lib/                    # Utility libraries
│   │   └── utils.ts            # Helper functions
│   ├── types/                  # TypeScript definitions
│   │   └── index.ts            # All application types
│   ├── hooks/                  # Custom React hooks
│   └── utils/                  # Additional utilities
├── tests/                      # Test suites
│   ├── unit/                   # Jest unit tests
│   └── e2e/                    # Playwright end-to-end tests
├── public/                     # Static assets
├── tailwind.config.js          # Tailwind configuration
├── next.config.js              # Next.js configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Dependencies and scripts
```

## 🔧 Configuration

### LLM Provider Setup

#### OpenAI
1. Visit [OpenAI API](https://platform.openai.com/api-keys)
2. Create a new API key
3. Add to environment: `OPENAI_API_KEY=sk-...`

#### Anthropic
1. Visit [Anthropic Console](https://console.anthropic.com/)
2. Generate an API key
3. Add to environment: `ANTHROPIC_API_KEY=sk-ant-...`

#### Hugging Face
1. Visit [Hugging Face Tokens](https://huggingface.co/settings/tokens)
2. Create a new token with inference permissions
3. Add to environment: `HUGGINGFACE_API_KEY=hf_...`

### SAM.gov API Access

1. **Register at SAM.gov**
   - Visit [SAM.gov](https://sam.gov/content/entity-registration)
   - Create a free account

2. **Request API Access**
   - Navigate to the API section
   - Request access to the Opportunities API
   - Wait for approval (usually 1-2 business days)

3. **Configure API Key**
   - Add your SAM API key to `.env.local`
   - Set appropriate rate limits in configuration

## 🎯 Usage Guide

### Chat Interface

1. **Select LLM Provider**: Choose from OpenAI, Anthropic, or Hugging Face
2. **Configure API Key**: Click "Set API Key" in the sidebar
3. **Start Chatting**: Ask questions about government contracting
   - "Find me recent AI contracts over $1M"
   - "What are the trending NAICS codes this quarter?"
   - "Explain the differences between set-aside programs"

### Semantic Search

1. **Natural Language Queries**: Use conversational search terms
   - ✅ "Cybersecurity contracts for small businesses"
   - ✅ "Cloud infrastructure opportunities in Virginia"
   - ❌ "cyber AND security OR cloud"

2. **Apply Filters**: Refine results with:
   - Date ranges
   - Geographic locations
   - NAICS codes
   - Set-aside types
   - Contract values

3. **Save Favorites**: Star important opportunities for later review

### Document Upload

1. **Supported Formats**: PDF, CSV, TXT files up to 10MB
2. **Processing**: Files are automatically:
   - Text extracted and cleaned
   - Converted to embeddings
   - Indexed for semantic search
3. **Chat Integration**: Reference uploaded documents in conversations

### Forecasting

1. **Historical Analysis**: Review past 12 months of opportunities
2. **Trend Visualization**: Interactive charts showing:
   - Volume trends by month
   - Agency distribution
   - NAICS code patterns
3. **Predictive Insights**: AI-generated forecasts based on historical data

## 🧪 Testing

### Unit Tests
```bash
# Run all unit tests
npm test

# Watch mode for development
npm run test:watch

# Generate coverage report
npm test -- --coverage
```

### End-to-End Tests
```bash
# Install Playwright browsers
npx playwright install

# Run all e2e tests
npm run test:e2e

# Run tests in UI mode
npx playwright test --ui
```

### Test Coverage Goals
- **Unit Tests**: >90% coverage for utilities and components
- **Integration Tests**: API endpoints and state management
- **E2E Tests**: Critical user journeys and provider switching

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect Repository**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Login and deploy
   vercel login
   vercel --prod
   ```

2. **Environment Variables**
   - Add all `.env.local` variables in Vercel dashboard
   - Ensure API keys are properly configured

3. **Domain Configuration**
   - Set up custom domain in Vercel settings
   - Update `NEXT_PUBLIC_APP_URL` to production URL

### Netlify

1. **Build Settings**
   ```toml
   [build]
   command = "npm run build"
   publish = "out"
   ```

2. **Environment Variables**
   - Configure in Netlify dashboard
   - Enable environment variable inheritance

### Docker Deployment

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/out ./out
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "start"]
```

## ⚡ Performance Optimization

### Bundle Analysis
```bash
# Analyze bundle size
npm run analyze

# Check performance metrics
npm run lighthouse
```

### Optimization Techniques
- **Code Splitting**: Dynamic imports for large components
- **Image Optimization**: Next.js Image component with WebP
- **Caching**: API response caching with TTL
- **Tree Shaking**: Unused code elimination
- **Compression**: Gzip/Brotli compression for static assets

### Performance Targets
- **Lighthouse Score**: ≥95 for Performance, Accessibility, Best Practices
- **Bundle Size**: ≤1MB initial JavaScript load
- **First Contentful Paint**: ≤1.5s
- **Largest Contentful Paint**: ≤2.5s

## 🔒 Security

### Data Protection
- **API Key Encryption**: Client-side encryption using Web Crypto API
- **No Server Storage**: API keys never stored on server
- **Rate Limiting**: Built-in rate limiting for all endpoints
- **CORS Protection**: Strict origin validation

### Best Practices
- **Content Security Policy**: Prevents XSS attacks
- **HTTPS Only**: Force secure connections in production
- **Input Validation**: Comprehensive request validation
- **Error Handling**: No sensitive data in error messages

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow

1. **Fork & Clone**
   ```bash
   git clone https://github.com/your-username/opensam-ai-dashboard.git
   cd opensam-ai-dashboard
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make Changes**
   - Follow TypeScript strict mode
   - Add tests for new functionality
   - Update documentation as needed

4. **Test Your Changes**
   ```bash
   npm run test
   npm run test:e2e
   npm run lint
   ```

5. **Submit Pull Request**
   - Clear description of changes
   - Link to any related issues
   - Ensure all CI checks pass

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- [API Documentation](docs/api.md)
- [Component Library](docs/components.md)
- [Deployment Guide](docs/deployment.md)

### Community
- 💬 [Discord Server](https://discord.gg/opensam-ai)
- 🐛 [Issue Tracker](https://github.com/your-org/opensam-ai-dashboard/issues)
- 📧 [Email Support](mailto:support@opensam-ai.com)

### FAQ

**Q: Can I use this without SAM.gov API access?**
A: The application includes mock data for development, but production use requires a valid SAM.gov API key.

**Q: Which LLM provider gives the best results?**
A: All providers work well. OpenAI GPT-4 tends to give the most accurate government contracting advice, while Anthropic Claude excels at document analysis.

**Q: Is my API key secure?**
A: Yes, API keys are encrypted client-side and never transmitted to our servers in plain text.

**Q: Can I customize the color scheme?**
A: The application is designed specifically for black-and-white accessibility. Theme customization would require significant CSS modifications.

---

<div align="center">

**Built with ❤️ for the government contracting community**

[Website](https://opensam-ai.com) • [Documentation](https://docs.opensam-ai.com) • [Community](https://discord.gg/opensam-ai)

</div>
