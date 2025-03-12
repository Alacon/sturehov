import { task } from "@trigger.dev/sdk/v3";
import { supabaseAdmin } from "./lib/supabase";
import { getPdfData, getPdfImage } from "./lib/pdf";
import { extractDaysTask } from "./extract-days";
import sendMessage from "./lib/slack";

type Schedule = {
    id: string,
    title: string,
    path: string,
    text: string,
    image: string,
    slug: string,
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

        const { text, meta } = await getPdfData(url);
        const slug = title.replace(/\s+/g, '_').replace('.pdf', '').toLowerCase();
        const item: Schedule = {
            id,
            title,
            path,
            text,
            image: '',
            slug,
            ...meta,
        }

        const { data, error } = await supabaseAdmin.from('schedules').select('id,modified').eq('id', id).limit(1).maybeSingle();
        if (error) {
            console.error('Failed to fetch item', error);
        }


        const currentModified = data?.modified ? new Date(data.modified).getTime() : 0;
        const newModified = meta.modified ? new Date(meta.modified).getTime() : 0;
        const fileName = meta.modified?.toISOString().slice(0, 10) ?? new Date().toISOString().slice(0, 10);

        if ((data && meta.modified && currentModified < newModified)) {
            await sendMessage({
                title: `Uppdaterat: ${title}`, url, modified: fileName
            })
            await supabaseAdmin.from('schedules')
                .upsert(item)
                .throwOnError();
            await uploadPdf(id, item, url, fileName);
            return extractDaysTask.trigger({ id }, { tags: ['extract-days', id] })
        }

        if (!data) {
            await sendMessage({
                title: `Nytt: ${title}`, url, modified: fileName
            })
            await supabaseAdmin.from('schedules')
                .upsert(item)
                .throwOnError();
            await uploadPdf(id, item, url, fileName);
            return extractDaysTask.trigger({ id }, { tags: ['extract-days', id] })
        }
        if ((data && meta.modified && data.modified < meta.modified) || !data || !meta.modified) {
            await uploadPdf(id, item, url, fileName);

            await supabaseAdmin.from('schedules')
                .upsert(item)
                .throwOnError();
            return extractDaysTask.trigger({ id }, { tags: ['extract-days', id] })
        } else {
            console.log('Already up to date');
            return extractDaysTask.trigger({ id }, { tags: ['extract-days', id] })
        }
    },
});

const uploadPdf = async (id: string, item: Schedule, url: string, fileName: string) => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch PDF from ${url}`);
    }
    const pdfBuffer = await response.arrayBuffer();
    const { error: uploadError } = await supabaseAdmin.storage
        .from('schedules')
        .upload(`${item.slug}/${fileName}.pdf`, pdfBuffer, { upsert: true });
    if (uploadError) {
        throw new Error(`Failed to upload PDF to ${url}`);
    }
}
