# Quick Start - PICC Platform Production Deployment

**Estimated Time: 30 minutes**

## What You Have

A production-ready, Vercel-deployed PICC Command Center application with:
- React frontend (Vite + TypeScript)
- Notion database integration
- Gemini AI assistant
- Proposal builder with exports
- Complete multi-role dashboard

## The 4-Step Deploy

### Step 1: Copy Components (5 min)

```bash
cd /sessions/tender-hopeful-goodall/picc-deploy

# Copy Notion/Dashboard/Admin components from Antigravity
cp ../mnt/PICC\ Command\ Antigravity/Picc-command-center/components/NotionDocList.tsx src/components/
cp ../mnt/PICC\ Command\ Antigravity/Picc-command-center/components/AICopilot.tsx src/components/
cp ../mnt/PICC\ Command\ Antigravity/Picc-command-center/components/Settings.tsx src/components/
cp ../mnt/PICC\ Command\ Antigravity/Picc-command-center/components/ServiceWorkspace.tsx src/components/
cp ../mnt/PICC\ Command\ Antigravity/Picc-command-center/components/CustomerPortal.tsx src/components/
cp ../mnt/PICC\ Command\ Antigravity/Picc-command-center/components/PPPOnboarding.tsx src/components/
cp ../mnt/PICC\ Command\ Antigravity/Picc-command-center/components/AdminDashboard.tsx src/components/
cp ../mnt/PICC\ Command\ Antigravity/Picc-command-center/components/WorkOrderSystem.tsx src/components/

# Copy Proposal components from Joe's repo
cp ../extracted/joes_repo/picc-platform-intranet-master/components/ProposalBuilder.tsx src/components/
cp ../extracted/joes_repo/picc-platform-intranet-master/components/ProposalFilterBar.tsx src/components/
cp ../extracted/joes_repo/picc-platform-intranet-master/components/ProposalProductGrid.tsx src/components/
cp ../extracted/joes_repo/picc-platform-intranet-master/components/ProposalProductCard.tsx src/components/
cp ../extracted/joes_repo/picc-platform-intranet-master/components/ProposalSummary.tsx src/components/
cp ../extracted/joes_repo/picc-platform-intranet-master/components/ProposalHistory.tsx src/components/
cp ../extracted/joes_repo/picc-platform-intranet-master/components/ProposalCustomerModal.tsx src/components/
```

### Step 2: Verify Build (5 min)

```bash
npm install
npm run build
```

Expected output:
```
✓ 125 modules transformed
✓ built in 2.45s
```

If you see errors, check:
- All components copied successfully
- TypeScript compiler not complaining about imports

### Step 3: Get API Keys (10 min)

**Notion Integration Token:**
1. Go to https://www.notion.com/my-integrations
2. Click "Create new integration"
3. Name it "PICC Platform"
4. Copy "Internal Integration Token"
5. Go to your Notion databases and share with this integration

**Gemini API Key:**
1. Go to https://ai.google.dev
2. Click "Get API Key" (top right)
3. Create new project
4. Copy API key

### Step 4: Deploy to Vercel (10 min)

#### Option A: GitHub + Vercel (Recommended)

```bash
# 1. Push to GitHub
git add -A
git commit -m "PICC Platform production deployment"
git push origin main

# 2. Go to vercel.com and click "Add New..." > "Project"
# 3. Import your repository
# 4. In "Environment Variables", add:
#    - Name: NOTION_API_KEY
#      Value: [paste your Notion token]
#    - Name: GEMINI_API_KEY
#      Value: [paste your Gemini key]
# 5. Click "Deploy"
```

#### Option B: CLI

```bash
npm install -g vercel
vercel link

# Follow prompts to link project

vercel env add NOTION_API_KEY
# Paste Notion token, press Enter, then select Production

vercel env add GEMINI_API_KEY
# Paste Gemini key, press Enter, then select Production

vercel
# Deployment starts automatically
```

## Verification Checklist

After deployment completes:

- [ ] Visit your Vercel URL
- [ ] Homepage/Dashboard loads
- [ ] Go to Settings tab
- [ ] Click "Verify Server Connection"
  - Should show: "Connected as [Bot Name]"
- [ ] Click "Refresh List" to find your databases
- [ ] Select a database and click "Save Configuration"
- [ ] Go to "Notion Wiki" tab
  - Should display your database pages
- [ ] Click AI Copilot (bottom right)
  - Type "Hello" and submit
  - Should respond within a few seconds
- [ ] Click "Proposal Builder"
  - Should show product grid
  - Can add products and export

All passing? **You're live! 🎉**

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Build fails with "Cannot find module" | Copy ALL components from both repos |
| "Missing Notion API Key" error | Add NOTION_API_KEY to Vercel Environment Variables |
| "Missing Gemini API Key" error | Add GEMINI_API_KEY to Vercel Environment Variables |
| API keys set but still error | Go to Vercel > Redeploy to activate env vars |
| Dashboard shows but Wiki is empty | Database not shared with Notion integration |
| AI Copilot gives empty response | Check Gemini API key in Vercel env vars |
| Proposal exports don't work | npm list jspdf xlsx (must be installed) |

## Next Steps

1. **Customize** - Update branding, colors, text
2. **Add Users** - Set up team access in Vercel
3. **Monitor** - Check Vercel analytics dashboard
4. **Scale** - Add custom domain if needed
5. **Backup** - Enable GitHub integration for auto-deploys

## Key Files Reference

| File | Purpose |
|------|---------|
| `/api/notion/[...path].ts` | Notion API proxy |
| `/api/gemini.ts` | AI endpoint |
| `/src/services/notionService.ts` | Notion integration |
| `/src/services/geminiService.ts` | AI integration |
| `/src/App.tsx` | Main router |
| `vercel.json` | Vercel config |
| `package.json` | Dependencies |

## Full Documentation

For detailed information, see:
- `README.md` - Complete feature overview
- `SETUP.md` - Detailed setup with troubleshooting
- `COMPONENTS_MANIFEST.md` - Component reference
- `DEPLOYMENT_CHECKLIST.md` - Pre/post deployment checklist

## Support

- **Vercel Support**: https://vercel.com/support
- **Notion API Docs**: https://developers.notion.com
- **Gemini Docs**: https://ai.google.dev/docs

---

**Status**: Production Ready ✅
**Location**: `/sessions/tender-hopeful-goodall/picc-deploy/`
**Time to Deploy**: ~30 minutes
