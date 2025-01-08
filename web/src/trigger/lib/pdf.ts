import { extractText, getDocumentProxy } from 'unpdf';
import { parsePDFDate } from './date';

export const getPdfData = async (pdfUrl: string): Promise<{ text: string, meta: { created: Date | undefined, modified: Date | undefined } }> => {
    const response = await fetch(pdfUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch PDF from ${pdfUrl}`);
    }

    const buffer = await response.arrayBuffer();
    const pdf = await getDocumentProxy(buffer);
    const meta = await pdf.getMetadata()

    const { text } = await extractText(pdf, { mergePages: true });

    return {
        text,
        meta: {
            created: parsePDFDate(meta?.info?.CreationDate),
            modified: parsePDFDate(meta?.info?.ModDate)
        }
    };
}