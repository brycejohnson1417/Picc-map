import { NextResponse } from 'next/server';
import { Client } from '@notionhq/client';
import { prisma as db } from '@/lib/db/prisma';
import { safeGeocodeAddress } from '@/lib/integrations/google';
import { env } from '@/lib/config/env';

/**
 * Ensures a single mock organization exists to link accounts and system configs to.
 * In a real multi-tenant app, this would be derived from the user/Clerk session.
 * For cron/background tasks, we default to the primary PICC org.
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

const notion = new Client({ auth: env.NOTION_API_KEY });

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // Optional: Add a simple secret protection so public can't spam the sync route
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

    // We do cursor pagination to pull all valid accounts ensuring we never exceed limits
    while (hasMore) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response: any = await (notion.databases as any).query({
        database_id: dbId,
        start_cursor: cursor,
        page_size: 50, // Notion limits to 100 max. 50 allows processing overhead
        filter: {
          property: 'License Number',
          rich_text: {
            is_not_empty: true
          }
        }
      });

      for (const record of response.results) {
        // Safe type casting for Notion's chaotic response structure
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const props = (record as any).properties;

        const licenseNumber = props['License Number']?.rich_text?.[0]?.plain_text || 'UNKNOWN';
        const name = props['Name']?.title?.[0]?.plain_text || 'Unnamed Dispensary';
        const address1 = props['Address Line 1']?.rich_text?.[0]?.plain_text || '';
        const address2 = props['Address Line 2']?.rich_text?.[0]?.plain_text || null;
        const city = props['City']?.rich_text?.[0]?.plain_text || '';
        const state = props['State']?.select?.name || 'MI';
        const zipcode = props['Zip Code']?.rich_text?.[0]?.plain_text || '';
        const phone = props['Phone Number']?.phone_number || null;

        // Pipeline Status logic
        const rawStatus = props['Status']?.status?.name || 'INACTIVE';
        const recordStatus = rawStatus === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE';

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

        // Full address compilation for Google
        const fullAddress = `${address1} ${city}, ${state} ${zipcode}`.trim();

        let lat = existing?.latitude || null;
        let lng = existing?.longitude || null;

        // If it's a new record OR address changed, fire Google Geocoding (locked behind budget wrapper)
        const addressChanged = existing &&
          (existing.address1 !== address1 || existing.city !== city || existing.zipcode !== zipcode);

        if ((!existing && fullAddress.length > 5) || addressChanged) {
          const coords = await safeGeocodeAddress(org.id, fullAddress);
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
    return NextResponse.json({ success: false, error: 'Internal sync error' }, { status: 500 });
  }
}
