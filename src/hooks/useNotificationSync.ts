import { useEffect, useState } from 'react';
import { CalendarItem } from '../types/CalendarItem';
import { syncLocalNotifications } from '../services/notifications';

type NotificationSyncStatus = 'idle' | 'synced' | 'permission-denied' | 'error';

type UseNotificationSyncParams = {
  householdId: string | null;
  userId: string;
  items: CalendarItem[];
  enabled?: boolean;
};

export function useNotificationSync({
  householdId,
  userId,
  items,
  enabled = true,
}: UseNotificationSyncParams): {
  status: NotificationSyncStatus;
  errorMessage: string | null;
} {
  const [status, setStatus] = useState<NotificationSyncStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!householdId || !enabled) {
      setStatus('idle');
      setErrorMessage(null);
      return undefined;
    }

    let isActive = true;

    syncLocalNotifications({
      householdId,
      userId,
      items,
    })
      .then((result) => {
        if (!isActive) return;
        if (!result.permissionGranted) {
          setStatus('permission-denied');
          setErrorMessage('通知が許可されていません。端末の設定から通知を許可してください。');
          return;
        }
        setStatus('synced');
        setErrorMessage(null);
      })
      .catch(() => {
        if (!isActive) return;
        setStatus('error');
        setErrorMessage('通知の予約に失敗しました。時間をおいてもう一度お試しください。');
      });

    return () => {
      isActive = false;
    };
  }, [enabled, householdId, items, userId]);

  return { status, errorMessage };
}
