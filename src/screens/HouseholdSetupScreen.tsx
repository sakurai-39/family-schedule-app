import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Firestore } from 'firebase/firestore';
import { User } from '../types/User';
import { createHouseholdForUser, updateUser } from '../services/firestore';
import { joinHouseholdByCode } from '../services/pairing';
import { normalizeInviteCodeInput } from '../utils/validation';

type HouseholdSetupScreenProps = {
  db: Firestore;
  user: User;
  onCompleted: () => Promise<void>;
};

export function HouseholdSetupScreen({ db, user, onCompleted }: HouseholdSetupScreenProps) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [inviteCode, setInviteCode] = useState('');
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canSubmit =
    displayName.trim().length > 0 &&
    !isSubmitting &&
    (mode === 'create' || inviteCode.length === 6);

  const handleSubmit = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      if (mode === 'create') {
        await createHouseholdForUser(db, user.userId, displayName);
      } else {
        await updateUser(db, user.userId, { displayName });
        await joinHouseholdByCode(db, user.userId, inviteCode);
      }
      await onCompleted();
    } catch {
      setErrorMessage(
        mode === 'create'
          ? '家族の作成に失敗しました。呼び名を確認してください。'
          : '家族への参加に失敗しました。呼び名と招待コードを確認してください。'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInviteCodeChange = (value: string) => {
    setInviteCode(normalizeInviteCodeInput(value));
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>呼び名を決める</Text>
        <Text style={styles.subtitle}>ふたりの予定で表示する短い名前を入力してください。</Text>

        <View style={styles.modeSwitcher}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setMode('create')}
            style={[styles.modeButton, mode === 'create' && styles.activeModeButton]}
          >
            <Text style={[styles.modeButtonText, mode === 'create' && styles.activeModeButtonText]}>
              作成
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setMode('join')}
            style={[styles.modeButton, mode === 'join' && styles.activeModeButton]}
          >
            <Text style={[styles.modeButtonText, mode === 'join' && styles.activeModeButtonText]}>
              参加
            </Text>
          </Pressable>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>呼び名</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={6}
            onChangeText={setDisplayName}
            placeholder="例: りょう"
            style={styles.input}
            value={displayName}
          />
          <Text style={styles.helperText}>{displayName.length}/6</Text>
        </View>

        {mode === 'join' ? (
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>招待コード</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="number-pad"
              maxLength={6}
              onChangeText={handleInviteCodeChange}
              placeholder="482917"
              style={styles.input}
              value={inviteCode}
            />
            <Text style={styles.helperText}>{inviteCode.length}/6</Text>
          </View>
        ) : null}

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <Pressable
          accessibilityRole="button"
          disabled={!canSubmit}
          onPress={handleSubmit}
          style={({ pressed }) => [
            styles.primaryButton,
            !canSubmit && styles.disabledButton,
            pressed && canSubmit && styles.pressedButton,
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {isSubmitting ? '処理中' : mode === 'create' ? '家族を作成' : '家族に参加'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f2',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  content: {
    gap: 18,
  },
  title: {
    color: '#202124',
    fontSize: 30,
    fontWeight: '700',
  },
  subtitle: {
    color: '#5d625e',
    fontSize: 16,
    lineHeight: 24,
  },
  modeSwitcher: {
    backgroundColor: '#e7ece8',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 4,
    minHeight: 44,
    padding: 4,
  },
  modeButton: {
    alignItems: 'center',
    borderRadius: 5,
    flex: 1,
    justifyContent: 'center',
  },
  activeModeButton: {
    backgroundColor: '#ffffff',
  },
  modeButtonText: {
    color: '#5d625e',
    fontSize: 15,
    fontWeight: '700',
  },
  activeModeButtonText: {
    color: '#205f4b',
  },
  fieldGroup: {
    gap: 8,
    marginTop: 8,
  },
  label: {
    color: '#303431',
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#cfd6d1',
    borderRadius: 6,
    borderWidth: 1,
    color: '#202124',
    fontSize: 18,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  helperText: {
    color: '#68706b',
    fontSize: 12,
    textAlign: 'right',
  },
  errorText: {
    color: '#b42318',
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#205f4b',
    borderRadius: 6,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.45,
  },
  pressedButton: {
    opacity: 0.82,
  },
});
