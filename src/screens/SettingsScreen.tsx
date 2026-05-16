import { useState } from 'react';
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
import { Firestore } from 'firebase/firestore';
import { DISPLAY_NAME_MAX_LENGTH, User } from '../types/User';
import { updateUser } from '../services/firestore';
import { sanitizeText, validateDisplayName } from '../utils/validation';

type SettingsScreenProps = {
  db: Firestore;
  user: User;
  onBack: () => void;
  onSignOut: () => Promise<void> | void;
  onUserUpdated: () => Promise<void> | void;
  onOpenInvite: () => void;
};

export function SettingsScreen({
  db,
  user,
  onBack,
  onSignOut,
  onUserUpdated,
  onOpenInvite,
}: SettingsScreenProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
});
