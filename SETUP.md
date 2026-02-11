# PICC Platform Setup Guide

Complete guide to set up the production-ready Vercel deployment.

## Step 1: Complete Component Installation

The core infrastructure is ready. Now add the UI components:

```bash
cd /sessions/tender-hopeful-goodall/picc-deploy

# Copy all Antigravity components
cp ../mnt/PICC\ Command\ Antigravity/Picc-command-center/components/*.tsx src/components/

# Copy Joe's proposal components
cp ../extracted/joes_repo/picc-platform-intranet-master/components/Proposal*.tsx src/components/

# Remove duplicate Dashboard if needed
rm src/components/Dashboard.tsx  # The created one can be replaced
```

## Step 2: Create Component Index

Create `src/components/index.ts`:

```typescript
export { Sidebar } from './Sidebar';
export { Dashboard } from './Dashboard';
export { NotionDocList } from './NotionDocList';
export { AICopilot } from './AICopilot';
export { Settings } from './Settings';
export { ServiceWorkspace } from './ServiceWorkspace';
export { CustomerPortal } from './CustomerPortal';
export { PPPOnboarding } from './PPPOnboarding';
export { AdminDashboard } from './AdminDashboard';
export { WorkOrderSystem } from './WorkOrderSystem';
export { ProposalBuilder } from './ProposalBuilder';
export { ProposalFilterBar } from './ProposalFilterBar';
export { ProposalProductGrid } from './ProposalProductGrid';
export { ProposalProductCard } from './ProposalProductCard';
export { ProposalSummary } from './ProposalSummary';
export { ProposalHistory } from './ProposalHistory';
export { ProposalCustomerModal } from './ProposalCustomerModal';
```

## Step 3: Verify Build

```bash
npm install
npm run build
```

Should output:
```
✓ built in 2.45s
```

## Step 4: Local Testing

```bash
# Terminal 1: Start Vite dev server
npm run dev

# Terminal 2 (optional): Start Vercel Functions locally
vercel dev
```

Visit http://localhost:5173

Test:
- [ ] Dashboard loads
- [ ] Navigation works
- [ ] Settings > "Verify Server Connection" shows error (expected - no API yet)
- [ ] AI Copilot opens
- [ ] Proposal Builder tabs work

## Step 5: Deploy to Vercel

### Option A: Automatic (Recommended)

1. Push to GitHub
2. Go to https://vercel.com/new
3. Import repository
4. Add environment variables:
   - `NOTION_API_KEY` = your integration token
   - `GEMINI_API_KEY` = your API key
5. Click Deploy

### Option B: CLI

```bash
npm install -g vercel
vercel login
vercel link
vercel env add NOTION_API_KEY
# Paste your Notion integration token
vercel env add GEMINI_API_KEY
# Paste your Gemini API key
vercel
```

## Step 6: Verify Production Deployment

1. Visit your Vercel deployment URL
2. Check that it loads (no build errors)
3. Open browser Developer Tools (F12)
4. Go to Settings tab
5. Click "Verify Server Connection"
   - Should show "Connected" if API keys are correct
   - Should show specific error if API keys missing
6. Select a Notion database and save
7. Go to Wiki tab - should show your Notion pages
8. Try AI Copilot - should respond

## Troubleshooting

### Build fails: "Cannot find module"

**Solution**: Check that all components are in `src/components/` and imports are relative:
```typescript
// ✓ Correct
import { NotionPage } from '../types';

// ✗ Wrong
import { NotionPage } from './types';
```

### "NOTION_API_KEY not set" error

**Solution**: Verify in Vercel dashboard:
1. Go to Project Settings > Environment Variables
2. Confirm `NOTION_API_KEY` is set
3. Redeploy (push new commit or click "Redeploy" button)

### "Missing Notion API Key" on Vercel but works locally

**Solution**: Environment variables don't take effect immediately:
1. Add variables to Vercel
2. Trigger new deployment (git push)
3. Check function logs in Vercel dashboard

### Proposal exports fail

**Ensure dependencies installed**:
```bash
npm list jspdf xlsx
```

Both should be listed. If not:
```bash
npm install jspdf xlsx --save
```

### Components not updating

**Clear build cache**:
```bash
rm -rf dist .next
npm run build
```

## Deployment Environment Variables

In Vercel dashboard → Settings → Environment Variables:

| Variable | Value | Notes |
|----------|-------|-------|
| `NOTION_API_KEY` | Your integration secret | From https://www.notion.com/my-integrations |
| `GEMINI_API_KEY` | Your API key | From https://ai.google.dev |

## API Endpoints Created

After deployment, you have:

- `https://your-domain/api/notion/*` - Notion proxy
- `https://your-domain/api/gemini` - Gemini AI endpoint

These are automatically secured because:
- API keys only on server
- Accessed only from your domain
- Frontend never sees sensitive credentials

## Monitoring

**Vercel Dashboard checks**:

1. **Functions** tab
   - Green checkmarks = all healthy
   - Click endpoint to see logs
   - Check for 500 errors

2. **Analytics** tab
   - Monitor response times
   - Check error rates

3. **Deployments** tab
   - History of all deployments
   - Quick rollback if needed

## Rollback

If something breaks:

```bash
# List recent deployments
vercel list

# Rollback to specific deployment
vercel rollback <deployment-url>
```

Or in Vercel dashboard: Deployments > Find broken version > click "..." > Rollback

## Next Steps

1. Set up custom domain (optional)
2. Configure CI/CD for automatic deployments
3. Set up error monitoring (e.g., Sentry)
4. Create team access (Pro tier)
5. Set up analytics dashboard

## Support

- **Vercel Docs**: https://vercel.com/docs
- **Notion API**: https://developers.notion.com
- **Gemini API**: https://ai.google.dev/docs
- **Discord Community**: https://discord.gg/vercel
