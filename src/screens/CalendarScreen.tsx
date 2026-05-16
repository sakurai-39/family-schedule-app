import { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Firestore } from 'firebase/firestore';
import { User } from '../types/User';
import { CalendarItem } from '../types/CalendarItem';
import { BottomNavBar } from '../components/BottomNavBar';
import { useCalendarItems } from '../hooks/useCalendarItems';
import { useNotificationSync } from '../hooks/useNotificationSync';
import {
  buildMonthGrid,
  CalendarDay,
  getDisplayDate,
  getUndatedTasks,
  toLocalDateKey,
} from '../utils/calendarDisplay';
import {
  buildCalendarCellPresentation,
  CalendarCellAssigneeTone,
} from '../utils/calendarCellPresentation';
import { CalendarDateTone, getCalendarDateTone } from '../utils/japaneseHolidays';

type CalendarScreenProps = {
  db: Firestore;
  user: User;
  onCreateEventForDate: (date: Date) => void;
  onOpenDateItems: (date: Date) => void;
  onOpenInbox: () => void;
  onOpenInboxComposer: () => void;
  onOpenSettings: () => void;
  onOpenUndatedTasks: () => void;
};

const weekLabels = ['日', '月', '火', '水', '木', '金', '土'];
const MAX_ITEMS_PER_CELL = 2;
const MONTH_PAGE_RADIUS = 60;
const MONTH_PAGE_COUNT = MONTH_PAGE_RADIUS * 2 + 1;

type MonthPage = {
  key: string;
  month: Date;
  visibleDays: CalendarDay[];
};

function getMonthDate(baseDate: Date, offset: number): Date {
  return new Date(baseDate.getFullYear(), baseDate.getMonth() + offset, 1);
}

function getMonthOffset(fromMonth: Date, toMonth: Date): number {
  return (
    (toMonth.getFullYear() - fromMonth.getFullYear()) * 12 +
    toMonth.getMonth() -
    fromMonth.getMonth()
  );
}

