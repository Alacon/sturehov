import { task } from "@trigger.dev/sdk/v3";
import fetch from "node-fetch";
import { PDFDocument } from "pdf-lib";

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

        const item = {
            creationDate: pdfDoc.getCreationDate()?.toISOString() || "Not available",
            modificationDate: pdfDoc.getModificationDate()?.toISOString() || "Not available",
        }
        // Log metadata
        console.log("PDF Metadata" + title, item);

        return item;
    },
});