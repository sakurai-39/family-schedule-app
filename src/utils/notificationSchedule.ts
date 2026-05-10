import {
  ITEM_PREVIOUS_DAY_REMINDER_HOUR,
  ITEM_REMINDER_MINUTE,
  ITEM_SAME_DAY_REMINDER_HOUR,
  WEEKLY_TODO_SUMMARY_HOUR,
  WEEKLY_TODO_SUMMARY_MINUTE,
  WEEKLY_TODO_SUMMARY_WEEKDAY,
} from '../constants/notifications';
import { AssigneeValue, CalendarItem } from '../types/CalendarItem';

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
  now: Date = new Date()
): ItemNotificationPlan[] {
  return items.flatMap((item) => {
    const baseDate = getItemReminderBaseDate(item);
    if (!baseDate || !shouldNotifyAssignee(item.assignee, currentUserId)) {
      return [];
    }

    return buildReminderTriggers(baseDate)
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
  currentUserId: string
): WeeklyTodoSummaryPlan | null {
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

export function getWeeklyTodoSummaryTrigger(): WeeklyTodoSummaryTrigger {
  return {
    weekday: WEEKLY_TODO_SUMMARY_WEEKDAY,
    hour: WEEKLY_TODO_SUMMARY_HOUR,
    minute: WEEKLY_TODO_SUMMARY_MINUTE,
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

function buildReminderTriggers(baseDate: Date): {
  kind: ItemReminderKind;
  triggerAt: Date;
}[] {
  return [
    {
      kind: 'previous-day',
      triggerAt: withLocalTime(addDays(baseDate, -1), ITEM_PREVIOUS_DAY_REMINDER_HOUR),
    },
    {
      kind: 'same-day',
      triggerAt: withLocalTime(baseDate, ITEM_SAME_DAY_REMINDER_HOUR),
    },
  ];
}

function buildItemReminderBody(item: CalendarItem, kind: ItemReminderKind): string {
  const dayLabel = kind === 'previous-day' ? '明日' : '今日';
  const typeLabel = item.type === 'task' ? '期限' : '予定';
  return `${dayLabel}の${typeLabel}: ${item.title}`;
}

function addDays(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function withLocalTime(date: Date, hour: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, ITEM_REMINDER_MINUTE);
}
