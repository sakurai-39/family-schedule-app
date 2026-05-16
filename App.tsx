import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db } from './src/services/firebase';
import { AuthProvider, useAuth } from './src/hooks/useAuthFlow';
import { LoginScreen } from './src/screens/LoginScreen';
import { HouseholdSetupScreen } from './src/screens/HouseholdSetupScreen';
import { InviteScreen } from './src/screens/InviteScreen';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { InboxScreen } from './src/screens/InboxScreen';
import { CalendarItemEditScreen } from './src/screens/CalendarItemEditScreen';
import { DateItemListScreen } from './src/screens/DateItemListScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { UndatedTaskListScreen } from './src/screens/UndatedTaskListScreen';
import { configureForegroundNotificationHandling } from './src/services/notifications';
import { User } from './src/types/User';
import { ActiveScreen, getAndroidBackTarget, getEditReturnScreen } from './src/utils/navigation';

configureForegroundNotificationHandling();

const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const googleAndroidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider auth={auth} db={db}>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const { firebaseUser, user, isLoading, error, refreshUser, signOut } = useAuth();
  const authReady = auth !== undefined;
  const dbReady = db !== undefined;

  if (isLoading) {
    return (
      <View style={styles.appShell}>
        <View style={styles.container}>
          <Text style={styles.title}>読み込み中</Text>
        </View>
        <StatusBar style="auto" />
      </View>
    );
  }

  if (!firebaseUser) {
    return (
      <View style={styles.appShell}>
        <LoginScreen
          auth={auth}
          googleClientIds={{
            webClientId: googleWebClientId,
            androidClientId: googleAndroidClientId,
            iosClientId: googleIosClientId,
          }}
        />
        <StatusBar style="auto" />
      </View>
    );
  }

  if (user && !user.householdId) {
    return (
      <View style={styles.appShell}>
        <HouseholdSetupScreen db={db} onCompleted={refreshUser} user={user} />
        <StatusBar style="auto" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.appShell}>
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
        <StatusBar style="auto" />
      </View>
    );
  }

  return <AuthenticatedApp refreshUser={refreshUser} signOut={signOut} user={user} />;
}

type AuthenticatedAppProps = {
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
  user: User;
};

function AuthenticatedApp({ refreshUser, signOut, user }: AuthenticatedAppProps) {
  const insets = useSafeAreaInsets();
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>({ name: 'calendar' });

  useEffect(() => {
    setActiveScreen({ name: 'calendar' });
  }, [user.userId, user.householdId]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      const backTarget = getAndroidBackTarget(activeScreen);
      if (!backTarget) return false;

      setActiveScreen(backTarget);
      return true;
    });

    return () => subscription.remove();
  }, [activeScreen]);

  const calendarScreen = useMemo(
    () => (
      <CalendarScreen
        db={db}
        onCreateEventForDate={(date) => setActiveScreen({ name: 'create-event', presetDate: date })}
        onOpenDateItems={(date) => setActiveScreen({ name: 'date-items', date })}
        onOpenInbox={() => setActiveScreen({ name: 'inbox', mode: 'list' })}
        onOpenInboxComposer={() => setActiveScreen({ name: 'inbox', mode: 'compose' })}
        onOpenUndatedTasks={() => setActiveScreen({ name: 'undated-tasks' })}
        onOpenSettings={() => setActiveScreen({ name: 'settings' })}
        user={user}
      />
    ),
    [user]
  );

  const overlayScreen = useMemo(() => {
    if (activeScreen.name === 'calendar') return null;

    if (activeScreen.name === 'invite') {
      return (
        <InviteScreen db={db} onBack={() => setActiveScreen({ name: 'settings' })} user={user} />
      );
    }

    if (activeScreen.name === 'inbox') {
      return (
        <InboxScreen
          db={db}
          mode={activeScreen.mode}
          onBack={() => setActiveScreen({ name: 'calendar' })}
          onOpenItem={(item) => setActiveScreen({ name: 'edit', item })}
          user={user}
        />
      );
    }

    if (activeScreen.name === 'undated-tasks') {
      return (
        <UndatedTaskListScreen
          db={db}
          onBack={() => setActiveScreen({ name: 'calendar' })}
          onOpenItem={(item) => setActiveScreen({ name: 'edit', item })}
          user={user}
        />
      );
    }

    if (activeScreen.name === 'date-items') {
      return (
        <DateItemListScreen
          date={activeScreen.date}
          db={db}
          onBack={() => setActiveScreen({ name: 'calendar' })}
          onCreateEventForDate={(date) =>
            setActiveScreen({
              name: 'create-event',
              presetDate: date,
              returnTo: { name: 'date-items', date },
            })
          }
          onOpenItem={(item) =>
            setActiveScreen({
              name: 'edit',
              item,
              returnTo: { name: 'date-items', date: activeScreen.date },
            })
          }
          user={user}
        />
      );
    }

    if (activeScreen.name === 'edit') {
      return (
        <CalendarItemEditScreen
          mode="edit"
          db={db}
          item={activeScreen.item}
          onBack={() =>
            setActiveScreen(getEditReturnScreen(activeScreen.item, activeScreen.returnTo))
          }
          onDeleted={() => setActiveScreen(activeScreen.returnTo ?? { name: 'calendar' })}
          onSaved={() => setActiveScreen(activeScreen.returnTo ?? { name: 'calendar' })}
          user={user}
        />
      );
    }

    if (activeScreen.name === 'create-event') {
      return (
        <CalendarItemEditScreen
          mode="create"
          db={db}
          presetDate={activeScreen.presetDate}
          onBack={() => setActiveScreen(activeScreen.returnTo ?? { name: 'calendar' })}
          onSaved={() => setActiveScreen(activeScreen.returnTo ?? { name: 'calendar' })}
          user={user}
        />
      );
    }

    return (
      <SettingsScreen
        db={db}
        onBack={() => setActiveScreen({ name: 'calendar' })}
        onOpenInvite={() => setActiveScreen({ name: 'invite' })}
        onSignOut={signOut}
        onUserUpdated={refreshUser}
        user={user}
      />
    );
  }, [activeScreen, refreshUser, signOut, user]);

  return (
    <View style={styles.appShell}>
      <ScreenStack
        baseScreen={calendarScreen}
        overlayScreen={overlayScreen}
        overlayStyle={{
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
          paddingTop: insets.top,
        }}
      />
      <StatusBar style="auto" />
    </View>
  );
}

type ScreenStackProps = {
  baseScreen: ReactNode;
  overlayScreen: ReactNode | null;
  overlayStyle: StyleProp<ViewStyle>;
};

function ScreenStack({ baseScreen, overlayScreen, overlayStyle }: ScreenStackProps) {
  const hasOverlay = Boolean(overlayScreen);

  return (
    <>
      <View pointerEvents={hasOverlay ? 'none' : 'auto'} style={styles.screenLayer}>
        {baseScreen}
      </View>
      {overlayScreen ? (
        <View style={[styles.screenLayer, overlayStyle]}>{overlayScreen}</View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  appShell: {
    backgroundColor: '#f7f7f2',
    flex: 1,
  },
  screenLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f7f7f2',
  },
  container: {
    flex: 1,
    backgroundColor: '#f7f7f2',
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
