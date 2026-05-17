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
