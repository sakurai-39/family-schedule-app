import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { auth, db } from './src/services/firebase';
import { AuthProvider, useAuth } from './src/hooks/useAuthFlow';
import { LoginScreen } from './src/screens/LoginScreen';

const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

export default function App() {
  return (
    <AuthProvider auth={auth} db={db}>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { firebaseUser, user, isLoading, error, signOut } = useAuth();
  const authReady = auth !== undefined;
  const dbReady = db !== undefined;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>読み込み中</Text>
        <StatusBar style="auto" />
      </View>
    );
  }

  if (!firebaseUser) {
    return (
      <>
        <LoginScreen auth={auth} googleWebClientId={googleWebClientId} />
        <StatusBar style="auto" />
      </>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>家族スケジュール管理アプリ</Text>
      <Text style={styles.status}>ログイン: OK</Text>
      <Text style={styles.status}>呼び名: {user?.displayName || '未設定'}</Text>
      <Text style={styles.status}>家族: {user?.householdId ? '作成済み' : '未作成'}</Text>
      <Text style={styles.status}>Firebase Auth: {authReady ? 'OK' : 'NG'}</Text>
      <Text style={styles.status}>Firestore: {dbReady ? 'OK' : 'NG'}</Text>
      {error ? <Text style={styles.errorText}>ユーザー情報の読み込みに失敗しました</Text> : null}
      <Pressable accessibilityRole="button" onPress={signOut} style={styles.signOutButton}>
        <Text style={styles.signOutButtonText}>サインアウト</Text>
      </Pressable>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  status: {
    fontSize: 16,
    marginVertical: 4,
  },
  errorText: {
    color: '#b42318',
    fontSize: 14,
    marginTop: 12,
  },
  signOutButton: {
    backgroundColor: '#202124',
    borderRadius: 6,
    marginTop: 18,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  signOutButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
