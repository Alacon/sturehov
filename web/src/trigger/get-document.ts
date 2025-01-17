import { task } from "@trigger.dev/sdk/v3";
import { supabaseAdmin } from "./lib/supabase";
import { getPdfData, getPdfImage } from "./lib/pdf";
import { extractDaysTask } from "./extract-days";

type Schedule = {
    id: string,
    title: string,
    path: string,
    text: string,
    image: string,
    created: Date | undefined,
    modified: Date | undefined
}

export const getDocument = task({
    id: "get-document",
    queue: {
        concurrencyLimit: 5,
    },
    maxDuration: 60,
    machine: { preset: 'micro' },
    run: async ({ title, path }: { title: string, path: string }) => {

        const url = `https://www.svenskalag.se/iksturehov${path}`;
        const id = path.replace('/dokument/', '');

        const { text,meta } = await getPdfData(url);
        const item: Schedule = {
            id,
            title,
            path,
            text,
            image: '',
            ...meta,
        }
        const { data, error } = await supabaseAdmin.from('schedules').select('id,modified').eq('id', id).limit(1).maybeSingle();
        if (error) {
            console.error('Failed to fetch item', error);
        }

        if ((data && meta.modified && data.modified < meta.modified) || !data || !meta.modified) {
            const s = await getPdfImage(url);
            if (!s) {
                throw new Error('Failed to fetch image');
            }
            item.image = s;


            await supabaseAdmin.from('schedules')
                .upsert(item)
                .throwOnError();
            return extractDaysTask.trigger({ id: item.id })
        }else{
            console.log('Already up to date');
            return extractDaysTask.trigger({ id: item.id })
        }
        return item;
    },
});

