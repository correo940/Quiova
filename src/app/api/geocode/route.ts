import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q');
  if (!q || q.length < 2) return NextResponse.json([]);

  try {
    // Photon (Komoot) — geocoder pensado para búsqueda autocompletar, sin límites estrictos
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Quiova-App/1.0' },
      cache: 'no-store',
    });

    if (!res.ok) return NextResponse.json([]);
    const data = await res.json();

    const results = (data.features || []).map((f: any) => {
      const p = f.properties || {};
      const [lng, lat] = f.geometry?.coordinates || [];

      const nombre = p.name || p.street || p.city || p.display_name || 'Ubicación';
      const ciudad = p.city || p.town || p.village || p.county || p.state || '';
      const pais = p.country || '';
      const display = [ciudad !== nombre ? ciudad : '', pais].filter(Boolean).join(', ');

      return { nombre, display, lat, lng };
    }).filter((r: any) => typeof r.lat === 'number' && typeof r.lng === 'number');

    return NextResponse.json(results);
  } catch (e) {
    console.error('Geocode error:', e);
    return NextResponse.json([]);
  }
}
