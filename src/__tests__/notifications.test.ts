import {
  buildItemNotificationPlans,
  buildWeeklyTodoSummaryPlan,
  getWeeklyTodoSummaryTrigger,
  shouldNotifyAssignee,
} from '../utils/notificationSchedule';
import { syncLocalNotifications } from '../services/notifications';
import {
  NOTIFICATION_CHANNEL_ID,
  NOTIFICATION_PREFERENCES_STORAGE_KEY,
  NOTIFICATION_STORAGE_KEY_PREFIX,
} from '../constants/notifications';
import { CalendarItem } from '../types/CalendarItem';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

jest.mock('expo-notifications', () => ({
  __esModule: true,
  AndroidImportance: {
    DEFAULT: 5,
  },
  SchedulableTriggerInputTypes: {
    DATE: 'date',
    WEEKLY: 'weekly',
  },
  cancelScheduledNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
}));

const SELF_ID = 'user-self';
const PARTNER_ID = 'user-partner';
const NOTIFICATION_IDS_STORAGE_KEY = `${NOTIFICATION_STORAGE_KEY_PREFIX}:household-1:${SELF_ID}`;

type ScheduledNotificationRequest = {
  trigger: unknown;
  content: unknown;
};

function item(overrides: Partial<CalendarItem>): CalendarItem {
  return {
    itemId: 'item-1',
    status: 'scheduled',
    type: 'event',
    title: '保育園に提出',
    assignee: SELF_ID,
    startAt: new Date(2026, 4, 9, 10, 30),
    dueAt: null,
    memo: '',
    isCompleted: false,
    recurrence: null,
    createdBy: SELF_ID,
    inputDurationMs: null,
    createdAt: new Date(2026, 4, 8, 10),
    updatedAt: new Date(2026, 4, 8, 10),
    ...overrides,
    targetPeriod: overrides.targetPeriod ?? null,
  };
}

