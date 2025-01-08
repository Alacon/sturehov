export const parsePDFDate = (pdfDate: string): Date => {
    // Remove the "D:" prefix
    pdfDate = pdfDate.replace("D:", "");

    // Extract date and time components
    const year = parseInt(pdfDate.slice(0, 4));
    const month = parseInt(pdfDate.slice(4, 6)) - 1; // JavaScript months are 0-indexed
    const day = parseInt(pdfDate.slice(6, 8));
    const hour = parseInt(pdfDate.slice(8, 10));
    const minute = parseInt(pdfDate.slice(10, 12));
    const second = parseInt(pdfDate.slice(12, 14));

    // Extract timezone offset
    const offsetSign = pdfDate[14]; // "+" or "-"
    const offsetHours = parseInt(pdfDate.slice(15, 17));
    const offsetMinutes = parseInt(pdfDate.slice(18, 20));
    const totalOffsetMinutes =
        (offsetHours * 60 + offsetMinutes) * (offsetSign === "+" ? 1 : -1);

    // Create the date in UTC
    const utcDate = new Date(Date.UTC(year, month, day, hour, minute, second));

    // Apply the timezone offset to get the local time
    utcDate.setUTCMinutes(utcDate.getUTCMinutes() - totalOffsetMinutes);

    return utcDate;
}