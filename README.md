# PICC Platform Intranet - Vercel Deployment

Production-ready PICC Command Center application built with React, TypeScript, Vite, and Vercel serverless functions.

## Architecture

### Frontend (React + Vite)
- **Location**: `/src`
- **Components**: Modular React components with TypeScript
- **Styling**: Tailwind CSS
- **State**: React hooks with localStorage for persistence
- **API Integration**: Fetch API calls to `/api` routes

### Backend (Vercel Serverless Functions)
- **Location**: `/api`
- **Notion Proxy**: `/api/notion/[...path].ts` - Forwards requests to Notion API
- **Gemini AI**: `/api/gemini.ts` - AI-powered assistant
- **Inventory**: `/api/inventory.ts` (optional) - Live inventory sync
- **Sheets**: `/api/sheets/[sheetId]/values/[range]` (optional) - Google Sheets integration

## Environment Variables

Required for Vercel deployment:

```env
NOTION_API_KEY=your_notion_integration_secret_token
GEMINI_API_KEY=your_gemini_api_key
```

### Getting API Keys

#### Notion Integration Token
1. Go to https://www.notion.com/my-integrations
2. Create a new integration
3. Copy the "Internal Integration Token"
4. Share databases with your integration in Notion
5. Set as `NOTION_API_KEY` in Vercel

#### Gemini API Key
1. Go to https://ai.google.dev
2. Create a project in Google Cloud
3. Enable the Generative AI API
4. Create an API key
5. Set as `GEMINI_API_KEY` in Vercel

## Deployment to Vercel

### One-Click Deploy (Recommended)

1. Fork this repository to your GitHub
2. Go to https://vercel.com and sign in
3. Click "New Project"
4. Import your repository
5. In "Environment Variables", add:
   - `NOTION_API_KEY`
   - `GEMINI_API_KEY`
6. Click "Deploy"

### Manual Deployment

```bash
npm install -g vercel
vercel link
vercel env add NOTION_API_KEY
vercel env add GEMINI_API_KEY
vercel
```

## Local Development

```bash
# Install dependencies
npm install

# Start development server (with API proxy)
npm run dev

# This runs:
# - Frontend on http://localhost:5173
# - API proxy configured in vite.config.ts

# For testing API endpoints locally, start a local server or use Vercel CLI:
vercel dev
```

## Project Structure

```
picc-deploy/
├── src/
│   ├── components/          # React components
│   ├── services/            # API and business logic
│   │   ├── notionService.ts
│   │   ├── geminiService.ts
│   │   ├── inventoryService.ts
│   │   ├── proposalExportService.ts
│   │   └── sheetsService.ts
│   ├── App.tsx              # Main app component
│   ├── types.ts             # TypeScript interfaces
│   ├── constants.ts         # Mock data and constants
│   └── index.tsx            # React entry point
├── api/
│   ├── notion/
│   │   └── [...path].ts     # Notion API proxy
│   ├── gemini.ts            # Gemini AI endpoint
│   └── (optional additional endpoints)
├── index.html               # HTML entry point
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript config
├── package.json
├── vercel.json              # Vercel routing config
└── README.md

```

## Key Features

### 1. **Notion Integration**
- Read and write pages from any connected Notion database
- Search databases automatically
- Create new pages from the interface
- No API keys exposed to frontend

### 2. **AI Copilot**
- Chat-based assistant powered by Gemini 2.5 Flash
- Context-aware responses about workspace
- Serverless execution with secure API key storage

### 3. **Proposal Builder**
- Create and manage sales proposals
- Product inventory management
- Export to PDF, Excel, CSV
- Copy to clipboard functionality
- Customer management

### 4. **Multi-Role Dashboard**
- Role-based views (Sales Rep, Sales Ops, Admin, Ambassador, Finance)
- Work order tracking
- PPP onboarding workflow
- Service center integration

### 5. **Knowledge Base**
- Notion integration for documentation
- Search and filter capabilities
- Create new pages directly

## Configuration Notes

### Notion Database Setup
1. Create a Notion workspace
2. Create a database with these properties:
   - `Name` (title)
   - `Category` (select)
   - `Tags` (multi-select)
3. Create an integration and share the database with it
4. In Settings, paste the database ID and verify connection

### Database Configuration (Vercel)
Navigate to Settings > Integration Setup:
- Select your Notion database
- Click "Save Configuration"
- Database ID is stored in browser localStorage (user-specific)

### Offline Fallback
If Notion is unavailable, the app gracefully falls back to mock data. This allows continued productivity while connectivity is restored.

## Security Best Practices

1. **API Keys**: Never commit API keys to git. Use Vercel environment variables only.
2. **Frontend**: No sensitive credentials in client-side code
3. **Proxy Pattern**: All external API calls go through Vercel serverless functions
4. **Notion Token**: Stored only on Vercel's secure environment
5. **Gemini Key**: Stored only on Vercel's secure environment

## Troubleshooting

### "Missing Notion API Key" Error
- Check that `NOTION_API_KEY` is set in Vercel environment variables
- Verify the token is valid and not expired
- Ensure the integration has access to your databases

### Gemini API Not Working
- Verify `GEMINI_API_KEY` is set in Vercel environment variables
- Check that Generative AI API is enabled in Google Cloud
- Ensure the API key has Generative AI API permissions

### Proposal Export Issues
- jsPDF and xlsx are included in dependencies
- Browser must support file download API
- Check console for specific export errors

## Performance Optimization

- **Vite**: Fast builds with ES modules
- **Code Splitting**: Routes are lazy-loaded
- **Caching**: API responses cached where possible
- **Compression**: Vercel handles gzip/brotli
- **Tree-shaking**: Unused code removed in production

## Monitoring

Check Vercel Dashboard for:
- Function execution logs
- Environment variable status
- Deployment history
- Edge network performance

## Support & Documentation

- **Notion API Docs**: https://developers.notion.com
- **Gemini API Docs**: https://ai.google.dev/docs
- **Vite Documentation**: https://vitejs.dev
- **Vercel Documentation**: https://vercel.com/docs
