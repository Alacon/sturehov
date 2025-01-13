
import { task } from '@trigger.dev/sdk/v3';
import { createOpenAI } from '@ai-sdk/openai';
import { supabaseAdmin } from './lib/supabase';
import { APICallError, generateObject, TypeValidationError } from 'ai';
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

    console.log(ScheduleSchema.parse(sData));


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

const extract = async (text: string): Promise<Schedule> => {
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
        ]
      }
        - The output must strictly match this format.        
        `
      },
      {
        role: 'user',
        content: text
      }
    ]
  });

  const { object } = response;
  console.log('object', object);

  return object;
};
// Example usage:
// ScheduleSchema.parse(yourData);
const sData = { "schedules": [{ "hours": [{ "17-18": ["P12/P13", "ÖA", "P15"] }, { "18-19": ["SMÅ IF", "SMÅ IF", "F12"] }, { "19-20": ["Herr", "PU16/DamJun", null] }], "date": "2025-02-17" }, { "hours": [{ "17-18": ["P10", "P11", "F13/14"] }, { "18-19": ["PU19", "F11", "F13/14"] }, { "19-20": ["Dam", "F09/10", null] }], "date": "2025-02-18" }, { "hours": [{ "16-17": [null] }, { "17-18": ["DamJun", "PU16", "P14"] }, { "18-19": ["P12", "F11/F12", null] }, { "19-20": ["Herr", "Herr", null] }], "date": "2025-02-19" }, { "hours": [{ "16-17": ["P15", null, null] }, { "17-18": ["F09/10", "ÖA", "P15"] }, { "18-19": ["P10", "P11", "F15"] }, { "19-20": ["Dam", "PU19", null] }], "date": "2025-02-20" }, { "hours": [{ "15-16": ["Flick/Dam", null, null] }, { "16-17": ["P10", "P11", null] }, { "17-18": ["P13", "P14", null] }, { "18-19": ["PU19", "PU19", null] }], "date": "2025-02-21" }, { "hours": [{ "10-11": ["Dam", "Matchtid", null] }, { "11-12": ["Dam", "Matchtid", null] }, { "12-13": ["F12", null, null] }, { "13-14": ["F13/14", "F15", null] }, { "14-15": [null] }], "date": "2025-02-22" }, { "hours": [{ "9-10": ["P16", null, null] }, { "10-11": ["Östra almby", null, null] }, { "11-12": ["F14/F16", "P17", null] }, { "12-13": ["Matchtid", null, null] }, { "13-14": ["Matchtid", null, null] }, { "14-15": ["P14", "Vlad", "Målvaktsskola"] }, { "15-16": ["F13/14", "P13", null] }, { "16-17": ["P15", "P12", null] }, { "17-18": ["P18r", "P18b", null] }], "date": "2025-02-23" }] }