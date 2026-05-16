import { useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Firestore } from 'firebase/firestore';
import { User } from '../types/User';
import { generateInviteCode } from '../services/pairing';

type InviteScreenProps = {
  db: Firestore;
  user: User;
  onBack: () => void;
};

export function InviteScreen({ db, user, onBack }: InviteScreenProps) {
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const canUseCode = inviteCode !== null;

  const handleGenerate = async () => {
    if (!user.householdId) {
      setErrorMessage('家族情報の読み込みに失敗しました。');
      return;
    }

    setErrorMessage(null);
    setStatusMessage(null);
    setIsGenerating(true);

    try {
      const code = await generateInviteCode(db, user.householdId);
      setInviteCode(code);
      setStatusMessage('招待コードを発行しました。');
    } catch {
      setErrorMessage('招待コードの発行に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!inviteCode) return;

    try {
      await Clipboard.setStringAsync(inviteCode);
      setErrorMessage(null);
      setStatusMessage('招待コードをコピーしました。');
    } catch {
      setStatusMessage(null);
      setErrorMessage('招待コードのコピーに失敗しました。');
    }
  };

  const handleShare = async () => {
    if (!inviteCode) return;

    await Share.share({
      message: `家族スケジュール管理アプリの招待コード: ${inviteCode}\n24時間以内に入力してください。`,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>家族に招待</Text>
        <Text style={styles.subtitle}>招待コードを発行して、相手に共有してください。</Text>

        <View style={styles.codeArea}>
          <Text style={styles.codeLabel}>招待コード</Text>
          <Text style={styles.codeValue}>{inviteCode ?? '------'}</Text>
          <Text style={styles.helperText}>有効期限: 発行から24時間</Text>
        </View>

        {statusMessage ? <Text style={styles.statusText}>{statusMessage}</Text> : null}
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <Pressable
          accessibilityRole="button"
          disabled={isGenerating}
          onPress={handleGenerate}
          style={({ pressed }) => [
            styles.primaryButton,
            isGenerating && styles.disabledButton,
            pressed && !isGenerating && styles.pressedButton,
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {isGenerating ? '発行中' : inviteCode ? '新しいコードを発行' : '招待コードを発行'}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={!canUseCode}
          onPress={handleCopy}
          style={({ pressed }) => [
            styles.secondaryButton,
            !canUseCode && styles.disabledButton,
            pressed && canUseCode && styles.pressedButton,
          ]}
        >
          <Text style={styles.secondaryButtonText}>コピー</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={!canUseCode}
          onPress={handleShare}
          style={({ pressed }) => [
            styles.secondaryButton,
            !canUseCode && styles.disabledButton,
            pressed && canUseCode && styles.pressedButton,
          ]}
        >
          <Text style={styles.secondaryButtonText}>共有</Text>
        </Pressable>

        <Pressable accessibilityRole="button" onPress={onBack} style={styles.textButton}>
          <Text style={styles.textButtonText}>戻る</Text>
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
  codeArea: {
    backgroundColor: '#ffffff',
    borderColor: '#cfd6d1',
    borderRadius: 6,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  codeLabel: {
    color: '#303431',
    fontSize: 14,
    fontWeight: '600',
  },
  codeValue: {
    color: '#202124',
    fontSize: 40,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    letterSpacing: 0,
  },
  helperText: {
    color: '#68706b',
    fontSize: 13,
  },
  statusText: {
    color: '#205f4b',
    fontSize: 14,
    lineHeight: 20,
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
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#205f4b',
    borderRadius: 6,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: '#205f4b',
    fontSize: 16,
    fontWeight: '700',
  },
  textButton: {
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  textButtonText: {
    color: '#5d625e',
    fontSize: 15,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.45,
  },
  pressedButton: {
    opacity: 0.82,
  },
});
