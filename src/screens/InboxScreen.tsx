import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Firestore } from 'firebase/firestore';
import { User } from '../types/User';
import { CalendarItem, TITLE_MAX_LENGTH } from '../types/CalendarItem';
import { InboxItem } from '../components/InboxItem';
import { useInboxItems } from '../hooks/useInboxItems';
import { createInboxItem } from '../services/firestore';

type InboxScreenProps = {
  db: Firestore;
  user: User;
  onBack: () => void;
  onOpenItem: (item: CalendarItem) => void;
};

export function InboxScreen({ db, user, onBack, onOpenItem }: InboxScreenProps) {
  const householdId = user.householdId;
  const { items, isLoading, errorMessage } = useInboxItems(db, householdId);
  const [title, setTitle] = useState('');
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const trimmedTitle = title.trim();
  const canSave = trimmedTitle.length > 0 && trimmedTitle.length <= TITLE_MAX_LENGTH && !isSaving;

  const handleChangeTitle = (nextTitle: string) => {
    if (startedAtMs === null && nextTitle.trim().length > 0) {
      setStartedAtMs(Date.now());
    }
    setTitle(nextTitle);
  };

  const handleCreate = async () => {
    if (!householdId || !canSave) return;

    setIsSaving(true);
    setActionError(null);
    try {
      await createInboxItem(db, householdId, {
        title,
        createdBy: user.userId,
        inputDurationMs: startedAtMs === null ? null : Math.max(0, Date.now() - startedAtMs),
      });
      setTitle('');
      setStartedAtMs(null);
    } catch {
      setActionError('メモの保存に失敗しました。時間をおいてもう一度お試しください。');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>あとで整理する場所</Text>
            <Text style={styles.title}>とりあえずメモ</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={onBack} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>戻る</Text>
          </Pressable>
        </View>

        <View style={styles.inputArea}>
          <Text style={styles.label}>メモ</Text>
          <TextInput
            maxLength={TITLE_MAX_LENGTH}
            multiline
            onChangeText={handleChangeTitle}
            placeholder="例: 週末に保育園へ提出する書類"
            placeholderTextColor="#8f9791"
            style={styles.input}
            value={title}
          />
          <Text style={styles.counter}>
            {trimmedTitle.length}/{TITLE_MAX_LENGTH}
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={!canSave}
            onPress={handleCreate}
            style={[styles.primaryButton, !canSave && styles.disabledButton]}
          >
            <Text style={styles.primaryButtonText}>{isSaving ? '保存中' : 'メモを追加'}</Text>
          </Pressable>
        </View>

        {actionError ? <Text style={styles.errorText}>{actionError}</Text> : null}
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>未整理のメモ</Text>
          <Text style={styles.countText}>{items.length}件</Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingArea}>
            <ActivityIndicator color="#205f4b" />
            <Text style={styles.mutedText}>メモを読み込んでいます</Text>
          </View>
        ) : null}

        {!isLoading && items.length === 0 ? (
          <View style={styles.emptyArea}>
            <Text style={styles.emptyTitle}>まだメモはありません</Text>
            <Text style={styles.emptyText}>
              思いついた予定やタスクを短く入れて、あとで整理できます。
            </Text>
          </View>
        ) : null}

        <View style={styles.itemList}>
          {items.map((item) => (
            <InboxItem item={item} key={item.itemId} onPress={onOpenItem} />
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f7f7f2',
    flex: 1,
  },
  content: {
    gap: 18,
    paddingBottom: 34,
    paddingHorizontal: 20,
    paddingTop: 64,
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
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  headerButtonText: {
    color: '#205f4b',
    fontSize: 13,
    fontWeight: '800',
  },
  inputArea: {
    backgroundColor: '#ffffff',
    borderColor: '#d8ded9',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  label: {
    color: '#202124',
    fontSize: 14,
    fontWeight: '800',
  },
  input: {
    backgroundColor: '#fbfcfb',
    borderColor: '#cfd6d1',
    borderRadius: 8,
    borderWidth: 1,
    color: '#202124',
    fontSize: 16,
    lineHeight: 23,
    minHeight: 96,
    padding: 12,
    textAlignVertical: 'top',
  },
  counter: {
    alignSelf: 'flex-end',
    color: '#68706b',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#205f4b',
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  disabledButton: {
    backgroundColor: '#a7beb4',
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
});
