import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { BETA_COOKIE, siteUrl } from '@/lib/beta/constants';
import { getBetaUserByToken, getUserRank, getCompetitionData, syncEmailVerification } from '@/lib/beta/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { buildDashboard } from '@/lib/beta/dashboard';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';

export default async function BetaDashboardPage({
    searchParams,
}: {
    searchParams: { t?: string };
}) {
    const token = searchParams.t || cookies().get(BETA_COOKIE)?.value;
    const user = await getBetaUserByToken(token);
    if (!user) redirect('/beta');

    // Sincronizar verificación antes de construir el dashboard
    const emailVerified = await syncEmailVerification(user);

    // Todas las queries en paralelo — misma fuente de datos que el ranking público.
    const [data, rank, competition, referralRankRes] = await Promise.all([
        buildDashboard(user),
        getUserRank(user.id),
        getCompetitionData(),
        supabaseAdmin.rpc('beta_user_referral_rank', { p_user_id: user.id }),
    ]);
    const referralRank = (referralRankRes.data as number | null) ?? 0;

    const { totalParticipants, leaderPoints, top10Points, top50Points } = competition;
    const inTop10  = top10Points === null || rank <= 10;
    const inTop50  = top50Points === null || rank <= 50;
    const pointsToTop10  = !inTop10  && top10Points  != null ? Math.max(1, top10Points  - user.points + 1) : 0;
    const pointsToTop50  = !inTop50  && top50Points  != null ? Math.max(1, top50Points  - user.points + 1) : 0;
    const refLink = `${siteUrl()}/beta?ref=${user.referral_code}`;

    return (
        <DashboardClient
            data={data}
            rank={rank}
            totalParticipants={totalParticipants}
            leaderPoints={leaderPoints}
            inTop10={inTop10}
            inTop50={inTop50}
            pointsToTop10={pointsToTop10}
            pointsToTop50={pointsToTop50}
            refLink={refLink}
            unreadCount={data.unreadCount}
            referralRank={referralRank}
            emailVerified={emailVerified}
            email={user.email}
        />
    );
}
