import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Firestore } from 'firebase/firestore';
import { User } from '../types/User';
import { CalendarItem, AssigneeValue } from '../types/CalendarItem';
import { CalendarItemCard } from '../components/CalendarItemCard';
import { AssigneeBadgeTone } from '../components/AssigneeBadge';
import { BottomNavBar } from '../components/BottomNavBar';
import { useCalendarItems } from '../hooks/useCalendarItems';
import { useNotificationSync } from '../hooks/useNotificationSync';
import {
  buildMonthGrid,
  getDisplayDate,
  getItemsForDate,
  getUndatedTasks,
  splitCompletedItems,
  toLocalDateKey,
} from '../utils/calendarDisplay';
import { updateCalendarItem } from '../services/firestore';

type CalendarScreenProps = {
  db: Firestore;
  user: User;
  onOpenSettings: () => void;
  onOpenInbox: () => void;
  onOpenInboxComposer: () => void;
  onOpenUndatedTasks: () => void;
  onOpenItem: (item: CalendarItem) => void;
  onCreateEventForDate: (date: Date) => void;
};

const weekLabels = ['日', '月', '火', '水', '木', '金', '土'];
const MAX_ITEMS_PER_CELL = 2;

export function CalendarScreen({
  db,
  user,
  onOpenSettings,
  onOpenInbox,
  onOpenInboxComposer,
  onOpenUndatedTasks,
  onOpenItem,
  onCreateEventForDate,
}: CalendarScreenProps) {
  const insets = useSafeAreaInsets();
  const householdId = user.householdId;
  const today = useMemo(() => new Date(), []);
  const [visibleMonth, setVisibleMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDate, setSelectedDate] = useState(today);
  const [showCompleted, setShowCompleted] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const { items, isLoading, errorMessage } = useCalendarItems(db, householdId);
  const notificationSync = useNotificationSync({
    householdId,
    userId: user.userId,
    items,
    enabled: !isLoading,
  });

  const monthGrid = useMemo(() => buildMonthGrid(visibleMonth, today), [today, visibleMonth]);
  const visibleMonthGrid = useMemo(() => {
    let lastCurrentMonthIndex = 0;
    for (let i = 0; i < monthGrid.length; i++) {
      const cell = monthGrid[i];
      if (cell?.isCurrentMonth) lastCurrentMonthIndex = i;
    }
    const weeksNeeded = Math.max(5, Math.ceil((lastCurrentMonthIndex + 1) / 7));
    return monthGrid.slice(0, weeksNeeded * 7);
  }, [monthGrid]);

  const itemsByDateKey = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items) {
      const date = getDisplayDate(item);
      if (!date) continue;
      const key = toLocalDateKey(date);
      const list = map.get(key);
      if (list) {
        list.push(item);
      } else {
        map.set(key, [item]);
      }
    }
    return map;
  }, [items]);

  const selectedItems = useMemo(() => getItemsForDate(items, selectedDate), [items, selectedDate]);
  const undatedTasks = useMemo(() => getUndatedTasks(items), [items]);
  const openUndatedTaskCount = useMemo(
    () => undatedTasks.filter((item) => !item.isCompleted).length,
    [undatedTasks]
  );
  const { open, completed } = useMemo(() => splitCompletedItems(selectedItems), [selectedItems]);

  const handleMoveMonth = (amount: number) => {
    const nextMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + amount, 1);
    setVisibleMonth(nextMonth);
  };

  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-30, 30])
        .failOffsetY([-20, 20])
        .onEnd((event) => {
          if (event.translationX <= -50) {
            handleMoveMonth(1);
          } else if (event.translationX >= 50) {
            handleMoveMonth(-1);
          }
        }),
    // handleMoveMonth depends on visibleMonth so re-create on month change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleMonth]
  );

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  };

  const handleToggleCompleted = async (item: CalendarItem) => {
    if (!householdId) return;

    setUpdatingItemId(item.itemId);
    setActionError(null);
    try {
      await updateCalendarItem(db, householdId, item.itemId, {
        isCompleted: !item.isCompleted,
      });
    } catch {
      setActionError('完了状態の更新に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setUpdatingItemId(null);
    }
  };

  const bottomNavReservedHeight = 96 + insets.bottom;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomNavReservedHeight }]}
      >
        <View style={styles.monthHeader}>
          <Pressable
            accessibilityRole="button"
            onPress={() => handleMoveMonth(-1)}
            style={styles.monthButton}
          >
            <Text style={styles.monthButtonText}>‹</Text>
          </Pressable>
          <Text style={styles.monthTitle}>{formatMonthTitle(visibleMonth)}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => handleMoveMonth(1)}
            style={styles.monthButton}
          >
            <Text style={styles.monthButtonText}>›</Text>
          </Pressable>
        </View>

        <View style={styles.weekRow}>
          {weekLabels.map((label) => (
            <Text key={label} style={styles.weekLabel}>
              {label}
            </Text>
          ))}
        </View>

        <GestureDetector gesture={swipeGesture}>
          <View style={styles.monthGrid}>
            {visibleMonthGrid.map((day) => {
              const isSelected = day.dateKey === toLocalDateKey(selectedDate);
              const dayItems = itemsByDateKey.get(day.dateKey) ?? [];
              const visibleItems = dayItems.slice(0, MAX_ITEMS_PER_CELL);
              const overflowCount = dayItems.length - visibleItems.length;

              return (
                <Pressable
                  accessibilityRole="button"
                  key={day.dateKey}
                  onPress={() => handleSelectDate(day.date)}
                  style={[
                    styles.dayCell,
                    !day.isCurrentMonth && styles.otherMonthCell,
                    day.isToday && styles.todayCell,
                    isSelected && styles.selectedDayCell,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      !day.isCurrentMonth && styles.otherMonthText,
                      isSelected && styles.selectedDayText,
                    ]}
                  >
                    {day.dayOfMonth}
                  </Text>
                  <View style={styles.cellItemsArea}>
                    {visibleItems.map((item) => (
                      <Text
                        key={item.itemId}
                        numberOfLines={1}
                        style={[styles.cellItemText, isSelected && styles.cellItemTextSelected]}
                      >
                        {item.title}
                      </Text>
                    ))}
                    {overflowCount > 0 ? (
                      <Text
                        style={[styles.cellOverflowText, isSelected && styles.cellItemTextSelected]}
                      >
                        +{overflowCount}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </GestureDetector>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{formatListTitle(selectedDate)}</Text>
          <Text style={styles.countText}>{selectedItems.length}件</Text>
        </View>

        {isLoading ? <Text style={styles.mutedText}>予定を読み込んでいます。</Text> : null}
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        {actionError ? <Text style={styles.errorText}>{actionError}</Text> : null}
        {notificationSync.errorMessage ? (
          <Text style={styles.errorText}>{notificationSync.errorMessage}</Text>
        ) : null}

        {openUndatedTaskCount > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={onOpenUndatedTasks}
            style={styles.todoSummaryBanner}
          >
            <Text style={styles.todoSummaryBannerText}>
              期限なしタスクが{openUndatedTaskCount}件あります
            </Text>
          </Pressable>
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

      <BottomNavBar
        bottomInset={insets.bottom}
        onAddEvent={() => onCreateEventForDate(selectedDate)}
        onAddInbox={onOpenInboxComposer}
        onOpenInbox={onOpenInbox}
        onOpenSettings={onOpenSettings}
      />
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

function formatMonthTitle(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

function formatListTitle(date: Date): string {
  return `${date.getMonth() + 1}月${date.getDate()}日の予定`;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f7f7f2',
    flex: 1,
  },
  content: {
    gap: 14,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  monthHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  monthButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  monthButtonText: {
    color: '#202124',
    fontSize: 26,
    fontWeight: '600',
    lineHeight: 30,
  },
  monthTitle: {
    color: '#202124',
    fontSize: 22,
    fontWeight: '800',
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekLabel: {
    color: '#68706b',
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  monthGrid: {
    backgroundColor: '#ffffff',
    borderColor: '#d8ded9',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    overflow: 'hidden',
  },
  dayCell: {
    alignItems: 'stretch',
    borderColor: '#edf0ed',
    borderRightWidth: 1,
    borderTopWidth: 1,
    minHeight: 76,
    paddingHorizontal: 3,
    paddingVertical: 4,
    width: `${100 / 7}%`,
  },
  otherMonthCell: {
    backgroundColor: '#fafbf9',
  },
  todayCell: {
    backgroundColor: '#eaf4ee',
  },
  selectedDayCell: {
    backgroundColor: '#205f4b',
  },
  dayText: {
    color: '#202124',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  otherMonthText: {
    color: '#a2aaa5',
  },
  selectedDayText: {
    color: '#ffffff',
  },
  cellItemsArea: {
    gap: 2,
    marginTop: 2,
  },
  cellItemText: {
    backgroundColor: '#dfe7e3',
    borderRadius: 3,
    color: '#1a3d30',
    fontSize: 9,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  cellItemTextSelected: {
    backgroundColor: '#ffffff',
    color: '#205f4b',
  },
  cellOverflowText: {
    color: '#205f4b',
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'right',
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  sectionTitle: {
    color: '#202124',
    fontSize: 17,
    fontWeight: '800',
  },
  countText: {
    color: '#68706b',
    fontSize: 13,
    fontWeight: '700',
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
  itemList: {
    gap: 10,
  },
  completedArea: {
    gap: 10,
  },
  completedToggle: {
    backgroundColor: '#edf0ed',
    borderRadius: 8,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  completedToggleText: {
    color: '#4d5751',
    fontSize: 13,
    fontWeight: '800',
  },
  todoSummaryBanner: {
    backgroundColor: '#eaf4ee',
    borderColor: '#b7d2c4',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  todoSummaryBannerText: {
    color: '#205f4b',
    fontSize: 14,
    fontWeight: '800',
  },
});
