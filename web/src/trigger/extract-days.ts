
import { task } from '@trigger.dev/sdk/v3';
import { createOpenAI } from '@ai-sdk/openai';
import { supabaseAdmin } from './lib/supabase';
import { APICallError, generateObject, TypeValidationError, type ImagePart, type TextPart } from 'ai';
import { generateUUID } from './lib/uuid';
import { ScheduleSchema, type Schedule } from './models/schedule';
import type { Days } from './models/days';

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
      .select('id,text, image')
      .eq('id', id)
      .limit(1)
      .maybeSingle();

    if (error || data == null) {
      console.error('Failed to fetch item', error);
    }

    const scheduleResponse = await extract(data?.image, data!.text)


    const days = scheduleResponse.schedules.map(schedule => {
      const { hours, date } = schedule;
      const uuid = generateUUID(schedule.date)
      return {
        id: uuid,
        date,
        hours
      } as Days
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

const extract = async (image: string, text: string): Promise<Schedule> => {
  const response = await generateObject({
    model: openai('gpt-4o-mini'),
    schema: ScheduleSchema,
    messages: [
      {
        role: 'system',
        content: `
         Your task is to extract a JSON object from the input text that strictly matches the provided schema. 
        - Each element in the array should represent a day.
        - Each day must include:
          - "hours": an array of objects where:
            - The keys are time slots in the format "HH-MM".
            - The values are arrays of three items representing the schedule for "KG1", "KG2", and "KG xtra (16x35m)" respectively. If no schedule exists, represent it as null.
          - "date": a string in ISO 8601 format (YYYY-MM-DD).
        - Input dates must be converted to ISO 8601 format.


      Example input for date:
      10-feb
      13-mar

      Example output for date:
      2025-02-10
      2025-03-13

        Example Input:
        Måndag KG1 KG2 KG xtra (16x35m) 29-jan 17-18 P12/P13 ÖA P15 18-19 F12 Damjun 19-20 Herr PU16
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
            "hours": [
              {
                "17-18": ["P12/P13", "ÖA", "P15"]
              },
              {
                "18-19": ["F12", "Damjun", null]
              },
              {
                "19-20": ["Herr", "PU16", null]
              }
            ],
            "date": "2025-01-13"
          },
          {
            "hours": [
              {
                "17-18": ["P10", "P11", "F13/14"]
              },
              {
                "18-19": ["PU19", "F11", "F13/14"]
              },
              {
                "19-20": ["Dam", "F09/10", null]
              }
            ],
            "date": "2025-01-14"
          }
        ],
        "explanation": "Add explanation here on how you found all"
      }
        - There is nothing in the image that indicates the year. Use the current year.
        - The month comes from the image. Either jan, feb, mar, apr, maj, jun, jul, aug, sep, okt, nov, dec.
        - The output must strictly match this format. Use the provided schema to validate your output.        
        `
      },
      {
        role: 'user',
        content: [{ type: 'text', text }, { type: 'image', image }] as Array<TextPart | ImagePart>
      }
    ]
  });

  const { object } = response;

  return object;
};
// Example usage:
// ScheduleSchema.parse(yourData);