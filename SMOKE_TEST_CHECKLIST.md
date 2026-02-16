# PICC Command Center – Smoke Test Checklist

## Auth Flow
- [ ] Signed-out state shows login form.
- [ ] Invalid password returns clear error and does not authenticate.
- [ ] Valid password authenticates and loads main workspace.
- [ ] Sign out clears session and returns to login screen.
- [ ] If auth env vars are missing/unavailable, UI shows actionable auth service message.

## Notion Query / Error Handling
- [ ] With valid Notion mapping, dashboards/modules load data successfully.
- [ ] If Notion query returns non-200, UI shows fallback/warning and remains usable.
- [ ] Error details from Notion query are surfaced (not generic silent failure).
- [ ] Pagination does not loop indefinitely (guarded).

## Empty + Loading States
- [ ] Dashboard, Service, Finance, Team, PPP, Sales all show loading indicators during fetch.
- [ ] Empty data sets show friendly empty-state copy (no blank screens).
- [ ] Sales CRM shows explicit error banner when CRM load fails.

## Large CRM List Performance
- [ ] Sales CRM remains responsive with large row counts.
- [ ] Typing in search remains smooth (deferred search path).
- [ ] Refresh completes without locking UI on errors.

## Build Gate
- [ ] `npm run build` passes locally.
