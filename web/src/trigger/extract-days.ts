
import { task } from '@trigger.dev/sdk/v3';
import { createOpenAI } from '@ai-sdk/openai';
import { supabaseAdmin } from './lib/supabase';
import { z } from 'zod';
import { APICallError, generateObject, TypeValidationError } from 'ai';
import { generateUUID } from './lib/uuid';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? ''
});

export const extractDaysTask = task({
  id: "extract-days",
  queue: {
    concurrencyLimit: 5,
  },
  maxDuration: 60,
  machine: { preset: 'micro' },
  run: async ({ id }: { id: string }) => {

    const { data, error } = await supabaseAdmin
      .from('schedules')
      .select('id,text')
      .eq('id', id)
      .limit(1)
      .maybeSingle();

    if (error || data == null) {
      console.error('Failed to fetch item', error);
    }

    const scheduleResponse = await extract(data!.text)

    const days = scheduleResponse.schedules.map(schedule => {
      const { KG1, KG2, date } = schedule;
      const uuid = generateUUID(schedule.date)
      return {
        id: uuid,
        date,
        kg1: KG1,
        kg2: KG2,
        kg_extra: schedule['KG xtra (16x35m)']
      } as Days
    });

    const { error: dayError } = await supabaseAdmin
      .from('days')
      .upsert(days, { onConflict: 'id' });

    if (dayError) console.log('dayError',dayError)

    return {
      id,
      text: scheduleResponse.schedules
    }
  },
  handleError(error) {
    if (error instanceof APICallError) {
      if (!error.statusCode) {
        return {
          skipRetrying: true,
        };
      }

      if (error.statusCode === 401 || error.statusCode === 429 || error.statusCode === 503) {
        return {
          skipRetrying: true,
        };
      }
    } else if (error instanceof TypeValidationError) {
      return {
        skipRetrying: true,
      };
    }

    //returning undefined means the normal retrying logic will be used
    return;
  },
});

const TimeSlotSchema = z.record(z.union([z.string(), z.null()]));

const DayScheduleSchema = z.object({
  KG1: TimeSlotSchema,
  KG2: TimeSlotSchema,
  "KG xtra (16x35m)": TimeSlotSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid ISO 8601 date format")
});

const ScheduleSchema = z.object({
  schedules: z.array(DayScheduleSchema),
});

const extract = async (text: string): Promise<ScheduleResponse> => {
  const {object} = await generateObject({
    model: openai('gpt-4o-mini'),
    schema: ScheduleSchema,

    messages: [
      {
        role: 'system',
        content: `
          Your task is to extract a JSON object from the input text that strictly matches the provided schema. 
        - Each element in the array should represent a day.
        - Include keys "KG1", "KG2", "KG xtra (16x35m)", and "Datum".
        - Dates must be in ISO 8601 format (YYYY-MM-DD).
        - If a time slot is empty, represent it as null.
        
        Example Input:
        Måndag KG1 KG2 KG xtra (16x35m) 20-jan 17-18 P12/P13 ÖA P15 18-19 F12 Damjun 19-20 Herr PU16

        Example Output:
    {
      "schedules": [
        {
          "KG1": {
            "16-17": null,
            "17-18": "P12/P13",
            "18-19": "F12",
            "19-20": "Herr"
          },
          "KG2": {
            "16-17": null,
            "17-18": "ÖA",
            "18-19": "Damjun",
            "19-20": "PU16"
          },
          "KG xtra (16x35m)": {
            "16-17": null,
            "17-18": "P15",
            "18-19": null,
            "19-20": null
          },
          "date": "2025-01-20"
        }
      ]
    }
    The output must strictly match this format.
        `
      },
      {
        role: 'user',
        content: text
      }
    ]
  });

  return object;
};
// Example usage:
// ScheduleSchema.parse(yourData);
