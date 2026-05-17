import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_PREFERENCES_STORAGE_KEY,
} from '../constants/notifications';
import {
  NotificationPreferences,
  NotificationReminderPreference,
  WeeklyTodoSummaryPreference,
} from '../types/NotificationPreferences';

type NotificationPreferencesStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

export async function readNotificationPreferences(
  storage: NotificationPreferencesStorage = AsyncStorage
): Promise<NotificationPreferences> {
  const raw = await storage.getItem(NOTIFICATION_PREFERENCES_STORAGE_KEY);
  if (!raw) {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }

  try {
    return normalizeNotificationPreferences(JSON.parse(raw));
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

export async function writeNotificationPreferences(
  preferences: NotificationPreferences,
  storage: NotificationPreferencesStorage = AsyncStorage
): Promise<void> {
  await storage.setItem(
    NOTIFICATION_PREFERENCES_STORAGE_KEY,
    JSON.stringify(normalizeNotificationPreferences(preferences))
  );
}

export function normalizeNotificationPreferences(value: unknown): NotificationPreferences {
  const input = isRecord(value) ? value : {};

  return {
    previousDayReminder: normalizeReminderPreference(
      input.previousDayReminder,
      DEFAULT_NOTIFICATION_PREFERENCES.previousDayReminder
    ),
    sameDayReminder: normalizeReminderPreference(
      input.sameDayReminder,
      DEFAULT_NOTIFICATION_PREFERENCES.sameDayReminder
    ),
    weeklyTodoSummary: normalizeWeeklyPreference(
      input.weeklyTodoSummary,
      DEFAULT_NOTIFICATION_PREFERENCES.weeklyTodoSummary
    ),
  };
}

function normalizeReminderPreference(
  value: unknown,
  fallback: NotificationReminderPreference
): NotificationReminderPreference {
  const input = isRecord(value) ? value : {};

  return {
    enabled: typeof input.enabled === 'boolean' ? input.enabled : fallback.enabled,
    hour: normalizeNumber(input.hour, fallback.hour, 0, 23),
    minute: normalizeNumber(input.minute, fallback.minute, 0, 59),
  };
}

function normalizeWeeklyPreference(
  value: unknown,
  fallback: WeeklyTodoSummaryPreference
): WeeklyTodoSummaryPreference {
  const input = isRecord(value) ? value : {};
  const reminder = normalizeReminderPreference(input, fallback);

  return {
    ...reminder,
    weekday: normalizeNumber(input.weekday, fallback.weekday, 1, 7),
  };
}

function normalizeNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    return fallback;
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
