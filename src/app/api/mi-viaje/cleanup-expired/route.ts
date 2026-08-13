import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

const BUCKET = 'trip-documents';

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: expired, error } = await supabaseAdmin
        .from('trip_assets')
        .select('id, file_path')
        .not('file_path', 'is', null)
        .lt('expires_at', new Date().toISOString());

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!expired || expired.length === 0) {
        return NextResponse.json({ deleted: 0 });
    }

    const paths = expired.map((row) => row.file_path as string);
    await supabaseAdmin.storage.from(BUCKET).remove(paths);

    const now = new Date().toISOString();
    await supabaseAdmin
        .from('trip_assets')
        .update({ file_path: null, photo_deleted_at: now })
        .in('id', expired.map((row) => row.id));

    return NextResponse.json({ deleted: expired.length });
}
