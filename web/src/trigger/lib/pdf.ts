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
export const getPdfImage = async (pdfUrl: string): Promise<string | null> => {
    const apiEndpoint = `${process.env.CLOUDMERSIVE_URL}/convert/pdf/to/png/direct`; // Replace with your API endpoint
    const apiToken = process.env.CLOUDMERSIVE_KEY; // Replace with your API authentication token if needed

    try {
        const response = await fetch(pdfUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch PDF from ${pdfUrl}`);
        }
        const pdfBuffer = await response.arrayBuffer();
        // Step 2: Upload the PDF to the API
        const uploadResponse = await fetch(apiEndpoint, {
            method: "POST",
            headers: {
                "Apikey": `${apiToken}`, // Add authorization header if required
            },
            body: pdfBuffer,
        });

        if (!uploadResponse.ok) {
            throw new Error(`Failed to upload PDF: ${uploadResponse.statusText}`);
        }

        const uploadResult = await uploadResponse.json();

        if (uploadResult.Successful == false) {
            return null;
        }
        const base64Image = uploadResult.PngResultPages[0].ImageData;

        return `data:image/png;base64,${base64Image}`;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}