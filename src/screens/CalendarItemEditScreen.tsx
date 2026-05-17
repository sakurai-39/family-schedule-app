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
  TaskTargetPeriod,
  TITLE_MAX_LENGTH,
} from '../types/CalendarItem';
import { AssigneeSelector } from '../components/AssigneeSelector';
import { DateTimeInput } from '../components/DateTimeInput';
import { ItemTypeSelector } from '../components/ItemTypeSelector';
import {
  createScheduledItem,
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
import { formatDateInput, formatTimeInput } from '../utils/dateTimeFormat';
import { TASK_TARGET_PERIOD_OPTIONS } from '../utils/taskTargetPeriod';

type CalendarItemEditScreenProps = {
  db: Firestore;
  user: User;
  onBack: () => void;
  onSaved: () => void;
} & (
  | { mode: 'edit'; item: CalendarItem; onDeleted: () => void }
  | { mode: 'create'; presetDate: Date }
);

export function CalendarItemEditScreen(props: CalendarItemEditScreenProps) {
  const { db, user, onBack, onSaved, mode } = props;
  const householdId = user.householdId;

  const initialKind = useMemo<ScheduleDraftKind>(
    () => (mode === 'edit' ? getInitialKind(props.item) : 'event'),
    [mode, props]
  );
  const initialHasDueDate = useMemo(
    () => (mode === 'edit' ? getInitialHasDueDate(props.item) : true),
    [mode, props]
  );
  const initialDate = useMemo(
    () =>
      mode === 'edit'
        ? (props.item.startAt ?? props.item.dueAt ?? new Date())
        : applyDefaultTime(props.presetDate),
    [mode, props]
  );
  const initialTitle = mode === 'edit' ? props.item.title : '';
  const initialMemo = mode === 'edit' ? props.item.memo : '';
  const initialAssignee: AssigneeValue | null =
    mode === 'edit' ? (props.item.assignee ?? user.userId) : user.userId;
  const initialTargetPeriod = mode === 'edit' ? getInitialTargetPeriod(props.item) : null;

  const [kind, setKind] = useState<ScheduleDraftKind>(initialKind);
  const [hasDueDate, setHasDueDate] = useState(initialHasDueDate);
  const [targetPeriod, setTargetPeriod] = useState<TaskTargetPeriod | null>(initialTargetPeriod);
  const [title, setTitle] = useState(initialTitle);
  const [memo, setMemo] = useState(initialMemo);
  const [assignee, setAssignee] = useState<AssigneeValue | null>(initialAssignee);
  const [dateText, setDateText] = useState(formatDateInput(initialDate));
  const [timeText, setTimeText] = useState(formatTimeInput(initialDate));
  const [partnerId, setPartnerId] = useState<string | null>(null);
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
          const otherMember = household?.members.find((memberId) => memberId !== user.userId);
          setPartnerId(otherMember ?? null);
        }
      } catch {
        if (isMounted) {
          setPartnerId(null);
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
      hasDueDate: kind === 'event' ? true : hasDueDate,
      targetPeriod: kind === 'task' && !hasDueDate ? targetPeriod : null,
    });

    if (!result.ok) {
      setActionError(result.reason);
      return;
    }

    setIsSaving(true);
    setActionError(null);
    try {
      if (mode === 'edit') {
        await saveExistingItem(db, householdId, props.item, result);
      } else {
        await createScheduledItem(db, householdId, result.draft, user.userId);
      }
      onSaved();
    } catch {
      setActionError('保存に失敗しました。時間をおいてもう一度お試しください。');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (mode !== 'edit' || !householdId || isDeleting || isSaving) return;

    Alert.alert('削除しますか？', 'このメモや予定を削除します。', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          setIsDeleting(true);
          setActionError(null);
          try {
            await deleteCalendarItem(db, householdId, props.item.itemId);
            props.onDeleted();
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
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flexFill}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>{getEyebrowText(props)}</Text>
              <Text style={styles.title}>{getTitleText(props)}</Text>
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
              <AssigneeSelector
                onChange={setAssignee}
                partnerId={partnerId}
                partnerLabel="相手"
                selfId={user.userId}
                selfLabel={user.displayName || '自分'}
                value={assignee}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{kind === 'event' ? '予定日時' : '期限'}</Text>
              {kind === 'task' ? (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: !hasDueDate }}
                  onPress={() => setHasDueDate((prev) => !prev)}
                  style={styles.toggleRow}
                >
                  <View style={[styles.checkbox, !hasDueDate && styles.checkboxChecked]}>
                    {!hasDueDate ? <Text style={styles.checkboxMark}>✓</Text> : null}
                  </View>
                  <Text style={styles.toggleLabel}>期限を設定しない（いつかやるタスク）</Text>
                </Pressable>
              ) : null}
              {kind === 'event' || hasDueDate ? (
                <DateTimeInput
                  dateText={dateText}
                  onChangeDate={setDateText}
                  onChangeTime={setTimeText}
                  timeText={timeText}
                />
              ) : (
                <View style={styles.targetPeriodArea}>
                  <Text style={styles.helperText}>
                    期限を設定せず保存します。あとから期限を追加することもできます。
                  </Text>
                  <Text style={styles.subLabel}>おおまかな目安</Text>
                  <TaskTargetPeriodSelector value={targetPeriod} onChange={setTargetPeriod} />
                </View>
              )}
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

            {mode === 'edit' ? (
              <Pressable
                accessibilityRole="button"
                disabled={isSaving || isDeleting}
                onPress={handleDelete}
                style={styles.deleteButton}
              >
                <Text style={styles.deleteButtonText}>{isDeleting ? '削除中' : '削除'}</Text>
              </Pressable>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

async function saveExistingItem(
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

function getEyebrowText(props: CalendarItemEditScreenProps): string {
  if (props.mode === 'create') return '予定・タスクを追加';
  if (props.item.status === 'inbox') return 'メモを整理する';
  return props.item.type === 'task' ? 'タスクを編集' : '予定を編集';
}

function getTitleText(props: CalendarItemEditScreenProps): string {
  if (props.mode === 'create') return '追加する';
  return props.item.status === 'inbox' ? '整理する' : '編集する';
}

function applyDefaultTime(date: Date): Date {
  const result = new Date(date);
  result.setHours(12, 0, 0, 0);
  return result;
}

function getInitialKind(item: CalendarItem): ScheduleDraftKind {
  if (item.type === 'event') return 'event';
  return 'task';
}

function getInitialHasDueDate(item: CalendarItem): boolean {
  if (item.type === 'event') return true;
  return item.dueAt !== null;
}

function getInitialTargetPeriod(item: CalendarItem): TaskTargetPeriod | null {
  if (item.type !== 'task' || item.dueAt !== null) return null;
  return item.targetPeriod;
}

function TaskTargetPeriodSelector({
  value,
  onChange,
}: {
  value: TaskTargetPeriod | null;
  onChange: (value: TaskTargetPeriod | null) => void;
}) {
  return (
    <View style={styles.targetPeriodOptions}>
      {TASK_TARGET_PERIOD_OPTIONS.map((option) => {
        const isSelected = option.value === value;
        return (
          <Pressable
            accessibilityRole="button"
            key={option.value ?? 'none'}
            onPress={() => onChange(option.value)}
            style={[styles.targetPeriodOption, isSelected && styles.targetPeriodOptionSelected]}
          >
            <Text
              style={[
                styles.targetPeriodOptionText,
                isSelected && styles.targetPeriodOptionTextSelected,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f7f7f2',
    flex: 1,
  },
  flexFill: {
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
  subLabel: {
    color: '#4d5751',
    fontSize: 13,
    fontWeight: '800',
  },
  targetPeriodArea: {
    gap: 10,
  },
  targetPeriodOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  targetPeriodOption: {
    backgroundColor: '#ffffff',
    borderColor: '#cfd6d1',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  targetPeriodOptionSelected: {
    backgroundColor: '#e5f1ec',
    borderColor: '#205f4b',
  },
  targetPeriodOptionText: {
    color: '#4d5751',
    fontSize: 13,
    fontWeight: '800',
  },
  targetPeriodOptionTextSelected: {
    color: '#205f4b',
  },
  toggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
  },
  checkbox: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#cfd6d1',
    borderRadius: 5,
    borderWidth: 1.5,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  checkboxChecked: {
    backgroundColor: '#205f4b',
    borderColor: '#205f4b',
  },
  checkboxMark: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 16,
  },
  toggleLabel: {
    color: '#202124',
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
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
