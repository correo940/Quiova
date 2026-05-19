'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

export default function MapComponent({ porUbicacion, parseUbicacion, catColors, catIcons }: any) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  const buildMarkers = (L: any, map: any) => {
    // Remove existing markers (but keep tile layer)
    map.eachLayer((layer: any) => {
      if (!layer._url) map.removeLayer(layer);
    });

    const entries = Object.entries(porUbicacion);
    if (entries.length === 0) return;

    const bounds: [number, number][] = [];

    entries.forEach(([ub, gastos]: any) => {
      const coord = parseUbicacion(ub);
      if (!coord) return;

      bounds.push([coord.lat, coord.lng]);
      const tot = gastos.reduce((s: number, x: any) => s + Number(x.monto), 0);
      const cat = gastos[gastos.length - 1].cat;
      const color = catColors[cat] || '#3B6D11';
      const icon = catIcons[cat] || '📌';

      const customIcon = L.divIcon({
        html: `<div style="background:${color};color:white;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:17px;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:2px solid white">${icon}</div>`,
        className: '',
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      const popupHtml = `
        <div style="min-width:160px;font-family:system-ui,sans-serif">
          <div style="font-weight:700;font-size:14px;margin-bottom:4px">${coord.nombre}</div>
          <div style="font-size:12px;color:#666;margin-bottom:8px">Total: <strong style="color:${color}">${tot.toFixed(2)} €</strong></div>
          <div style="max-height:120px;overflow-y:auto">
            ${gastos.map((g: any) => `<div style="font-size:11px;padding:3px 0;border-bottom:1px solid #eee">${g.desc} — ${Number(g.monto).toFixed(2)} ${g.divisa}</div>`).join('')}
          </div>
        </div>`;

      L.marker([coord.lat, coord.lng], { icon: customIcon })
        .addTo(map)
        .bindPopup(popupHtml);
    });

    if (bounds.length === 1) {
      map.setView(bounds[0], 14);
    } else if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  };

  useEffect(() => {
    if (!mapRef.current) return;

    import('leaflet').then(L => {
      // Fix default marker icons
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
    import('leaflet').then(L => buildMarkers(L, mapInstanceRef.current));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [porUbicacion]);

  return (
    <div
      ref={mapRef}
      style={{ height: '380px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}
    />
  );
}
