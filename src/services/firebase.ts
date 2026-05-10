import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { Auth, getAuth, initializeAuth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
// `getReactNativePersistence` is exported at runtime on React Native but not in
// firebase/auth's default `.d.ts` (the RN-specific subpath is provided through
// metro's `react-native` package field). Use a typed `require` to bypass the
// missing type without losing type safety on the rest of firebase/auth.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getReactNativePersistence } = require('firebase/auth') as {
  getReactNativePersistence: (storage: unknown) => unknown;
};

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey) {
  throw new Error('Firebase configuration missing. Check .env.local file.');
}

const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

function createAuth(firebaseApp: FirebaseApp): Auth {
  try {
    return initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(AsyncStorage) as never,
    });
  } catch {
    // Auth was already initialized (e.g. on Fast Refresh or in tests).
    return getAuth(firebaseApp);
  }
}

export const auth: Auth = createAuth(app);
export const db: Firestore = getFirestore(app);
export default app;
