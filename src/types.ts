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
  content: string;
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
  change: number;
  trend: 'up' | 'down' | 'neutral';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export type PPPStatus = 'Not Started' | 'Invited' | 'Onboarding Pending' | 'Approved & Connected' | 'API Key Needed';

export interface Dispensary {
  id: string;
  name: string;
  pppStatus: PPPStatus;
  location: string;
  contactPerson: string;
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
  dispensaryId?: string;
  requesterName: string;
  priority: 'High' | 'Medium' | 'Low';
  description: string;
  dateCreated: string;
  channel: SupportChannel;
  sentiment: Sentiment;
  aiSummary?: string;
}

export interface Product {
  id: string;
  nabis_sku_id?: string;
  nabis_product_id?: string;
  product_code: string;
  product_title: string;
  brand: string;
  product_type: string;
  size: string;
  size_grams: number;
  strain_name: string | null;
  strain_type: 'S' | 'H' | 'I' | null;
  available_quantity: number;
  unit_price: number;
  case_size: number;
  inventory_class: 'PRE_ROLL' | 'ACCESSORIES';
  is_active: boolean;
}

export interface ProposalCustomer {
  id: string;
  name: string;
  dba_name?: string;
  location?: string;
  created_at: string;
}

export interface ProposalLineItem {
  product_id: string;
  product_title: string;
  brand: string;
  strain_name: string;
  strain_type: string;
  size: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface SavedProposal {
  id: string;
  customer: ProposalCustomer;
  title: string;
  notes?: string;
  items: ProposalLineItem[];
  total_items: number;
  total_cost: number;
  created_at: string;
  status: 'draft' | 'submitted';
}

export interface FinanceMetric {
  id: string;
  name: string;
  category: string;
  amount: number;
  status: string;
  period: string;
  lastEdited: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  region: string;
  status: string;
  email: string;
  phone: string;
  lastEdited: string;
}

export interface DataEnvelope<T> {
  rows: T[];
  source: 'api' | 'fallback';
  warning?: string;
  lastRefreshed: string;
}
