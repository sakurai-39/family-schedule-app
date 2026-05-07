import {
  buildMonthGrid,
  getDisplayDate,
  getItemsForDate,
  getUndatedTasks,
  splitCompletedItems,
  sortScheduledItems,
  toLocalDateKey,
} from '../utils/calendarDisplay';
import { CalendarItem } from '../types/CalendarItem';

function item(overrides: Partial<CalendarItem>): CalendarItem {
  return {
    itemId: overrides.itemId ?? 'item-1',
    status: overrides.status ?? 'scheduled',
    type: overrides.type ?? 'event',
    title: overrides.title ?? '予定',
    assignee: overrides.assignee ?? 'both',
    startAt: overrides.startAt ?? null,
    dueAt: overrides.dueAt ?? null,
    memo: overrides.memo ?? '',
    isCompleted: overrides.isCompleted ?? false,
    recurrence: overrides.recurrence ?? null,
    createdBy: overrides.createdBy ?? 'user-A',
    inputDurationMs: overrides.inputDurationMs ?? null,
    createdAt: overrides.createdAt ?? new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: overrides.updatedAt ?? new Date('2026-05-01T00:00:00.000Z'),
  };
}

describe('calendarDisplay', () => {
  it('uses startAt for events and dueAt for tasks as the display date', () => {
    const eventStart = new Date(2026, 4, 7, 10, 0);
    const taskDue = new Date(2026, 4, 8, 18, 0);

    expect(getDisplayDate(item({ type: 'event', startAt: eventStart }))).toBe(eventStart);
    expect(getDisplayDate(item({ type: 'task', dueAt: taskDue }))).toBe(taskDue);
    expect(getDisplayDate(item({ type: 'task', dueAt: null }))).toBeNull();
  });

  it('sorts dated scheduled items first and keeps undated tasks last', () => {
    const undated = item({ itemId: 'undated', type: 'task', dueAt: null });
    const later = item({ itemId: 'later', type: 'task', dueAt: new Date(2026, 4, 8, 18, 0) });
    const earlier = item({ itemId: 'earlier', type: 'event', startAt: new Date(2026, 4, 7, 9, 0) });

    expect(sortScheduledItems([undated, later, earlier]).map((current) => current.itemId)).toEqual([
      'earlier',
      'later',
      'undated',
    ]);
  });

  it('filters items for the selected local date', () => {
    const morning = item({ itemId: 'morning', startAt: new Date(2026, 4, 7, 9, 0) });
    const evening = item({ itemId: 'evening', dueAt: new Date(2026, 4, 7, 18, 0), type: 'task' });
    const tomorrow = item({ itemId: 'tomorrow', startAt: new Date(2026, 4, 8, 9, 0) });

    expect(getItemsForDate([tomorrow, evening, morning], new Date(2026, 4, 7))).toEqual([
      morning,
      evening,
    ]);
  });

  it('returns only scheduled tasks without a due date as undated tasks', () => {
    const undated = item({ itemId: 'undated', type: 'task', dueAt: null });
    const dated = item({ itemId: 'dated', type: 'task', dueAt: new Date(2026, 4, 9) });
    const event = item({ itemId: 'event', type: 'event', startAt: new Date(2026, 4, 9) });
    const inbox = item({ itemId: 'inbox', status: 'inbox', type: null });

    expect(getUndatedTasks([dated, event, inbox, undated])).toEqual([undated]);
  });

  it('splits open and completed items without changing their relative order', () => {
    const openA = item({ itemId: 'open-a' });
    const done = item({ itemId: 'done', isCompleted: true });
    const openB = item({ itemId: 'open-b' });

    expect(splitCompletedItems([openA, done, openB])).toEqual({
      open: [openA, openB],
      completed: [done],
    });
  });

  it('builds a stable Sunday-start month grid', () => {
    const grid = buildMonthGrid(new Date(2026, 4, 7));

    expect(grid).toHaveLength(42);
    expect(grid[0]).toMatchObject({
      dateKey: '2026-04-26',
      dayOfMonth: 26,
      isCurrentMonth: false,
    });
    expect(grid[5]).toMatchObject({
      dateKey: '2026-05-01',
      dayOfMonth: 1,
      isCurrentMonth: true,
    });
    expect(grid[41]).toMatchObject({
      dateKey: '2026-06-06',
      dayOfMonth: 6,
      isCurrentMonth: false,
    });
  });

  it('formats a local date key without using UTC conversion', () => {
    expect(toLocalDateKey(new Date(2026, 4, 7, 23, 30))).toBe('2026-05-07');
  });
});
