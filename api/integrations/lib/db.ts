import { Pool } from 'pg';
import {
  IntegrationConfigResponse,
  IntegrationModuleKey,
  IntegrationSource,
  IntegrationSourceType,
  IntegrationWorkspace,
  IntegrationMapping,
  NormalizedEntity,
  OutboxEvent,
  SyncCheckpoint,
  SyncJob,
  SyncStatus,
  SyncStatusResponse
} from './types';
import { nowIso, newId, parseJson } from './utils';

type DbWorkspace = {
  id: string;
  slug: string;
  display_name: string;
};

type RowSource = {
  id: string;
  type: IntegrationSourceType;
  module: IntegrationModuleKey;
  name: string;
  target_id: string | null;
  settings: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type RowMapping = {
  id: string;
  source_id: string;
  module: IntegrationModuleKey;
  field_map: string;
  transform_rules: string;
  is_active: boolean;
};

type RowCheckpoint = {
  id: string;
  source_id: string;
  module: IntegrationModuleKey;
  cursor: string | null;
  checksum: string | null;
  last_synced_at: string | null;
  last_sync_status: SyncStatus;
  meta: string;
};

type RowJob = {
  id: string;
  status: SyncStatus;
  started_at: string;
  ended_at: string | null;
  message: string | null;
};

type RowOutbox = {
  id: string;
  source_id: string;
  module: IntegrationModuleKey;
  request_id: string;
  action: OutboxEvent['action'];
  payload: string;
  status: OutboxEvent['status'];
  result: string | null;
  attempts: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

type DbEntity = {
  id: string;
  source_id: string;
  module: IntegrationModuleKey;
  source_record_id: string;
  canonical: string;
  source_version: string | null;
  source_updated_at: string | null;
  checksum: string | null;
  last_seen_at: string;
  updated_at: string;
};

interface DbState {
  workspace: IntegrationWorkspace;
  sources: Map<string, IntegrationSource>;
  mappings: Map<string, IntegrationMapping>;
  checkpoints: Map<string, SyncCheckpoint[]>;
  entities: Map<string, NormalizedEntity[]>;
}

const FALLBACK_WORKSPACE: IntegrationWorkspace = {
  id: 'workspace-default',
  slug: 'default',
  displayName: 'Default Workspace'
};

const NOTION_DEFAULT_MODULE: IntegrationModuleKey = 'wiki';
const SHEETS_DEFAULT_MODULE: IntegrationModuleKey = 'ppp_onboarding';

let pool: Pool | null = null;
let initPromise: Promise<void> | null = null;
let schemaReady = false;
let fallbackState: DbState | null = null;

const getPool = (): Pool | null => {
  if (pool) {
    return pool;
  }

  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    return null;
  }

  pool = new Pool({
    connectionString,
    max: Number(process.env.PG_POOL_SIZE || 6),
    ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : undefined
  });

  return pool;
};

const query = async <T>(text: string, values: unknown[] = []): Promise<T[]> => {
  const db = getPool();
  if (!db) {
    return [];
  }

  const result = await db.query<T>(text, values);
  return result.rows || [];
};

const queryOne = async <T>(text: string, values: unknown[] = []): Promise<T | null> => {
  const rows = await query<T>(text, values);
  return rows[0] ?? null;
};

const normalizeSource = (row: RowSource): IntegrationSource => ({
  id: row.id,
  type: row.type,
  module: row.module,
  name: row.name,
  targetId: row.target_id,
  settings: parseJson(row.settings) || {},
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const normalizeMapping = (row: RowMapping): IntegrationMapping => ({
  id: row.id,
  sourceId: row.source_id,
  module: row.module,
  fieldMap: parseJson(row.field_map) || {},
  transformRules: parseJson(row.transform_rules) || {},
  isActive: row.is_active
});

const normalizeCheckpoint = (row: RowCheckpoint): SyncCheckpoint => ({
  id: row.id,
  sourceId: row.source_id,
  module: row.module,
  cursor: row.cursor,
  checksum: row.checksum,
  lastSyncedAt: row.last_synced_at,
  lastSyncStatus: row.last_sync_status,
  meta: parseJson(row.meta) || {}
});

const normalizeJob = (row: RowJob): Pick<SyncJob, 'id' | 'status' | 'startedAt' | 'endedAt' | 'message'> => ({
  id: row.id,
  status: row.status,
  startedAt: row.started_at,
  endedAt: row.ended_at,
  message: row.message
});

const normalizeOutbox = (row: RowOutbox): OutboxEvent => ({
  id: row.id,
  sourceId: row.source_id,
  module: row.module,
  requestId: row.request_id,
  action: row.action,
  payload: parseJson(row.payload) || {},
  status: row.status,
  result: parseJson(row.result || '') || null,
  attempts: row.attempts,
  lastError: row.last_error,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const fallback = (): DbState => {
  if (fallbackState) {
    return fallbackState;
  }

  const workspace = FALLBACK_WORKSPACE;

  const notionSource: IntegrationSource = {
    id: 'source-notion-primary',
    type: 'notion',
    module: NOTION_DEFAULT_MODULE,
    name: 'Primary Notion Source',
    targetId: process.env.NOTION_DEFAULT_DATABASE_ID || null,
    settings: {
      propertyMap: {
        title: 'Name',
        category: 'Category',
        tags: 'Tags',
        content: 'Content'
      },
      createdThroughApi: false
    },
    isActive: true,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  const sheetSource: IntegrationSource = {
    id: 'source-sheets-primary',
    type: 'sheets',
    module: SHEETS_DEFAULT_MODULE,
    name: 'Primary Sheets Source',
    targetId: process.env.DEFAULT_SHEET_ID || null,
    settings: {
      range: process.env.DEFAULT_SHEET_RANGE || 'A1:H1000',
      parseMode: 'ppp'
    },
    isActive: true,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  const notionMapping: IntegrationMapping = {
    id: 'mapping-notion-primary',
    sourceId: notionSource.id,
    module: NOTION_DEFAULT_MODULE,
    fieldMap: {
      id: 'id',
      title: 'title',
      category: 'category',
      tags: 'tags',
      content: 'content',
      syncStatus: 'syncStatus',
      notionUrl: 'notionUrl',
      lastEdited: 'lastEdited'
    },
    transformRules: {},
    isActive: true
  };

  const sheetsMapping: IntegrationMapping = {
    id: 'mapping-sheets-ppp',
    sourceId: sheetSource.id,
    module: SHEETS_DEFAULT_MODULE,
    fieldMap: {
      id: 'id',
      name: 'name',
      pppStatus: 'pppStatus',
      location: 'location',
      contactPerson: 'contactPerson',
      licenseNumber: 'licenseNumber',
      totalOrders: 'totalOrders',
      totalOrderedAmount: 'totalOrderedAmount',
      lastOrderDate: 'lastOrderDate'
    },
    transformRules: {
      headerRow: 0,
      fallbackSourceColumns: [
        'Name',
        'PPP Status',
        'Location',
        'Contact',
        'License',
        'Total Orders',
        'Total Ordered',
        'Last Order Date'
      ]
    },
    isActive: true
  };

  const notionCheckpoint = createCheckpoint(notionSource.id, NOTION_DEFAULT_MODULE);
  const sheetCheckpoint = createCheckpoint(sheetSource.id, SHEETS_DEFAULT_MODULE);

  fallbackState = {
    workspace,
    sources: new Map<string, IntegrationSource>([
      [notionSource.id, notionSource],
      [sheetSource.id, sheetSource]
    ]),
    mappings: new Map<string, IntegrationMapping>([
      [notionMapping.id, notionMapping],
      [sheetsMapping.id, sheetsMapping]
    ]),
    checkpoints: new Map<string, SyncCheckpoint[]>([
      [notionSource.id, [notionCheckpoint]],
      [sheetSource.id, [sheetCheckpoint]]
    ]),
    entities: new Map<string, NormalizedEntity[]>()
  };

  return fallbackState;
};

const createCheckpoint = (sourceId: string, module: IntegrationModuleKey): SyncCheckpoint => ({
  id: newId('checkpoint'),
  sourceId,
  module,
  cursor: null,
  checksum: null,
  lastSyncedAt: null,
  lastSyncStatus: 'idle',
  meta: {}
});

const ensureSchema = async (): Promise<void> => {
  if (schemaReady) {
    return;
  }

  if (!getPool()) {
    schemaReady = true;
    return;
  }

  if (initPromise) {
    await initPromise;
    return;
  }

  initPromise = (async () => {
    await query(`
      CREATE TABLE IF NOT EXISTS integration_workspace (
        id TEXT PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS integration_source (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('notion', 'sheets')),
        module TEXT NOT NULL,
        name TEXT NOT NULL,
        target_id TEXT,
        settings JSONB NOT NULL DEFAULT '{}'::jsonb,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS integration_mapping (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL REFERENCES integration_source(id) ON DELETE CASCADE,
        module TEXT NOT NULL,
        field_map JSONB NOT NULL DEFAULT '{}'::jsonb,
        transform_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS sync_checkpoint (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL REFERENCES integration_source(id) ON DELETE CASCADE,
        module TEXT NOT NULL,
        cursor TEXT,
        checksum TEXT,
        last_synced_at TIMESTAMPTZ,
        last_sync_status TEXT NOT NULL DEFAULT 'idle',
        meta JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (source_id, module)
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS normalized_entity (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL REFERENCES integration_source(id) ON DELETE CASCADE,
        module TEXT NOT NULL,
        source_record_id TEXT NOT NULL,
        canonical JSONB NOT NULL,
        source_version TEXT,
        source_updated_at TEXT,
        checksum TEXT,
        last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (source_id, source_record_id)
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS sync_job (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL REFERENCES integration_source(id) ON DELETE CASCADE,
        module TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ended_at TIMESTAMPTZ,
        message TEXT,
        created_by TEXT
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS outbox_event (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL REFERENCES integration_source(id) ON DELETE CASCADE,
        module TEXT NOT NULL,
        request_id TEXT NOT NULL,
        action TEXT NOT NULL,
        payload JSONB NOT NULL,
        status TEXT NOT NULL,
        result JSONB,
        attempts INT NOT NULL DEFAULT 0,
        last_error TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (source_id, request_id)
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS sync_error (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        source_id TEXT NOT NULL,
        phase TEXT NOT NULL,
        message TEXT,
        details JSONB NOT NULL DEFAULT '{}'::jsonb,
        occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await ensureDefaultWorkspace();
    schemaReady = true;
  })();

  await initPromise;
};

const ensureDefaultWorkspace = async (): Promise<void> => {
  const existingWorkspace = await queryOne<DbWorkspace>(
    'SELECT id, slug, display_name FROM integration_workspace WHERE slug = $1',
    [FALLBACK_WORKSPACE.slug]
  );

  if (!existingWorkspace) {
    await query(
      'INSERT INTO integration_workspace (id, slug, display_name) VALUES ($1, $2, $3)',
      [FALLBACK_WORKSPACE.id, FALLBACK_WORKSPACE.slug, FALLBACK_WORKSPACE.displayName]
    );
  }

  const sourceRows = await query<RowSource>('SELECT id, type, module, name, target_id, settings, is_active, created_at, updated_at FROM integration_source WHERE workspace_id = $1', [
    FALLBACK_WORKSPACE.id
  ]);

  if (sourceRows.length > 0) {
    return;
  }

  const notionSource = fallback().sources.get('source-notion-primary')!;
  const sheetsSource = fallback().sources.get('source-sheets-primary')!;
  const notionMap = fallback().mappings.values().next().value as IntegrationMapping;
  const sheetsMap = fallback().mappings.get('mapping-sheets-ppp')!;

  await query(
    `INSERT INTO integration_source (id, workspace_id, type, module, name, target_id, settings, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      notionSource.id,
      FALLBACK_WORKSPACE.id,
      notionSource.type,
      notionSource.module,
      notionSource.name,
      notionSource.targetId,
      notionSource.settings,
      notionSource.isActive
    ]
  );

  await query(
    `INSERT INTO integration_source (id, workspace_id, type, module, name, target_id, settings, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      sheetsSource.id,
      FALLBACK_WORKSPACE.id,
      sheetsSource.type,
      sheetsSource.module,
      sheetsSource.name,
      sheetsSource.targetId,
      sheetsSource.settings,
      sheetsSource.isActive
    ]
  );

  if (notionMap) {
    await query(
      'INSERT INTO integration_mapping (id, source_id, module, field_map, transform_rules, is_active) VALUES ($1, $2, $3, $4, $5, $6)',
      [
        notionMap.id,
        notionMap.sourceId,
        notionMap.module,
        notionMap.fieldMap,
        notionMap.transformRules,
        notionMap.isActive
      ]
    );
  }

  if (sheetsMap) {
    await query(
      'INSERT INTO integration_mapping (id, source_id, module, field_map, transform_rules, is_active) VALUES ($1, $2, $3, $4, $5, $6)',
      [
        sheetsMap.id,
        sheetsMap.sourceId,
        sheetsMap.module,
        sheetsMap.fieldMap,
        sheetsMap.transformRules,
        sheetsMap.isActive
      ]
    );
  }

  for (const source of [notionSource, sheetsSource]) {
    const checkpoint = createCheckpoint(source.id, source.module);
    await query(
      'INSERT INTO sync_checkpoint (id, source_id, module, cursor, checksum, last_synced_at, last_sync_status, meta) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [
        checkpoint.id,
        source.id,
        source.module,
        checkpoint.cursor,
        checkpoint.checksum,
        checkpoint.lastSyncedAt,
        checkpoint.lastSyncStatus,
        checkpoint.meta
      ]
    );
  }
};

export const getSourceRows = async (): Promise<IntegrationSource[]> => {
  await ensureSchema();
  const db = getPool();
  if (!db) {
    return Array.from(fallback().sources.values());
  }

  const rows = await query<RowSource>(
    'SELECT id, type, module, name, target_id, settings::text AS settings, is_active, created_at, updated_at FROM integration_source',
    []
  );
  return rows.map(normalizeSource);
};

export const getConfig = async (): Promise<IntegrationConfigResponse> => {
  await ensureSchema();
  const db = getPool();

  if (!db) {
    const state = fallback();
    return {
      workspace: state.workspace,
      sources: Array.from(state.sources.values()),
      mappings: Array.from(state.mappings.values()),
      checkpoints: Array.from(state.checkpoints.values()).flat()
    };
  }

  const workspace = await queryOne<DbWorkspace>('SELECT id, slug, display_name FROM integration_workspace LIMIT 1', []);
  const sources = await getSourceRows();
  const mappings = await query<RowMapping>('SELECT id, source_id, module, field_map::text AS field_map, transform_rules::text AS transform_rules, is_active FROM integration_mapping', []);
  const checkpointRows = await query<RowCheckpoint>(
    'SELECT id, source_id, module, cursor, checksum, last_synced_at, last_sync_status, meta::text AS meta FROM sync_checkpoint',
    []
  );

  return {
    workspace: {
      id: workspace?.id || FALLBACK_WORKSPACE.id,
      slug: workspace?.slug || FALLBACK_WORKSPACE.slug,
      displayName: workspace?.display_name || FALLBACK_WORKSPACE.displayName
    },
    sources,
    mappings: mappings.map(normalizeMapping),
    checkpoints: checkpointRows.map(normalizeCheckpoint)
  };
};

export const getSource = async (sourceId: string): Promise<IntegrationSource | null> => {
  await ensureSchema();
  const db = getPool();
  if (!db) {
    return fallback().sources.get(sourceId) || null;
  }

  const row = await queryOne<RowSource>(
    'SELECT id, type, module, name, target_id, settings::text AS settings, is_active, created_at, updated_at FROM integration_source WHERE id = $1',
    [sourceId]
  );

  return row ? normalizeSource(row) : null;
};

export const listSourcesByType = async (type: IntegrationSourceType): Promise<IntegrationSource[]> => {
  await ensureSchema();
  const db = getPool();
  if (!db) {
    return Array.from(fallback().sources.values()).filter((source) => source.type === type && source.isActive);
  }

  const rows = await query<RowSource>(
    'SELECT id, type, module, name, target_id, settings::text AS settings, is_active, created_at, updated_at FROM integration_source WHERE type = $1 AND is_active = TRUE',
    [type]
  );

  return rows.map(normalizeSource);
};

export const patchSource = async (
  sourceId: string,
  updates: Partial<Pick<IntegrationSource, 'targetId' | 'name' | 'settings'>> & {
    isActive?: boolean;
    module?: IntegrationModuleKey;
  }
): Promise<IntegrationSource> => {
  await ensureSchema();
  const source = await getSource(sourceId);
  if (!source) {
    throw new Error(`Source ${sourceId} not found.`);
  }

  if (!getPool()) {
    const state = fallback();
    const next = {
      ...source,
      ...updates,
      targetId: updates.targetId ?? source.targetId,
      name: updates.name ?? source.name,
      module: updates.module ?? source.module,
      settings: updates.settings ?? source.settings,
      isActive: updates.isActive ?? source.isActive,
      updatedAt: nowIso()
    } as IntegrationSource;
    state.sources.set(sourceId, next);
    return next;
  }

  const timestamp = nowIso();
  await query(
    `UPDATE integration_source
       SET target_id = $2,
           name = $3,
           module = $4,
           settings = $5,
           is_active = $6,
           updated_at = $7
     WHERE id = $1`,
    [
      sourceId,
      updates.targetId ?? source.targetId,
      updates.name ?? source.name,
      updates.module ?? source.module,
      JSON.stringify(updates.settings ?? source.settings),
      updates.isActive ?? source.isActive,
      timestamp
    ]
  );

  return { ...source, ...updates, targetId: updates.targetId ?? source.targetId, updatedAt: timestamp };
};

export const upsertMapping = async (
  sourceId: string,
  module: IntegrationModuleKey,
  updates: Partial<Pick<IntegrationMapping, 'fieldMap' | 'transformRules' | 'isActive'>>
): Promise<IntegrationMapping> => {
  await ensureSchema();
  const now = nowIso();
  const db = getPool();
  if (!db) {
    const state = fallback();
    const existing = Array.from(state.mappings.values()).find(
      (map) => map.sourceId === sourceId && map.module === module
    );
    const mapping: IntegrationMapping = existing
      ? {
          ...existing,
          fieldMap: { ...existing.fieldMap, ...(updates.fieldMap || {}) },
          transformRules: { ...existing.transformRules, ...(updates.transformRules || {}) },
          isActive: updates.isActive ?? existing.isActive
        }
      : {
          id: newId('mapping'),
          sourceId,
          module,
          fieldMap: updates.fieldMap || {},
          transformRules: updates.transformRules || {},
          isActive: updates.isActive ?? true
        };

    if (existing) {
      state.mappings.set(existing.id, mapping);
    } else {
      state.mappings.set(mapping.id, mapping);
    }
    return mapping;
  }

  const existing = await queryOne<RowMapping>(
    'SELECT id, source_id, module, field_map::text AS field_map, transform_rules::text AS transform_rules, is_active FROM integration_mapping WHERE source_id = $1 AND module = $2',
    [sourceId, module]
  );

  if (!existing) {
    const id = newId('mapping');
    await query(
      `INSERT INTO integration_mapping (id, source_id, module, field_map, transform_rules, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, sourceId, module, updates.fieldMap || {}, updates.transformRules || {}, updates.isActive ?? true]
    );
    return {
      id,
      sourceId,
      module,
      fieldMap: updates.fieldMap || {},
      transformRules: updates.transformRules || {},
      isActive: updates.isActive ?? true
    };
  }

  const next: IntegrationMapping = {
    id: existing.id,
    sourceId,
    module,
    fieldMap: {
      ...(parseJson(existing.field_map) || {}),
      ...(updates.fieldMap || {})
    },
    transformRules: {
      ...(parseJson(existing.transform_rules) || {}),
      ...(updates.transformRules || {})
    },
    isActive: updates.isActive ?? existing.is_active
  };

  await query(
    `UPDATE integration_mapping
       SET field_map = $2,
           transform_rules = $3,
           is_active = $4,
           updated_at = NOW()
     WHERE id = $1`,
    [existing.id, next.fieldMap, next.transformRules, next.isActive]
  );

  return next;
};

export const getMappingsForSource = async (sourceId: string): Promise<IntegrationMapping[]> => {
  await ensureSchema();
  const db = getPool();
  if (!db) {
    return Array.from(fallback().mappings.values()).filter((mapping) => mapping.sourceId === sourceId);
  }

  const rows = await query<RowMapping>(
    'SELECT id, source_id, module, field_map::text AS field_map, transform_rules::text AS transform_rules, is_active FROM integration_mapping WHERE source_id = $1',
    [sourceId]
  );

  return rows.map(normalizeMapping);
};

export const getCheckpoint = async (sourceId: string, module: IntegrationModuleKey): Promise<SyncCheckpoint | null> => {
  await ensureSchema();
  const db = getPool();
  if (!db) {
    const checkpoints = fallback().checkpoints.get(sourceId) || [];
    return checkpoints.find((checkpoint) => checkpoint.module === module) || null;
  }

  const row = await queryOne<RowCheckpoint>(
    'SELECT id, source_id, module, cursor, checksum, last_synced_at, last_sync_status, meta::text AS meta FROM sync_checkpoint WHERE source_id = $1 AND module = $2',
    [sourceId, module]
  );
  return row ? normalizeCheckpoint(row) : null;
};

export const upsertCheckpoint = async (
  sourceId: string,
  module: IntegrationModuleKey,
  payload: Partial<Pick<SyncCheckpoint, 'cursor' | 'checksum' | 'lastSyncStatus'>> & { meta?: Record<string, unknown>; lastSyncedAt?: string }
): Promise<SyncCheckpoint> => {
  await ensureSchema();
  const existing = await getCheckpoint(sourceId, module);
  const now = nowIso();
  const db = getPool();

  if (!db) {
    const state = fallback();
    const list = state.checkpoints.get(sourceId) || [];
    const next: SyncCheckpoint = {
      id: existing?.id || newId('checkpoint'),
      sourceId,
      module,
      cursor: payload.cursor ?? existing?.cursor ?? null,
      checksum: payload.checksum ?? existing?.checksum ?? null,
      lastSyncedAt: payload.lastSyncedAt ?? now,
      lastSyncStatus: payload.lastSyncStatus ?? existing?.lastSyncStatus ?? 'idle',
      meta: payload.meta ?? existing?.meta ?? {}
    };
    state.checkpoints.set(
      sourceId,
      list.filter((checkpoint) => checkpoint.module !== module).concat([next])
    );
    return next;
  }

  if (existing) {
    await query(
      `UPDATE sync_checkpoint
         SET cursor = $3,
             checksum = $4,
             last_synced_at = $5,
             last_sync_status = $6,
             meta = $7,
             updated_at = NOW()
       WHERE source_id = $1 AND module = $2`,
      [
        sourceId,
        module,
        payload.cursor ?? existing.cursor,
        payload.checksum ?? existing.checksum,
        payload.lastSyncedAt ?? now,
        payload.lastSyncStatus ?? existing.lastSyncStatus,
        payload.meta ?? existing.meta
      ]
    );

    return {
      ...existing,
      cursor: payload.cursor ?? existing.cursor,
      checksum: payload.checksum ?? existing.checksum,
      lastSyncedAt: payload.lastSyncedAt ?? now,
      lastSyncStatus: payload.lastSyncStatus ?? existing.lastSyncStatus,
      meta: payload.meta ?? existing.meta
    };
  }

  const id = newId('checkpoint');
  await query(
    `INSERT INTO sync_checkpoint (id, source_id, module, cursor, checksum, last_synced_at, last_sync_status, meta)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      id,
      sourceId,
      module,
      payload.cursor ?? null,
      payload.checksum ?? null,
      payload.lastSyncedAt ?? now,
      payload.lastSyncStatus ?? 'idle',
      payload.meta ?? {}
    ]
  );

  return {
    id,
    sourceId,
    module,
    cursor: payload.cursor ?? null,
    checksum: payload.checksum ?? null,
    lastSyncedAt: payload.lastSyncedAt ?? now,
    lastSyncStatus: payload.lastSyncStatus ?? 'idle',
    meta: payload.meta || {}
  };
};

export const writeNormalizedEntities = async (
  sourceId: string,
  module: IntegrationModuleKey,
  entities: Omit<NormalizedEntity, 'id' | 'sourceId' | 'module' | 'lastSeenAt' | 'updatedAt'>[]
): Promise<void> => {
  await ensureSchema();
  const db = getPool();
  const now = nowIso();

  if (!db) {
    const state = fallback();
    const existing = state.entities.get(sourceId) || [];
    for (const entity of entities) {
      const idx = existing.findIndex((row) => row.sourceRecordId === entity.sourceRecordId && row.module === module);
      const next = {
        ...entity,
        id: newId('entity'),
        sourceId,
        module,
        lastSeenAt: now,
        updatedAt: now
      };
      if (idx >= 0) {
        existing[idx] = { ...existing[idx], ...next };
      } else {
        existing.push(next);
      }
    }
    state.entities.set(sourceId, existing);
    return;
  }

  for (const entity of entities) {
    await query(
      `INSERT INTO normalized_entity (id, source_id, module, source_record_id, canonical, source_version, source_updated_at, checksum, last_seen_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       ON CONFLICT (source_id, source_record_id)
       DO UPDATE SET
         canonical = EXCLUDED.canonical,
         source_version = EXCLUDED.source_version,
         source_updated_at = EXCLUDED.source_updated_at,
         checksum = EXCLUDED.checksum,
         last_seen_at = NOW(),
         updated_at = NOW()`,
      [
        newId('entity'),
        sourceId,
        module,
        entity.sourceRecordId,
        entity.canonical,
        entity.sourceVersion,
        entity.sourceUpdatedAt,
        entity.checksum
      ]
    );
  }
};

export const getEntities = async (sourceId: string, module: IntegrationModuleKey, limit = 200): Promise<NormalizedEntity[]> => {
  await ensureSchema();
  const db = getPool();
  if (!db) {
    return (fallback().entities.get(sourceId) || [])
      .filter((entity) => entity.module === module)
      .slice(0, limit);
  }

  const rows = await query<DbEntity>(
    'SELECT id, source_id, module, source_record_id, canonical::text AS canonical, source_version, source_updated_at, checksum, last_seen_at, updated_at FROM normalized_entity WHERE source_id = $1 AND module = $2 ORDER BY updated_at DESC LIMIT $3',
    [sourceId, module, limit]
  );

  return rows.map((row) => ({
    id: row.id,
    sourceId: row.source_id,
    module: row.module,
    sourceRecordId: row.source_record_id,
    canonical: parseJson(row.canonical) || {},
    sourceVersion: row.source_version,
    sourceUpdatedAt: row.source_updated_at,
    checksum: row.checksum,
    lastSeenAt: row.last_seen_at,
    updatedAt: row.updated_at
  }));
};

export const openJob = async (sourceId: string, module: IntegrationModuleKey, createdBy = 'system'): Promise<string> => {
  await ensureSchema();
  const db = getPool();
  const id = newId('job');
  if (!db) {
    return id;
  }

  await query('INSERT INTO sync_job (id, source_id, module, status, created_by) VALUES ($1, $2, $3, $4, $5)', [
    id,
    sourceId,
    module,
    'running',
    createdBy
  ]);
  return id;
};

export const closeJob = async (jobId: string, status: SyncStatus, message: string | null = null): Promise<void> => {
  await ensureSchema();
  const db = getPool();
  if (!db) {
    return;
  }

  await query('UPDATE sync_job SET status = $2, ended_at = NOW(), message = $3 WHERE id = $1', [jobId, status, message]);
};

export const getLatestJobs = async (sourceId: string): Promise<SyncStatusResponse['activeJobs']> => {
  await ensureSchema();
  const db = getPool();
  if (!db) {
    return [];
  }

  const rows = await query<RowJob>(
    'SELECT id, status, started_at, ended_at, message FROM sync_job WHERE source_id = $1 ORDER BY started_at DESC LIMIT 3',
    [sourceId]
  );

  return rows.map(normalizeJob);
};

export const isSourceSyncRunning = async (sourceId: string): Promise<boolean> => {
  const jobs = await getLatestJobs(sourceId);
  return jobs.some((job) => job.status === 'running');
};

export const getSourceStatus = async (sourceId: string): Promise<SyncStatusResponse | null> => {
  await ensureSchema();
  const source = await getSource(sourceId);
  if (!source) {
    return null;
  }

  const checkpoint = await getCheckpoint(sourceId, source.module);
  const jobs = await getLatestJobs(sourceId);

  return {
    sourceId: source.id,
    module: source.module,
    sourceType: source.type,
    sourceName: source.name,
    lastCheckpoint: checkpoint,
    activeJobs: jobs
  };
};

export const getStatusAllSources = async (): Promise<SyncStatusResponse[]> => {
  await ensureSchema();
  const sources = await getSourceRows();
  const statuses = await Promise.all(sources.map((source) => getSourceStatus(source.id)));
  return statuses.filter((status): status is SyncStatusResponse => Boolean(status));
};

export const getOutboxByRequestId = async (sourceId: string, requestId: string): Promise<OutboxEvent | null> => {
  await ensureSchema();
  const db = getPool();
  if (!db) {
    return null;
  }
  const row = await queryOne<RowOutbox>(
    'SELECT id, source_id, module, request_id, action, payload::text AS payload, status, result::text AS result, attempts, last_error, created_at, updated_at FROM outbox_event WHERE source_id = $1 AND request_id = $2',
    [sourceId, requestId]
  );
  return row ? normalizeOutbox(row) : null;
};

export const putOutbox = async (
  source: IntegrationSource,
  requestId: string,
  action: OutboxEvent['action'],
  payload: Record<string, unknown>
): Promise<OutboxEvent> => {
  await ensureSchema();
  const db = getPool();
  const existing = await getOutboxByRequestId(source.id, requestId);
  if (!db) {
    if (existing) {
      return existing;
    }
    const event: OutboxEvent = {
      id: newId('outbox'),
      sourceId: source.id,
      module: source.module,
      requestId,
      action,
      payload,
      status: 'pending',
      result: null,
      attempts: 0,
      lastError: null,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    return event;
  }
  if (existing) {
    return existing;
  }

  const id = newId('outbox');
  await query(
    'INSERT INTO outbox_event (id, source_id, module, request_id, action, payload, status, attempts, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, NOW(), NOW())',
    [id, source.id, source.module, requestId, action, payload, 'pending']
  );

  return {
    id,
    sourceId: source.id,
    module: source.module,
    requestId,
    action,
    payload,
    status: 'pending',
    result: null,
    attempts: 0,
    lastError: null,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
};

export const completeOutbox = async (
  outboxId: string,
  status: OutboxEvent['status'],
  result: Record<string, unknown> | null = null,
  error?: string
): Promise<void> => {
  await ensureSchema();
  const db = getPool();
  if (!db) {
    return;
  }

  await query(
    'UPDATE outbox_event SET status = $2, result = $3, attempts = attempts + 1, last_error = $4, updated_at = NOW() WHERE id = $1',
    [outboxId, status, result, error || null]
  );
};

export const ensureAdmin = (req: { headers: Record<string, string | undefined> }): boolean => {
  const required = process.env.INTEGRATION_ADMIN_TOKEN;
  if (!required) {
    return true;
  }

  const provided = req.headers['x-admin-token'] || req.headers['authorization'];
  return provided === required || provided === `Bearer ${required}`;
};
