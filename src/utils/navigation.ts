import { CalendarItem } from '../types/CalendarItem';

export type ReturnScreen =
  | { name: 'calendar' }
  | { name: 'inbox'; mode: 'list' | 'compose' }
  | { name: 'date-items'; date: Date }
  | { name: 'undated-tasks' }
  | { name: 'search' };

export type ActiveScreen =
  | ReturnScreen
  | { name: 'invite' }
  | { name: 'edit'; item: CalendarItem; returnTo?: ReturnScreen }
  | { name: 'create-event'; presetDate: Date; returnTo?: ReturnScreen }
  | { name: 'settings' };

export function getAndroidBackTarget(activeScreen: ActiveScreen): ActiveScreen | null {
  switch (activeScreen.name) {
    case 'calendar':
      return null;
    case 'invite':
      return { name: 'settings' };
    case 'inbox':
    case 'undated-tasks':
    case 'search':
    case 'date-items':
    case 'settings':
      return { name: 'calendar' };
    case 'edit':
      return getEditReturnScreen(activeScreen.item, activeScreen.returnTo);
    case 'create-event':
      return activeScreen.returnTo ?? { name: 'calendar' };
  }
}

export function getEditReturnScreen(item: CalendarItem, returnTo?: ReturnScreen): ReturnScreen {
  if (returnTo) return returnTo;
  if (item.status === 'inbox') return { name: 'inbox', mode: 'list' };
  if (item.type === 'task' && item.dueAt === null) return { name: 'undated-tasks' };
  return { name: 'calendar' };
}
