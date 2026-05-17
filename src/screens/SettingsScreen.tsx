import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Firestore } from 'firebase/firestore';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../constants/notifications';
import { DISPLAY_NAME_MAX_LENGTH, User } from '../types/User';
import {
  NotificationPreferences,
  NotificationReminderPreference,
  WeeklyTodoSummaryPreference,
} from '../types/NotificationPreferences';
import { updateUser } from '../services/firestore';
import {
  readNotificationPreferences,
  writeNotificationPreferences,
} from '../services/notificationPreferences';
import { sanitizeText, validateDisplayName } from '../utils/validation';

type SettingsScreenProps = {
  db: Firestore;
  user: User;
  onBack: () => void;
  onSignOut: () => Promise<void> | void;
  onUserUpdated: () => Promise<void> | void;
  onOpenInvite: () => void;
  onNotificationPreferencesSaved: () => void;
};

export function SettingsScreen({
  db,
  user,
  onBack,
  onSignOut,
  onUserUpdated,
  onOpenInvite,
  onNotificationPreferencesSaved,
}: SettingsScreenProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES
  );
  const [isNotificationSettingsSaving, setIsNotificationSettingsSaving] = useState(false);
  const [notificationSettingsMessage, setNotificationSettingsMessage] = useState<string | null>(
    null
  );
  const [notificationSettingsError, setNotificationSettingsError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    readNotificationPreferences()
      .then((preferences) => {
        if (isMounted) {
          setNotificationPreferences(preferences);
        }
      })
      .catch(() => {
        if (isMounted) {
          setNotificationSettingsError(
            '通知設定の読み込みに失敗しました。既定の設定を表示しています。'
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleStartEdit = () => {
    setDisplayName(user.displayName);
    setErrorMessage(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setErrorMessage(null);
  };

  const handleSave = async () => {
    const trimmed = sanitizeText(displayName.trim());
    const result = validateDisplayName(trimmed);
    if (!result.ok) {
      setErrorMessage(result.reason);
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    try {
      await updateUser(db, user.userId, { displayName: trimmed });
      await onUserUpdated();
      setIsEditing(false);
    } catch {
      setErrorMessage('呼び名の更新に失敗しました。時間をおいてもう一度お試しください。');
    } finally {
      setIsSaving(false);
    }
  };

  const updateNotificationPreferences = (
    updater: (current: NotificationPreferences) => NotificationPreferences
  ) => {
    setNotificationSettingsMessage(null);
    setNotificationSettingsError(null);
    setNotificationPreferences((current) => updater(current));
  };

  const handleSaveNotificationPreferences = async () => {
    setIsNotificationSettingsSaving(true);
    setNotificationSettingsMessage(null);
    setNotificationSettingsError(null);

    try {
      await writeNotificationPreferences(notificationPreferences);
      onNotificationPreferencesSaved();
      setNotificationSettingsMessage('保存しました。通知を最新設定で再予約しました。');
    } catch {
      setNotificationSettingsError(
        '通知設定の保存に失敗しました。時間をおいてもう一度お試しください。'
      );
    } finally {
      setIsNotificationSettingsSaving(false);
    }
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
              <Text style={styles.eyebrow}>アカウントと家族</Text>
              <Text style={styles.title}>設定</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={onBack} style={styles.headerButton}>
              <Text style={styles.headerButtonText}>戻る</Text>
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>自分の呼び名</Text>
            <Text style={styles.helpText}>
              家族カレンダーで「担当」として表示される名前です。最大{DISPLAY_NAME_MAX_LENGTH}文字。
            </Text>

            {isEditing ? (
              <View style={styles.editArea}>
                <TextInput
                  autoFocus
                  maxLength={DISPLAY_NAME_MAX_LENGTH}
                  onChangeText={setDisplayName}
                  placeholder="例：ゆうた、みき、パパ"
                  placeholderTextColor="#8f9791"
                  style={styles.input}
                  value={displayName}
                />
                <View style={styles.editActions}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={isSaving}
                    onPress={handleCancelEdit}
                    style={styles.secondaryButton}
                  >
                    <Text style={styles.secondaryButtonText}>キャンセル</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={isSaving}
                    onPress={handleSave}
                    style={[styles.primaryButton, isSaving && styles.disabledButton]}
                  >
                    <Text style={styles.primaryButtonText}>{isSaving ? '保存中' : '保存'}</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.viewArea}>
                <Text style={styles.currentName}>{user.displayName || '（未設定）'}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={handleStartEdit}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>編集</Text>
                </Pressable>
              </View>
            )}

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>家族に招待</Text>
            <Text style={styles.helpText}>
              招待コードを発行して、家族メンバーをこのアプリに招待します。
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={onOpenInvite}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>招待コードを発行する</Text>
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>通知</Text>
            <Text style={styles.helpText}>
              この端末に届く通知だけを設定します。家族それぞれの端末で別々に調整できます。
            </Text>
            <NotificationReminderRow
              description="予定や期限ありタスクの前日に知らせます。"
              onChange={(next) =>
                updateNotificationPreferences((current) => ({
                  ...current,
                  previousDayReminder: next,
                }))
              }
              title="前日リマインド"
              value={notificationPreferences.previousDayReminder}
            />
            <NotificationReminderRow
              description="予定や期限ありタスクの当日に知らせます。"
              onChange={(next) =>
                updateNotificationPreferences((current) => ({
                  ...current,
                  sameDayReminder: next,
                }))
              }
              title="当日リマインド"
              value={notificationPreferences.sameDayReminder}
            />
            <WeeklySummaryRow
              onChange={(next) =>
                updateNotificationPreferences((current) => ({
                  ...current,
                  weeklyTodoSummary: next,
                }))
              }
              value={notificationPreferences.weeklyTodoSummary}
            />
            {notificationSettingsMessage ? (
              <Text style={styles.successText}>{notificationSettingsMessage}</Text>
            ) : null}
            {notificationSettingsError ? (
              <Text style={styles.errorText}>{notificationSettingsError}</Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              disabled={isNotificationSettingsSaving}
              onPress={handleSaveNotificationPreferences}
              style={[styles.primaryButton, isNotificationSettingsSaving && styles.disabledButton]}
            >
              <Text style={styles.primaryButtonText}>
                {isNotificationSettingsSaving ? '保存中' : '通知設定を保存'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>アカウント</Text>
            <Pressable accessibilityRole="button" onPress={onSignOut} style={styles.dangerButton}>
              <Text style={styles.dangerButtonText}>ログアウト</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

type NotificationReminderRowProps = {
  title: string;
  description: string;
  value: NotificationReminderPreference;
  onChange: (value: NotificationReminderPreference) => void;
};

function NotificationReminderRow({
  title,
  description,
  value,
  onChange,
}: NotificationReminderRowProps) {
  return (
    <View style={styles.notificationRow}>
      <View style={styles.notificationRowHeader}>
        <View style={styles.notificationTextArea}>
          <Text style={styles.notificationTitle}>{title}</Text>
          <Text style={styles.notificationDescription}>{description}</Text>
        </View>
        <ToggleButton
          enabled={value.enabled}
          onPress={() => onChange({ ...value, enabled: !value.enabled })}
        />
      </View>
      <TimePickerButton
        disabled={!value.enabled}
        hour={value.hour}
        minute={value.minute}
        onChange={(hour, minute) => onChange({ ...value, hour, minute })}
      />
    </View>
  );
}

type WeeklySummaryRowProps = {
  value: WeeklyTodoSummaryPreference;
  onChange: (value: WeeklyTodoSummaryPreference) => void;
};

function WeeklySummaryRow({ value, onChange }: WeeklySummaryRowProps) {
  return (
    <View style={styles.notificationRow}>
      <View style={styles.notificationRowHeader}>
        <View style={styles.notificationTextArea}>
          <Text style={styles.notificationTitle}>いつかやるタスク通知</Text>
          <Text style={styles.notificationDescription}>
            期限がない未完了タスクを週に1回まとめて知らせます。
          </Text>
        </View>
        <ToggleButton
          enabled={value.enabled}
          onPress={() => onChange({ ...value, enabled: !value.enabled })}
        />
      </View>
      <WeekdaySelector
        disabled={!value.enabled}
        onChange={(weekday) => onChange({ ...value, weekday })}
        value={value.weekday}
      />
      <TimePickerButton
        disabled={!value.enabled}
        hour={value.hour}
        minute={value.minute}
        onChange={(hour, minute) => onChange({ ...value, hour, minute })}
      />
    </View>
  );
}

function ToggleButton({ enabled, onPress }: { enabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: enabled }}
      onPress={onPress}
      style={[styles.toggleButton, enabled ? styles.toggleButtonOn : styles.toggleButtonOff]}
    >
      <Text style={[styles.toggleButtonText, enabled && styles.toggleButtonTextOn]}>
        {enabled ? 'ON' : 'OFF'}
      </Text>
    </Pressable>
  );
}

function TimePickerButton({
  disabled,
  hour,
  minute,
  onChange,
}: {
  disabled: boolean;
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
}) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const value = new Date(2026, 0, 1, hour, minute);

  const handleTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setIsPickerOpen(false);
    if (event.type === 'set' && selectedDate) {
      onChange(selectedDate.getHours(), selectedDate.getMinutes());
    }
  };

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={() => setIsPickerOpen(true)}
        style={[styles.timeButton, disabled && styles.disabledInput]}
      >
        <Text style={[styles.timeButtonText, disabled && styles.disabledText]}>
          {formatNotificationTime(hour, minute)}
        </Text>
      </Pressable>
      {isPickerOpen ? (
        <DateTimePicker mode="time" value={value} is24Hour onChange={handleTimeChange} />
      ) : null}
    </View>
  );
}

const weekdayOptions = [
  { value: 1, label: '日' },
  { value: 2, label: '月' },
  { value: 3, label: '火' },
  { value: 4, label: '水' },
  { value: 5, label: '木' },
  { value: 6, label: '金' },
  { value: 7, label: '土' },
];

function WeekdaySelector({
  disabled,
  value,
  onChange,
}: {
  disabled: boolean;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.weekdayRow}>
      {weekdayOptions.map((option) => (
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          key={option.value}
          onPress={() => onChange(option.value)}
          style={[
            styles.weekdayButton,
            option.value === value && styles.weekdayButtonSelected,
            disabled && styles.disabledInput,
          ]}
        >
          <Text
            style={[
              styles.weekdayButtonText,
              option.value === value && styles.weekdayButtonTextSelected,
              disabled && styles.disabledText,
            ]}
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function formatNotificationTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
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
  section: {
    backgroundColor: '#ffffff',
    borderColor: '#d8ded9',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  sectionTitle: {
    color: '#202124',
    fontSize: 16,
    fontWeight: '800',
  },
  helpText: {
    color: '#68706b',
    fontSize: 13,
    lineHeight: 18,
  },
  viewArea: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  currentName: {
    color: '#202124',
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
  },
  editArea: {
    gap: 12,
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
  editActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#205f4b',
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  disabledButton: {
    backgroundColor: '#a7beb4',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#cfd6d1',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    color: '#205f4b',
    fontSize: 14,
    fontWeight: '800',
  },
  notificationRow: {
    backgroundColor: '#fbfcfb',
    borderColor: '#e0e6e1',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  notificationRowHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  notificationTextArea: {
    flex: 1,
    gap: 4,
  },
  notificationTitle: {
    color: '#202124',
    fontSize: 14,
    fontWeight: '800',
  },
  notificationDescription: {
    color: '#68706b',
    fontSize: 12,
    lineHeight: 17,
  },
  toggleButton: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 54,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  toggleButtonOn: {
    backgroundColor: '#205f4b',
    borderColor: '#205f4b',
  },
  toggleButtonOff: {
    backgroundColor: '#ffffff',
    borderColor: '#cfd6d1',
  },
  toggleButtonText: {
    color: '#68706b',
    fontSize: 12,
    fontWeight: '900',
  },
  toggleButtonTextOn: {
    color: '#ffffff',
  },
  timeButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#cfd6d1',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 42,
    justifyContent: 'center',
  },
  timeButtonText: {
    color: '#202124',
    fontSize: 16,
    fontWeight: '800',
  },
  weekdayRow: {
    flexDirection: 'row',
    gap: 6,
  },
  weekdayButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#cfd6d1',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 36,
    justifyContent: 'center',
  },
  weekdayButtonSelected: {
    backgroundColor: '#205f4b',
    borderColor: '#205f4b',
  },
  weekdayButtonText: {
    color: '#68706b',
    fontSize: 13,
    fontWeight: '800',
  },
  weekdayButtonTextSelected: {
    color: '#ffffff',
  },
  disabledInput: {
    backgroundColor: '#edf0ed',
  },
  disabledText: {
    color: '#9aa49e',
  },
  dangerButton: {
    alignItems: 'center',
    borderColor: '#b42318',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  dangerButtonText: {
    color: '#b42318',
    fontSize: 15,
    fontWeight: '800',
  },
  errorText: {
    color: '#b42318',
    fontSize: 14,
    lineHeight: 20,
  },
  successText: {
    color: '#205f4b',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
});
