export enum UserRole {
  SALES_OPS = 'Sales Ops',
  SALES_REP = 'Sales Rep',
  AMBASSADOR = 'Brand Ambassador',
  FINANCE = 'Finance',
  ADMIN = 'Platform Admin',
}

export type SyncStatus = 'synced' | 'pending' | 'error' | 'local_only';

export interface NotionPage {
  id: string;
  title: string;
  coverImage?: string;
  icon?: string;
  category: 'Policy' | 'Sales Asset' | 'Financial Report' | 'Event' | 'General' | 'Meeting Notes';
  lastEdited: string;
  content: string; // Simplified content for mock
  tags: string[];
  syncStatus?: SyncStatus;
  notionUrl?: string;
}

export interface NotionDatabase {
  id: string;
  title: string;
  icon?: string;
  url: string;
  lastEdited: string;
}

export interface NotionBot {
  name: string;
  icon: string;
  workspaceName?: string;
}

export interface SalesMetric {
  name: string;
  value: number;
  change: number; // Percentage
  trend: 'up' | 'down' | 'neutral';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

// Work Order & CRM Types
export type PPPStatus = 'Not Started' | 'Invited' | 'Onboarding Pending' | 'Approved & Connected' | 'API Key Needed';

export interface Dispensary {
  id: string;
  name: string;
  pppStatus: PPPStatus;
  location: string;
  contactPerson: string;
  // Extended fields from CSV
  licenseNumber?: string;
  totalOrders?: number;
  totalOrderedAmount?: string;
  lastOrderDate?: string;
  creditStatus?: string;
  salesRep?: string;
  email?: string;
  phone?: string;
}

export type WorkOrderType = 'PPP Proposal' | 'PPP Onboarding' | 'General Order' | 'Support Case' | 'HR Request';
export type WorkOrderStatus = 'New' | 'In Progress' | 'Completed' | 'Archived';
export type SupportChannel = 'Email' | 'Slack' | 'Phone' | 'SMS' | 'Portal' | 'Instagram';
export type Sentiment = 'Positive' | 'Neutral' | 'Negative';

export interface WorkOrder {
  id: string;
  ticketNumber: string;
  title: string;
  type: WorkOrderType;
  status: WorkOrderStatus;
  assignee?: UserRole | 'Unassigned'; 
  dispensaryId?: string; // Optional now as HR requests might not have a dispensary
  requesterName: string;
  priority: 'High' | 'Medium' | 'Low';
  description: string;
  dateCreated: string;
  channel: SupportChannel;
  sentiment: Sentiment;
  aiSummary?: string; // For Agent Assist
}
