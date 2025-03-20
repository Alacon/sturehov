import { task } from "@trigger.dev/sdk/v3";
import ical from "node-ical";
import type { CalendarComponent, VEvent } from "node-ical";
import { supabaseAdmin } from "./lib/supabase";
//import sendMessage from "./lib/slack";

interface CalendarEvent {
    id: string;
    title: string;
    date: Date;
    start_time: string;
    end_time: string;
    team: string;
    type: "practice" | "game" | "tournament" | "other";
    description?: string;
    location?: string;
    url?: string;
}

interface EventInfo {
    team: string;
    type: "practice" | "game" | "tournament" | "other";
    title: string;
}

function parseEventString(input: string): EventInfo {
    const [description, teamPart] = input.split(" // ");
    const team = teamPart.replace(" - IK Sturehov", "").trim();

    let type: "practice" | "game" | "tournament" | "other";
    let title: string;

    if (description.startsWith("Träning")) {
        type = "practice";
        title = "Träning";
    } else if (description.startsWith("Match:")) {
        type = "game";
        title = description.replace("Match: ", "").trim();
    } else if (description.includes("Cup") || description.includes("Cupen")) {
        type = "tournament";
        title = description.trim();
    } else {
        type = "other";
        title = description.trim();
    }

    return { team, type, title };
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
                        .map((event: VEvent) => {
                            const startDate = event.start.toISOString().slice(0, 10); // yyyy-MM-dd format
                            const startTime = event.start.toTimeString().slice(0, 5); // HH:MM format
                            const endTime = event.end.toTimeString().slice(0, 5); // HH:MM format
                            
                            return {
                                id: event.uid,
                                ...parseEventString(event.summary),
                                date: new Date(startDate),
                                start_time: startTime,
                                end_time: endTime,
                                description: event.description,
                                location: event.location
                            };
                        });

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