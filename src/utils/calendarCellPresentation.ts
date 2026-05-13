import { AssigneeValue, CalendarItem } from '../types/CalendarItem';

export type CalendarCellAssigneeTone = 'self' | 'partner' | 'both' | 'whoever' | 'unknown';

export type CalendarCellPresentation = {
  kindLabel: '予' | 'タ';
  assigneeTone: CalendarCellAssigneeTone;
  title: string;
};

export function buildCalendarCellPresentation(
  item: CalendarItem,
  currentUserId: string,
  maxTitleLength = 10
): CalendarCellPresentation {
  return {
    kindLabel: item.type === 'event' ? '予' : 'タ',
    assigneeTone: getAssigneeTone(item.assignee, currentUserId),
    title: shortenTitle(item.title, maxTitleLength),
  };
}

function getAssigneeTone(
  assignee: AssigneeValue | null,
  currentUserId: string
): CalendarCellAssigneeTone {
  if (!assignee) return 'unknown';
  if (assignee === 'both') return 'both';
  if (assignee === 'whoever') return 'whoever';
  return assignee === currentUserId ? 'self' : 'partner';
}

function shortenTitle(title: string, maxLength: number): string {
  const normalized = title.trim().replace(/\s+/g, ' ');
  if (normalized.length <= maxLength) return normalized;
  if (maxLength <= 1) return normalized.slice(0, maxLength);
  return `${normalized.slice(0, maxLength - 1)}…`;
}
