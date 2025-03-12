
import { task } from '@trigger.dev/sdk/v3';
import { createOpenAI } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { supabaseAdmin } from './lib/supabase';
import { APICallError, generateObject, TypeValidationError, type FilePart } from 'ai';
import { generateUUID } from './lib/uuid';
import { ScheduleSchema, type Schedule } from './models/schedule';
import type { Days } from './models/days';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? ''
});

const gemini = google('gemini-2.0-flash-001');


export const extractDaysTask = task({
  id: "extract-days",
  retry: {
    maxAttempts: 1,
  },
  queue: {
    concurrencyLimit: 5,
  },
  maxDuration: 60,
  machine: { preset: 'micro' },
  run: async ({ id }: { id: string }) => {

    const { data, error } = await supabaseAdmin
      .from('schedules')
      .select('id,text, slug, modified')
      .eq('id', id)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      console.error('Failed to fetch item', error);
      return;
    }

    const arrayBuffer = await supabaseAdmin.storage.from('schedules')
      .download(`${data.slug}/${data.modified.slice(0, 10)}.pdf`)
      .then(async res => await res.data?.arrayBuffer())

    if (!arrayBuffer) {
      console.error('Failed to fetch pdf');
      return;
    }
    console.log('arrayBuffer', arrayBuffer);
    

    const scheduleResponse = await extract(arrayBuffer)

    const days = scheduleResponse.schedules.map(schedule => {
      const { hours, date } = schedule;
      const uuid = generateUUID(schedule.date);
      
      // Transform the hours format to match the Days interface
      const transformedHours = hours.map(hour => {
        const { time_slot, entries } = hour;
        return { [time_slot]: entries };
      });
      
      return {
        id: uuid,
        date,
        hours: transformedHours
      };
    });

    const { error: dayError } = await supabaseAdmin
      .from('days')
      .upsert(days, { onConflict: 'id' });

    if (dayError) console.log('dayError', dayError)

    return {
      id,
      text: days
    }
  },
  handleError(payload, error) {
    console.log('Error', error);

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

const extract = async (buffer: ArrayBuffer): Promise<Schedule> => {
  console.log('extract');

  const prompt = `Your task is to extract a JSON object from the provided PDF, which contains a schedule table, and format it strictly according to the provided schema. The table includes days of the week, dates, time slots, and activities for "KG1", "KG2", and "KG xtra (16x35m)". Follow these instructions:

- Each element in the "schedules" array represents one day and must include "date" and "hours".
- For each day, include:
  - "date": Convert the input date (e.g., "24-feb") to ISO 8601 format (YYYY-MM-DD). Use the current year, 2025, since no year is provided in the PDF.
  - "hours": An array of objects (at least one object) where each object has:
    - "time_slot": A string representing the time slot. Normalize the format as follows:
      - If the input is "HH-MM" (e.g., "17-18"), use it as is.
      - If the input is "HH:MM-HH:MM" (e.g., "15:30-16:30"), use it as is.
      - If the input mixes formats (e.g., "10:30-13" or "15-17.15"), convert to "HH:MM-HH:MM" by assuming missing minutes are "00" and replacing dots with colons (e.g., "10:30-13" becomes "10:30-13:00", "15-17.15" becomes "15:00-17:15").
    - "entries": An array of exactly 3 nullable strings representing the schedule for "KG1", "KG2", and "KG xtra (16x35m)" respectively. If no activity is listed, use null.
- Map the table columns as follows:
  - First column: Day of the week and date (e.g., "Måndag 24-feb").
  - Subsequent columns: Time slots and activities for KG1, KG2, and KG xtra.
- Handle overlapping or missing data by using null where no activity is specified.
- The output must strictly adhere to the provided schema.

Example Input (table snippet):
| Måndag 24-feb | KG1    | KG2    | KG xtra (16x35m) |
|---------------|--------|--------|------------------|
| 15:30-16:30   | P12/P13| ÖA     | P15              |
| 15-17.15      | ÖreBois| null   | null             |
| 17-18         | P12/P13| ÖA     | P15              |
| 18-19         | SMA    | DamU   | F12              |
| 19-20         | Herr   | PU16   | null             |

Example Output:
{
  "schedules": [
    {
      "date": "2025-02-24",
      "hours": [
        {
          "time_slot": "15:30-16:30",
          "entries": ["P12/P13", "ÖA", "P15"]
        },
        {
          "time_slot": "15:00-17:15",
          "entries": ["ÖreBois", null, null]
        },
        {
          "time_slot": "17-18",
          "entries": ["P12/P13", "ÖA", "P15"]
        },
        {
          "time_slot": "18-19",
          "entries": ["SMA", "DamU", "F12"]
        },
        {
          "time_slot": "19-20",
          "entries": ["Herr", "PU16", null]
        }
      ]
    }
  ],
  "explanation": "The schedule was extracted from the PDF table. Dates were converted to ISO 8601 format using 2025 as the year. Time slots were normalized to 'HH-MM' or 'HH:MM-HH:MM' format by converting mixed formats like '15-17.15' to '15:00-17:15'. Activities were mapped to the corresponding KG1, KG2, and KG xtra columns."
}

- Process the entire table in the PDF and generate the complete schedule.
- If a cell is empty or unclear, use null for that entry.
`;
  
  const response = await generateObject({
    model: gemini,
    schema: ScheduleSchema,
    messages: [
      {
        role: 'system',
        content: prompt
      },
      {
        role: 'user',
        content: [{
          type: 'file',
          data: buffer,
          mimeType: 'application/pdf'
        }] as Array<FilePart>
      }
    ]
  });
  const { object } = response;

  return object;
};
// Example usage:
// ScheduleSchema.parse(yourData);