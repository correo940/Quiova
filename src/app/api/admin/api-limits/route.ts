import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Get global limits
        const { data: globalLimits, error: globalError } = await supabaseAdmin
            .from('api_limits')
            .select('*')
            .order('endpoint');

        // Get custom user limits correctly (just joining user_id)
        // Since we can't easily join auth.users in standard supabase select without special setups,
        // we will return the user_ids and attach the emails on the frontend using the /api/admin/users list
        const { data: customLimits, error: customError } = await supabaseAdmin
            .from('user_api_limits')
            .select('*')
            .order('created_at', { ascending: false });

        if (globalError || customError) {
            console.error('[Admin API Limits] Error fetching:', globalError || customError);
            return NextResponse.json({ error: "Database error" }, { status: 500 });
        }

        return NextResponse.json({
            globalLimits: globalLimits || [],
            customLimits: customLimits || []
        });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { type, ...payload } = body;

        if (type === 'global') {
            const { id, monthly_limit, enabled } = payload;
            const { error } = await supabaseAdmin
                .from('api_limits')
                .update({ monthly_limit, enabled })
                .eq('id', id);

            if (error) throw error;
            return NextResponse.json({ success: true });
        }
        else if (type === 'custom') {
            const { user_id, endpoint, monthly_limit } = payload;

            // Upsert custom limit
            const { error } = await supabaseAdmin
                .from('user_api_limits')
                .upsert({ user_id, endpoint, monthly_limit }, { onConflict: 'user_id, endpoint' });

            if (error) throw error;
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    } catch (error: any) {
        console.error('[Admin API Limits] POST Error:', error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const url = new URL(req.url);
        const id = url.searchParams.get('id');

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        const { error } = await supabaseAdmin
            .from('user_api_limits')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
