// Type for a time slot mapping (e.g., "16-17": null or a string)
type TimeSlot = Record<string, string | null>;

// Type for a single day's schedule
interface DaySchedule {
    KG1: TimeSlot;
    KG2: TimeSlot;
    "KG xtra (16x35m)": TimeSlot;
    date: string; // ISO 8601 date format (e.g., "2025-01-20")
}

// Type for the full response object
interface ScheduleResponse {
    schedules: DaySchedule[];
}
