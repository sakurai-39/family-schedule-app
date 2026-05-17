import { DEFAULT_NOTIFICATION_PREFERENCES } from '../constants/notifications';
import { AssigneeValue, CalendarItem } from '../types/CalendarItem';
import { NotificationPreferences } from '../types/NotificationPreferences';

export type ItemReminderKind = 'previous-day' | 'same-day';

export type ItemNotificationPlan = {
  itemId: string;
  kind: ItemReminderKind;
  triggerAt: Date;
  title: string;
  body: string;
};

export type WeeklyTodoSummaryPlan = {
  count: number;
  title: string;
  body: string;
};

export type WeeklyTodoSummaryTrigger = {
  weekday: number;
  hour: number;
  minute: number;
};

export function shouldNotifyAssignee(
  assignee: AssigneeValue | null,
  currentUserId: string
): boolean {
  if (!assignee) return false;
  if (assignee === 'both' || assignee === 'whoever') return true;
  return assignee === currentUserId;
}

export function buildItemNotificationPlans(
  items: CalendarItem[],
  currentUserId: string,
  now: Date = new Date(),
  preferences: NotificationPreferences = DEFAULT_NOTIFICATION_PREFERENCES
): ItemNotificationPlan[] {
  return items.flatMap((item) => {
    const baseDate = getItemReminderBaseDate(item);
    if (!baseDate || !shouldNotifyAssignee(item.assignee, currentUserId)) {
      return [];
    }

    return buildReminderTriggers(baseDate, preferences)
      .filter((trigger) => trigger.triggerAt.getTime() > now.getTime())
      .map((trigger) => ({
        itemId: item.itemId,
        kind: trigger.kind,
        triggerAt: trigger.triggerAt,
        title: '家族スケジュール',
        body: buildItemReminderBody(item, trigger.kind),
      }));
  });
}

export function buildWeeklyTodoSummaryPlan(
  items: CalendarItem[],
  currentUserId: string,
  preferences: NotificationPreferences = DEFAULT_NOTIFICATION_PREFERENCES
): WeeklyTodoSummaryPlan | null {
  if (!preferences.weeklyTodoSummary.enabled) {
    return null;
  }

  const count = items.filter(
    (item) =>
      item.status === 'scheduled' &&
      item.type === 'task' &&
      item.dueAt === null &&
      !item.isCompleted &&
      shouldNotifyAssignee(item.assignee, currentUserId)
  ).length;

  if (count === 0) {
    return null;
  }

  return {
    count,
    title: '家族スケジュール',
    body: `期限なしタスクが${count}件あります`,
  };
}

export function getWeeklyTodoSummaryTrigger(
  preferences: NotificationPreferences = DEFAULT_NOTIFICATION_PREFERENCES
): WeeklyTodoSummaryTrigger {
  return {
    weekday: preferences.weeklyTodoSummary.weekday,
    hour: preferences.weeklyTodoSummary.hour,
    minute: preferences.weeklyTodoSummary.minute,
  };
}

function getItemReminderBaseDate(item: CalendarItem): Date | null {
  if (item.status !== 'scheduled' || item.isCompleted) {
    return null;
  }

  if (item.type === 'event') {
    return item.startAt;
  }

  return item.dueAt;
}

function buildReminderTriggers(
  baseDate: Date,
  preferences: NotificationPreferences
): {
  kind: ItemReminderKind;
  triggerAt: Date;
}[] {
  const triggers: {
    kind: ItemReminderKind;
    triggerAt: Date;
  }[] = [];

  if (preferences.previousDayReminder.enabled) {
    triggers.push({
      kind: 'previous-day',
      triggerAt: withLocalTime(
        addDays(baseDate, -1),
        preferences.previousDayReminder.hour,
        preferences.previousDayReminder.minute
      ),
    });
  }

  if (preferences.sameDayReminder.enabled) {
    triggers.push({
      kind: 'same-day',
      triggerAt: withLocalTime(
        baseDate,
        preferences.sameDayReminder.hour,
        preferences.sameDayReminder.minute
      ),
    });
  }

  return triggers;
}

function buildItemReminderBody(item: CalendarItem, kind: ItemReminderKind): string {
  const dayLabel = kind === 'previous-day' ? '明日' : '今日';
  const typeLabel = item.type === 'task' ? '期限' : '予定';
  return `${dayLabel}の${typeLabel}: ${item.title}`;
}

function addDays(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function withLocalTime(date: Date, hour: number, minute: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute);
}
