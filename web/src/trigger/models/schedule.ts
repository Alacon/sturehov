import { z } from "zod";

export const ScheduleSchema = z.object({
    schedules: z.array(
        z.object({
            date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid ISO 8601 date format'),
            hours: z.array(
                z.object({
                    time_slot: z.string().regex(
                        /^(?:\d{1,2}(?::\d{2})?-\d{1,2}(?::\d{2}|\.\d{2})?)$/,
                        'Invalid time slot format (e.g., "17-18", "15:30-16:30", or "15-17.15")'
                    ),
                    entries: z.array(z.string().nullable())
                        .length(3)
                        .default([null, null, null])

                }).strict()
            ).min(1),
        }).strict().refine((data) => data.date && data.hours.length > 0, {
            message: 'date and hours are required',
            path: ['date', 'hours'],
        })
    ).min(1), // Ensure at least one schedule entry
    explanation: z.string().min(1),
});

export type Schedule = z.infer<typeof ScheduleSchema>;