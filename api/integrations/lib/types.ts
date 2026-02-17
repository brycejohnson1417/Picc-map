export type IntegrationSourceType = 'notion' | 'sheets';

export type IntegrationModuleKey =
  | 'wiki'
  | 'ppp_onboarding'
  | 'work_orders'
  | 'crm'
  | 'vendor_days';

export type SyncStatus = 'idle' | 'running' | 'success' | 'error' | 'backoff';

export interface IntegrationSource {
  id: string;
  type: IntegrationSourceType;
  module: IntegrationModuleKey;
  name: string;
  targetId: string | null;
  settings: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationMapping {
  id: string;
  sourceId: string;
  module: IntegrationModuleKey;
  fieldMap: Record<string, string>;
  transformRules: Record<string, unknown>;
  isActive: boolean;
}

export interface SyncCheckpoint {
  id: string;
  sourceId: string;
  module: IntegrationModuleKey;
  cursor: string | null;
  checksum: string | null;
  lastSyncedAt: string | null;
  lastSyncStatus: SyncStatus;
  meta: Record<string, unknown>;
}

export interface NormalizedEntity {
  id: string;
  sourceId: string;
  module: IntegrationModuleKey;
  sourceRecordId: string;
  canonical: Record<string, unknown>;
  sourceVersion: string | null;
  sourceUpdatedAt: string | null;
  checksum: string | null;
  lastSeenAt: string;
  updatedAt: string;
}

export interface SyncJob {
  id: string;
  sourceId: string;
  module: IntegrationModuleKey;
  status: SyncStatus;
  startedAt: string;
  endedAt: string | null;
  message: string | null;
  createdBy: string | null;
}

export interface OutboxEvent {
  id: string;
  sourceId: string;
  module: IntegrationModuleKey;
  requestId: string;
  action: 'create' | 'update';
  payload: Record<string, unknown>;
  status: 'pending' | 'done' | 'failed' | 'dead';
  result: Record<string, unknown> | null;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationWorkspace {
  id: string;
  slug: string;
  displayName: string;
}

export interface IntegrationConfigResponse {
  workspace: IntegrationWorkspace;
  sources: IntegrationSource[];
  mappings: IntegrationMapping[];
  checkpoints: SyncCheckpoint[];
}

export interface SyncStatusResponse {
  sourceId: string;
  module: IntegrationModuleKey;
  sourceType: IntegrationSourceType;
  sourceName: string;
  lastCheckpoint: SyncCheckpoint | null;
  activeJobs: Array<Pick<SyncJob, 'id' | 'status' | 'startedAt' | 'endedAt' | 'message'>>;
}
