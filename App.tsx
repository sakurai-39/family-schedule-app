import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { auth, db } from './src/services/firebase';
import { AuthProvider, useAuth } from './src/hooks/useAuthFlow';
import { LoginScreen } from './src/screens/LoginScreen';
import { HouseholdSetupScreen } from './src/screens/HouseholdSetupScreen';
import { InviteScreen } from './src/screens/InviteScreen';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { InboxScreen } from './src/screens/InboxScreen';
import { CalendarItemEditScreen } from './src/screens/CalendarItemEditScreen';
import { CalendarItem } from './src/types/CalendarItem';
import { configureForegroundNotificationHandling } from './src/services/notifications';

configureForegroundNotificationHandling();

const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const googleAndroidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

type ActiveScreen =
  | { name: 'calendar' }
  | { name: 'invite' }
  | { name: 'inbox' }
  | { name: 'edit'; item: CalendarItem };

export default function App() {
  return (
    <AuthProvider auth={auth} db={db}>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { firebaseUser, user, isLoading, error, refreshUser, signOut } = useAuth();
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>({ name: 'calendar' });
  const authReady = auth !== undefined;
  const dbReady = db !== undefined;

  useEffect(() => {
    setActiveScreen({ name: 'calendar' });
  }, [user?.userId, user?.householdId]);

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
        <LoginScreen
          auth={auth}
          googleClientIds={{
            webClientId: googleWebClientId,
            androidClientId: googleAndroidClientId,
            iosClientId: googleIosClientId,
          }}
        />
        <StatusBar style="auto" />
      </>
    );
  }

  if (user && !user.householdId) {
    return (
      <>
        <HouseholdSetupScreen db={db} onCompleted={refreshUser} user={user} />
        <StatusBar style="auto" />
      </>
    );
  }

  return (
    <>
      {user ? (
        activeScreen.name === 'invite' ? (
          <InviteScreen
            db={db}
            onBack={() => setActiveScreen({ name: 'calendar' })}
            onSignOut={signOut}
            user={user}
          />
        ) : activeScreen.name === 'inbox' ? (
          <InboxScreen
            db={db}
            onBack={() => setActiveScreen({ name: 'calendar' })}
            onOpenItem={(item) => setActiveScreen({ name: 'edit', item })}
            user={user}
          />
        ) : activeScreen.name === 'edit' ? (
          <CalendarItemEditScreen
            db={db}
            item={activeScreen.item}
            onBack={() =>
              setActiveScreen(
                activeScreen.item.status === 'inbox' ? { name: 'inbox' } : { name: 'calendar' }
              )
            }
            onDeleted={() => setActiveScreen({ name: 'calendar' })}
            onSaved={() => setActiveScreen({ name: 'calendar' })}
            user={user}
          />
        ) : (
          <CalendarScreen
            db={db}
            onOpenInbox={() => setActiveScreen({ name: 'inbox' })}
            onOpenInvite={() => setActiveScreen({ name: 'invite' })}
            onOpenItem={(item) => setActiveScreen({ name: 'edit', item })}
            onSignOut={signOut}
            user={user}
          />
        )
      ) : (
        <View style={styles.container}>
          <Text style={styles.title}>家族スケジュール管理アプリ</Text>
          <Text style={styles.status}>ログイン: OK</Text>
          <Text style={styles.status}>Firebase Auth: {authReady ? 'OK' : 'NG'}</Text>
          <Text style={styles.status}>Firestore: {dbReady ? 'OK' : 'NG'}</Text>
          {error ? (
            <Text style={styles.errorText}>ユーザー情報の読み込みに失敗しました</Text>
          ) : null}
          <Pressable accessibilityRole="button" onPress={signOut} style={styles.signOutButton}>
            <Text style={styles.signOutButtonText}>サインアウト</Text>
          </Pressable>
        </View>
      )}
      <StatusBar style="auto" />
    </>
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
