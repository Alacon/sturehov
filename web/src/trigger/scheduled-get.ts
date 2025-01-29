import { schedules } from "@trigger.dev/sdk/v3";

export const scheduleGet = schedules.task({
  id: "scheduled-get-task",
  // Every hour
  cron: "0 * * * *",
  // Set an optional maxDuration to prevent tasks from running indefinitely
  maxDuration: 300, // Stop executing after 300 secs (5 mins) of compute
  run: async () => {
    return "Nothing to see"; //getSchema.trigger();
  },
});