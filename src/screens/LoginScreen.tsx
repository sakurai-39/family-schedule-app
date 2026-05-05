import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Auth } from 'firebase/auth';
import { handleGoogleAuthSessionResult, signInWithAppleAsync } from '../services/oauthSignIn';

WebBrowser.maybeCompleteAuthSession();

type LoginScreenProps = {
  auth: Auth;
  googleWebClientId?: string;
};

export function LoginScreen({ auth, googleWebClientId }: LoginScreenProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);
  const [isSigningInWithApple, setIsSigningInWithApple] = useState(false);
  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useIdTokenAuthRequest({
    webClientId: googleWebClientId,
  });

  useEffect(() => {
    let isActive = true;

    AppleAuthentication.isAvailableAsync()
      .then((available) => {
        if (isActive) {
          setIsAppleAvailable(available);
        }
      })
      .catch(() => {
        if (isActive) {
          setIsAppleAvailable(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await handleGoogleAuthSessionResult(auth, googleResponse);
        if (googleResponse?.type === 'success') {
          setErrorMessage(null);
        }
      } catch {
        setErrorMessage('Google サインインに失敗しました');
      }
    })();
  }, [auth, googleResponse]);

  const canUseGoogle = Boolean(googleWebClientId && googleRequest);

  const handleGooglePress = async () => {
    setErrorMessage(null);
    try {
      await promptGoogleAsync();
    } catch {
      setErrorMessage('Google サインインに失敗しました');
    }
  };

  const handleApplePress = async () => {
    setErrorMessage(null);
    setIsSigningInWithApple(true);
    try {
      await signInWithAppleAsync(auth);
    } catch {
      setErrorMessage('Apple サインインに失敗しました');
    } finally {
      setIsSigningInWithApple(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>家族スケジュール</Text>
        <Text style={styles.subtitle}>予定とタスクを、ふたりで同じ場所に。</Text>

        <View style={styles.buttonGroup}>
          <Pressable
            accessibilityRole="button"
            disabled={!canUseGoogle}
            onPress={handleGooglePress}
            style={({ pressed }) => [
              styles.googleButton,
              !canUseGoogle && styles.disabledButton,
              pressed && canUseGoogle && styles.pressedButton,
            ]}
          >
            <Text style={styles.googleButtonText}>Google で続ける</Text>
          </Pressable>

          {isAppleAvailable && Platform.OS === 'ios' ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              cornerRadius={6}
              onPress={handleApplePress}
              style={styles.appleButton}
            />
          ) : null}
        </View>

        {!googleWebClientId ? (
          <Text style={styles.notice}>Google サインイン設定が未設定です</Text>
        ) : null}
        {isSigningInWithApple ? <Text style={styles.notice}>Apple で確認中です</Text> : null}
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
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
    fontSize: 34,
    fontWeight: '700',
  },
  subtitle: {
    color: '#5d625e',
    fontSize: 16,
    lineHeight: 24,
  },
  buttonGroup: {
    gap: 12,
    marginTop: 14,
  },
  googleButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#d5d9d6',
    borderRadius: 6,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  googleButtonText: {
    color: '#202124',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.45,
  },
  pressedButton: {
    opacity: 0.78,
  },
  appleButton: {
    height: 48,
    width: '100%',
  },
  notice: {
    color: '#6b5f25',
    fontSize: 13,
    lineHeight: 20,
  },
  errorText: {
    color: '#b42318',
    fontSize: 14,
    lineHeight: 20,
  },
});
