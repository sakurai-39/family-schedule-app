import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
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
import {
  AssigneeValue,
  CalendarItem,
  MEMO_MAX_LENGTH,
  TITLE_MAX_LENGTH,
} from '../types/CalendarItem';
import { AssigneeOption, AssigneeSelector } from '../components/AssigneeSelector';
import { DateTimeInput } from '../components/DateTimeInput';
import { ItemTypeSelector } from '../components/ItemTypeSelector';
import {
  deleteCalendarItem,
  getHousehold,
  promoteInboxToScheduled,
  updateScheduledItem,
} from '../services/firestore';
import {
  buildScheduledItemDraft,
  ScheduleDraftKind,
  ScheduleDraftResult,
} from '../utils/scheduleDraft';

type CalendarItemEditScreenProps = {
  db: Firestore;
  item: CalendarItem;
  user: User;
  onBack: () => void;
  onDeleted: () => void;
  onSaved: () => void;
};

export function CalendarItemEditScreen({
  db,
  item,
  user,
  onBack,
  onDeleted,
  onSaved,
}: CalendarItemEditScreenProps) {
  const householdId = user.householdId;
  const initialKind = useMemo(() => getInitialKind(item), [item]);
  const initialDate = useMemo(() => item.startAt ?? item.dueAt ?? new Date(), [item]);
  const [kind, setKind] = useState<ScheduleDraftKind>(initialKind);
  const [title, setTitle] = useState(item.title);
  const [memo, setMemo] = useState(item.memo);
  const [assignee, setAssignee] = useState<AssigneeValue | null>(item.assignee ?? user.userId);
  const [dateText, setDateText] = useState(formatDateInput(initialDate));
  const [timeText, setTimeText] = useState(formatTimeInput(initialDate));
  const [assigneeOptions, setAssigneeOptions] = useState<AssigneeOption[]>(() =>
    buildAssigneeOptions(user, [])
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadHouseholdMembers() {
      if (!householdId) return;

      try {
        const household = await getHousehold(db, householdId);
        if (isMounted) {
          setAssigneeOptions(buildAssigneeOptions(user, household?.members ?? []));
        }
      } catch {
        if (isMounted) {
          setAssigneeOptions(buildAssigneeOptions(user, []));
        }
      }
    }

    loadHouseholdMembers();

    return () => {
      isMounted = false;
    };
  }, [db, householdId, user]);

  const canSubmit = title.trim().length > 0 && !isSaving && !isDeleting;

  const handleSave = async () => {
    if (!householdId || !canSubmit) return;

    const result = buildScheduledItemDraft({
      kind,
      title,
      memo,
      assignee,
      dateText,
      timeText,
    });

    if (!result.ok) {
      setActionError(result.reason);
      return;
    }

    setIsSaving(true);
    setActionError(null);
    try {
      await saveScheduledDraft(db, householdId, item, result);
      onSaved();
    } catch {
      setActionError('保存に失敗しました。時間をおいてもう一度お試しください。');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!householdId || isDeleting || isSaving) return;

    Alert.alert('削除しますか？', 'このメモや予定を削除します。', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          setIsDeleting(true);
          setActionError(null);
          try {
            await deleteCalendarItem(db, householdId, item.itemId);
            onDeleted();
          } catch {
            setActionError('削除に失敗しました。時間をおいてもう一度お試しください。');
          } finally {
            setIsDeleting(false);
          }
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>
              {item.status === 'inbox' ? 'メモを予定にする' : '予定を編集'}
            </Text>
            <Text style={styles.title}>{item.status === 'inbox' ? '整理する' : '編集する'}</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={onBack} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>戻る</Text>
          </Pressable>
        </View>

        <View style={styles.formArea}>
          <View style={styles.field}>
            <Text style={styles.label}>種類</Text>
            <ItemTypeSelector onChange={setKind} value={kind} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>タイトル</Text>
            <TextInput
              maxLength={TITLE_MAX_LENGTH}
              onChangeText={setTitle}
              placeholder="例: 保育園面談"
              placeholderTextColor="#8f9791"
              style={styles.input}
              value={title}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>担当</Text>
            <AssigneeSelector onChange={setAssignee} options={assigneeOptions} value={assignee} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{kind === 'event' ? '予定日時' : '期限'}</Text>
            <DateTimeInput
              dateText={dateText}
              disabled={kind === 'todo'}
              onChangeDate={setDateText}
              onChangeTime={setTimeText}
              timeText={timeText}
            />
            {kind === 'todo' ? (
              <Text style={styles.helperText}>日付を決めない「やること」として保存します。</Text>
            ) : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>メモ</Text>
            <TextInput
              maxLength={MEMO_MAX_LENGTH}
              multiline
              onChangeText={setMemo}
              placeholder="必要なら詳細を追加"
              placeholderTextColor="#8f9791"
              style={[styles.input, styles.memoInput]}
              textAlignVertical="top"
              value={memo}
            />
          </View>

          {actionError ? <Text style={styles.errorText}>{actionError}</Text> : null}

          <Pressable
            accessibilityRole="button"
            disabled={!canSubmit}
            onPress={handleSave}
            style={[styles.primaryButton, !canSubmit && styles.disabledButton]}
          >
            <Text style={styles.primaryButtonText}>{isSaving ? '保存中' : '保存'}</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={isSaving || isDeleting}
            onPress={handleDelete}
            style={styles.deleteButton}
          >
            <Text style={styles.deleteButtonText}>{isDeleting ? '削除中' : '削除'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

async function saveScheduledDraft(
  db: Firestore,
  householdId: string,
  item: CalendarItem,
  result: Extract<ScheduleDraftResult, { ok: true }>
): Promise<void> {
  if (item.status === 'inbox') {
    await promoteInboxToScheduled(db, householdId, item.itemId, result.draft);
    return;
  }

  await updateScheduledItem(db, householdId, item.itemId, result.draft);
}

function buildAssigneeOptions(user: User, members: string[]): AssigneeOption[] {
  const partnerId = members.find((memberId) => memberId !== user.userId);
  const options: AssigneeOption[] = [
    { value: user.userId, label: user.displayName || '自分' },
    { value: 'both', label: '両方' },
    { value: 'whoever', label: 'どちらか' },
  ];

  if (partnerId) {
    options.splice(1, 0, { value: partnerId, label: '相手' });
  }

  return options;
}

function getInitialKind(item: CalendarItem): ScheduleDraftKind {
  if (item.type === 'event') return 'event';
  if (item.dueAt) return 'task';
  return 'todo';
}

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTimeInput(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
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
  formArea: {
    backgroundColor: '#ffffff',
    borderColor: '#d8ded9',
    borderRadius: 8,
    borderWidth: 1,
    gap: 18,
    padding: 16,
  },
  field: {
    gap: 8,
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
    minHeight: 46,
    paddingHorizontal: 12,
  },
  memoInput: {
    minHeight: 96,
    paddingTop: 12,
  },
  helperText: {
    color: '#68706b',
    fontSize: 13,
    lineHeight: 18,
  },
  errorText: {
    color: '#b42318',
    fontSize: 14,
    lineHeight: 20,
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
  deleteButton: {
    alignItems: 'center',
    borderColor: '#b42318',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: '#b42318',
    fontSize: 15,
    fontWeight: '800',
  },
});
