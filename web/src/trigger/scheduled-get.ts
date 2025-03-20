import { schedules } from "@trigger.dev/sdk/v3";
import { getSchema } from "./get-schema";
import { getCalendar } from "./get-calendar";

export const scheduleGet = schedules.task({
  id: "scheduled-get-task",
  maxDuration: 300, // Stop executing after 300 secs (5 mins) of compute
  run: async () => {
    return getSchema.trigger();
  },
});

export const scheduleCalendar = schedules.task({
  id: "scheduled-calendar-task",
  maxDuration: 300, // Stop executing after 300 secs (5 mins) of compute
  run: async () => {
    return getCalendar.trigger();
  },
});