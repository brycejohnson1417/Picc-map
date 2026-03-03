import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireTerritoryApiAccess } from '@/lib/auth/territory-access';
import type { TerritoryOptimizedRouteResponse } from '@/lib/territory/types';

export const dynamic = 'force-dynamic';

const stopSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  lat: z.number().finite(),
  lng: z.number().finite(),
});

const requestSchema = z.object({
  mode: z.enum(['car', 'bike']),
  stops: z.array(stopSchema).min(2).max(25),
});

type TerritoryStop = z.infer<typeof stopSchema>;

type OsrmGeometry = {
  type?: string;
  coordinates?: [number, number][];
};

type OsrmLeg = {
  distance?: number;
  duration?: number;
};

type OsrmRouteResponse = {
  code?: string;
  message?: string;
  routes?: Array<{
    distance?: number;
    duration?: number;
    legs?: OsrmLeg[];
    geometry?: OsrmGeometry;
  }>;
};

type OsrmTripResponse = {
  code?: string;
  message?: string;
  trips?: Array<{
    distance?: number;
    duration?: number;
    legs?: OsrmLeg[];
    geometry?: OsrmGeometry;
  }>;
  waypoints?: Array<{
    waypoint_index: number;
  }>;
};

function asLineGeometry(geometry: OsrmGeometry | undefined): TerritoryOptimizedRouteResponse['geometry'] {
  if (geometry?.type !== 'LineString' || !Array.isArray(geometry.coordinates)) {
    return null;
  }

  const coordinates = geometry.coordinates
    .filter((point): point is [number, number] => Array.isArray(point) && point.length === 2 && Number.isFinite(point[0]) && Number.isFinite(point[1]))
    .map((point) => [point[0], point[1]] as [number, number]);

  if (coordinates.length < 2) {
    return null;
  }

  return {
    type: 'LineString',
    coordinates,
  };
}

function formatCoord(stop: { lng: number; lat: number }) {
  return `${stop.lng},${stop.lat}`;
}

async function optimizeTwoStopRoute(mode: 'car' | 'bike', stops: TerritoryStop[]) {
  const profile = mode === 'car' ? 'driving' : 'cycling';
  const coordinates = stops.map(formatCoord).join(';');
  const url = `https://router.project-osrm.org/route/v1/${profile}/${coordinates}?steps=true&overview=full&geometries=geojson`;

  const response = await fetch(url, { cache: 'no-store' });
  const payload = (await response.json()) as OsrmRouteResponse;

  if (!response.ok || payload?.code !== 'Ok') {
    throw new Error(`OSRM route failed: ${payload?.message ?? response.statusText}`);
  }

  const route = payload.routes?.[0];
  if (!route) {
    throw new Error('OSRM route missing route payload');
  }

  const result: TerritoryOptimizedRouteResponse = {
    mode,
    orderedStopIds: [stops[0].id, stops[1].id],
    totalDistanceMeters: Math.round(route.distance ?? 0),
    totalDurationSeconds: Math.round(route.duration ?? 0),
    legs: [
      {
        fromStopId: stops[0].id,
        toStopId: stops[1].id,
        distanceMeters: Math.round(route.legs?.[0]?.distance ?? route.distance ?? 0),
        durationSeconds: Math.round(route.legs?.[0]?.duration ?? route.duration ?? 0),
      },
    ],
    geometry: asLineGeometry(route.geometry),
  };

  return result;
}

export async function POST(request: Request) {
  const access = await requireTerritoryApiAccess();
  if ('error' in access) {
    return access.error;
  }

  try {
    const body = await request.json();
    const { mode, stops } = requestSchema.parse(body);

    if (stops.length === 2) {
      const payload = await optimizeTwoStopRoute(mode, stops);
      return NextResponse.json(payload);
    }

    const profile = mode === 'car' ? 'driving' : 'cycling';
    const coordinates = stops.map(formatCoord).join(';');
    const url = `https://router.project-osrm.org/trip/v1/${profile}/${coordinates}?source=first&destination=last&roundtrip=false&steps=true&overview=full&geometries=geojson`;

    const response = await fetch(url, { cache: 'no-store' });
    const payload = (await response.json()) as OsrmTripResponse;

    if (!response.ok || payload?.code !== 'Ok') {
      return NextResponse.json(
        {
          error: payload?.message ?? 'OSRM optimization failed',
        },
        { status: 502 },
      );
    }

    const trip = payload.trips?.[0];
    const waypoints = Array.isArray(payload.waypoints) ? payload.waypoints : [];

    if (!trip || waypoints.length !== stops.length) {
      return NextResponse.json(
        {
          error: 'OSRM optimization response malformed',
        },
        { status: 502 },
      );
    }

    const orderedStops: TerritoryStop[] = waypoints
      .map((waypoint: { waypoint_index: number }, inputIndex: number) => ({ waypoint, inputIndex }))
      .sort((a: { waypoint: { waypoint_index: number }; inputIndex: number }, b: { waypoint: { waypoint_index: number }; inputIndex: number }) => a.waypoint.waypoint_index - b.waypoint.waypoint_index)
      .map((item: { waypoint: { waypoint_index: number }; inputIndex: number }) => stops[item.inputIndex]);

    const legs = (trip.legs ?? []).map((leg: OsrmLeg, index: number) => ({
      fromStopId: orderedStops[index]?.id ?? '',
      toStopId: orderedStops[index + 1]?.id ?? '',
      distanceMeters: Math.round(leg.distance ?? 0),
      durationSeconds: Math.round(leg.duration ?? 0),
    }));

    const result: TerritoryOptimizedRouteResponse = {
      mode,
      orderedStopIds: orderedStops.map((stop: TerritoryStop) => stop.id),
      totalDistanceMeters: Math.round(trip.distance ?? 0),
      totalDurationSeconds: Math.round(trip.duration ?? 0),
      legs,
      geometry: asLineGeometry(trip.geometry),
    };

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid optimize route payload',
          details: error.issues,
        },
        { status: 400 },
      );
    }

    const message = error instanceof Error ? error.message : 'Route optimization failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
