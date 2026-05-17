import { TaskTargetPeriod } from '../types/CalendarItem';

export type TaskTargetPeriodOption = {
  value: TaskTargetPeriod | null;
  label: string;
};

export const TASK_TARGET_PERIOD_OPTIONS: TaskTargetPeriodOption[] = [
  { value: null, label: 'なし' },
  { value: 'week', label: '1週間' },
  { value: 'month', label: '1か月' },
  { value: 'six_months', label: '6か月' },
  { value: 'year', label: '1年' },
];

export function isValidTaskTargetPeriod(value: unknown): value is TaskTargetPeriod | null {
  return (
    value === null ||
    value === 'week' ||
    value === 'month' ||
    value === 'six_months' ||
    value === 'year'
  );
}

export function toTaskTargetPeriod(value: unknown): TaskTargetPeriod | null {
  return isValidTaskTargetPeriod(value) ? value : null;
}

export function formatTaskTargetPeriod(value: TaskTargetPeriod | null): string | null {
  return TASK_TARGET_PERIOD_OPTIONS.find((option) => option.value === value)?.label ?? null;
}

export function calculateTargetDate(createdAt: Date, period: TaskTargetPeriod | null): Date | null {
  if (period === null) return null;
  if (period === 'week') {
    const result = new Date(createdAt);
    result.setDate(result.getDate() + 7);
    return result;
  }
  if (period === 'month') return addMonthsWithClamp(createdAt, 1);
  if (period === 'six_months') return addMonthsWithClamp(createdAt, 6);
  if (period === 'year') return addMonthsWithClamp(createdAt, 12);
  return null;
}

function addMonthsWithClamp(date: Date, months: number): Date {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const targetYear = year + Math.floor((month + months) / 12);
  const targetMonth = (((month + months) % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const clampedDay = Math.min(day, lastDayOfTargetMonth);
  return new Date(targetYear, targetMonth, clampedDay);
}

export function formatTargetDate(targetDate: Date | null, now: Date): string | null {
  if (targetDate === null) return null;
  const month = targetDate.getMonth() + 1;
  const day = targetDate.getDate();
  if (targetDate.getFullYear() === now.getFullYear()) {
    return `${month}/${day}頃`;
  }
  return `${targetDate.getFullYear()}/${month}/${day}頃`;
}
