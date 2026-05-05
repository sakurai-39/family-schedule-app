import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Firestore } from 'firebase/firestore';
import { User } from '../types/User';
import { createHouseholdForUser } from '../services/firestore';

type HouseholdSetupScreenProps = {
  db: Firestore;
  user: User;
  onCompleted: () => Promise<void>;
};

export function HouseholdSetupScreen({ db, user, onCompleted }: HouseholdSetupScreenProps) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canSubmit = displayName.trim().length > 0 && !isSubmitting;

  const handleSubmit = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await createHouseholdForUser(db, user.userId, displayName);
      await onCompleted();
    } catch {
      setErrorMessage('家族の作成に失敗しました。呼び名を確認してください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>呼び名を決める</Text>
        <Text style={styles.subtitle}>ふたりの予定で表示する短い名前を入力してください。</Text>

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
          <Text style={styles.primaryButtonText}>{isSubmitting ? '作成中' : '家族を作成'}</Text>
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
