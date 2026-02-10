import { NotionPage, UserRole, SalesMetric, Dispensary, WorkOrder } from './types';

export const APP_NAME = "PICC Connect";

// Simulating a Notion Database response
export const MOCK_NOTION_PAGES: NotionPage[] = [
  {
    id: '1',
    title: 'Q3 2024 Sales Playbook',
    icon: '📘',
    category: 'Sales Asset',
    lastEdited: '2023-10-24',
    content: 'Focus on enterprise clients. Key value propositions: Scalability, AI integration, and 24/7 support. Discount capabilities: Up to 15% without approval.',
    tags: ['Sales', 'Q3', 'Strategy'],
  },
  {
    id: '2',
    title: 'Expense Reimbursement Policy v2',
    icon: '💸',
    category: 'Policy',
    lastEdited: '2023-09-15',
    content: 'All expenses over $50 require a receipt. Travel meals capped at $75/day. Submit via Finance portal by the 25th of each month.',
    tags: ['Finance', 'HR', 'Policy'],
  },
  {
    id: '3',
    title: 'Brand Ambassador Guidelines: Winter Campaign',
    icon: '❄️',
    category: 'Event',
    lastEdited: '2023-11-01',
    content: 'Wear branded hoodies. Focus on "Warmth & Tech" messaging. Social media tags: #PICCWinter #TechLife. Target demo: Students and young professionals.',
    tags: ['Marketing', 'Events', 'Ambassadors'],
  },
  {
    id: '4',
    title: 'Commission Structure 2024',
    icon: '💰',
    category: 'Financial Report',
    lastEdited: '2023-10-30',
    content: 'Base rate: 5%. Accelerator: 10% after $100k revenue. President\'s Club threshold: $500k ARR.',
    tags: ['Finance', 'Sales', 'Comp'],
  },
  {
    id: '5',
    title: 'PICC Platform Brand Assets',
    icon: '🎨',
    category: 'Sales Asset',
    lastEdited: '2023-08-20',
    content: 'Link to Google Drive for logos, fonts (Inter), and slide templates. Do not stretch the logo.',
    tags: ['Brand', 'Design'],
  },
  // New Mock Data for Admin Analysis
  {
    id: '6',
    title: 'Weekly Sales Sync Notes - Oct 12',
    icon: '📝',
    category: 'Meeting Notes',
    lastEdited: '2023-10-12',
    content: 'Team raised concerns about finding the "Commission Structure". It takes 5 clicks to navigate from the home dashboard. Can we make a shortcut?',
    tags: ['Sales', 'Feedback', 'Meeting'],
  },
  {
    id: '7',
    title: 'HR Feedback Box Results',
    icon: '🗳️',
    category: 'General',
    lastEdited: '2023-10-15',
    content: 'Multiple employees asked for a consolidated "Wellness Hub". They want to see the Gym perks and Mental Health benefits in one place, not scattered in policies.',
    tags: ['HR', 'Feedback'],
  },
  {
    id: '8',
    title: 'Support Team Retro',
    icon: '🛑',
    category: 'Meeting Notes',
    lastEdited: '2023-10-20',
    content: 'Bottleneck identified: PPP Onboarding status is often unclear. Sales Ops keeps asking Support for status updates. We need a shared view.',
    tags: ['Support', 'Operations'],
  }
];

export const SALES_METRICS: Record<UserRole, SalesMetric[]> = {
  [UserRole.SALES_OPS]: [
    { name: 'Total Pipeline', value: 4500000, change: 12, trend: 'up' },
    { name: 'Win Rate', value: 34, change: -2, trend: 'down' },
    { name: 'Avg Deal Size', value: 25000, change: 5, trend: 'up' },
  ],
  [UserRole.SALES_REP]: [
    { name: 'My Quota Attainment', value: 85, change: 10, trend: 'up' },
    { name: 'Open Opps', value: 12, change: 0, trend: 'neutral' },
    { name: 'Commissions Est.', value: 4500, change: 15, trend: 'up' },
  ],
  [UserRole.AMBASSADOR]: [
    { name: 'Leads Generated', value: 145, change: 25, trend: 'up' },
    { name: 'Event Check-ins', value: 320, change: 8, trend: 'up' },
    { name: 'Social Engagements', value: 15000, change: 40, trend: 'up' },
  ],
  [UserRole.FINANCE]: [
    { name: 'Monthly Revenue', value: 1200000, change: 8, trend: 'up' },
    { name: 'OpEx', value: 450000, change: -5, trend: 'up' },
    { name: 'Net Margin', value: 22, change: 2, trend: 'up' },
  ],
  [UserRole.ADMIN]: [
    { name: 'System Uptime', value: 99.9, change: 0.1, trend: 'up' },
    { name: 'Active Users', value: 142, change: 12, trend: 'up' },
    { name: 'Knowledge Base Queries', value: 1540, change: 25, trend: 'up' },
  ],
};

