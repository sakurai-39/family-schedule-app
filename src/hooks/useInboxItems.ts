import { useEffect, useState } from 'react';
import { Firestore } from 'firebase/firestore';
import { CalendarItem } from '../types/CalendarItem';
import { subscribeInboxItems } from '../services/firestore';

export function useInboxItems(
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

    const unsubscribe = subscribeInboxItems(
      db,
      householdId,
      (nextItems) => {
        setItems(sortInboxItems(nextItems));
        setIsLoading(false);
      },
      () => {
        setErrorMessage(
          'とりあえずメモの読み込みに失敗しました。時間をおいてもう一度お試しください。'
        );
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, [db, householdId]);

  return { items, isLoading, errorMessage };
}

function sortInboxItems(items: CalendarItem[]): CalendarItem[] {
  return [...items].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
