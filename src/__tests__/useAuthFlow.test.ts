import { loadSignedInUser, refreshSignedInUser } from '../hooks/useAuthFlow';
import { ensureUserDocument } from '../services/auth';
import { getUser } from '../services/firestore';

jest.mock('../services/auth', () => ({
  ensureUserDocument: jest.fn(() => Promise.resolve()),
}));

jest.mock('../services/firestore', () => ({
  getUser: jest.fn(),
}));

jest.mock('../services/oauthSignIn', () => ({
  signOutNativeGoogleAsync: jest.fn(() => Promise.resolve()),
}));

const mockedEnsureUserDocument = jest.mocked(ensureUserDocument);
const mockedGetUser = jest.mocked(getUser);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('loadSignedInUser', () => {
  it('ensures a user document exists and returns it', async () => {
    const db = { name: 'firestore-test-db' } as never;
    const firebaseUser = { uid: 'user-A', displayName: 'Alice', email: 'a@example.com' } as never;
    const firestoreUser = {
      userId: 'user-A',
      displayName: 'alice',
      accountName: 'Alice',
      email: 'a@example.com',
      householdId: null,
      createdAt: new Date('2026-05-05T00:00:00.000Z'),
    };
    mockedGetUser.mockResolvedValueOnce(firestoreUser);

    const result = await loadSignedInUser(db, firebaseUser);

    expect(result).toBe(firestoreUser);
    expect(mockedEnsureUserDocument).toHaveBeenCalledWith(db, firebaseUser);
    expect(mockedGetUser).toHaveBeenCalledWith(db, 'user-A');
  });

  it('throws when the user document is still missing after ensure', async () => {
    mockedGetUser.mockResolvedValueOnce(null);

    await expect(loadSignedInUser({} as never, { uid: 'user-A' } as never)).rejects.toThrow(
      'User document was not found after sign-in'
    );
  });
});

describe('refreshSignedInUser', () => {
  it('returns null without touching Firestore when signed out', async () => {
    const result = await refreshSignedInUser({} as never, null);

    expect(result).toBeNull();
    expect(mockedEnsureUserDocument).not.toHaveBeenCalled();
    expect(mockedGetUser).not.toHaveBeenCalled();
  });

  it('loads the Firestore user when signed in', async () => {
    const db = { name: 'firestore-test-db' } as never;
    const firebaseUser = { uid: 'user-A', displayName: 'Alice', email: 'a@example.com' } as never;
    const firestoreUser = {
      userId: 'user-A',
      displayName: 'alice',
      accountName: 'Alice',
      email: 'a@example.com',
      householdId: 'household-1',
      createdAt: new Date('2026-05-05T00:00:00.000Z'),
    };
    mockedGetUser.mockResolvedValueOnce(firestoreUser);

    const result = await refreshSignedInUser(db, firebaseUser);

    expect(result).toBe(firestoreUser);
    expect(mockedEnsureUserDocument).toHaveBeenCalledWith(db, firebaseUser);
    expect(mockedGetUser).toHaveBeenCalledWith(db, 'user-A');
  });
});