describe('notificationSchedule', () => {
  it('schedules event reminders for previous day 21:00 and same day 7:00', () => {
    const plans = buildItemNotificationPlans([item({})], SELF_ID, new Date(2026, 4, 8, 12));

    expect(plans.map((plan) => plan.triggerAt)).toEqual([
      new Date(2026, 4, 8, 21),
      new Date(2026, 4, 9, 7),
    ]);
    expect(plans.map((plan) => plan.kind)).toEqual(['previous-day', 'same-day']);
  });

  it('schedules due task reminders using the due date', () => {
    const plans = buildItemNotificationPlans(
      [
        item({
          type: 'task',
          startAt: null,
          dueAt: new Date(2026, 4, 10, 18),
          title: '給食袋を準備',
        }),
      ],
      SELF_ID,
      new Date(2026, 4, 9, 8)
    );

    expect(plans.map((plan) => plan.triggerAt)).toEqual([
      new Date(2026, 4, 9, 21),
      new Date(2026, 4, 10, 7),
    ]);
  });

  it('uses custom reminder times and disabled reminders', () => {
    const plans = buildItemNotificationPlans([item({})], SELF_ID, new Date(2026, 4, 8, 12), {
      previousDayReminder: {
        enabled: false,
        hour: 21,
        minute: 0,
      },
      sameDayReminder: {
        enabled: true,
        hour: 8,
        minute: 30,
      },
      weeklyTodoSummary: {
        enabled: true,
        weekday: 1,
        hour: 20,
        minute: 0,
      },
    });

    expect(plans.map((plan) => plan.triggerAt)).toEqual([new Date(2026, 4, 9, 8, 30)]);
    expect(plans.map((plan) => plan.kind)).toEqual(['same-day']);
  });

  it('does not schedule reminders in the past', () => {
    const plans = buildItemNotificationPlans([item({})], SELF_ID, new Date(2026, 4, 9, 8));

    expect(plans).toEqual([]);
  });

  it('does not schedule completed or undated task item reminders', () => {
    const plans = buildItemNotificationPlans(
      [
        item({ isCompleted: true }),
        item({ itemId: 'item-2', type: 'task', startAt: null, dueAt: null }),
      ],
      SELF_ID,
      new Date(2026, 4, 8, 12)
    );

    expect(plans).toEqual([]);
  });

  it('filters notifications by assignee', () => {
    expect(shouldNotifyAssignee(SELF_ID, SELF_ID)).toBe(true);
    expect(shouldNotifyAssignee(PARTNER_ID, SELF_ID)).toBe(false);
    expect(shouldNotifyAssignee('both', SELF_ID)).toBe(true);
    expect(shouldNotifyAssignee('whoever', SELF_ID)).toBe(true);
    expect(shouldNotifyAssignee(null, SELF_ID)).toBe(false);
  });

  it('builds weekly todo summary when open undated tasks exist', () => {
    const plan = buildWeeklyTodoSummaryPlan(
      [
        item({ itemId: 'task-1', type: 'task', startAt: null, dueAt: null }),
        item({ itemId: 'task-2', type: 'task', startAt: null, dueAt: null, assignee: 'both' }),
        item({
          itemId: 'task-3',
          type: 'task',
          startAt: null,
          dueAt: null,
          assignee: PARTNER_ID,
        }),
        item({ itemId: 'task-4', type: 'task', startAt: null, dueAt: null, isCompleted: true }),
      ],
      SELF_ID
    );

    expect(plan).toEqual({
      count: 2,
      title: '家族スケジュール',
      body: '期限なしタスクが2件あります',
    });
  });

  it('does not build weekly todo summary when there are no target tasks', () => {
    const plan = buildWeeklyTodoSummaryPlan(
      [item({ type: 'task', startAt: null, dueAt: null, assignee: PARTNER_ID })],
      SELF_ID
    );

    expect(plan).toBeNull();
  });

  it('does not build weekly todo summary when the setting is off', () => {
    const plan = buildWeeklyTodoSummaryPlan(
      [item({ itemId: 'task-1', type: 'task', startAt: null, dueAt: null })],
      SELF_ID,
      {
        previousDayReminder: {
          enabled: true,
          hour: 21,
          minute: 0,
        },
        sameDayReminder: {
          enabled: true,
          hour: 7,
          minute: 0,
        },
        weeklyTodoSummary: {
          enabled: false,
          weekday: 1,
          hour: 20,
          minute: 0,
        },
      }
    );

    expect(plan).toBeNull();
  });

  it('uses Sunday 20:00 as the weekly todo summary trigger', () => {
    expect(getWeeklyTodoSummaryTrigger()).toEqual({
      weekday: 1,
      hour: 20,
      minute: 0,
    });
  });

  it('uses custom weekly todo summary trigger settings', () => {
    expect(
      getWeeklyTodoSummaryTrigger({
        previousDayReminder: {
          enabled: true,
          hour: 21,
          minute: 0,
        },
        sameDayReminder: {
          enabled: true,
          hour: 7,
          minute: 0,
        },
        weeklyTodoSummary: {
          enabled: true,
          weekday: 6,
          hour: 19,
          minute: 30,
        },
      })
    ).toEqual({
      weekday: 6,
      hour: 19,
      minute: 30,
    });
  });
});

