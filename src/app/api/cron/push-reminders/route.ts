import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { differenceInDays, parseISO, addMonths } from 'date-fns';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

// Este cron se llama cada ~15 minutos (ver .github/workflows/push-reminders-cron.yml).
// Quioba no guarda el huso horario del usuario, así que asumimos Europe/Madrid
// (mercado único de la app). Si en el futuro se soportan otros países, habría
// que guardar el timezone por usuario y usarlo aquí en vez de la constante.
const TZ = 'Europe/Madrid';
const VEHICLE_CHECK_TIME = '09:00'; // hora fija diaria para avisos de ITV/seguro/mantenimiento
const WINDOW_MINUTES = 15;

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:soporte@quioba.com',
        vapidPublicKey,
        vapidPrivateKey
    );
}

function nowInMadrid(): { dateStr: string; minutesOfDay: number } {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: TZ,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).formatToParts(new Date());
    const get = (t: string) => parts.find((p) => p.type === t)!.value;
    const hour = Number(get('hour'));
    const minute = Number(get('minute'));
    return {
        dateStr: `${get('year')}-${get('month')}-${get('day')}`,
        minutesOfDay: hour * 60 + minute,
    };
}

// ¿"timeStr" (HH:MM) cayó dentro de los últimos WINDOW_MINUTES minutos?
function withinLastWindow(timeStr: string, nowMinutesOfDay: number): boolean {
    const [h, m] = timeStr.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return false;
    const diff = nowMinutesOfDay - (h * 60 + m);
    return diff >= 0 && diff < WINDOW_MINUTES;
}

async function alreadySent(userId: string, notifKey: string, dateStr: string): Promise<boolean> {
    const { data } = await supabaseAdmin
        .from('push_notification_log')
        .select('id')
        .eq('user_id', userId)
        .eq('notif_key', notifKey)
        .eq('sent_date', dateStr)
        .maybeSingle();
    return !!data;
}

async function markSent(userId: string, notifKey: string, dateStr: string) {
    await supabaseAdmin.from('push_notification_log').insert({ user_id: userId, notif_key: notifKey, sent_date: dateStr });
}

async function sendToUser(userId: string, payload: { title: string; body: string; url: string }): Promise<number> {
    const { data: subs } = await supabaseAdmin.from('push_subscriptions').select('*').eq('user_id', userId);
    if (!subs?.length) return 0;

    let delivered = 0;
    await Promise.all(
        subs.map(async (sub) => {
            try {
                await webpush.sendNotification(
                    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                    JSON.stringify(payload)
                );
                delivered++;
            } catch (err: any) {
                if (err?.statusCode === 404 || err?.statusCode === 410) {
                    // Suscripción caducada/revocada — la borramos.
                    await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
                } else {
                    console.error('[push-reminders] Error enviando push:', err?.statusCode, err?.message);
                }
            }
        })
    );
    return delivered;
}

export async function GET(req: Request) {
    const authHeader = req.headers.get('authorization');
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    if (!vapidPublicKey || !vapidPrivateKey) {
        return NextResponse.json({ error: 'VAPID keys no configuradas' }, { status: 500 });
    }

    const { dateStr, minutesOfDay } = nowInMadrid();
    let sent = 0;

    // ── Medicación ───────────────────────────────────────────────────────────
    const { data: medicines } = await supabaseAdmin
        .from('medicines')
        .select('id, user_id, name, dosage, alarm_times')
        .not('alarm_times', 'is', null);

    for (const med of medicines ?? []) {
        if (!Array.isArray(med.alarm_times)) continue;
        for (const time of med.alarm_times as string[]) {
            if (!withinLastWindow(time, minutesOfDay)) continue;
            const notifKey = `med_${med.id}_${time}`;
            if (await alreadySent(med.user_id, notifKey, dateStr)) continue;

            const delivered = await sendToUser(med.user_id, {
                title: '💊 Hora de tu medicación',
                body: `${med.name}${med.dosage ? ` — ${med.dosage}` : ''}`,
                url: '/apps/mi-hogar/pharmacy',
            });
            await markSent(med.user_id, notifKey, dateStr);
            sent += delivered;
        }
    }

    // ── Vehículos: ITV, seguro, aceite y ruedas por fecha ───────────────────
    if (withinLastWindow(VEHICLE_CHECK_TIME, minutesOfDay)) {
        const { data: vehicles } = await supabaseAdmin.from('vehicles').select('*');
        const now = new Date();

        for (const v of vehicles ?? []) {
            const notifyDays = v.notify_days_before || 30;
            const checks: Array<{ key: string; title: string; body: string }> = [];

            if (v.next_itv_date) {
                const days = differenceInDays(parseISO(v.next_itv_date), now);
                if (days >= 0 && days <= notifyDays) {
                    checks.push({
                        key: `itv_${v.id}`,
                        title: '📋 ITV Próxima',
                        body: `${v.name || v.brand}: la ITV caduca en ${days} días.`,
                    });
                }
            }
            if (v.insurance_expiry_date) {
                const days = differenceInDays(parseISO(v.insurance_expiry_date), now);
                if (days >= 0 && days <= notifyDays) {
                    checks.push({
                        key: `ins_${v.id}`,
                        title: '📄 Seguro Próximo a Vencer',
                        body: `${v.name || v.brand}: el seguro vence en ${days} días.`,
                    });
                }
            }
            if (v.last_oil_change_date) {
                const dueDate = addMonths(parseISO(v.last_oil_change_date), v.oil_change_interval_months || 12);
                const days = differenceInDays(dueDate, now);
                if (days >= 0 && days <= notifyDays) {
                    checks.push({
                        key: `oil_date_${v.id}`,
                        title: '🛢️ Cambio de Aceite',
                        body: `${v.name || v.brand}: toca cambio de aceite en ${days} días.`,
                    });
                }
            }
            if (v.last_tire_change_date) {
                const dueDate = addMonths(parseISO(v.last_tire_change_date), v.tire_change_interval_months || 48);
                const days = differenceInDays(dueDate, now);
                if (days >= 0 && days <= notifyDays) {
                    checks.push({
                        key: `tires_date_${v.id}`,
                        title: '🛞 Cambio de Ruedas',
                        body: `${v.name || v.brand}: toca cambio de ruedas en ${days} días.`,
                    });
                }
            }

            for (const c of checks) {
                if (await alreadySent(v.user_id, c.key, dateStr)) continue;
                const delivered = await sendToUser(v.user_id, { title: c.title, body: c.body, url: '/apps/mi-hogar/garage' });
                await markSent(v.user_id, c.key, dateStr);
                sent += delivered;
            }
        }
    }

    return NextResponse.json({ ok: true, sent, checkedAt: `${dateStr} ${Math.floor(minutesOfDay / 60)}:${String(minutesOfDay % 60).padStart(2, '0')}` });
}
