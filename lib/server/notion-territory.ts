import 'server-only';

import { randomUUID } from 'crypto';
import { prisma } from '@/lib/db/prisma';
import { colorForStatus, normalizeStatus, type TerritoryStoresResponse, type TerritoryStorePin } from '@/lib/territory/types';

const NOTION_API_BASE = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';
const GEOCODE_THROTTLE_MS = 1200;

const REQUIRED_PROPERTIES = [
  { name: 'Dispensary Name', type: 'title' },
  { name: 'Map Location', type: 'place' },
  { name: 'Account Status', type: 'status' },
  { name: 'Rep', type: 'people' },
] as const;

type NotionPropertySchema = {
  id: string;
  type: string;
};

type NotionDatabaseResponse = {
  title?: Array<{ plain_text?: string }>;
  properties?: Record<string, NotionPropertySchema>;
};

type NotionQueryResponse = {
  results?: Array<{
    id: string;
    last_edited_time: string;
    properties: Record<string, NotionPropertyValue>;
  }>;
  has_more?: boolean;
  next_cursor?: string | null;
};

type NotionTextSegment = {
  plain_text?: string;
};

type NotionPerson = {
  name?: string | null;
  person?: {
    email?: string | null;
  } | null;
};

type NotionPlace = {
  lat?: number;
  lon?: number;
  name?: string;
  address?: string;
};

type NotionPropertyValue = {
  title?: NotionTextSegment[];
  rich_text?: NotionTextSegment[];
  status?: {
    name?: string;
  } | null;
  people?: NotionPerson[];
  place?: NotionPlace | null;
};

interface GeoBudget {
  remaining: number;
  lookedUp: number;
}

let lastGeocodeLookupAt = 0;
let geocodeTableEnsured = false;

