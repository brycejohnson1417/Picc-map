import { prisma as db } from '@/lib/db/prisma';
import { env } from '@/lib/config/env';

/**
 * Ensures the org/system config exists to track Google Geo Hits
 */
export async function getOrCreateSystemConfig(orgId: string) {
    let config = await db.systemConfig.findUnique({
        where: { orgId }
    });

    if (!config) {
        config = await db.systemConfig.create({
            data: {
                id: 'singleton_' + orgId,
                orgId,
                googleGeocodingHits: 0,
                budgetLimit: 20000 // $100 cap at $0.005 per hit
            }
        });
    }

    return config;
}

/**
 * Protected backend wrapper for Geocoding.
 * Validates budget cap BEFORE making the HTTP request to Google.
 */
export async function safeGeocodeAddress(
    orgId: string,
    address: string
): Promise<{ lat: number; lng: number } | null> {
    if (!address || address.trim().length === 0) return null;

    const config = await getOrCreateSystemConfig(orgId);

    // Hard cap lock
    if (config.googleGeocodingHits >= config.budgetLimit) {
        console.warn(`[BUDGET ENFORCEMENT] Organization ${orgId} has exhausted their $100/mo geocoding budget limit.`);
        return null;
    }

    try {
        const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
        url.searchParams.append('address', address);
        url.searchParams.append('key', env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!);

        const response = await fetch(url.toString(), { cache: 'no-store' });
        const data = await response.json();

        if (data.status === 'OK' && data.results.length > 0) {
            const location = data.results[0].geometry.location;

            // Charge the hit to the budget
            await db.systemConfig.update({
                where: { orgId },
                data: {
                    googleGeocodingHits: { increment: 1 }
                }
            });

            return {
                lat: location.lat,
                lng: location.lng
            };
        }

        return null;
    } catch (error) {
        console.error('Error in safeGeocodeAddress:', error);
        return null;
    }
}
