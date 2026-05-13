import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Firestore } from 'firebase/firestore';
import { AssigneeValue, CalendarItem } from '../types/CalendarItem';
import { User } from '../types/User';
import { AssigneeBadgeTone } from '../components/AssigneeBadge';
import { CalendarItemCard } from '../components/CalendarItemCard';
import { useCalendarItems } from '../hooks/useCalendarItems';
import { getItemsForDate, splitCompletedItems } from '../utils/calendarDisplay';
import { updateCalendarItem } from '../services/firestore';

type DateItemListScreenProps = {
  date: Date;
  db: Firestore;
  user: User;
  onBack: () => void;
  onCreateEventForDate: (date: Date) => void;
  onOpenItem: (item: CalendarItem) => void;
};

export function DateItemListScreen({
  date,
  db,
  user,
  onBack,
  onCreateEventForDate,
  onOpenItem,
}: DateItemListScreenProps) {
  const householdId = user.householdId;
  const { items, isLoading, errorMessage } = useCalendarItems(db, householdId);
  const [showCompleted, setShowCompleted] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const dateItems = useMemo(() => getItemsForDate(items, date), [items, date]);
  const { open, completed } = useMemo(() => splitCompletedItems(dateItems), [dateItems]);

  const handleToggleCompleted = async (item: CalendarItem) => {
    if (!householdId) return;

    setUpdatingItemId(item.itemId);
    setActionError(null);
    try {
      await updateCalendarItem(db, householdId, item.itemId, {
        isCompleted: !item.isCompleted,
      });
    } catch {
      setActionError('予定・タスクの状態更新に失敗しました。時間をおいてもう一度お試しください。');
    } finally {
      setUpdatingItemId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>この日の予定とタスク</Text>
            <Text style={styles.title}>{formatDateTitle(date)}</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={onBack} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>戻る</Text>
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => onCreateEventForDate(date)}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>この日に予定を追加</Text>
        </Pressable>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>未完了</Text>
          <Text style={styles.countText}>{open.length}件</Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingArea}>
            <ActivityIndicator color="#205f4b" />
            <Text style={styles.mutedText}>予定とタスクを読み込んでいます</Text>
          </View>
        ) : null}

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        {actionError ? <Text style={styles.errorText}>{actionError}</Text> : null}

        {!isLoading && open.length === 0 ? (
          <View style={styles.emptyArea}>
            <Text style={styles.emptyTitle}>この日の未完了はありません</Text>
            <Text style={styles.emptyText}>予定やタスクを追加すると、ここに表示されます。</Text>
          </View>
        ) : null}

        <View style={styles.itemList}>
          {open.map((item) => {
            const assignee = getAssigneePresentation(item.assignee, user);
            return (
              <CalendarItemCard
                assigneeLabel={assignee.label}
                assigneeTone={assignee.tone}
                isUpdating={updatingItemId === item.itemId}
                item={item}
                key={item.itemId}
                onPress={onOpenItem}
                onToggleCompleted={handleToggleCompleted}
              />
            );
          })}
        </View>

        {completed.length > 0 ? (
          <View style={styles.completedArea}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowCompleted((current) => !current)}
              style={styles.completedToggle}
            >
              <Text style={styles.completedToggleText}>
                完了済み {completed.length}件 {showCompleted ? '閉じる' : '表示'}
              </Text>
            </Pressable>
            {showCompleted ? (
              <View style={styles.itemList}>
                {completed.map((item) => {
                  const assignee = getAssigneePresentation(item.assignee, user);
                  return (
                    <CalendarItemCard
                      assigneeLabel={assignee.label}
                      assigneeTone={assignee.tone}
                      isUpdating={updatingItemId === item.itemId}
                      item={item}
                      key={item.itemId}
                      onPress={onOpenItem}
                      onToggleCompleted={handleToggleCompleted}
                    />
                  );
                })}
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function getAssigneePresentation(
  assignee: AssigneeValue | null,
  user: User
): { label: string; tone: AssigneeBadgeTone } {
  if (!assignee) {
    return { label: '未定', tone: 'unknown' };
  }

  if (assignee === 'both') {
    return { label: '両方', tone: 'both' };
  }

  if (assignee === 'whoever') {
    return { label: 'どちらか', tone: 'whoever' };
  }

  if (assignee === user.userId) {
    return { label: user.displayName || '自分', tone: 'self' };
  }

  return { label: '相手', tone: 'partner' };
}

function formatDateTitle(date: Date): string {
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f7f7f2',
    flex: 1,
  },
  content: {
    gap: 18,
    paddingBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: '#68706b',
    fontSize: 13,
    fontWeight: '700',
  },
  title: {
    color: '#202124',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0,
    marginTop: 4,
  },
  headerButton: {
    backgroundColor: '#ffffff',
    borderColor: '#cfd6d1',
    borderRadius: 7,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 12,
  },
  headerButtonText: {
    color: '#205f4b',
    fontSize: 13,
    fontWeight: '800',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#205f4b',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: '#202124',
    fontSize: 18,
    fontWeight: '800',
  },
  countText: {
    color: '#68706b',
    fontSize: 13,
    fontWeight: '700',
  },
  loadingArea: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#d8ded9',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 16,
  },
  mutedText: {
    color: '#68706b',
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    color: '#b42318',
    fontSize: 14,
    lineHeight: 20,
  },
  emptyArea: {
    backgroundColor: '#ffffff',
    borderColor: '#d8ded9',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  emptyTitle: {
    color: '#202124',
    fontSize: 16,
    fontWeight: '800',
  },
  emptyText: {
    color: '#68706b',
    fontSize: 14,
    lineHeight: 20,
  },
  itemList: {
    gap: 10,
  },
  completedArea: {
    gap: 10,
  },
  completedToggle: {
    backgroundColor: '#edf0ed',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 14,
  },
  completedToggleText: {
    color: '#4d5751',
    fontSize: 13,
    fontWeight: '800',
  },
});
