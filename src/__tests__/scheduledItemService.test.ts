import { addDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { createScheduledItem, updateScheduledItem } from '../services/firestore';

jest.mock('firebase/firestore', () => ({
  Timestamp: class MockTimestamp {},
  addDoc: jest.fn(),
  arrayUnion: jest.fn(),
  collection: jest.fn((db: unknown, ...pathSegments: string[]) => ({ db, pathSegments })),
  deleteDoc: jest.fn(),
  doc: jest.fn((db: unknown, ...pathSegments: string[]) => ({ db, pathSegments })),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  onSnapshot: jest.fn(),
  orderBy: jest.fn((fieldPath: string, directionStr?: string) => ({ fieldPath, directionStr })),
  query: jest.fn((collectionRef: unknown, ...constraints: unknown[]) => ({
    collectionRef,
    constraints,
  })),
  serverTimestamp: jest.fn(() => ({ type: 'serverTimestamp' })),
  setDoc: jest.fn(),
  updateDoc: jest.fn(() => Promise.resolve()),
  where: jest.fn((fieldPath: string, opStr: string, value: unknown) => ({
    fieldPath,
    opStr,
    value,
  })),
  writeBatch: jest.fn(),
}));

const mockedAddDoc = jest.mocked(addDoc);
const mockedDoc = jest.mocked(doc);
const mockedServerTimestamp = jest.mocked(serverTimestamp);
const mockedUpdateDoc = jest.mocked(updateDoc);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('updateScheduledItem', () => {
  it('writes a complete scheduled event shape', async () => {
    const db = { name: 'firestore-test-db' } as never;
    const startAt = new Date('2026-05-08T09:30:00.000Z');

    await updateScheduledItem(db, 'household-1', 'item-1', {
      type: 'event',
      title: '保育園面談',
      memo: '持ち物確認',
      assignee: 'both',
      startAt,
    });

    expect(mockedDoc).toHaveBeenCalledWith(db, 'households/household-1/calendar_items', 'item-1');
    expect(mockedServerTimestamp).toHaveBeenCalledTimes(1);
    expect(mockedUpdateDoc).toHaveBeenCalledWith(
      { db, pathSegments: ['households/household-1/calendar_items', 'item-1'] },
      {
        status: 'scheduled',
        type: 'event',
        title: '保育園面談',
        assignee: 'both',
        memo: '持ち物確認',
        startAt,
        dueAt: null,
        updatedAt: { type: 'serverTimestamp' },
      }
    );
  });

  it('writes an undated todo shape as a scheduled task with dueAt null', async () => {
    const db = { name: 'firestore-test-db' } as never;

    await updateScheduledItem(db, 'household-1', 'item-1', {
      type: 'task',
      title: '靴を買う',
      memo: '',
      assignee: 'whoever',
      dueAt: null,
    });

    expect(mockedUpdateDoc).toHaveBeenCalledWith(expect.anything(), {
      status: 'scheduled',
      type: 'task',
      title: '靴を買う',
      assignee: 'whoever',
      memo: '',
      startAt: null,
      dueAt: null,
      updatedAt: { type: 'serverTimestamp' },
    });
  });
});

describe('createScheduledItem', () => {
  it('creates an inbox item and immediately promotes it to scheduled (event)', async () => {
    const db = { name: 'firestore-test-db' } as never;
    const startAt = new Date('2026-05-13T12:00:00.000Z');
    mockedAddDoc.mockResolvedValueOnce({ id: 'new-item-1' } as never);

    const itemId = await createScheduledItem(
      db,
      'household-1',
      {
        type: 'event',
        title: 'ピアノ搬入下見',
        memo: '',
        assignee: 'user-1',
        startAt,
      },
      'user-1'
    );

    expect(itemId).toBe('new-item-1');

    // Step 1: createInboxItem (addDoc) was called with inbox shape
    expect(mockedAddDoc).toHaveBeenCalledTimes(1);
    expect(mockedAddDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: 'inbox',
        type: null,
        title: 'ピアノ搬入下見',
        assignee: null,
        startAt: null,
        dueAt: null,
        memo: '',
        isCompleted: false,
        recurrence: null,
        createdBy: 'user-1',
        inputDurationMs: null,
      })
    );

    // Step 2: promoteInboxToScheduled (updateDoc) was called with scheduled event shape
    expect(mockedUpdateDoc).toHaveBeenCalledTimes(1);
    expect(mockedUpdateDoc).toHaveBeenCalledWith(expect.anything(), {
      status: 'scheduled',
      type: 'event',
      title: 'ピアノ搬入下見',
      assignee: 'user-1',
      memo: '',
      startAt,
      dueAt: null,
      updatedAt: { type: 'serverTimestamp' },
    });
  });

  it('creates an inbox item and immediately promotes it to scheduled (task with due date)', async () => {
    const db = { name: 'firestore-test-db' } as never;
    const dueAt = new Date('2026-05-14T18:00:00.000Z');
    mockedAddDoc.mockResolvedValueOnce({ id: 'new-item-2' } as never);

    const itemId = await createScheduledItem(
      db,
      'household-1',
      {
        type: 'task',
        title: '自動車税の支払い',
        memo: '今月中',
        assignee: 'both',
        dueAt,
      },
      'user-1'
    );

    expect(itemId).toBe('new-item-2');
    expect(mockedAddDoc).toHaveBeenCalledTimes(1);
    expect(mockedUpdateDoc).toHaveBeenCalledWith(expect.anything(), {
      status: 'scheduled',
      type: 'task',
      title: '自動車税の支払い',
      assignee: 'both',
      memo: '今月中',
      startAt: null,
      dueAt,
      updatedAt: { type: 'serverTimestamp' },
    });
  });
});
