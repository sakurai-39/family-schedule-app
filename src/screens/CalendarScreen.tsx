import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Firestore } from 'firebase/firestore';
import { User } from '../types/User';
import { CalendarItem, AssigneeValue } from '../types/CalendarItem';
import { CalendarItemCard } from '../components/CalendarItemCard';
import { AssigneeBadgeTone } from '../components/AssigneeBadge';
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
  onOpenItem: (item: CalendarItem) => void;
  onCreateEventForDate: (date: Date) => void;
};

type CalendarTab = 'today' | 'todo';

const weekLabels = ['日', '月', '火', '水', '木', '金', '土'];

export function CalendarScreen({
  db,
  user,
  onOpenSettings,
  onOpenInbox,
  onOpenItem,
  onCreateEventForDate,
}: CalendarScreenProps) {
  const householdId = user.householdId;
  const today = useMemo(() => new Date(), []);
  const [visibleMonth, setVisibleMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDate, setSelectedDate] = useState(today);
  const [activeTab, setActiveTab] = useState<CalendarTab>('today');
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
  const itemDateKeys = useMemo(() => {
    return new Set(
      items
        .map((item) => getDisplayDate(item))
        .filter((date): date is Date => date !== null)
        .map((date) => toLocalDateKey(date))
    );
  }, [items]);

  const selectedItems = useMemo(() => getItemsForDate(items, selectedDate), [items, selectedDate]);
  const undatedTasks = useMemo(() => getUndatedTasks(items), [items]);
  const openUndatedTaskCount = useMemo(
    () => undatedTasks.filter((item) => !item.isCompleted).length,
    [undatedTasks]
  );
  const visibleItems = activeTab === 'today' ? selectedItems : undatedTasks;
  const { open, completed } = useMemo(() => splitCompletedItems(visibleItems), [visibleItems]);

  const handleMoveMonth = (amount: number) => {
    const nextMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + amount, 1);
    setVisibleMonth(nextMonth);
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    setActiveTab('today');
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

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>家族スケジュール</Text>
            <Text style={styles.title}>{formatDateHeading(selectedDate)}</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable accessibilityRole="button" onPress={onOpenInbox} style={styles.headerButton}>
              <Text style={styles.headerButtonText}>メモ</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onOpenSettings}
              style={styles.headerButton}
            >
              <Text style={styles.headerButtonText}>設定</Text>
            </Pressable>
          </View>
        </View>

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

        <View style={styles.monthGrid}>
          {visibleMonthGrid.map((day) => {
            const isSelected = day.dateKey === toLocalDateKey(selectedDate);
            const hasItem = itemDateKeys.has(day.dateKey);

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
                <View
                  style={[
                    styles.itemDot,
                    !hasItem && styles.itemDotHidden,
                    isSelected && hasItem && styles.selectedItemDot,
                  ]}
                />
              </Pressable>
            );
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => onCreateEventForDate(selectedDate)}
          style={styles.addEventButton}
        >
          <Text style={styles.addEventButtonText}>+ この日に予定を追加</Text>
        </Pressable>

        <View style={styles.tabRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setActiveTab('today')}
            style={[styles.tabButton, activeTab === 'today' && styles.activeTabButton]}
          >
            <Text
              style={[styles.tabButtonText, activeTab === 'today' && styles.activeTabButtonText]}
            >
              今日
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setActiveTab('todo')}
            style={[styles.tabButton, activeTab === 'todo' && styles.activeTabButton]}
          >
            <Text
              style={[styles.tabButtonText, activeTab === 'todo' && styles.activeTabButtonText]}
            >
              やること
            </Text>
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {activeTab === 'today' ? formatListTitle(selectedDate) : '期限なしのやること'}
          </Text>
          <Text style={styles.countText}>{visibleItems.length}件</Text>
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
            onPress={() => setActiveTab('todo')}
            style={styles.todoSummaryBanner}
          >
            <Text style={styles.todoSummaryBannerText}>
              やることリストが{openUndatedTaskCount}件あります
            </Text>
          </Pressable>
        ) : null}

        {!isLoading && open.length === 0 && completed.length === 0 ? (
          <View style={styles.emptyArea}>
            <Text style={styles.emptyTitle}>
              {activeTab === 'today' ? 'この日の予定はありません' : 'やることはありません'}
            </Text>
            <Text style={styles.emptyText}>
              {activeTab === 'today'
                ? 'Plan 5で予定やタスクを追加できるようにします。'
                : '期限なしタスクはPlan 5の入力画面で追加します。'}
            </Text>
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

function formatMonthTitle(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

function formatDateHeading(date: Date): string {
  return `${date.getMonth() + 1}月${date.getDate()}日 ${weekLabels[date.getDay()]}`;
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
    gap: 18,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    backgroundColor: '#ffffff',
    borderColor: '#cfd6d1',
    borderRadius: 7,
    borderWidth: 1,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  headerButtonText: {
    color: '#205f4b',
    fontSize: 13,
    fontWeight: '800',
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
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  monthButtonText: {
    color: '#202124',
    fontSize: 30,
    fontWeight: '600',
    lineHeight: 34,
  },
  monthTitle: {
    color: '#202124',
    fontSize: 18,
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
    alignItems: 'center',
    aspectRatio: 1.15,
    borderColor: '#edf0ed',
    borderRightWidth: 1,
    borderTopWidth: 1,
    justifyContent: 'center',
    paddingVertical: 6,
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
    fontSize: 14,
    fontWeight: '700',
  },
  otherMonthText: {
    color: '#a2aaa5',
  },
  selectedDayText: {
    color: '#ffffff',
  },
  itemDot: {
    backgroundColor: '#426b9f',
    borderRadius: 3,
    height: 6,
    marginTop: 4,
    width: 6,
  },
  itemDotHidden: {
    backgroundColor: 'transparent',
  },
  selectedItemDot: {
    backgroundColor: '#ffffff',
  },
  addEventButton: {
    alignItems: 'center',
    backgroundColor: '#205f4b',
    borderRadius: 8,
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  addEventButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  tabRow: {
    backgroundColor: '#e7ece8',
    borderRadius: 8,
    flexDirection: 'row',
    padding: 4,
  },
  tabButton: {
    alignItems: 'center',
    borderRadius: 6,
    flex: 1,
    minHeight: 42,
    justifyContent: 'center',
  },
  activeTabButton: {
    backgroundColor: '#ffffff',
  },
  tabButtonText: {
    color: '#65706a',
    fontSize: 15,
    fontWeight: '800',
  },
  activeTabButtonText: {
    color: '#205f4b',
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
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  completedToggleText: {
    color: '#4d5751',
    fontSize: 14,
    fontWeight: '800',
  },
  todoSummaryBanner: {
    backgroundColor: '#eaf4ee',
    borderColor: '#b7d2c4',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  todoSummaryBannerText: {
    color: '#205f4b',
    fontSize: 15,
    fontWeight: '800',
  },
});
