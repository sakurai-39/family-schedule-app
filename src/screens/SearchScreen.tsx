import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Firestore } from 'firebase/firestore';
import { AssigneeValue, CalendarItem } from '../types/CalendarItem';
import { User } from '../types/User';
import { AssigneeBadgeTone } from '../components/AssigneeBadge';
import { CalendarItemCard } from '../components/CalendarItemCard';
import { useCalendarItems } from '../hooks/useCalendarItems';
import { updateCalendarItem } from '../services/firestore';
import { searchCalendarItems } from '../utils/calendarSearch';

type SearchScreenProps = {
  db: Firestore;
  user: User;
  onBack: () => void;
  onOpenItem: (item: CalendarItem) => void;
};

export function SearchScreen({ db, user, onBack, onOpenItem }: SearchScreenProps) {
  const householdId = user.householdId;
  const { items, isLoading, errorMessage } = useCalendarItems(db, householdId);
  const [query, setQuery] = useState('');
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const results = useMemo(() => searchCalendarItems(items, query), [items, query]);

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

  const hasQuery = query.trim().length > 0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>予定・タスクを探す</Text>
            <Text style={styles.title}>検索</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={onBack} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>戻る</Text>
          </Pressable>
        </View>

        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setQuery}
          placeholder="例: 病院、ピアノ、ゴミ"
          placeholderTextColor="#8b938e"
          style={styles.searchInput}
          value={query}
        />

        {isLoading ? (
          <View style={styles.loadingArea}>
            <ActivityIndicator color="#205f4b" />
            <Text style={styles.mutedText}>予定・タスクを読み込んでいます</Text>
          </View>
        ) : null}

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        {actionError ? <Text style={styles.errorText}>{actionError}</Text> : null}

        {hasQuery && !isLoading ? (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>検索結果</Text>
            <Text style={styles.countText}>{results.length}件</Text>
          </View>
        ) : null}

        {!hasQuery ? (
          <View style={styles.emptyArea}>
            <Text style={styles.emptyTitle}>キーワードを入力してください</Text>
            <Text style={styles.emptyText}>
              タイトルやメモに含まれる言葉で、予定・タスクを探せます。
            </Text>
          </View>
        ) : null}

        {hasQuery && !isLoading && results.length === 0 ? (
          <View style={styles.emptyArea}>
            <Text style={styles.emptyTitle}>見つかりませんでした</Text>
            <Text style={styles.emptyText}>別の言葉で検索してみてください。</Text>
          </View>
        ) : null}

        <View style={styles.itemList}>
          {results.map((item) => {
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
      </ScrollView>
    </View>
  );
}

function getAssigneePresentation(
  assignee: AssigneeValue | null,
  user: User
): { label: string; tone: AssigneeBadgeTone } {
  if (!assignee) return { label: '未定', tone: 'unknown' };
  if (assignee === 'both') return { label: '両方', tone: 'both' };
  if (assignee === 'whoever') return { label: 'どちらか', tone: 'whoever' };
  if (assignee === user.userId) return { label: user.displayName || '自分', tone: 'self' };
  return { label: '相手', tone: 'partner' };
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f7f7f2',
    flex: 1,
  },
  content: {
    gap: 18,
    paddingBottom: 32,
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
  searchInput: {
    backgroundColor: '#ffffff',
    borderColor: '#cfd6d1',
    borderRadius: 8,
    borderWidth: 1,
    color: '#202124',
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 14,
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
    padding: 16,
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
    gap: 12,
  },
});
