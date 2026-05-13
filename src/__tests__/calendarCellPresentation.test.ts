import { CalendarItem } from '../types/CalendarItem';
import { buildCalendarCellPresentation } from '../utils/calendarCellPresentation';

const baseItem: CalendarItem = {
  itemId: 'item-1',
  status: 'scheduled',
  type: 'event',
  title: '保育園の面談',
  assignee: 'user-self',
  startAt: new Date('2026-05-13T09:00:00'),
  dueAt: null,
  memo: '',
  isCompleted: false,
  recurrence: null,
  createdBy: 'user-self',
  inputDurationMs: null,
  createdAt: new Date('2026-05-01T00:00:00'),
  updatedAt: new Date('2026-05-01T00:00:00'),
};

function item(overrides: Partial<CalendarItem>): CalendarItem {
  return { ...baseItem, ...overrides };
}

describe('buildCalendarCellPresentation', () => {
  it('uses event label and self tone for current user assignee', () => {
    expect(
      buildCalendarCellPresentation(item({ type: 'event', assignee: 'user-self' }), 'user-self')
    ).toEqual({
      assigneeTone: 'self',
      kindLabel: '予',
      title: '保育園の面談',
    });
  });

  it('uses task label and partner tone for another user assignee', () => {
    expect(
      buildCalendarCellPresentation(item({ type: 'task', assignee: 'user-partner' }), 'user-self')
    ).toEqual({
      assigneeTone: 'partner',
      kindLabel: 'タ',
      title: '保育園の面談',
    });
  });

  it('maps shared assignee values to stable tones', () => {
    expect(
      buildCalendarCellPresentation(item({ assignee: 'both' }), 'user-self').assigneeTone
    ).toBe('both');
    expect(
      buildCalendarCellPresentation(item({ assignee: 'whoever' }), 'user-self').assigneeTone
    ).toBe('whoever');
    expect(buildCalendarCellPresentation(item({ assignee: null }), 'user-self').assigneeTone).toBe(
      'unknown'
    );
  });

  it('trims whitespace and shortens long titles', () => {
    expect(
      buildCalendarCellPresentation(
        item({ title: '  とても長い予定タイトルです  ' }),
        'user-self',
        8
      ).title
    ).toBe('とても長い予定…');
  });
});
