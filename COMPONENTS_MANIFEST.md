# Components Manifest

This document maps which components to use from the source repositories.

## Components to Create/Copy

### From Antigravity (Primary Source)
Copy these components from `/mnt/PICC Command Antigravity/Picc-command-center/components/`:

1. **NotionDocList.tsx** - Knowledge base UI
   - Fetch and display Notion pages
   - Create new pages
   - Sync with API

2. **AICopilot.tsx** - AI chat assistant
   - Floating chat widget
   - Message history
   - Gemini integration

3. **Settings.tsx** - Configuration panel
   - Notion integration setup
   - Database selection
   - Google Sheets configuration

4. **ServiceWorkspace.tsx** - Customer service center
   - Work order management
   - Case handling
   - Agent assist

5. **CustomerPortal.tsx** - External customer portal
   - Self-service knowledge base
   - Case tracking
   - Help center

6. **PPPOnboarding.tsx** - PPP workflow kanban
   - Dispensary status tracking
   - Workflow stages
   - Google Sheets sync

7. **AdminDashboard.tsx** - Admin analytics
   - Search analytics
   - Platform optimization suggestions
   - Gemini analysis

8. **WorkOrderSystem.tsx** - Ticket management
   - Work order table
   - Status filtering
   - Assignment

### From Joe's Repo (Proposal Features)
Copy these components from `/extracted/joes_repo/picc-platform-intranet-master/components/`:

1. **ProposalBuilder.tsx** - Main proposal UI
   - Tab navigation (Create/History)
   - Filter and product management
   - Inventory sync

2. **ProposalFilterBar.tsx** - Advanced filtering
   - Search
   - Brand/strain/size filters
   - Mobile-responsive

3. **ProposalProductGrid.tsx** - Product display
   - Grid layout
   - Pre-rolls and accessories sections
   - Product cards

4. **ProposalProductCard.tsx** - Individual product
   - Quantity input
   - Price display
   - Add to proposal

5. **ProposalSummary.tsx** - Cart/summary sidebar
   - Line item list
   - Total calculation
   - Export menu
   - Save/clear buttons

6. **ProposalHistory.tsx** - Saved proposals
   - Proposal list
   - Duplicate/delete/export
   - View details

7. **ProposalCustomerModal.tsx** - Add customer dialog
   - Name, DBA, location inputs
   - Form validation

## File Structure Reference

```
src/components/
├── Sidebar.tsx                    ✓ Created
├── Dashboard.tsx                  ✓ Created
├── NotionDocList.tsx              📋 Copy from Antigravity
├── AICopilot.tsx                  📋 Copy from Antigravity
├── Settings.tsx                   📋 Copy from Antigravity
├── ServiceWorkspace.tsx           📋 Copy from Antigravity
├── CustomerPortal.tsx             📋 Copy from Antigravity
├── PPPOnboarding.tsx              📋 Copy from Antigravity
├── AdminDashboard.tsx             📋 Copy from Antigravity
├── WorkOrderSystem.tsx            📋 Copy from Antigravity
├── ProposalBuilder.tsx            📋 Copy from Joe's repo
├── ProposalFilterBar.tsx          📋 Copy from Joe's repo
├── ProposalProductGrid.tsx        📋 Copy from Joe's repo
├── ProposalProductCard.tsx        📋 Copy from Joe's repo
├── ProposalSummary.tsx            📋 Copy from Joe's repo
├── ProposalHistory.tsx            📋 Copy from Joe's repo
└── ProposalCustomerModal.tsx      📋 Copy from Joe's repo
```

## Quick Copy Commands

From `/sessions/tender-hopeful-goodall/`:

```bash
# Copy Antigravity components
cp mnt/PICC\ Command\ Antigravity/Picc-command-center/components/*.tsx \
   picc-deploy/src/components/

# Copy Joe's proposal components (overwrite Dashboard.tsx from Antigravity)
cp extracted/joes_repo/picc-platform-intranet-master/components/Proposal*.tsx \
   picc-deploy/src/components/
```

## Notes

- All components are already compatible with the types.ts and constants.ts in picc-deploy
- Import paths will need to be updated to use relative imports like `../types` instead of `./types`
- Gemini and Notion services are already integrated
- Proposal export services are included
- The existing Sidebar and Dashboard components in picc-deploy can be replaced if you prefer the Antigravity versions

## Validation Checklist

After copying components:

- [ ] All TypeScript files compile without errors
- [ ] No missing imports (check for any `./components/` imports that should be `../types`)
- [ ] All services are properly imported
- [ ] No CSS/styling conflicts
- [ ] Run `npm run build` to verify production build succeeds
