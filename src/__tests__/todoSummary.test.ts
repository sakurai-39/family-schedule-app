import {
  buildWeeklyTodoSummaryPlan,
  getWeeklyTodoSummaryTrigger,
} from '../utils/notificationSchedule';
import { CalendarItem } from '../types/CalendarItem';

const SELF_ID = 'user-self';
const PARTNER_ID = 'user-partner';

function calendarItem(overrides: Partial<CalendarItem>): CalendarItem {
  return {
    itemId: 'item-1',
    status: 'scheduled',
    type: 'task',
    title: '保育園に連絡',
    assignee: SELF_ID,
    startAt: null,
    dueAt: null,
    memo: '',
    isCompleted: false,
    recurrence: null,
    createdBy: SELF_ID,
    inputDurationMs: null,
    createdAt: new Date('2026-05-08T00:00:00.000Z'),
    updatedAt: new Date('2026-05-08T00:00:00.000Z'),
    ...overrides,
  };
}

describe('todo summary notification quality checks', () => {
  it('counts only open undated tasks assigned to the current user or shared assignees', () => {
    const plan = buildWeeklyTodoSummaryPlan(
      [
        calendarItem({ itemId: 'mine' }),
        calendarItem({ itemId: 'both', assignee: 'both' }),
        calendarItem({ itemId: 'whoever', assignee: 'whoever' }),
        calendarItem({ itemId: 'partner', assignee: PARTNER_ID }),
        calendarItem({ itemId: 'completed', isCompleted: true }),
        calendarItem({ itemId: 'due-task', dueAt: new Date('2026-05-09T09:00:00.000Z') }),
        calendarItem({
          itemId: 'event',
          type: 'event',
          startAt: new Date('2026-05-09T09:00:00.000Z'),
        }),
        calendarItem({ itemId: 'inbox', status: 'inbox', type: null, assignee: null }),
      ],
      SELF_ID
    );

    expect(plan).toEqual({
      count: 3,
      title: '家族スケジュール',
      body: 'やることリストが3件あります',
    });
  });

  it('returns null when there are no visible open undated tasks', () => {
    const plan = buildWeeklyTodoSummaryPlan(
      [
        calendarItem({ assignee: PARTNER_ID }),
        calendarItem({ assignee: 'both', isCompleted: true }),
        calendarItem({ assignee: SELF_ID, dueAt: new Date('2026-05-09T09:00:00.000Z') }),
      ],
      SELF_ID
    );

    expect(plan).toBeNull();
  });

  it('uses Sunday 20:00 for the weekly summary notification', () => {
    expect(getWeeklyTodoSummaryTrigger()).toEqual({
      weekday: 1,
      hour: 20,
      minute: 0,
    });
  });
});
