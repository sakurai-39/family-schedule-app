export type NotificationReminderPreference = {
  enabled: boolean;
  hour: number;
  minute: number;
};

export type WeeklyTodoSummaryPreference = NotificationReminderPreference & {
  weekday: number;
};

export type NotificationPreferences = {
  previousDayReminder: NotificationReminderPreference;
  sameDayReminder: NotificationReminderPreference;
  weeklyTodoSummary: WeeklyTodoSummaryPreference;
};
