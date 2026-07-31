'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

type MapEvent = {
    id: string;
    title: string;
    event_type: string;
    lat: number;
    lng: number;
};

const TYPE_ICON: Record<string, string> = {
    flight: '✈️',
    hotel: '🏨',
    activity: '🎟️',
    transport: '🚌',
    other: '📍',
};

export default function TripMap({
    events,
    pickMode,
    onPick,
}: {
    events: MapEvent[];
    pickMode?: boolean;
    onPick?: (lat: number, lng: number) => void;
}) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const pickMarkerRef = useRef<any>(null);
    const onPickRef = useRef(onPick);
    onPickRef.current = onPick;

    const buildMarkers = (L: any, map: any) => {
        map.eachLayer((layer: any) => {
            if (!layer._url && layer !== pickMarkerRef.current) map.removeLayer(layer);
        });

        if (events.length === 0) return;
        const bounds: [number, number][] = [];

        events.forEach((event) => {
            bounds.push([event.lat, event.lng]);
            const icon = L.divIcon({
                html: `<div style="background:#1a5c2e;color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:2px solid white">${TYPE_ICON[event.event_type] || '📍'}</div>`,
                className: '',
                iconSize: [32, 32],
                iconAnchor: [16, 16],
            });
            L.marker([event.lat, event.lng], { icon }).addTo(map).bindPopup(`<strong>${event.title}</strong>`);
        });

        if (bounds.length === 1) map.setView(bounds[0], 12);
        else map.fitBounds(bounds, { padding: [40, 40] });
    };

    useEffect(() => {
        if (!mapRef.current) return;

        import('leaflet').then((L) => {
            delete (L.Icon.Default.prototype as any)._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            });

            const container = mapRef.current! as any;
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
            if (container._leaflet_id) delete container._leaflet_id;

            const map = L.map(container).setView([40.4168, -3.7038], 5);
            mapInstanceRef.current = map;

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            }).addTo(map);

            map.on('click', (e: any) => {
                if (!onPickRef.current) return;
                const { lat, lng } = e.latlng;
                if (pickMarkerRef.current) map.removeLayer(pickMarkerRef.current);
                pickMarkerRef.current = L.marker([lat, lng]).addTo(map);
                onPickRef.current(lat, lng);
            });

            buildMarkers(L, map);
        });

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!mapInstanceRef.current) return;
        import('leaflet').then((L) => buildMarkers(L, mapInstanceRef.current));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [events]);

    return (
        <div
            ref={mapRef}
            style={{
                height: '320px',
                width: '100%',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid var(--border)',
                cursor: pickMode ? 'crosshair' : undefined,
            }}
        />
    );
}