export function CalendarScreen({
  db,
  user,
  onCreateEventForDate,
  onOpenDateItems,
  onOpenInbox,
  onOpenInboxComposer,
  onOpenSettings,
  onOpenUndatedTasks,
}: CalendarScreenProps) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const householdId = user.householdId;
  const monthListRef = useRef<FlatList<MonthPage>>(null);
  const currentPageIndexRef = useRef(MONTH_PAGE_RADIUS);
  const today = useMemo(() => new Date(), []);
  const baseMonth = useMemo(() => new Date(today.getFullYear(), today.getMonth(), 1), [today]);
  const [currentPageIndex, setCurrentPageIndexState] = useState(MONTH_PAGE_RADIUS);
  const visibleMonth = useMemo(
    () => getMonthDate(baseMonth, currentPageIndex - MONTH_PAGE_RADIUS),
    [baseMonth, currentPageIndex]
  );
  const [selectedDate, setSelectedDate] = useState(today);
  const { items, isLoading, errorMessage } = useCalendarItems(db, householdId);
  const notificationSync = useNotificationSync({
    householdId,
    userId: user.userId,
    items,
    enabled: !isLoading,
  });

  const monthPages = useMemo(
    () =>
      Array.from({ length: MONTH_PAGE_COUNT }, (_, index) => {
        const month = getMonthDate(baseMonth, index - MONTH_PAGE_RADIUS);
        return {
          key: toLocalDateKey(month),
          month,
          visibleDays: getVisibleMonthGrid(buildMonthGrid(month, today)),
        };
      }),
    [baseMonth, today]
  );

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

  const undatedTasks = useMemo(() => getUndatedTasks(items), [items]);
  const openUndatedTaskCount = useMemo(
    () => undatedTasks.filter((item) => !item.isCompleted).length,
    [undatedTasks]
  );

  const pageWidth = Math.max(windowWidth - 32, 1);

  const updateCurrentPageIndex = useCallback((index: number) => {
    const nextIndex = Math.max(0, Math.min(MONTH_PAGE_COUNT - 1, index));
    if (currentPageIndexRef.current === nextIndex) return;

    currentPageIndexRef.current = nextIndex;
    setCurrentPageIndexState(nextIndex);
  }, []);

  const scrollToPageIndex = useCallback(
    (index: number, animated = true) => {
      const nextIndex = Math.max(0, Math.min(MONTH_PAGE_COUNT - 1, index));
      updateCurrentPageIndex(nextIndex);
      monthListRef.current?.scrollToOffset({
        animated,
        offset: nextIndex * pageWidth,
      });
    },
    [pageWidth, updateCurrentPageIndex]
  );

  const syncPageIndexFromOffset = useCallback(
    (offsetX: number) => {
      updateCurrentPageIndex(Math.round(offsetX / pageWidth));
    },
    [pageWidth, updateCurrentPageIndex]
  );

  const handleMonthScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      syncPageIndexFromOffset(event.nativeEvent.contentOffset.x);
    },
    [syncPageIndexFromOffset]
  );

  const syncPageIndexFromScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      syncPageIndexFromOffset(event.nativeEvent.contentOffset.x);
    },
    [syncPageIndexFromOffset]
  );

  const handleOpenDateItems = useCallback(
    (date: Date) => {
      setSelectedDate(date);
      const targetMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      scrollToPageIndex(MONTH_PAGE_RADIUS + getMonthOffset(baseMonth, targetMonth), false);
      onOpenDateItems(date);
    },
    [baseMonth, onOpenDateItems, scrollToPageIndex]
  );

  const renderMonthPage = useCallback(
    ({ item: page }: { item: MonthPage }) => (
      <View style={[styles.monthPage, { width: pageWidth }]}>
        <View style={styles.monthGrid}>
          {page.visibleDays.map((day) =>
            renderDayCell({
              day,
              isSelected: day.dateKey === toLocalDateKey(selectedDate),
              items: itemsByDateKey.get(day.dateKey) ?? [],
              onPress: () => handleOpenDateItems(day.date),
              userId: user.userId,
            })
          )}
        </View>
      </View>
    ),
    [handleOpenDateItems, itemsByDateKey, pageWidth, selectedDate, user.userId]
  );

  const bottomNavReservedHeight = 96 + insets.bottom;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomNavReservedHeight }]}
      >
        <View style={styles.monthHeader}>
          <Pressable
            accessibilityRole="button"
            onPress={() => scrollToPageIndex(currentPageIndex - 1, false)}
            style={styles.monthButton}
          >
            <Text style={styles.monthButtonText}>‹</Text>
          </Pressable>
          <Text style={styles.monthTitle}>{formatMonthTitle(visibleMonth)}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => scrollToPageIndex(currentPageIndex + 1, false)}
            style={styles.monthButton}
          >
            <Text style={styles.monthButtonText}>›</Text>
          </Pressable>
        </View>

        <View style={styles.weekRow}>
          {weekLabels.map((label, index) => (
            <Text
              key={label}
              style={[
                styles.weekLabel,
                index === 0 && styles.weekLabelSunday,
                index === 6 && styles.weekLabelSaturday,
              ]}
            >
              {label}
            </Text>
          ))}
        </View>

        <View style={styles.monthGridFrame}>
          <FlatList
            ref={monthListRef}
            data={monthPages}
            decelerationRate="fast"
            directionalLockEnabled
            getItemLayout={(_, index) => ({
              index,
              length: pageWidth,
              offset: pageWidth * index,
            })}
            horizontal
            initialScrollIndex={MONTH_PAGE_RADIUS}
            initialNumToRender={3}
            keyExtractor={(page) => page.key}
            maxToRenderPerBatch={3}
            onMomentumScrollEnd={syncPageIndexFromScroll}
            onScroll={handleMonthScroll}
            onScrollToIndexFailed={(info) => {
              monthListRef.current?.scrollToOffset({
                animated: false,
                offset: info.index * pageWidth,
              });
            }}
            pagingEnabled
            renderItem={renderMonthPage}
            removeClippedSubviews
            scrollEventThrottle={16}
            showsHorizontalScrollIndicator={false}
            windowSize={5}
          />
        </View>

        {isLoading ? <Text style={styles.mutedText}>予定を読み込んでいます</Text> : null}
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
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

