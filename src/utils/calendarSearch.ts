import { CalendarItem } from '../types/CalendarItem';
import { sortScheduledItems } from './calendarDisplay';

export function searchCalendarItems(items: CalendarItem[], query: string): CalendarItem[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];

  return sortScheduledItems(items).filter((item) => {
    if (item.status !== 'scheduled') return false;
    const searchableText = normalizeSearchText(`${item.title} ${item.memo}`);
    return searchableText.includes(normalizedQuery);
  });
}

function normalizeSearchText(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}
