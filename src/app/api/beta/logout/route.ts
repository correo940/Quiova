import { NextRequest, NextResponse } from 'next/server';
import { BETA_COOKIE } from '@/lib/beta/constants';

export const dynamic = 'force-dynamic';

// Borra la cookie beta_token y redirige a /beta.
// Seguro llamarlo desde un <a href> normal o fetch.
export async function GET(req: NextRequest) {
    const res = NextResponse.redirect(new URL('/beta', req.url));
    res.cookies.set(BETA_COOKIE, '', {
        httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
        path: '/', maxAge: 0,   // borra la cookie inmediatamente
    });
    return res;
}
