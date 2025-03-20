import { task } from "@trigger.dev/sdk/v3";
import ical from "node-ical";
import type { CalendarComponent, VEvent } from "node-ical";
import { supabaseAdmin } from "./lib/supabase";
//import sendMessage from "./lib/slack";

interface CalendarEvent {
    id: string;
    title: string;
    start_time: Date;
    end_time: Date;
    description?: string;
    location?: string;
    url?: string;
}

export const getCalendar = task({
    id: "get-calendar",
    queue: {
        concurrencyLimit: 5,
    },
    maxDuration: 60,
    machine: { preset: 'micro' },
    run: async () => {
        // Replace this URL with your actual webcal URL
        const webcalUrl = process.env.CALENDAR_URL;
        if (!webcalUrl) {
            throw new Error("CALENDAR_URL environment variable is not set");
        }

        // Convert webcal:// to https://
        const httpsUrl = webcalUrl.replace('webcal://', 'https://');

        try {
            const events = await new Promise<CalendarEvent[]>((resolve, reject) => {
                ical.fromURL(httpsUrl, {}, (err, data) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    const calendarEvents: CalendarEvent[] = Object.values(data)
                        .filter((event: CalendarComponent): event is VEvent => event.type === 'VEVENT')
                        .map((event: VEvent) => ({
                            id: event.uid,
                            title: event.summary,
                            start_time: event.start,
                            end_time: event.end,
                            description: event.description,
                            location: event.location,
                            url: event.url
                        }));

                    resolve(calendarEvents);
                });
            });

            // Store events in Supabase
            const { error } = await supabaseAdmin
                .from('calendar_events')
                .upsert(events, { onConflict: 'id' });

            if (error) {
                console.error('Failed to store calendar events:', error);
                throw error;
            }

            // Send notification about new/updated events
            /* await sendMessage({
               title: `Calendar Updated`,
               modified: new Date().toISOString().slice(0, 10),
               url: webcalUrl
             });*/

            return {
                success: true,
                eventsProcessed: events.length
            };
        } catch (error) {
            console.error('Failed to process calendar:', error);
            throw error;
        }
    },
}); 