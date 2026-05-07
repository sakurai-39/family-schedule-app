import {
  GoogleAuthProvider,
  OAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signOut,
} from 'firebase/auth';
import {
  ensureUserDocument,
  signInWithAppleIdentityToken,
  signInWithGoogleIdToken,
  signOutUser,
  subscribeAuthState,
} from '../services/auth';
import { createUser, getUser } from '../services/firestore';

jest.mock('firebase/auth', () => ({
  GoogleAuthProvider: {
    credential: jest.fn((idToken: string) => ({ providerId: 'google.com', idToken })),
  },
  OAuthProvider: jest.fn().mockImplementation((providerId: string) => ({
    credential: jest.fn((params: { idToken: string; rawNonce: string }) => ({
      providerId,
      ...params,
    })),
  })),
  onAuthStateChanged: jest.fn(() => 'unsubscribe'),
  signInWithCredential: jest.fn(() => Promise.resolve({ user: { uid: 'user-A' } })),
  signOut: jest.fn(() => Promise.resolve()),
}));

jest.mock('../services/firestore', () => ({
  createUser: jest.fn(() => Promise.resolve()),
  getUser: jest.fn(),
}));

const mockedGoogleAuthProvider = jest.mocked(GoogleAuthProvider);
const mockedOAuthProvider = jest.mocked(OAuthProvider);
const mockedOnAuthStateChanged = jest.mocked(onAuthStateChanged);
const mockedSignInWithCredential = jest.mocked(signInWithCredential);
const mockedSignOut = jest.mocked(signOut);
const mockedCreateUser = jest.mocked(createUser);
const mockedGetUser = jest.mocked(getUser);

beforeEach(() => {
  jest.clearAllMocks();
  mockedSignInWithCredential.mockResolvedValue({ user: { uid: 'user-A' } } as never);
  mockedSignOut.mockResolvedValue(undefined);
});

describe('auth service', () => {
  it('signs in to Firebase with a Google ID token', async () => {
    const auth = { name: 'auth' } as never;

    await signInWithGoogleIdToken(auth, 'google-id-token');

    expect(mockedGoogleAuthProvider.credential).toHaveBeenCalledWith('google-id-token');
    expect(mockedSignInWithCredential).toHaveBeenCalledWith(auth, {
      providerId: 'google.com',
      idToken: 'google-id-token',
    });
  });

  it('signs in to Firebase with an Apple identity token and nonce', async () => {
    const auth = { name: 'auth' } as never;

    await signInWithAppleIdentityToken(auth, 'apple-id-token', 'raw-nonce');

    expect(mockedOAuthProvider).toHaveBeenCalledWith('apple.com');
    const provider = mockedOAuthProvider.mock.results[0]?.value;
    expect(provider.credential).toHaveBeenCalledWith({
      idToken: 'apple-id-token',
      rawNonce: 'raw-nonce',
    });
    expect(mockedSignInWithCredential).toHaveBeenCalledWith(auth, {
      providerId: 'apple.com',
      idToken: 'apple-id-token',
      rawNonce: 'raw-nonce',
    });
  });

  it('rejects Apple sign-in without a nonce', async () => {
    await expect(signInWithAppleIdentityToken({} as never, 'apple-id-token', '')).rejects.toThrow(
      'Apple sign-in nonce is required'
    );

    expect(mockedSignInWithCredential).not.toHaveBeenCalled();
  });

  it('signs out from Firebase Auth', async () => {
    const auth = { name: 'auth' } as never;

    await signOutUser(auth);

    expect(mockedSignOut).toHaveBeenCalledWith(auth);
  });

  it('signs out from external providers before Firebase Auth', async () => {
    const auth = { name: 'auth' } as never;
    const signOutFromExternalProvider = jest.fn(() => Promise.resolve());

    await signOutUser(auth, signOutFromExternalProvider);

    expect(signOutFromExternalProvider).toHaveBeenCalledTimes(1);
    expect(mockedSignOut).toHaveBeenCalledWith(auth);
  });

  it('still signs out from Firebase Auth when external provider sign-out fails', async () => {
    const auth = { name: 'auth' } as never;
    const signOutFromExternalProvider = jest.fn(() => Promise.reject(new Error('Google failed')));

    await signOutUser(auth, signOutFromExternalProvider);

    expect(signOutFromExternalProvider).toHaveBeenCalledTimes(1);
    expect(mockedSignOut).toHaveBeenCalledWith(auth);
  });

  it('subscribes to Firebase Auth state changes', () => {
    const auth = { name: 'auth' } as never;
    const callback = jest.fn();

    const unsubscribe = subscribeAuthState(auth, callback);

    expect(unsubscribe).toBe('unsubscribe');
    expect(mockedOnAuthStateChanged).toHaveBeenCalledWith(auth, callback);
  });

  it('creates a user document on first sign-in', async () => {
    mockedGetUser.mockResolvedValueOnce(null);
    const db = { name: 'firestore' } as never;
    const firebaseUser = {
      uid: 'user-A',
      displayName: 'Alice Account',
      email: 'alice@example.com',
    } as never;

    await ensureUserDocument(db, firebaseUser);

    expect(mockedGetUser).toHaveBeenCalledWith(db, 'user-A');
    expect(mockedCreateUser).toHaveBeenCalledWith(db, {
      userId: 'user-A',
      displayName: '',
      accountName: 'Alice Account',
      email: 'alice@example.com',
    });
  });

  it('does not overwrite an existing user document', async () => {
    mockedGetUser.mockResolvedValueOnce({
      userId: 'user-A',
      displayName: 'alice',
      accountName: 'Alice Account',
      email: 'alice@example.com',
      householdId: null,
      createdAt: new Date(),
    });

    await ensureUserDocument({} as never, { uid: 'user-A' } as never);

    expect(mockedCreateUser).not.toHaveBeenCalled();
  });
});
