export interface Days {
    id: string;
    hours: Record<string, string[] | null>[];
    date: string;
}