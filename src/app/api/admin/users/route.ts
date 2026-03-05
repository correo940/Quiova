import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch all users safely via the admin API
        const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();

        if (error) {
            console.error('[Admin Users API] Error fetching users:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Only return necessary fields to the frontend
        const safeUsers = users.map(user => ({
            id: user.id,
            email: user.email,
            created_at: user.created_at,
            last_sign_in_at: user.last_sign_in_at
        }));

        return NextResponse.json({ users: safeUsers });
    } catch (error) {
        console.error('[Admin Users API] Server error:', error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
