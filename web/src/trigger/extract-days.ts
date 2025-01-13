
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

    if (dayError) console.log('dayError', dayError)

    return {
      id,
      text: scheduleResponse.schedules
    }
  },
  handleError(payload, error, params) {
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
  const response = await generateObject({
    model: openai('gpt-4o-mini'),
    schema: ScheduleSchema,

    messages: [
      {
        role: 'system',
        content: `
          Your task is to extract a JSON object from the input text that strictly matches the provided schema. 
        - Each element in the array should represent a day.
        - Include keys "KG1", "KG2", "KG xtra (16x35m)", and "date".
        - Dates must be in ISO 8601 format (YYYY-MM-DD).
        - If a time slot is empty, represent it as null.
        
        Example Input:
        Måndag KG1 KG2 KG xtra (16x35m) 13-jan 17-18 P12/P13 ÖA P15 18-19 F12 Damjun 19-20 Herr PU16
        Tisdag KG1 KG2 KG xtra (16x35m) 14-jan 17-18 P10 P11 F13/14 18-19 PU19 F11 F13/14 19-20 Dam F09/10
        Onsdag KG1 KG2 KG xtra (16x35m) 15-jan 16-17 F15 17-18 DamJun PU16 P14 18-19 P12 F11/F12 19-20 Herr Herr
        Torsdag KG1 KG2 KG xtra (16x35m) 16-jan 17-18 F09/10 ÖA P15 18-19 P10 P11 19-20 Dam PU19
        Fredag KG1 KG2 KG xtra (16x35m) 17-jan 15-16 Flick/Dam 16-17 P10 P11 17-18 P13 P14 18-19 PU19 PU19
        Lördag KG1 KG2 KG xtra (16x35m) 18-jan 10.-11 Dam Matchtid 11.-12 Dam Matchtid 12.-13 F12 13.-14 F13/14 F15 14.-15
        Söndag KG1 KG2 KG xtra (16x35m) 19-jan 9.-10 P16 10.-11 Östra almby 11.-12 F14/F16 P17 12.-13 Matchtid 13.-14 Matchtid 14.-15 P14 Vlad Målvaktsskola 15.-16 P13 16.-17 P15 P12 17.-18 P18r P18b

        Example Output:
    {
      "schedules": [
        {
          "KG1": {"17-18": "P12/P13", "18-19": "F12", "19-20": "Herr"},
          "KG2": {"17-18": "ÖA", "18-19": "Damjun", "19-20": "PU16"},
          "KG xtra": {"17-18": "P15", "18-19": null, "19-20": null},
          "date": "2025-01-13"
        },
        {...},
        {...},
        {...},
        {
          "KG1": {"15-16": "Flick/Dam", "16-17": "P10", "17-18": "P13", "18-19": "PU19"},
          "KG2": {"15-16": null, "16-17": "P11", "17-18": "P14", "18-19": "PU19"},
          "KG xtra": {"15-16": null, "16-17": null, "17-18": null, "18-19": null},
          "date": "2025-01-17"
        },
        {...},
        {...}
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

  const { object } = response;
  return object;
};
// Example usage:
// ScheduleSchema.parse(yourData);