describe('syncLocalNotifications', () => {
  it('clears all stale scheduled notifications and stores newly scheduled IDs', async () => {
    const api = createNotificationApi('granted');
    const storage = createStorage({
      [NOTIFICATION_IDS_STORAGE_KEY]: JSON.stringify({
        itemNotificationIds: ['old-item'],
        weeklySummaryNotificationId: 'old-weekly',
      }),
      [NOTIFICATION_PREFERENCES_STORAGE_KEY]: JSON.stringify({
        previousDayReminder: {
          enabled: true,
          hour: 22,
          minute: 0,
        },
        sameDayReminder: {
          enabled: false,
          hour: 7,
          minute: 0,
        },
        weeklyTodoSummary: {
          enabled: true,
          weekday: 3,
          hour: 19,
          minute: 30,
        },
      }),
    });

    const result = await syncLocalNotifications({
      householdId: 'household-1',
      userId: SELF_ID,
      items: [item({}), item({ itemId: 'task-1', type: 'task', startAt: null, dueAt: null })],
      now: new Date(2026, 4, 8, 12),
      api,
      storage,
      platformOS: 'android',
    });

    expect(api.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
    expect(api.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
    expect(api.setNotificationChannelAsync).toHaveBeenCalledWith(NOTIFICATION_CHANNEL_ID, {
      name: '予定とタスク',
      importance: 5,
    });
    expect(api.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      permissionGranted: true,
      itemNotificationCount: 1,
      weeklySummaryScheduled: true,
    });

    const scheduledRequests = api.scheduleNotificationAsync.mock.calls.map(([request]) => request);
    expect(scheduledRequests[0]?.trigger).toMatchObject({
      type: 'date',
      date: new Date(2026, 4, 8, 22),
      channelId: NOTIFICATION_CHANNEL_ID,
    });
    expect(scheduledRequests[1]?.trigger).toMatchObject({
      type: 'weekly',
      weekday: 3,
      hour: 19,
      minute: 30,
      channelId: NOTIFICATION_CHANNEL_ID,
    });
    expect(JSON.parse(storage.getLatestValue(NOTIFICATION_IDS_STORAGE_KEY) ?? '')).toEqual({
      itemNotificationIds: ['notification-1'],
      weeklySummaryNotificationId: 'notification-2',
    });
  });

  it('clears stored IDs without scheduling when permission is denied', async () => {
    const api = createNotificationApi('denied');
    const storage = createStorage({
      [NOTIFICATION_IDS_STORAGE_KEY]: JSON.stringify({
        itemNotificationIds: ['old-item'],
        weeklySummaryNotificationId: null,
      }),
    });

    const result = await syncLocalNotifications({
      householdId: 'household-1',
      userId: SELF_ID,
      items: [item({})],
      now: new Date(2026, 4, 8, 12),
      api,
      storage,
      platformOS: 'android',
    });

    expect(api.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
    expect(api.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
    expect(api.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(result).toEqual({
      permissionGranted: false,
      itemNotificationCount: 0,
      weeklySummaryScheduled: false,
    });
    expect(JSON.parse(storage.getLatestValue(NOTIFICATION_IDS_STORAGE_KEY) ?? '')).toEqual({
      itemNotificationIds: [],
      weeklySummaryNotificationId: null,
    });
  });

  it('falls back to stored notification IDs when bulk cancel is unavailable', async () => {
    const apiWithBulkCancel = createNotificationApi('granted');
    const api = {
      getPermissionsAsync: apiWithBulkCancel.getPermissionsAsync,
      requestPermissionsAsync: apiWithBulkCancel.requestPermissionsAsync,
      setNotificationChannelAsync: apiWithBulkCancel.setNotificationChannelAsync,
      scheduleNotificationAsync: apiWithBulkCancel.scheduleNotificationAsync,
      cancelScheduledNotificationAsync: apiWithBulkCancel.cancelScheduledNotificationAsync,
    };
    const storage = createStorage({
      [NOTIFICATION_IDS_STORAGE_KEY]: JSON.stringify({
        itemNotificationIds: ['old-item'],
        weeklySummaryNotificationId: 'old-weekly',
      }),
    });

    await syncLocalNotifications({
      householdId: 'household-1',
      userId: SELF_ID,
      items: [],
      now: new Date(2026, 4, 8, 12),
      api,
      storage,
      platformOS: 'android',
    });

    expect(api.cancelScheduledNotificationAsync).toHaveBeenCalledWith('old-item');
    expect(api.cancelScheduledNotificationAsync).toHaveBeenCalledWith('old-weekly');
  });
});

function createNotificationApi(permissionStatus: 'granted' | 'denied') {
  let notificationIndex = 0;

  return {
    getPermissionsAsync: jest.fn(async () => ({ status: permissionStatus })),
    requestPermissionsAsync: jest.fn(async () => ({ status: permissionStatus })),
    setNotificationChannelAsync: jest.fn(async () => null),
    scheduleNotificationAsync: jest.fn<Promise<string>, [ScheduledNotificationRequest]>(
      async () => {
        notificationIndex += 1;
        return `notification-${notificationIndex}`;
      }
    ),
    cancelScheduledNotificationAsync: jest.fn(async () => undefined),
    cancelAllScheduledNotificationsAsync: jest.fn(async () => undefined),
  };
}

function createStorage(initialValues: Record<string, string | null>) {
  const values = new Map<string, string>();
  for (const [key, value] of Object.entries(initialValues)) {
    if (value !== null) {
      values.set(key, value);
    }
  }

  return {
    getItem: jest.fn(async (key: string) => values.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
    getLatestValue: (key: string) => values.get(key) ?? null,
  };
}
