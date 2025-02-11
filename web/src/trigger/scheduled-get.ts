import { schedules } from "@trigger.dev/sdk/v3";
import { getSchema } from "./get-schema";

export const scheduleGet = schedules.task({
  id: "scheduled-get-task",
  maxDuration: 300, // Stop executing after 300 secs (5 mins) of compute
  run: async () => {
    return getSchema.trigger();
  },
});