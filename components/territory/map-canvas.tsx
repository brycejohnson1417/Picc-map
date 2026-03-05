'use client';

import { useMemo } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import type { TerritoryStorePin } from '@/lib/territory/types';

interface MapCanvasProps {
    stores: TerritoryStorePin[];
    selectedStopIds: string[];
    focusedStoreId: string | null;
    onSelectStore: (storeId: string) => void;
}

const FALLBACK_CENTER = { lat: 39.8283, lng: -98.5795 };
const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export function MapCanvas({
    stores,
    selectedStopIds,
    focusedStoreId,
    onSelectStore,
}: MapCanvasProps) {
    const selectedSet = useMemo(() => new Set(selectedStopIds), [selectedStopIds]);

    const mapCenter = useMemo(() => {
        if (stores.length === 0) return FALLBACK_CENTER;
        const focus = focusedStoreId ? stores.find((s) => s.id === focusedStoreId) : null;
        if (focus) return { lat: focus.lat, lng: focus.lng };
        return { lat: stores[0].lat, lng: stores[0].lng };
    }, [stores, focusedStoreId]);

    return (
        <div className="h-full w-full">
            <APIProvider apiKey={GOOGLE_MAPS_KEY}>
                <Map
                    defaultCenter={mapCenter}
                    defaultZoom={6}
                    mapId="picc_crm_map_id" // Use mapId to enable AdvancedMarkerElement
                    disableDefaultUI={true}
                    gestureHandling="greedy"
                >
                    {stores.map((store) => {
                        const isSelected = selectedSet.has(store.id);

                        return (
                            <AdvancedMarker
                                key={store.id}
                                position={{ lat: store.lat, lng: store.lng }}
                                onClick={() => onSelectStore(store.id)}
                            >
                                <Pin
                                    background={isSelected ? '#0f172a' : store.statusColor || '#3b82f6'}
                                    borderColor={isSelected ? '#ffffff' : '#1e293b'}
                                    glyphColor={isSelected ? '#ffffff' : '#1e293b'}
                                />
                            </AdvancedMarker>
                        );
                    })}
                </Map>
            </APIProvider>
        </div>
    );
}
