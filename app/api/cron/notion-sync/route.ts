import { NextResponse } from 'next/server';
import { prisma as db } from '@/lib/db/prisma';
import { safeGeocodeAddress } from '@/lib/integrations/google';
import { env } from '@/lib/config/env';

/**
 * Ensures a single mock organization exists to link accounts and system configs to.
 */
async function getOrCreateRootOrg() {
  const orgId = 'picc_root_org';
  let org = await db.organizationWorkspace.findUnique({ where: { id: orgId } });

  if (!org) {
    org = await db.organizationWorkspace.create({
      data: {
        id: orgId,
        clerkOrgId: 'org_root',
        name: 'PICC Master Workspace'
      }
    });
  }
  return org;
}

/**
 * Direct Notion REST API query (avoids SDK bundler issues on Vercel)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function queryNotionDatabase(databaseId: string, startCursor?: string): Promise<any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: any = {
    page_size: 50,
    filter: {
      property: 'License Number',
      rich_text: { is_not_empty: true }
    }
  };
  if (startCursor) body.start_cursor = startCursor;

  const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.NOTION_API_KEY}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion API error ${res.status}: ${text}`);
  }

  return res.json();
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.warn('Unauthorized cron sync attempt');
    }

    const org = await getOrCreateRootOrg();
    const dbId = env.NOTION_DB_DISPENSARY_MASTER;

    if (!dbId) {
      throw new Error('NOTION_DB_DISPENSARY_MASTER is not defined in the environment.');
    }

    let cursor: string | undefined = undefined;
    let hasMore = true;
    let totalSynced = 0;
    let newGeocodes = 0;

    while (hasMore) {
      const response = await queryNotionDatabase(dbId, cursor);

      for (const record of response.results) {
        // Safe type casting for Notion's chaotic response structure
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const props = (record as any).properties;

        const licenseNumber = props['License Number']?.rich_text?.[0]?.plain_text || 'UNKNOWN';
        const name = props['Dispensary Name']?.title?.[0]?.plain_text || 'Unnamed Dispensary';
        const fullAddr = props['Full Address']?.rich_text?.[0]?.plain_text || '';
        const city = props['City']?.rich_text?.[0]?.plain_text || '';
        const zipcode = props['Zipcode']?.rich_text?.[0]?.plain_text || '';
        const phone = props['Contact Phone']?.phone_number || null;
        const dba = props['DBA']?.rich_text?.[0]?.plain_text || null;

        // Parse address line from Full Address (e.g. "3162 Lake Rd Ste 4, Horseheads 14845")
        const address1 = fullAddr.split(',')[0]?.trim() || '';
        const address2 = null;
        // Attempt to extract state from Region formula or default
        const state = 'NY';

        // Pipeline Status logic
        const rawStatus = props['PPP Status']?.status?.name || 'Not Started';
        const recordStatus = rawStatus === 'Not Started' || rawStatus === 'Inactive' ? 'INACTIVE' : 'ACTIVE';

        // Notion provides last_edited_time ISO string
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const notionLastEdited = new Date((record as any).last_edited_time);

        // Find existing record by unique License
        const existing = await db.account.findUnique({
          where: {
            orgId_licenseNumber: { orgId: org.id, licenseNumber }
          }
        });

        // Smart Diff: Skip if existing record is newer or same as Notion
        if (existing && existing.lastSyncedAt && existing.lastSyncedAt >= notionLastEdited) {
          continue;
        }

        // Full address compilation for Google Geocoding
        const geocodeAddress = fullAddr || `${address1} ${city}, ${state} ${zipcode}`.trim();

        let lat = existing?.latitude || null;
        let lng = existing?.longitude || null;

        // If it's a new record OR address changed, fire Google Geocoding (locked behind budget wrapper)
        const addressChanged = existing &&
          (existing.address1 !== address1 || existing.city !== city || existing.zipcode !== zipcode);

        if ((!existing && geocodeAddress.length > 5) || addressChanged) {
          const coords = await safeGeocodeAddress(org.id, geocodeAddress);
          if (coords) {
            lat = coords.lat;
            lng = coords.lng;
            newGeocodes++;
          }
        }

        // Upsert Database record with the latest Notion data
        await db.account.upsert({
          where: {
            orgId_licenseNumber: { orgId: org.id, licenseNumber }
          },
          create: {
            orgId: org.id,
            licenseNumber,
            name,
            address1,
            address2,
            city,
            state,
            zipcode,
            phone,
            status: recordStatus,
            latitude: lat,
            longitude: lng,
            lastSyncedAt: new Date()
          },
          update: {
            name,
            address1,
            address2,
            city,
            state,
            zipcode,
            phone,
            status: recordStatus,
            latitude: lat,
            longitude: lng,
            lastSyncedAt: new Date()
          }
        });

        totalSynced++;
      }

      cursor = response.next_cursor || undefined;
      hasMore = response.has_more;

      // Safety throttle (Notion allows ~3 requests/sec)
      await new Promise(resolve => setTimeout(resolve, 350));
    }

    return NextResponse.json({
      success: true,
      syncedAccounts: totalSynced,
      newGeocodesBilled: newGeocodes
    });

  } catch (error) {
    console.error('Notion Sync Error:', error);
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json({ success: false, error: message, stack }, { status: 500 });
  }
}
