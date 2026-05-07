import { useEffect, useState } from 'react';
import { Firestore } from 'firebase/firestore';
import { CalendarItem } from '../types/CalendarItem';
import { subscribeCalendarItems } from '../services/firestore';
import { sortScheduledItems } from '../utils/calendarDisplay';

export function useCalendarItems(
  db: Firestore,
  householdId: string | null
): {
  items: CalendarItem[];
  isLoading: boolean;
  errorMessage: string | null;
} {
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(householdId));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!householdId) {
      setItems([]);
      setIsLoading(false);
      setErrorMessage(null);
      return undefined;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const unsubscribe = subscribeCalendarItems(
      db,
      householdId,
      (nextItems) => {
        setItems(sortScheduledItems(nextItems));
        setIsLoading(false);
      },
      () => {
        setErrorMessage('予定の読み込みに失敗しました。時間をおいて再度お試しください。');
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, [db, householdId]);

  return { items, isLoading, errorMessage };
}
