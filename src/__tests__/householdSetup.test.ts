import { collection, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { createHouseholdForUser } from '../services/firestore';

const mockBatchSet = jest.fn();
const mockBatchUpdate = jest.fn();
const mockBatchCommit = jest.fn(() => Promise.resolve());
const mockServerTimestamp = { type: 'serverTimestamp' };

jest.mock('firebase/firestore', () => ({
  collection: jest.fn((db: unknown, ...pathSegments: string[]) => ({ db, pathSegments })),
  doc: jest.fn((parent: unknown, ...pathSegments: string[]) => ({
    parent,
    pathSegments,
    id: pathSegments.length === 0 ? 'household-1' : pathSegments[pathSegments.length - 1],
  })),
  serverTimestamp: jest.fn(() => mockServerTimestamp),
  updateDoc: jest.fn(() => Promise.resolve()),
  writeBatch: jest.fn(() => ({
    set: mockBatchSet,
    update: mockBatchUpdate,
    commit: mockBatchCommit,
  })),
}));

const mockedCollection = jest.mocked(collection);
const mockedDoc = jest.mocked(doc);
const mockedUpdateDoc = jest.mocked(updateDoc);
const mockedWriteBatch = jest.mocked(writeBatch);

beforeEach(() => {
  jest.clearAllMocks();
  mockBatchCommit.mockResolvedValue(undefined);
});

describe('createHouseholdForUser', () => {
  it('creates a household and links it to the user atomically', async () => {
    const db = { name: 'firestore-test-db' } as never;

    const householdId = await createHouseholdForUser(db, 'user-A', 'りょう');

    expect(householdId).toBe('household-1');
    expect(mockedWriteBatch).toHaveBeenCalledWith(db);
    expect(mockedCollection).toHaveBeenCalledWith(db, 'households');
    expect(mockedDoc).toHaveBeenCalledWith({ db, pathSegments: ['households'] });
    expect(mockBatchSet).toHaveBeenCalledWith(
      { parent: { db, pathSegments: ['households'] }, pathSegments: [], id: 'household-1' },
      {
        members: ['user-A'],
        createdAt: mockServerTimestamp,
        inviteCode: null,
        inviteCodeExpiresAt: null,
      }
    );
    expect(mockBatchUpdate).toHaveBeenCalledWith(
      { parent: db, pathSegments: ['users', 'user-A'], id: 'user-A' },
      {
        displayName: 'りょう',
        householdId: 'household-1',
      }
    );
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    expect(mockedUpdateDoc).not.toHaveBeenCalled();
  });

  it('rejects an overlong displayName before writing', async () => {
    const db = { name: 'firestore-test-db' } as never;

    await expect(createHouseholdForUser(db, 'user-A', 'abcdefg')).rejects.toThrow(
      '6文字以内で入力してください'
    );

    expect(mockedWriteBatch).not.toHaveBeenCalled();
    expect(mockBatchSet).not.toHaveBeenCalled();
    expect(mockBatchUpdate).not.toHaveBeenCalled();
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });

  it('removes unsafe control characters from displayName before writing', async () => {
    const db = { name: 'firestore-test-db' } as never;

    await createHouseholdForUser(db, 'user-A', 'りょ\u0000う');

    expect(mockBatchUpdate).toHaveBeenCalledWith(
      { parent: db, pathSegments: ['users', 'user-A'], id: 'user-A' },
      {
        displayName: 'りょう',
        householdId: 'household-1',
      }
    );
  });
});
