import {
  ActiveScreen,
  getAndroidBackTarget,
  getEditReturnScreen,
  ReturnScreen,
} from '../utils/navigation';
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

describe('navigation', () => {
  it('lets Android handle back on the root calendar screen', () => {
    expect(getAndroidBackTarget({ name: 'calendar' })).toBeNull();
  });

  it('returns from secondary screens to their expected parent screens', () => {
    expect(getAndroidBackTarget({ name: 'settings' })).toEqual({ name: 'calendar' });
    expect(getAndroidBackTarget({ name: 'invite' })).toEqual({ name: 'settings' });
    expect(getAndroidBackTarget({ name: 'inbox', mode: 'list' })).toEqual({ name: 'calendar' });
    expect(getAndroidBackTarget({ name: 'undated-tasks' })).toEqual({ name: 'calendar' });
    expect(getAndroidBackTarget({ name: 'date-items', date: new Date(2026, 4, 7) })).toEqual({
      name: 'calendar',
    });
  });

  it('preserves explicit return targets for create and edit screens', () => {
    const returnTo: ReturnScreen = { name: 'date-items', date: new Date(2026, 4, 7) };

    expect(
      getAndroidBackTarget({
        name: 'create-event',
        presetDate: new Date(2026, 4, 7),
        returnTo,
      })
    ).toBe(returnTo);

    expect(
      getAndroidBackTarget({
        name: 'edit',
        item: item({ itemId: 'event' }),
        returnTo,
      })
    ).toBe(returnTo);
  });

  it('falls back to the correct list when editing without an explicit return target', () => {
    const inbox = item({ status: 'inbox', type: null });
    const undatedTask = item({ type: 'task', dueAt: null });
    const datedTask = item({ type: 'task', dueAt: new Date(2026, 4, 8, 18, 0) });

    expect(getEditReturnScreen(inbox)).toEqual({ name: 'inbox', mode: 'list' });
    expect(getEditReturnScreen(undatedTask)).toEqual({ name: 'undated-tasks' });
    expect(getEditReturnScreen(datedTask)).toEqual({ name: 'calendar' });
  });

  it('keeps create screen back navigation on calendar by default', () => {
    const activeScreen: ActiveScreen = {
      name: 'create-event',
      presetDate: new Date(2026, 4, 7),
    };

    expect(getAndroidBackTarget(activeScreen)).toEqual({ name: 'calendar' });
  });
});