function requiredEnv(name: 'NOTION_API_KEY' | 'NOTION_MASTER_LIST_DATABASE_ID') {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function getNotionHeaders() {
  return {
    Authorization: `Bearer ${requiredEnv('NOTION_API_KEY')}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  };
}

async function notionRequest<T>(path: string, init?: RequestInit, attempt = 0): Promise<T> {
  const response = await fetch(`${NOTION_API_BASE}${path}`, {
    ...init,
    headers: {
      ...getNotionHeaders(),
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  if ((response.status === 429 || response.status >= 500) && attempt < 2) {
    await sleep(500 * (attempt + 1));
    return notionRequest<T>(path, init, attempt + 1);
  }

  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(`Notion request failed (${response.status}): ${JSON.stringify(payload)}`);
  }

  return payload as T;
}

function getDatabaseTitle(database: NotionDatabaseResponse) {
  return (database.title ?? []).map((segment) => segment.plain_text ?? '').join('').trim() || 'Untitled Database';
}

function findMissingFields(properties: Record<string, NotionPropertySchema>) {
  return REQUIRED_PROPERTIES.filter((required) => {
    const property = properties[required.name];
    if (!property) return true;
    return property.type !== required.type;
  }).map((required) => required.name);
}

async function fetchAndValidateDatabaseSchema() {
  const databaseId = requiredEnv('NOTION_MASTER_LIST_DATABASE_ID');
  const database = await notionRequest<NotionDatabaseResponse>(`/databases/${databaseId}`);
  const properties = database.properties ?? {};
  const missingFields = findMissingFields(properties);

  return {
    database,
    databaseId,
    properties,
    missingFields,
  };
}

function textFromTitleProperty(property: NotionPropertyValue | undefined) {
  const titleArray = Array.isArray(property?.title) ? property.title : [];
  return titleArray.map((item) => item?.plain_text ?? '').join('').trim();
}

function textFromRichTextProperty(property: NotionPropertyValue | undefined) {
  const textArray = Array.isArray(property?.rich_text) ? property.rich_text : [];
  return textArray.map((item) => item?.plain_text ?? '').join('').trim();
}

function firstNonEmpty(values: Array<string | null | undefined>) {
  for (const value of values) {
    if (value && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function normalizeAddress(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureGeocodeCacheTable() {
  if (geocodeTableEnsured) {
    return;
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SpatialGeocodeCache" (
      "id" TEXT NOT NULL,
      "addressNormalized" TEXT NOT NULL,
      "lat" DOUBLE PRECISION NOT NULL,
      "lng" DOUBLE PRECISION NOT NULL,
      "formattedAddress" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "SpatialGeocodeCache_pkey" PRIMARY KEY ("id")
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "SpatialGeocodeCache_addressNormalized_key"
    ON "SpatialGeocodeCache"("addressNormalized")
  `);

  geocodeTableEnsured = true;
}

async function geocodeAddressWithCache(address: string, budget: GeoBudget, allowLiveLookup: boolean) {
  const addressNormalized = normalizeAddress(address);
  if (!addressNormalized) {
    return null;
  }

  await ensureGeocodeCacheTable();

  const cachedRows = await prisma.$queryRaw<Array<{ lat: number; lng: number; formattedAddress: string | null }>>`
    SELECT "lat", "lng", "formattedAddress"
    FROM "SpatialGeocodeCache"
    WHERE "addressNormalized" = ${addressNormalized}
    LIMIT 1
  `;

  const cached = cachedRows[0];

  if (cached) {
    return {
      lat: cached.lat,
      lng: cached.lng,
      formattedAddress: cached.formattedAddress ?? address,
      source: 'nominatim-cache' as const,
    };
  }

  if (!allowLiveLookup || budget.remaining <= 0) {
    return null;
  }

  budget.remaining -= 1;
  budget.lookedUp += 1;

  const now = Date.now();
  const waitFor = Math.max(0, GEOCODE_THROTTLE_MS - (now - lastGeocodeLookupAt));
  if (waitFor > 0) {
    await sleep(waitFor);
  }
  lastGeocodeLookupAt = Date.now();

  const url = `${NOMINATIM_BASE}?format=jsonv2&limit=1&q=${encodeURIComponent(address)}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'picc-command-center-territory/1.0 (sales routing)',
      'Accept-Language': 'en',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as Array<{ lat?: string; lon?: string; display_name?: string }>;
  const match = payload[0];
  if (!match?.lat || !match?.lon) {
    return null;
  }

  const lat = Number.parseFloat(match.lat);
  const lng = Number.parseFloat(match.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const formattedAddress = match.display_name ?? address;

  await prisma.$executeRaw`
    INSERT INTO "SpatialGeocodeCache" ("id", "addressNormalized", "lat", "lng", "formattedAddress", "createdAt", "updatedAt")
    VALUES (${randomUUID()}, ${addressNormalized}, ${lat}, ${lng}, ${formattedAddress}, NOW(), NOW())
    ON CONFLICT ("addressNormalized")
    DO UPDATE SET
      "lat" = EXCLUDED."lat",
      "lng" = EXCLUDED."lng",
      "formattedAddress" = EXCLUDED."formattedAddress",
      "updatedAt" = NOW()
  `;

  return {
    lat,
    lng,
    formattedAddress,
    source: 'nominatim-live' as const,
  };
}

async function queryAllStorePages(databaseId: string) {
  const allRows: NotionQueryResponse['results'] = [];
  let startCursor: string | undefined;

  while (true) {
    const result = await notionRequest<NotionQueryResponse>(`/databases/${databaseId}/query`, {
      method: 'POST',
      body: JSON.stringify({
        page_size: 100,
        ...(startCursor ? { start_cursor: startCursor } : {}),
      }),
    });

    allRows.push(...(result.results ?? []));

    if (!result.has_more || !result.next_cursor) {
      break;
    }

    startCursor = result.next_cursor;
  }

  return allRows;
}

function buildRepLabelSet(pin: TerritoryStorePin) {
  const labels = new Set<string>();
  for (const name of pin.repNames) {
    labels.add(name.toLowerCase());
  }
  for (const email of pin.repEmails) {
    labels.add(email.toLowerCase());
  }
  if (labels.size === 0) {
    labels.add('unassigned');
  }
  return labels;
}

export async function territoryConnectionCheck() {
  const schema = await fetchAndValidateDatabaseSchema();

  return {
    ok: schema.missingFields.length === 0,
    databaseTitle: getDatabaseTitle(schema.database),
    missingFields: schema.missingFields,
    checkedAt: new Date().toISOString(),
  };
}

export async function loadTerritoryStores(input?: {
  statuses?: string[];
  reps?: string[];
  query?: string;
  refresh?: boolean;
  maxLiveGeocodeLookups?: number;
}): Promise<TerritoryStoresResponse> {
  const schema = await fetchAndValidateDatabaseSchema();
  if (schema.missingFields.length > 0) {
    throw new Error(`Notion schema missing required fields: ${schema.missingFields.join(', ')}`);
  }

  const rows = await queryAllStorePages(schema.databaseId);

  const filters = {
    status: new Set((input?.statuses ?? []).map((value) => normalizeStatus(value))),
    rep: new Set((input?.reps ?? []).map((value) => value.trim().toLowerCase()).filter(Boolean)),
    q: input?.query?.trim().toLowerCase() ?? '',
  };

  const geocodeBudget: GeoBudget = {
    remaining: Math.max(0, input?.maxLiveGeocodeLookups ?? (input?.refresh ? 30 : 8)),
    lookedUp: 0,
  };

  const statusCounts = new Map<string, number>();
  const repCounts = new Map<string, number>();
  const stores: TerritoryStorePin[] = [];

  let lastEditedMax: string | null = null;
  let unresolvedLocationCount = 0;

  for (const row of rows) {
    const properties = row.properties ?? {};

    const name = textFromTitleProperty(properties['Dispensary Name']) || 'Untitled Store';
    const statusName = properties['Account Status']?.status?.name ?? 'Unspecified';
    const statusKey = normalizeStatus(statusName);

    const repPeople = Array.isArray(properties['Rep']?.people) ? properties['Rep'].people : [];
    const repNames = repPeople.map((person) => person?.name).filter((value: unknown): value is string => Boolean(value));
    const repEmails = repPeople
      .map((person) => person?.person?.email)
      .filter((value: unknown): value is string => typeof value === 'string' && value.length > 0);

    const place = properties['Map Location']?.place;
    const notionLat = typeof place?.lat === 'number' ? place.lat : null;
    const notionLng = typeof place?.lon === 'number' ? place.lon : null;
    const hasPlaceCoords = notionLat !== null && notionLng !== null;

    const placeName = typeof place?.name === 'string' ? place.name.trim() : '';
    const placeAddress = typeof place?.address === 'string' ? place.address.trim() : '';

    const fullAddress = textFromRichTextProperty(properties['Full Address']);
    const address1 = textFromRichTextProperty(properties['Address 1']);
    const city = textFromRichTextProperty(properties['City']);
    const zipcode = textFromRichTextProperty(properties['Zipcode']);

    const fallbackAddress = firstNonEmpty([placeAddress, placeName, fullAddress, [address1, city, zipcode].filter(Boolean).join(', ')]);

    let lat: number | null = hasPlaceCoords ? notionLat : null;
    let lng: number | null = hasPlaceCoords ? notionLng : null;
    let locationSource: TerritoryStorePin['locationSource'] = hasPlaceCoords ? 'notion-place' : 'nominatim-cache';
    let resolvedAddress = firstNonEmpty([placeAddress, fullAddress, placeName]);

    if (!hasPlaceCoords && fallbackAddress) {
      const geocodeResult = await geocodeAddressWithCache(fallbackAddress, geocodeBudget, Boolean(input?.refresh));
      if (geocodeResult) {
        lat = geocodeResult.lat;
        lng = geocodeResult.lng;
        resolvedAddress = geocodeResult.formattedAddress;
        locationSource = geocodeResult.source;
      }
    }

    if (lat === null || lng === null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      unresolvedLocationCount += 1;
      if (!lastEditedMax || row.last_edited_time > lastEditedMax) {
        lastEditedMax = row.last_edited_time;
      }
      continue;
    }

    const resolvedLat: number = lat;
    const resolvedLng: number = lng;

    const pin: TerritoryStorePin = {
      id: row.id,
      notionPageId: row.id,
      name,
      status: statusName,
      statusKey,
      statusColor: colorForStatus(statusName),
      repNames,
      repEmails,
      lat: resolvedLat,
      lng: resolvedLng,
      locationLabel: firstNonEmpty([placeName, fallbackAddress]),
      locationAddress: resolvedAddress,
      locationSource,
      lastEditedTime: row.last_edited_time,
    };

    statusCounts.set(pin.status, (statusCounts.get(pin.status) ?? 0) + 1);

    if (pin.repNames.length === 0 && pin.repEmails.length === 0) {
      repCounts.set('Unassigned', (repCounts.get('Unassigned') ?? 0) + 1);
    } else {
      for (const repName of pin.repNames) {
        repCounts.set(repName, (repCounts.get(repName) ?? 0) + 1);
      }
    }

    if (!lastEditedMax || row.last_edited_time > lastEditedMax) {
      lastEditedMax = row.last_edited_time;
    }

    stores.push(pin);
  }

  const filteredStores = stores.filter((pin) => {
    if (filters.status.size > 0 && !filters.status.has(pin.statusKey)) {
      return false;
    }

    if (filters.rep.size > 0) {
      const repSet = buildRepLabelSet(pin);
      let repMatch = false;
      for (const filterValue of filters.rep) {
        if (repSet.has(filterValue)) {
          repMatch = true;
          break;
        }
      }
      if (!repMatch) {
        return false;
      }
    }

    if (filters.q && !pin.name.toLowerCase().includes(filters.q)) {
      return false;
    }

    return true;
  });

  filteredStores.sort((a, b) => a.name.localeCompare(b.name));

  const statusFilterCounts = [...statusCounts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value.localeCompare(b.value));

  const repFilterCounts = [...repCounts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value.localeCompare(b.value));

  return {
    stores: filteredStores,
    filters: {
      statuses: statusFilterCounts,
      reps: repFilterCounts,
    },
    meta: {
      dataSource: 'notion-live',
      lastEditedMax,
      recordsRead: rows.length,
      unresolvedLocationCount,
      geocodedThisRequest: geocodeBudget.lookedUp,
    },
  };
}

export async function prewarmTerritoryGeocodeCache() {
  const result = await loadTerritoryStores({
    refresh: true,
    maxLiveGeocodeLookups: 20,
  });

  return {
    warmedLookups: result.meta.geocodedThisRequest,
    recordsRead: result.meta.recordsRead,
    unresolvedLocationCount: result.meta.unresolvedLocationCount,
    lastEditedMax: result.meta.lastEditedMax,
  };
}