export const MOCK_DISPENSARIES: Dispensary[] = [
  { id: 'd1', name: 'Green Leaf Wellness', pppStatus: 'Not Started', location: 'Denver, CO', contactPerson: 'Mike Ross' },
  { id: 'd2', name: 'Urban Herb', pppStatus: 'API Key Needed', location: 'Seattle, WA', contactPerson: 'Jessica Pearson' },
  { id: 'd3', name: 'Nature Cure', pppStatus: 'Approved & Connected', location: 'Portland, OR', contactPerson: 'Harvey Specter' },
  { id: 'd4', name: 'High Altitude', pppStatus: 'Invited', location: 'Boulder, CO', contactPerson: 'Louis Litt' },
  { id: 'd5', name: 'Zen Garden', pppStatus: 'Onboarding Pending', location: 'San Francisco, CA', contactPerson: 'Donna Paulsen' },
  { id: 'd6', name: 'Emerald City Meds', pppStatus: 'API Key Needed', location: 'Seattle, WA', contactPerson: 'Rachel Zane' },
  { id: 'd7', name: 'The Apothecary', pppStatus: 'Not Started', location: 'Austin, TX', contactPerson: 'Alex Williams' },
];

export const MOCK_WORK_ORDERS: WorkOrder[] = [
  { 
    id: 'wo1', 
    ticketNumber: 'WO-1024', 
    title: 'Setup PPP Integration', 
    type: 'PPP Onboarding', 
    status: 'New', 
    dispensaryId: 'd2', 
    requesterName: 'Jessica Pearson',
    priority: 'High', 
    description: 'Need to get API key from owner. They are unresponsive to emails.', 
    dateCreated: '2023-10-25', 
    assignee: UserRole.SALES_OPS,
    channel: 'Email',
    sentiment: 'Neutral',
    aiSummary: 'Customer is waiting on instructions. Recommend resending the API Key guide.'
  },
  { 
    id: 'wo2', 
    ticketNumber: 'WO-1025', 
    title: 'Restock Edibles Display', 
    type: 'General Order', 
    status: 'In Progress', 
    dispensaryId: 'd1', 
    requesterName: 'Mike Ross',
    priority: 'Medium', 
    description: 'Client requested marketing materials refresh for the front counter.', 
    dateCreated: '2023-10-26', 
    assignee: UserRole.AMBASSADOR,
    channel: 'SMS',
    sentiment: 'Positive',
    aiSummary: 'Routine request. Check inventory for "Summer Edibles" kit.'
  },
  { 
    id: 'wo3', 
    ticketNumber: 'WO-1021', 
    title: 'Q4 Sales Proposal', 
    type: 'PPP Proposal', 
    status: 'Completed', 
    dispensaryId: 'd3', 
    requesterName: 'Harvey Specter',
    priority: 'High', 
    description: 'Sent proposal for holiday bundle including new tiers.', 
    dateCreated: '2023-10-20', 
    assignee: UserRole.SALES_REP,
    channel: 'Phone',
    sentiment: 'Positive',
    aiSummary: 'Deal closed verbally. Proposal document serves as confirmation.'
  },
  { 
    id: 'wo4', 
    ticketNumber: 'WO-1026', 
    title: 'Fix API Connection', 
    type: 'Support Case', 
    status: 'New', 
    dispensaryId: 'd6', 
    requesterName: 'Rachel Zane',
    priority: 'High', 
    description: 'API Key provided is invalid. Need to coordinate call with IT.', 
    dateCreated: '2023-10-27', 
    assignee: 'Unassigned',
    channel: 'Slack',
    sentiment: 'Negative',
    aiSummary: 'Customer is frustrated due to downtime. Suggest immediate escalation to Tech Support.'
  },
  { 
    id: 'wo5', 
    ticketNumber: 'WO-1027', 
    title: 'Initial Outreach', 
    type: 'PPP Proposal', 
    status: 'New', 
    dispensaryId: 'd7', 
    requesterName: 'Alex Williams',
    priority: 'Low', 
    description: 'Cold call scheduled for next Tuesday.', 
    dateCreated: '2023-10-27', 
    assignee: 'Unassigned',
    channel: 'Phone',
    sentiment: 'Neutral',
    aiSummary: 'Prospecting stage. Ensure script #4 is prepared.'
  },
  {
    id: 'wo6',
    ticketNumber: 'HR-501',
    title: 'Payroll Correction Request',
    type: 'HR Request',
    status: 'New',
    requesterName: 'Internal Employee',
    priority: 'Medium',
    description: 'Missing overtime hours from last pay period.',
    dateCreated: '2023-10-28',
    assignee: UserRole.FINANCE,
    channel: 'Portal',
    sentiment: 'Neutral',
    aiSummary: 'Check Timesheet ID #9982 against approved logs.'
  }
];
