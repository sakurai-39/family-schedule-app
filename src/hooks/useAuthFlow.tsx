import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Auth, User as FirebaseUser } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import { User } from '../types/User';
import { ensureUserDocument, signOutUser, subscribeAuthState } from '../services/auth';
import { getUser } from '../services/firestore';

export async function loadSignedInUser(db: Firestore, firebaseUser: FirebaseUser): Promise<User> {
  await ensureUserDocument(db, firebaseUser);
  const user = await getUser(db, firebaseUser.uid);
  if (!user) {
    throw new Error('User document was not found after sign-in');
  }
  return user;
}

export async function refreshSignedInUser(
  db: Firestore,
  firebaseUser: FirebaseUser | null
): Promise<User | null> {
  if (!firebaseUser) {
    return null;
  }
  return loadSignedInUser(db, firebaseUser);
}

export type AuthFlowContextValue = {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthFlowContext = createContext<AuthFlowContextValue | null>(null);

export type AuthProviderProps = {
  auth: Auth;
  db: Firestore;
  children: ReactNode;
};

export function AuthProvider({ auth, db, children }: AuthProviderProps) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refreshUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextUser = await refreshSignedInUser(db, firebaseUser);
      setUser(nextUser);
    } catch (unknownError) {
      const nextError =
        unknownError instanceof Error ? unknownError : new Error('Auth flow failed');
      setUser(null);
      setError(nextError);
      throw nextError;
    } finally {
      setIsLoading(false);
    }
  }, [db, firebaseUser]);

  useEffect(() => {
    let isActive = true;

    const unsubscribe = subscribeAuthState(auth, (nextFirebaseUser) => {
      void (async () => {
        if (!isActive) return;
        setIsLoading(true);
        setError(null);
        setFirebaseUser(nextFirebaseUser);

        if (!nextFirebaseUser) {
          setUser(null);
          setIsLoading(false);
          return;
        }

        try {
          const nextUser = await loadSignedInUser(db, nextFirebaseUser);
          if (!isActive) return;
          setUser(nextUser);
        } catch (unknownError) {
          if (!isActive) return;
          setUser(null);
          setError(unknownError instanceof Error ? unknownError : new Error('Auth flow failed'));
        } finally {
          if (isActive) {
            setIsLoading(false);
          }
        }
      })();
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [auth, db]);

  const value = useMemo<AuthFlowContextValue>(
    () => ({
      firebaseUser,
      user,
      isLoading,
      error,
      refreshUser,
      signOut: () => signOutUser(auth),
    }),
    [auth, error, firebaseUser, isLoading, refreshUser, user]
  );

  return <AuthFlowContext.Provider value={value}>{children}</AuthFlowContext.Provider>;
}

export function useAuth(): AuthFlowContextValue {
  const value = useContext(AuthFlowContext);
  if (!value) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return value;
}
