import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { subscribeCalendarItems } from '../services/firestore';

const unsubscribe = jest.fn();

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
  updateDoc: jest.fn(),
  where: jest.fn((fieldPath: string, opStr: string, value: unknown) => ({
    fieldPath,
    opStr,
    value,
  })),
  writeBatch: jest.fn(),
}));

const mockedCollection = jest.mocked(collection);
const mockedOnSnapshot = jest.mocked(onSnapshot);
const mockedQuery = jest.mocked(query);
const mockedWhere = jest.mocked(where);

beforeEach(() => {
  jest.clearAllMocks();
  unsubscribe.mockClear();
});

describe('subscribeCalendarItems', () => {
  it('subscribes to scheduled calendar items under the household only', () => {
    const db = { name: 'firestore-test-db' } as never;
    const onItems = jest.fn();
    const onError = jest.fn();
    const emitSnapshots: ((snapshot: unknown) => void)[] = [];

    mockedOnSnapshot.mockImplementationOnce((target, next) => {
      emitSnapshots.push(next as (snapshot: unknown) => void);
      expect(target).toEqual({
        collectionRef: {
          db,
          pathSegments: ['households/household-1/calendar_items'],
        },
        constraints: [{ fieldPath: 'status', opStr: '==', value: 'scheduled' }],
      });
      return unsubscribe;
    });

    const result = subscribeCalendarItems(db, 'household-1', onItems, onError);

    expect(mockedCollection).toHaveBeenCalledWith(db, 'households/household-1/calendar_items');
    expect(mockedWhere).toHaveBeenCalledWith('status', '==', 'scheduled');
    expect(mockedQuery).toHaveBeenCalled();
    expect(mockedOnSnapshot).toHaveBeenCalledTimes(1);
    expect(result).toBe(unsubscribe);

    expect(emitSnapshots[0]).toBeDefined();
    emitSnapshots[0]?.({
      docs: [
        {
          id: 'item-1',
          data: () => ({
            status: 'scheduled',
            type: 'event',
            title: '保育園面談',
            assignee: 'both',
            startAt: new Date('2026-05-07T10:00:00.000Z'),
            dueAt: null,
            memo: '',
            isCompleted: false,
            createdBy: 'user-A',
            inputDurationMs: null,
            createdAt: new Date('2026-05-01T00:00:00.000Z'),
            updatedAt: new Date('2026-05-01T00:00:00.000Z'),
          }),
        },
      ],
    });

    expect(onItems).toHaveBeenCalledWith([
      expect.objectContaining({
        itemId: 'item-1',
        status: 'scheduled',
        title: '保育園面談',
      }),
    ]);
    expect(onError).not.toHaveBeenCalled();
  });
});
