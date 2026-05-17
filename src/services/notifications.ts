import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  NOTIFICATION_CHANNEL_ID,
  NOTIFICATION_CHANNEL_NAME,
  NOTIFICATION_STORAGE_KEY_PREFIX,
} from '../constants/notifications';
import { CalendarItem } from '../types/CalendarItem';
import { readNotificationPreferences } from './notificationPreferences';
import {
  buildItemNotificationPlans,
  buildWeeklyTodoSummaryPlan,
  getWeeklyTodoSummaryTrigger,
} from '../utils/notificationSchedule';

type PermissionStatusLike = {
  status: string;
};

type NotificationApi = {
  getPermissionsAsync: () => Promise<PermissionStatusLike>;
  requestPermissionsAsync: () => Promise<PermissionStatusLike>;
  setNotificationChannelAsync?: typeof Notifications.setNotificationChannelAsync;
  scheduleNotificationAsync: typeof Notifications.scheduleNotificationAsync;
  cancelScheduledNotificationAsync: typeof Notifications.cancelScheduledNotificationAsync;
  cancelAllScheduledNotificationsAsync?: typeof Notifications.cancelAllScheduledNotificationsAsync;
};

type NotificationStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

type StoredNotificationIds = {
  itemNotificationIds: string[];
  weeklySummaryNotificationId: string | null;
};

type SyncLocalNotificationsParams = {
  householdId: string;
  userId: string;
  items: CalendarItem[];
  now?: Date;
  api?: NotificationApi;
  storage?: NotificationStorage;
  platformOS?: typeof Platform.OS;
};

export type SyncLocalNotificationsResult = {
  permissionGranted: boolean;
  itemNotificationCount: number;
  weeklySummaryScheduled: boolean;
};

const EMPTY_STORED_IDS: StoredNotificationIds = {
  itemNotificationIds: [],
  weeklySummaryNotificationId: null,
};

let syncQueue: Promise<unknown> = Promise.resolve();

export function configureForegroundNotificationHandling(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function syncLocalNotifications({
  householdId,
  userId,
  items,
  now = new Date(),
  api = Notifications,
  storage = AsyncStorage,
  platformOS = Platform.OS,
}: SyncLocalNotificationsParams): Promise<SyncLocalNotificationsResult> {
  const syncTask = syncQueue
    .catch(() => undefined)
    .then(() =>
      syncLocalNotificationsNow({
        householdId,
        userId,
        items,
        now,
        api,
        storage,
        platformOS,
      })
    );

  syncQueue = syncTask.catch(() => undefined);
  return syncTask;
}

async function syncLocalNotificationsNow({
  householdId,
  userId,
  items,
  now,
  api,
  storage,
  platformOS,
}: Required<SyncLocalNotificationsParams>): Promise<SyncLocalNotificationsResult> {
  const storageKey = getNotificationStorageKey(householdId, userId);
  const storedIds = await readStoredNotificationIds(storage, storageKey);
  await cancelStaleNotifications(api, storedIds);

  const permissionGranted = await ensureNotificationPermission(api);
  if (!permissionGranted) {
    await writeStoredNotificationIds(storage, storageKey, EMPTY_STORED_IDS);
    return {
      permissionGranted: false,
      itemNotificationCount: 0,
      weeklySummaryScheduled: false,
    };
  }

  await configureAndroidChannel(api, platformOS);

  const preferences = await readNotificationPreferences(storage);

  const itemPlans = buildItemNotificationPlans(items, userId, now, preferences);
  const itemNotificationIds = await Promise.all(
    itemPlans.map((plan) =>
      api.scheduleNotificationAsync({
        content: {
          title: plan.title,
          body: plan.body,
          sound: true,
          data: {
            kind: 'item-reminder',
            itemId: plan.itemId,
            reminderKind: plan.kind,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: plan.triggerAt,
          channelId: NOTIFICATION_CHANNEL_ID,
        },
      })
    )
  );

  const weeklySummary = buildWeeklyTodoSummaryPlan(items, userId, preferences);
  const weeklySummaryNotificationId = weeklySummary
    ? await api.scheduleNotificationAsync({
        content: {
          title: weeklySummary.title,
          body: weeklySummary.body,
          sound: true,
          data: {
            kind: 'weekly-todo-summary',
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          ...getWeeklyTodoSummaryTrigger(preferences),
          channelId: NOTIFICATION_CHANNEL_ID,
        },
      })
    : null;

  await writeStoredNotificationIds(storage, storageKey, {
    itemNotificationIds,
    weeklySummaryNotificationId,
  });

  return {
    permissionGranted: true,
    itemNotificationCount: itemNotificationIds.length,
    weeklySummaryScheduled: weeklySummaryNotificationId !== null,
  };
}

async function cancelStaleNotifications(
  api: NotificationApi,
  storedIds: StoredNotificationIds
): Promise<void> {
  if (api.cancelAllScheduledNotificationsAsync) {
    await api.cancelAllScheduledNotificationsAsync();
    return;
  }

  await cancelStoredNotifications(api, storedIds);
}

async function ensureNotificationPermission(api: NotificationApi): Promise<boolean> {
  const current = await api.getPermissionsAsync();
  if (current.status === 'granted') {
    return true;
  }

  const requested = await api.requestPermissionsAsync();
  return requested.status === 'granted';
}

async function configureAndroidChannel(
  api: NotificationApi,
  platformOS: typeof Platform.OS
): Promise<void> {
  if (platformOS !== 'android' || !api.setNotificationChannelAsync) {
    return;
  }

  await api.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
    name: NOTIFICATION_CHANNEL_NAME,
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

async function cancelStoredNotifications(
  api: NotificationApi,
  storedIds: StoredNotificationIds
): Promise<void> {
  const notificationIds = [
    ...storedIds.itemNotificationIds,
    ...(storedIds.weeklySummaryNotificationId ? [storedIds.weeklySummaryNotificationId] : []),
  ];

  await Promise.all(
    notificationIds.map((notificationId) => api.cancelScheduledNotificationAsync(notificationId))
  );
}

async function readStoredNotificationIds(
  storage: NotificationStorage,
  storageKey: string
): Promise<StoredNotificationIds> {
  const raw = await storage.getItem(storageKey);
  if (!raw) {
    return EMPTY_STORED_IDS;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredNotificationIds>;
    return {
      itemNotificationIds: Array.isArray(parsed.itemNotificationIds)
        ? parsed.itemNotificationIds.filter((id): id is string => typeof id === 'string')
        : [],
      weeklySummaryNotificationId:
        typeof parsed.weeklySummaryNotificationId === 'string'
          ? parsed.weeklySummaryNotificationId
          : null,
    };
  } catch {
    return EMPTY_STORED_IDS;
  }
}

async function writeStoredNotificationIds(
  storage: NotificationStorage,
  storageKey: string,
  ids: StoredNotificationIds
): Promise<void> {
  await storage.setItem(storageKey, JSON.stringify(ids));
}

function getNotificationStorageKey(householdId: string, userId: string): string {
  return `${NOTIFICATION_STORAGE_KEY_PREFIX}:${householdId}:${userId}`;
}
