import {
  Auth,
  GoogleAuthProvider,
  OAuthProvider,
  User as FirebaseUser,
  UserCredential,
  onAuthStateChanged,
  signInWithCredential,
  signOut,
  Unsubscribe,
} from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import { createUser, getUser } from './firestore';

export async function signInWithGoogleIdToken(
  auth: Auth,
  idToken: string
): Promise<UserCredential> {
  if (idToken.length === 0) {
    throw new Error('Google ID token is required');
  }

  const credential = GoogleAuthProvider.credential(idToken);
  return signInWithCredential(auth, credential);
}

export async function signInWithAppleIdentityToken(
  auth: Auth,
  identityToken: string,
  rawNonce: string
): Promise<UserCredential> {
  if (identityToken.length === 0) {
    throw new Error('Apple identity token is required');
  }
  if (rawNonce.length === 0) {
    throw new Error('Apple sign-in nonce is required');
  }

  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({
    idToken: identityToken,
    rawNonce,
  });

  return signInWithCredential(auth, credential);
}

export function signOutUser(auth: Auth): Promise<void> {
  return signOut(auth);
}

export function subscribeAuthState(
  auth: Auth,
  callback: (user: FirebaseUser | null) => void
): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}

export async function ensureUserDocument(db: Firestore, firebaseUser: FirebaseUser): Promise<void> {
  const existingUser = await getUser(db, firebaseUser.uid);
  if (existingUser) {
    return;
  }

  await createUser(db, {
    userId: firebaseUser.uid,
    displayName: '',
    accountName: firebaseUser.displayName ?? '',
    email: firebaseUser.email ?? '',
  });
}
