import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { removeMember } from '../services/firestore';

jest.mock('firebase/firestore', () => ({
  Timestamp: class MockTimestamp {},
  addDoc: jest.fn(),
  arrayUnion: jest.fn(),
  collection: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn((db: unknown, ...pathSegments: string[]) => ({ db, pathSegments })),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  onSnapshot: jest.fn(),
  orderBy: jest.fn(),
  query: jest.fn(),
  serverTimestamp: jest.fn(() => ({ type: 'serverTimestamp' })),
  setDoc: jest.fn(),
  updateDoc: jest.fn(() => Promise.resolve()),
  where: jest.fn(),
  writeBatch: jest.fn(),
}));

const mockedDoc = jest.mocked(doc);
const mockedGetDoc = jest.mocked(getDoc);
const mockedUpdateDoc = jest.mocked(updateDoc);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('member deletion data integrity', () => {
  it('rejects removing yourself before writing to Firestore', async () => {
    const db = { name: 'firestore-test-db' } as never;

    await expect(removeMember(db, 'household-1', 'user-A', 'user-A')).rejects.toThrow(
      'cannot remove yourself from a household'
    );

    expect(mockedGetDoc).not.toHaveBeenCalled();
    expect(mockedUpdateDoc).not.toHaveBeenCalled();
  });

  it('removes only the target member from household members', async () => {
    const db = { name: 'firestore-test-db' } as never;
    mockedGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        members: ['user-A', 'user-B'],
        createdAt: new Date('2026-05-08T00:00:00.000Z'),
        inviteCode: null,
        inviteCodeExpiresAt: null,
      }),
    } as never);

    await removeMember(db, 'household-1', 'user-B', 'user-A');

    expect(mockedDoc).toHaveBeenCalledWith(db, 'households', 'household-1');
    expect(mockedUpdateDoc).toHaveBeenCalledWith(
      { db, pathSegments: ['households', 'household-1'] },
      { members: ['user-A'] }
    );
  });

  it('does not mutate calendar item assignee tags while removing a member', async () => {
    const db = { name: 'firestore-test-db' } as never;
    mockedGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        members: ['user-A', 'user-B'],
        createdAt: new Date('2026-05-08T00:00:00.000Z'),
        inviteCode: null,
        inviteCodeExpiresAt: null,
      }),
    } as never);

    await removeMember(db, 'household-1', 'user-B', 'user-A');

    const updatePayload = mockedUpdateDoc.mock.calls[0]?.[1] as unknown as Record<string, unknown>;
    expect(updatePayload).toEqual({ members: ['user-A'] });
    expect(updatePayload).not.toHaveProperty('assignee');
    expect(updatePayload).not.toHaveProperty('createdBy');
    expect(updatePayload).not.toHaveProperty('calendar_items');
  });
});
