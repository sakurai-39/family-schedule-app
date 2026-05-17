import { NotificationPreferences } from '../types/NotificationPreferences';

export const NOTIFICATION_CHANNEL_ID = 'family-schedule-reminders';
export const NOTIFICATION_CHANNEL_NAME = '予定とタスク';

export const ITEM_PREVIOUS_DAY_REMINDER_HOUR = 21;
export const ITEM_SAME_DAY_REMINDER_HOUR = 7;
export const ITEM_REMINDER_MINUTE = 0;

export const WEEKLY_TODO_SUMMARY_WEEKDAY = 1; // Expo notifications: 1 = Sunday.
export const WEEKLY_TODO_SUMMARY_HOUR = 20;
export const WEEKLY_TODO_SUMMARY_MINUTE = 0;

export const NOTIFICATION_STORAGE_KEY_PREFIX = 'family-schedule:notifications';
export const NOTIFICATION_PREFERENCES_STORAGE_KEY = `${NOTIFICATION_STORAGE_KEY_PREFIX}:preferences:v1`;

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  previousDayReminder: {
    enabled: true,
    hour: ITEM_PREVIOUS_DAY_REMINDER_HOUR,
    minute: ITEM_REMINDER_MINUTE,
  },
  sameDayReminder: {
    enabled: true,
    hour: ITEM_SAME_DAY_REMINDER_HOUR,
    minute: ITEM_REMINDER_MINUTE,
  },
  weeklyTodoSummary: {
    enabled: true,
    weekday: WEEKLY_TODO_SUMMARY_WEEKDAY,
    hour: WEEKLY_TODO_SUMMARY_HOUR,
    minute: WEEKLY_TODO_SUMMARY_MINUTE,
  },
};
