import { AssigneeValue, ScheduledItemDraft, TaskTargetPeriod } from '../types/CalendarItem';
import { sanitizeText, validateMemo, validateTitle } from './validation';

export type ScheduleDraftKind = 'event' | 'task';

export type ScheduleDraftForm = {
  kind: ScheduleDraftKind;
  title: string;
  memo: string;
  assignee: AssigneeValue | null;
  dateText: string;
  timeText: string;
  // For 'task' kind: when false, the task is saved without a due date.
  // Always treated as true for 'event' kind (events require a date).
  hasDueDate: boolean;
  targetPeriod?: TaskTargetPeriod | null;
};

export type ScheduleDraftResult =
  | { ok: true; draft: ScheduledItemDraft }
  | { ok: false; reason: string };

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(\d{2}):(\d{2})$/;

export function parseLocalDateTime(dateText: string, timeText: string): Date | null {
  const dateMatch = DATE_PATTERN.exec(dateText.trim());
  const timeMatch = TIME_PATTERN.exec(timeText.trim());

  if (!dateMatch || !timeMatch) {
    return null;
  }

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    month < 1 ||
    month > 12 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  const date = new Date(year, month - 1, day, hour, minute);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) {
    return null;
  }

  return date;
}

export function buildScheduledItemDraft(form: ScheduleDraftForm): ScheduleDraftResult {
  const title = sanitizeText(form.title.trim());
  const memo = sanitizeText(form.memo.trim());
  const titleValidation = validateTitle(title);
  const memoValidation = validateMemo(memo);

  if (!titleValidation.ok) {
    return titleValidation;
  }

  if (!memoValidation.ok) {
    return memoValidation;
  }

  if (!form.assignee) {
    return { ok: false, reason: '担当者を選んでください' };
  }

  if (form.kind === 'task' && !form.hasDueDate) {
    return {
      ok: true,
      draft: {
        type: 'task',
        title,
        memo,
        assignee: form.assignee,
        dueAt: null,
        targetPeriod: form.targetPeriod ?? null,
      },
    };
  }

  const scheduledAt = parseLocalDateTime(form.dateText, form.timeText);
  if (!scheduledAt) {
    return { ok: false, reason: '日付と時刻を正しく入力してください' };
  }

  if (form.kind === 'event') {
    return {
      ok: true,
      draft: {
        type: 'event',
        title,
        memo,
        assignee: form.assignee,
        startAt: scheduledAt,
      },
    };
  }

  return {
    ok: true,
    draft: {
      type: 'task',
      title,
      memo,
      assignee: form.assignee,
      dueAt: scheduledAt,
      targetPeriod: null,
    },
  };
}
