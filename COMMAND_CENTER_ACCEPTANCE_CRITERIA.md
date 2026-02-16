# Command Center v3 Acceptance Criteria

This spec defines implementation-ready acceptance criteria for a role-based operating UI over Notion/Sheets data. It is not a generic analytics dashboard.

## Dashboard
**Objective**
- Present role-specific operational priorities and queues with clear execution signals.

**Required behaviors**
- Show role-tailored command surfaces (Sales Ops, Sales Rep, BA, Finance, Admin).
- Surface operational queues (scheduling, reports, work orders, risks) with warning/fallback visibility.
- Include referral/sample pipeline visibility with queue + counts.

**Acceptance criteria**
- [ ] Dashboard renders role-specific metrics and queue cards from live/fallback data.
- [ ] Warnings are visible when mapped databases are missing or in fallback mode.
- [ ] Referral/sample pipeline shows counts and a prioritized queue from CRM keyword heuristics.
- [ ] Refresh action updates all dashboard modules without hard reload.

**Non-goals**
- Building a BI-style dashboard with arbitrary chart builders.
- Replacing Notion schema management workflows.

## Sales CRM
**Objective**
- Provide frontline-friendly CRM execution without requiring direct Notion edits for common actions.

**Required behaviors**
- Preserve existing filters, presets, rep focus, bulk actions, and keyboard navigation.
- Keep deterministic “My Stores” behavior and PICC-locked mapping behavior.
- Add referral/sample pipeline visibility as first-class operational context.

**Acceptance criteria**
- [ ] CRM table/detail interactions remain intact (selection, keyboard nav, bulk copy/open).
- [ ] Presets and column visibility persist in local storage as before.
- [ ] Referral/sample panel displays counts and queue items derived from CRM property heuristics.
- [ ] Queue items can be opened/inspected directly from CRM context.

**Non-goals**
- Redesigning core CRM IA or replacing existing filter architecture.
- Introducing schema-breaking writes back to Notion.

## BA Ops
**Objective**
- Support BA and Sales handoff flow: scheduling, execution, report/credit follow-through.

**Required behaviors**
- Track vendor-day scheduling pressure and report backlog.
- Highlight overdue follow-ups and stale execution gaps.
- Keep owner visibility for cross-role handoffs.

**Acceptance criteria**
- [ ] Needs Scheduling / In Progress / Awaiting Reports queues are visible.
- [ ] Overdue follow-ups are clearly surfaced as priority work.
- [ ] Queue items include owner/context metadata for handoff clarity.
- [ ] Role views can isolate rep-specific execution when required.

**Non-goals**
- Replacing event planning tools or calendar systems.
- Building full incentive/commission modeling in BA Ops.

## Service Center (Work Orders)
**Objective**
- Operate real work orders with dispensary/requester context, follow-up tracking, and sign-off closure.

**Required behaviors**
- Show operator-first queue with urgency/deadline prioritization.
- Support clear lanes: Follow-Ups, Work Orders, Awaiting Sign-Off, My Queue.
- Include quick action links (open in Notion when available).
- Keep resilient fallback behavior when live mappings fail.

**Acceptance criteria**
- [ ] Work order model includes due date, follow-up reason, sign-off fields, assignee context, and Notion URL.
- [ ] Service data loader maps these fields from Notion using robust hint-based reads with safe defaults.
- [ ] Service workspace shows metric cards: Open Work Orders, Follow-Ups Due, Awaiting Sign-Off, My Queue.
- [ ] Queue cards display dispensary/requester context, due date, follow-up reason, sign-off state, and action link.
- [ ] Empty/error/fallback states remain user-readable and non-blocking.

**Non-goals**
- Implementing full SLA engine automation.
- Replacing ticketing integrations outside current Notion/Sheets scope.

## Finance
**Objective**
- Provide actionable financial exception view tied to operational execution.

**Required behaviors**
- Load finance rows with robust category/amount mapping.
- Surface pending exposure and high-value pending items.
- Keep fallback mode explicit when mappings are missing.

**Acceptance criteria**
- [ ] Revenue, expenses, net, and pending exposure are computed and displayed.
- [ ] Pending high-value list is visible and prioritized.
- [ ] Finance module remains functional when CRM/other modules degrade.

**Non-goals**
- Full accounting system replacement.
- Tax/compliance workflows.

## Referral/Sample Pipeline
**Objective**
- Make referral/sample/trial-box flow visible as a cross-role queue.

**Required behaviors**
- Derive pipeline from existing CRM properties using keyword heuristics.
- Show counts and queue state (pending/active/closed) without schema migration.
- Keep this view available in CRM and command-center contexts.

**Acceptance criteria**
- [ ] Heuristics detect referral/sample rows using terms like referral, sample, trial box, pending referral.
- [ ] Pipeline counts are displayed for referral-tagged, sample-tagged, and pending queue.
- [ ] Queue is prioritized for operational follow-through and is not hidden behind advanced filters.
- [ ] Existing CRM behaviors remain intact after pipeline enhancements.

**Non-goals**
- Introducing a new dedicated Notion database solely for referral/sample tracking.
- ML-based classification beyond deterministic keyword heuristics.
