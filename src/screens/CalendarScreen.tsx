import { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
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
  getCalendarDateTapAction,
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
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  onOpenUndatedTasks: () => void;
  notificationSyncRevision?: number;
};

const weekLabels = ['日', '月', '火', '水', '木', '金', '土'];
const MAX_ITEMS_PER_CELL = 4;
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

export function CalendarScreen({
  db,
  user,
  onCreateEventForDate,
  onOpenDateItems,
  onOpenInbox,
  onOpenInboxComposer,
  onOpenSearch,
  onOpenSettings,
  onOpenUndatedTasks,
  notificationSyncRevision = 0,
}: CalendarScreenProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const householdId = user.householdId;
  const monthListRef = useRef<FlatList<MonthPage>>(null);
  const currentPageIndexRef = useRef(MONTH_PAGE_RADIUS);
  const today = useMemo(() => new Date(), []);
  const baseMonth = useMemo(() => new Date(today.getFullYear(), today.getMonth(), 1), [today]);
  const [currentPageIndex, setCurrentPageIndexState] = useState(MONTH_PAGE_RADIUS);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [monthPickerYear, setMonthPickerYear] = useState(today.getFullYear());
  const visibleMonth = useMemo(
    () => getMonthDate(baseMonth, currentPageIndex - MONTH_PAGE_RADIUS),
    [baseMonth, currentPageIndex]
  );
  const [selectedDate, setSelectedDate] = useState(today);
  const [openableDateKey, setOpenableDateKey] = useState<string | null>(null);
  const { items, isLoading, errorMessage } = useCalendarItems(db, householdId);
  const notificationSync = useNotificationSync({
    householdId,
    userId: user.userId,
    items,
    enabled: !isLoading,
    refreshKey: notificationSyncRevision,
  });

  const monthPages = useMemo(
    () =>
      Array.from({ length: MONTH_PAGE_COUNT }, (_, index) => {
        const month = getMonthDate(baseMonth, index - MONTH_PAGE_RADIUS);
        return {
          key: toLocalDateKey(month),
          month,
          visibleDays: buildMonthGrid(month, today),
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

  const bottomNavReservedHeight = 84 + insets.bottom;
  const pageWidth = Math.max(windowWidth, 1);
  const calendarCellWidth = (pageWidth - 6) / 7;
  const calendarCellHeight = Math.max(
    92,
    Math.min(132, Math.floor((windowHeight - bottomNavReservedHeight - insets.top - 86) / 6))
  );

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

  const openMonthPicker = useCallback(() => {
    setMonthPickerYear(visibleMonth.getFullYear());
    setIsMonthPickerOpen(true);
  }, [visibleMonth]);

  const jumpToMonth = useCallback(
    (year: number, monthIndex: number) => {
      const targetMonth = new Date(year, monthIndex, 1);
      const offset =
        (targetMonth.getFullYear() - baseMonth.getFullYear()) * 12 +
        targetMonth.getMonth() -
        baseMonth.getMonth();
      scrollToPageIndex(MONTH_PAGE_RADIUS + offset, false);
      setIsMonthPickerOpen(false);
    },
    [baseMonth, scrollToPageIndex]
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

  const handleDayPress = useCallback(
    (date: Date) => {
      const dateKey = toLocalDateKey(date);
      const action = getCalendarDateTapAction(openableDateKey, dateKey);
      setSelectedDate(date);
      setOpenableDateKey(dateKey);
      if (action === 'open') {
        onOpenDateItems(date);
      }
    },
    [onOpenDateItems, openableDateKey]
  );

  const renderMonthPage = useCallback(
    ({ item: page }: { item: MonthPage }) => (
      <View style={[styles.monthPage, { width: pageWidth }]}>
        <View style={styles.monthGrid}>
          {page.visibleDays.map((day, index) =>
            renderDayCell({
              day,
              isSelected: day.dateKey === toLocalDateKey(selectedDate),
              items: itemsByDateKey.get(day.dateKey) ?? [],
              onPress: () => handleDayPress(day.date),
              cellHeight: calendarCellHeight,
              cellWidth: calendarCellWidth,
              columnIndex: index % 7,
              userId: user.userId,
            })
          )}
        </View>
      </View>
    ),
    [
      calendarCellHeight,
      calendarCellWidth,
      handleDayPress,
      itemsByDateKey,
      pageWidth,
      selectedDate,
      user.userId,
    ]
  );

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
          <Pressable
            accessibilityRole="button"
            onPress={openMonthPicker}
            style={styles.monthTitleButton}
          >
            <Text style={styles.monthTitle}>{formatMonthTitle(visibleMonth)}</Text>
          </Pressable>
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
      </ScrollView>

      <Modal animationType="fade" transparent visible={isMonthPickerOpen}>
        <Pressable style={styles.monthPickerBackdrop} onPress={() => setIsMonthPickerOpen(false)}>
          <Pressable style={styles.monthPickerPanel}>
            <View style={styles.monthPickerHeader}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setMonthPickerYear((year) => year - 1)}
                style={styles.monthPickerYearButton}
              >
                <Text style={styles.monthPickerYearButtonText}>‹</Text>
              </Pressable>
              <Text style={styles.monthPickerYearText}>{monthPickerYear}年</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setMonthPickerYear((year) => year + 1)}
                style={styles.monthPickerYearButton}
              >
                <Text style={styles.monthPickerYearButtonText}>›</Text>
              </Pressable>
            </View>
            <View style={styles.monthPickerGrid}>
              {Array.from({ length: 12 }, (_, monthIndex) => (
                <Pressable
                  accessibilityRole="button"
                  key={monthIndex}
                  onPress={() => jumpToMonth(monthPickerYear, monthIndex)}
                  style={[
                    styles.monthPickerMonthButton,
                    visibleMonth.getFullYear() === monthPickerYear &&
                      visibleMonth.getMonth() === monthIndex &&
                      styles.monthPickerMonthButtonSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.monthPickerMonthText,
                      visibleMonth.getFullYear() === monthPickerYear &&
                        visibleMonth.getMonth() === monthIndex &&
                        styles.monthPickerMonthTextSelected,
                    ]}
                  >
                    {monthIndex + 1}月
                  </Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <BottomNavBar
        bottomInset={insets.bottom}
        onAddEvent={() => onCreateEventForDate(selectedDate)}
        onAddInbox={onOpenInboxComposer}
        onOpenInbox={onOpenInbox}
        onOpenSearch={onOpenSearch}
        onOpenSettings={onOpenSettings}
        onOpenUndatedTasks={onOpenUndatedTasks}
        undatedTaskCount={openUndatedTaskCount}
      />
    </SafeAreaView>
  );
}

function formatMonthTitle(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

function renderDayCell({
  day,
  isSelected,
  items,
  onPress,
  cellHeight,
  cellWidth,
  columnIndex,
  userId,
}: {
  day: ReturnType<typeof buildMonthGrid>[number];
  isSelected: boolean;
  items: CalendarItem[];
  onPress: () => void;
  cellHeight: number;
  cellWidth: number;
  columnIndex: number;
  userId: string;
}) {
  const dateTone = getCalendarDateTone(day.date);
  const hasOverflow = items.length > MAX_ITEMS_PER_CELL;
  const visibleItems = items.slice(0, MAX_ITEMS_PER_CELL);

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
        columnIndex > 0 && styles.dayCellColumnDivider,
        { minHeight: cellHeight, width: cellWidth },
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
              style={[styles.cellItemPill, cellToneStyles[presentation.assigneeTone]]}
            >
              <Text numberOfLines={1} style={styles.cellItemTitle}>
                {presentation.title}
              </Text>
            </View>
          );
        })}
        {hasOverflow ? (
          <View style={styles.cellOverflowRow}>
            <Text style={[styles.cellOverflowText, isSelected && styles.cellOverflowSelected]}>
              …
            </Text>
          </View>
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
    gap: 8,
    paddingHorizontal: 0,
    paddingTop: 8,
  },
  monthHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
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
  monthTitleButton: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
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
    overflow: 'hidden',
  },
  monthPage: {
    backgroundColor: '#ffffff',
  },
  monthGrid: {
    backgroundColor: '#ffffff',
    borderColor: '#d8ded9',
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    overflow: 'hidden',
  },
  dayCell: {
    alignItems: 'stretch',
    borderColor: '#edf0ed',
    borderTopWidth: 1,
    paddingHorizontal: 3,
    paddingVertical: 4,
  },
  dayCellColumnDivider: {
    borderLeftWidth: 1,
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
    minHeight: 15,
    overflow: 'hidden',
    paddingHorizontal: 4,
  },
  cellItemTitle: {
    color: '#202124',
    flex: 1,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
  cellOverflowRow: {
    alignItems: 'center',
    alignSelf: 'center',
    height: 12,
    justifyContent: 'center',
    width: 28,
  },
  cellOverflowText: {
    color: '#205f4b',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    lineHeight: 12,
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
  monthPickerBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  monthPickerPanel: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    gap: 18,
    padding: 18,
    width: '100%',
  },
  monthPickerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  monthPickerYearButton: {
    alignItems: 'center',
    backgroundColor: '#f2f5f3',
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    width: 48,
  },
  monthPickerYearButtonText: {
    color: '#205f4b',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 28,
  },
  monthPickerYearText: {
    color: '#202124',
    fontSize: 22,
    fontWeight: '900',
  },
  monthPickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthPickerMonthButton: {
    alignItems: 'center',
    backgroundColor: '#f7f7f2',
    borderColor: '#d8ded9',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
    width: '31%',
  },
  monthPickerMonthButtonSelected: {
    backgroundColor: '#205f4b',
    borderColor: '#205f4b',
  },
  monthPickerMonthText: {
    color: '#202124',
    fontSize: 15,
    fontWeight: '800',
  },
  monthPickerMonthTextSelected: {
    color: '#ffffff',
  },
  undatedTaskRowText: {
    color: '#205f4b',
    fontSize: 13,
    fontWeight: '800',
  },
});

const cellToneStyles = StyleSheet.create<Record<CalendarCellAssigneeTone, object>>({
  self: {
    backgroundColor: '#e8f2ff',
    borderColor: '#005ab5',
  },
  partner: {
    backgroundColor: '#fff0e0',
    borderColor: '#d55e00',
  },
  both: {
    backgroundColor: '#f2f3f5',
    borderColor: '#111827',
  },
  whoever: {
    backgroundColor: '#e5f7f8',
    borderColor: '#007c89',
  },
  unknown: {
    backgroundColor: '#ffffff',
    borderColor: '#94a3b8',
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
