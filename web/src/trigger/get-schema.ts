import { task } from "@trigger.dev/sdk/v3";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { getDocument } from "./get-document";

export const getSchema = task({
    id: "get-schema",
    queue: {
        concurrencyLimit: 5,
    },
    maxDuration: 60,
    machine: { preset: 'micro' },
    run: async () => {

        const url = 'https://www.svenskalag.se/iksturehov/dokument#folder=52570';
        const response = await fetch(url);
        const html = await response.text();

        const $ = cheerio.load(html);
        const result: {
            success: boolean, data: {
                title: string;
                path: string | undefined;
            }[]
        } = { success: false, data: [] };

        const items = $('.folder-52570 a').map((i, el) => {
            const item = { title: '', path: $(el).attr('href')?.trim() ?? '' };

            $(el).children('label').each((i, child) => {
                item.title = $(child).text().replace(/\s+0,\d{2} MB\s*$/s, "").trim();
            });
            result.data.push(item);
            if (item.title?.endsWith('.pdf'))
                return item;
        }).toArray();

        const filteredItems = items.filter(item => item.title.endsWith('.pdf'));
        const mappedItems = filteredItems.map(item => ({ payload: { title: item.title, path: item.path! } }));

        return getDocument.batchTrigger(mappedItems);
    },
});
