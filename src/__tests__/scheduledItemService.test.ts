import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { updateScheduledItem } from '../services/firestore';

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
