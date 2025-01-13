import { z } from "zod";

export const ScheduleSchema = z.object({
    schedules: z.array(
        z.object({
            date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid ISO 8601 date format'),
            hours: z.array(
                z.record(
                    z.string().regex(/^\d{1,2}-\d{1,2}$/, 'Invalid time slot format (HH-HH)'),
                    z.array(z.string().nullable()).default([null, null, null]) // Exactly 3 entries for KG1, KG2, KG xtra
                )
            ),
        })
    ),
});

export type Schedule = z.infer<typeof ScheduleSchema>;