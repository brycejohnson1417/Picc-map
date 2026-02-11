# Vercel Deployment Checklist

## Pre-Deployment

- [ ] All environment variables configured in Vercel dashboard:
  - [ ] `NOTION_API_KEY`
  - [ ] `GEMINI_API_KEY`
- [ ] Notion integration created and databases shared with integration
- [ ] Gemini API enabled in Google Cloud console
- [ ] Repository pushed to GitHub
- [ ] All dependencies listed in package.json

## Vercel Setup

- [ ] Project linked to Vercel
- [ ] Environment variables added to production environment
- [ ] Build command set to: `npm run build`
- [ ] Output directory set to: `dist`
- [ ] No build errors in deployment logs

## Post-Deployment

- [ ] Navigate to deployment URL
- [ ] Dashboard loads without errors
- [ ] Notion Wiki section works
  - [ ] Click "Verify Server Connection" in Settings
  - [ ] Database selection appears
  - [ ] Select a database and save
- [ ] AI Copilot responds to messages
- [ ] Proposal Builder loads
- [ ] No 404 errors on route navigation
- [ ] Mock data shows when APIs unavailable
- [ ] Export functionality works (PDF, Excel, CSV)

## Monitoring

- [ ] Check Vercel Analytics dashboard
- [ ] Monitor function logs for errors
- [ ] Set up alerts for failed deployments
- [ ] Review error logs weekly

## Production Best Practices

- [ ] Enable HTTPS (default on Vercel)
- [ ] Set up custom domain (optional)
- [ ] Configure CI/CD for auto-deployment on pushes
- [ ] Set up branch protection rules on GitHub
- [ ] Document any custom environment variables for team
- [ ] Create runbook for common issues

## Security Review

- [ ] API keys not exposed in code
- [ ] .env files in .gitignore
- [ ] Only Vercel can access sensitive credentials
- [ ] CORS configured if needed
- [ ] Rate limiting considered for public endpoints
- [ ] Input validation on all API endpoints
