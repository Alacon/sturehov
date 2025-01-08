import { task } from "@trigger.dev/sdk/v3";
import { supabaseAdmin } from "./lib/supabase";
import { getPdfData } from "./lib/pdf";

type Schedule = {
    id: string,
    title: string,
    path: string,
    text: string,
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

        const { text, meta } = await getPdfData(url);

        const id = path.replace('/dokument/', '');
        const item: Schedule = {
            id,
            title,
            path,
            text,
            ...meta,
        }

        const { data, error } = await supabaseAdmin.from('schedules').select('id,modified').eq('id', id).limit(1).maybeSingle();
        if (error) {
            console.error('Failed to fetch item', error);
        }

        if ((data && item.modified && data.modified < item.modified) || !data || !item.modified) {
            console.log('Upserting item', item);
            await supabaseAdmin.from('schedules')
                .upsert(item)
                .throwOnError();
        }
        return item;
    },
});

