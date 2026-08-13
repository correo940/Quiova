import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const ADMIN_EMAIL = 'todojuntomirar@gmail.com';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get('days') || '7', 10);
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const [
    { data: totalViews },
    { data: uniqueSessions },
    { data: topPages },
    { data: dailyViews },
    { data: deviceBreakdown },
    { data: browserBreakdown },
    { data: countryBreakdown },
    { data: referrerBreakdown },
    { data: recentViews },
  ] = await Promise.all([
    supabaseAdmin.rpc('analytics_total_views', { since_date: since }),
    supabaseAdmin.rpc('analytics_unique_sessions', { since_date: since }),
    supabaseAdmin.rpc('analytics_top_pages', { since_date: since, lim: 10 }),
    supabaseAdmin.rpc('analytics_daily_views', { since_date: since }),
    supabaseAdmin.rpc('analytics_device_breakdown', { since_date: since }),
    supabaseAdmin.rpc('analytics_browser_breakdown', { since_date: since }),
    supabaseAdmin.rpc('analytics_country_breakdown', { since_date: since }),
    supabaseAdmin.rpc('analytics_referrer_breakdown', { since_date: since }),
    supabaseAdmin
      .from('page_views')
      .select('path, device, browser, country, city, referrer, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  return NextResponse.json({
    totalViews,
    uniqueSessions,
    topPages,
    dailyViews,
    deviceBreakdown,
    browserBreakdown,
    countryBreakdown,
    referrerBreakdown,
    recentViews,
  });
}
