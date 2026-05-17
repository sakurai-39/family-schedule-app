import { searchCalendarItems } from '../utils/calendarSearch';
import { CalendarItem } from '../types/CalendarItem';

function item(overrides: Partial<CalendarItem>): CalendarItem {
  return {
    itemId: overrides.itemId ?? 'item-1',
    status: overrides.status ?? 'scheduled',
    type: overrides.type ?? 'event',
    title: overrides.title ?? '買い物',
    assignee: overrides.assignee ?? 'both',
    startAt: overrides.startAt ?? new Date(2026, 4, 1, 9, 0),
    dueAt: overrides.dueAt ?? null,
    targetPeriod: overrides.targetPeriod ?? null,
    memo: overrides.memo ?? '',
    isCompleted: overrides.isCompleted ?? false,
    recurrence: overrides.recurrence ?? null,
    createdBy: overrides.createdBy ?? 'user-A',
    inputDurationMs: overrides.inputDurationMs ?? null,
    createdAt: overrides.createdAt ?? new Date(2026, 4, 1, 0, 0),
    updatedAt: overrides.updatedAt ?? new Date(2026, 4, 1, 0, 0),
  };
}

describe('searchCalendarItems', () => {
  it('returns no items for an empty query', () => {
    expect(searchCalendarItems([item({ title: '買い物' })], '  ')).toEqual([]);
  });

  it('matches item titles and memos', () => {
    const piano = item({ itemId: 'piano', title: 'ピアノ発表会' });
    const clinic = item({ itemId: 'clinic', title: '予防接種', memo: '小児科' });
    const other = item({ itemId: 'other', title: 'ごみ捨て' });

    expect(searchCalendarItems([piano, clinic, other], '小児')).toEqual([clinic]);
    expect(searchCalendarItems([piano, clinic, other], 'ピアノ')).toEqual([piano]);
  });

  it('does not include unscheduled inbox memos', () => {
    const inbox = item({ itemId: 'inbox', status: 'inbox', type: null, title: 'あとで調べる' });

    expect(searchCalendarItems([inbox], 'あとで')).toEqual([]);
  });

  it('normalizes case and repeated whitespace', () => {
    const itemA = item({ title: 'School  Forms' });

    expect(searchCalendarItems([itemA], 'school forms')).toEqual([itemA]);
  });
});
