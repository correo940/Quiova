import { LocalNotifications } from '@capacitor/local-notifications';
import { toast } from 'sonner';

export const NotificationManager = {
    async requestPermissions() {
        try {
            const result = await LocalNotifications.requestPermissions();
            return result.display === 'granted';
        } catch (e) {
            console.error('Error requesting notification permissions:', e);
            return false;
        }
    },

    async schedule(options: {
        id: number;
        title: string;
        body: string;
        schedule: { at?: Date; every?: 'year' | 'month' | 'two-weeks' | 'week' | 'day' | 'hour' | 'minute' | 'second' };
        extra?: any;
    }) {
        try {
            // Check/Request permission on fly? Better to rely on component doing it, but safe check here.
            // (Skipping permission check here to avoid spamming prompts, assume caller handles it or it fails silently)

            await LocalNotifications.schedule({
                notifications: [
                    {
                        id: options.id,
                        title: options.title,
                        body: options.body,
                        schedule: options.schedule,
                        sound: undefined,
                        attachments: undefined,
                        actionTypeId: "",
                        extra: options.extra
                    }
                ]
            });
            console.log(`Notification scheduled: ${options.title} at ${options.schedule.at}`);
            return true;
        } catch (e) {
            console.error('Error scheduling notification:', e);
            return false;
        }
    },

    async cancel(ids: number[]) {
        try {
            await LocalNotifications.cancel({ notifications: ids.map(id => ({ id })) });
        } catch (e) {
            console.error('Error cancelling notifications:', e);
        }
    },

    // Hash function to turn string IDs (UUIDs) into unique Integers for Android notifications
    generateId(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash); // Ensure positive
    }
};
