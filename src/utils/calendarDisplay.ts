import { CalendarItem } from '../types/CalendarItem';

export type CalendarDay = {
  date: Date;
  dateKey: string;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
};

export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDisplayDate(item: CalendarItem): Date | null {
  if (item.status !== 'scheduled') {
    return null;
  }

  return item.startAt ?? item.dueAt;
}

export function sortScheduledItems(items: CalendarItem[]): CalendarItem[] {
  return [...items].sort((a, b) => {
    const aDate = getDisplayDate(a);
    const bDate = getDisplayDate(b);

    if (aDate && bDate) {
      return aDate.getTime() - bDate.getTime();
    }

    if (aDate) return -1;
    if (bDate) return 1;

    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}

export function getItemsForDate(items: CalendarItem[], date: Date): CalendarItem[] {
  const targetKey = toLocalDateKey(date);

  return sortScheduledItems(items).filter((item) => {
    const displayDate = getDisplayDate(item);
    return displayDate !== null && toLocalDateKey(displayDate) === targetKey;
  });
}

export type CalendarDateTapAction = 'select' | 'open';

export function getCalendarDateTapAction(
  selectedDateKey: string | null,
  tappedDateKey: string
): CalendarDateTapAction {
  return selectedDateKey === tappedDateKey ? 'open' : 'select';
}

export function getUndatedTasks(items: CalendarItem[]): CalendarItem[] {
  return sortScheduledItems(items).filter(
    (item) => item.status === 'scheduled' && item.type === 'task' && item.dueAt === null
  );
}

export function splitCompletedItems(items: CalendarItem[]): {
  open: CalendarItem[];
  completed: CalendarItem[];
} {
  return items.reduce(
    (result, item) => {
      if (item.isCompleted) {
        result.completed.push(item);
      } else {
        result.open.push(item);
      }
      return result;
    },
    { open: [] as CalendarItem[], completed: [] as CalendarItem[] }
  );
}

export function buildMonthGrid(baseDate: Date, today: Date = new Date()): CalendarDay[] {
  const firstOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

  const currentMonth = baseDate.getMonth();
  const todayKey = toLocalDateKey(today);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);

    return {
      date,
      dateKey: toLocalDateKey(date),
      dayOfMonth: date.getDate(),
      isCurrentMonth: date.getMonth() === currentMonth,
      isToday: toLocalDateKey(date) === todayKey,
    };
  });
}
