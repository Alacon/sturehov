import { task } from "@trigger.dev/sdk/v3";
import fetch from "node-fetch";
import { PDFDocument } from "pdf-lib";
import { supabaseAdmin } from "./lib/supabase";

type Schedule = {
    id: string,
    title: string,
    path: string,
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
    run: async ({ title, path }: { title: string, path: string }, { ctx }) => {

        const url = `https://www.svenskalag.se/iksturehov${path}`;
        const response = await fetch(url);
        const pdfBytes = await response.arrayBuffer();

        // Load the PDF with pdf-lib
        const pdfDoc = await PDFDocument.load(pdfBytes);

        const id = path.replace('/dokument/', '');
        const item: Schedule = {
            id,
            title,
            path,
            created: pdfDoc.getCreationDate(),
            modified: pdfDoc.getModificationDate(),
        }
        // Log metadata
        console.log("PDF Metadata" + title, item);
        await supabaseAdmin.from('schedules')
            .upsert(item)
            .throwOnError();

        
        return item;
    },
});