function formatMonthTitle(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

function getVisibleMonthGrid(monthGrid: ReturnType<typeof buildMonthGrid>) {
  let lastCurrentMonthIndex = 0;
  for (let i = 0; i < monthGrid.length; i++) {
    const cell = monthGrid[i];
    if (cell?.isCurrentMonth) lastCurrentMonthIndex = i;
  }
  const weeksNeeded = Math.max(5, Math.ceil((lastCurrentMonthIndex + 1) / 7));
  return monthGrid.slice(0, weeksNeeded * 7);
}

function renderDayCell({
  day,
  isSelected,
  items,
  onPress,
  userId,
}: {
  day: ReturnType<typeof buildMonthGrid>[number];
  isSelected: boolean;
  items: CalendarItem[];
  onPress: () => void;
  userId: string;
}) {
  const dateTone = getCalendarDateTone(day.date);
  const visibleItems = items.slice(0, MAX_ITEMS_PER_CELL);
  const overflowCount = items.length - visibleItems.length;

  return (
    <Pressable
      accessibilityRole="button"
      key={day.dateKey}
      onPress={onPress}
      style={[
        styles.dayCell,
        dateToneCellStyles[dateTone],
        !day.isCurrentMonth && styles.otherMonthCell,
        day.isToday && styles.todayCell,
        isSelected && styles.selectedDayCell,
      ]}
    >
      <Text
        style={[
          styles.dayText,
          dateToneTextStyles[dateTone],
          !day.isCurrentMonth && styles.otherMonthText,
          isSelected && styles.selectedDayText,
        ]}
      >
        {day.dayOfMonth}
      </Text>
      <View style={styles.cellItemsArea}>
        {visibleItems.map((item) => {
          const presentation = buildCalendarCellPresentation(item, userId, 8);
          return (
            <View
              key={item.itemId}
              style={[
                styles.cellItemPill,
                cellToneStyles[presentation.assigneeTone],
                isSelected && styles.cellItemPillSelected,
              ]}
            >
              <Text style={[styles.cellItemKind, isSelected && styles.cellItemKindSelected]}>
                {presentation.kindLabel}
              </Text>
              <Text
                numberOfLines={1}
                style={[styles.cellItemTitle, isSelected && styles.cellItemTitleSelected]}
              >
                {presentation.title}
              </Text>
            </View>
          );
        })}
        {overflowCount > 0 ? (
          <Text style={[styles.cellOverflowText, isSelected && styles.cellOverflowSelected]}>
            +{overflowCount}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
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
  weekLabelSaturday: {
    color: '#2563a9',
  },
  weekLabelSunday: {
    color: '#b42318',
  },
  monthGridFrame: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  monthPage: {
    backgroundColor: '#ffffff',
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
  cellItemPill: {
    alignItems: 'center',
    borderRadius: 4,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 2,
    minHeight: 16,
    overflow: 'hidden',
    paddingHorizontal: 2,
  },
  cellItemPillSelected: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  cellItemKind: {
    color: '#202124',
    fontSize: 8,
    fontWeight: '900',
    lineHeight: 12,
  },
  cellItemKindSelected: {
    color: '#205f4b',
  },
  cellItemTitle: {
    color: '#202124',
    flex: 1,
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 12,
  },
  cellItemTitleSelected: {
    color: '#205f4b',
  },
  cellOverflowText: {
    color: '#205f4b',
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'right',
  },
  cellOverflowSelected: {
    color: '#ffffff',
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
  todoSummaryBanner: {
    backgroundColor: '#eaf4ee',
    borderColor: '#b7d2c4',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
  },
  todoSummaryBannerText: {
    color: '#205f4b',
    fontSize: 14,
    fontWeight: '800',
  },
});

const cellToneStyles = StyleSheet.create<Record<CalendarCellAssigneeTone, object>>({
  self: {
    backgroundColor: '#e4f3ec',
    borderColor: '#8fc7aa',
  },
  partner: {
    backgroundColor: '#fde8ef',
    borderColor: '#eba6bd',
  },
  both: {
    backgroundColor: '#efe8ff',
    borderColor: '#b8a2e6',
  },
  whoever: {
    backgroundColor: '#fff3cf',
    borderColor: '#e2bd55',
  },
  unknown: {
    backgroundColor: '#edf0ef',
    borderColor: '#c4cbc7',
  },
});

const dateToneCellStyles = StyleSheet.create<Record<CalendarDateTone, object>>({
  weekday: {},
  saturday: {
    backgroundColor: '#f3f8ff',
  },
  sunday: {
    backgroundColor: '#fff4f3',
  },
  holiday: {
    backgroundColor: '#fff0ed',
  },
});

const dateToneTextStyles = StyleSheet.create<Record<CalendarDateTone, object>>({
  weekday: {},
  saturday: {
    color: '#2563a9',
  },
  sunday: {
    color: '#b42318',
  },
  holiday: {
    color: '#b42318',
  },
});
