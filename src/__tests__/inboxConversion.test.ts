import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { promoteInboxToScheduled } from '../services/firestore';
import { buildScheduledItemDraft } from '../utils/scheduleDraft';

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
const mockedServerTimestamp = jest.mocked(serverTimestamp);
const mockedUpdateDoc = jest.mocked(updateDoc);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('inbox conversion draft quality checks', () => {
  it('converts form input into a scheduled event draft', () => {
    const result = buildScheduledItemDraft({
      kind: 'event',
      title: ' 保育園面談 ',
      memo: ' 持ち物を確認 ',
      assignee: 'both',
      dateText: '2026-05-10',
      timeText: '09:30',
      hasDueDate: true,
    });

    expect(result).toEqual({
      ok: true,
      draft: {
        type: 'event',
        title: '保育園面談',
        memo: '持ち物を確認',
        assignee: 'both',
        startAt: new Date(2026, 4, 10, 9, 30),
      },
    });
  });

  it('converts form input into an undated task draft (no due date)', () => {
    const result = buildScheduledItemDraft({
      kind: 'task',
      title: '靴を買う',
      memo: '',
      assignee: 'whoever',
      dateText: '',
      timeText: '',
      hasDueDate: false,
      targetPeriod: 'week',
    });

    expect(result).toEqual({
      ok: true,
      draft: {
        type: 'task',
        title: '靴を買う',
        memo: '',
        assignee: 'whoever',
        dueAt: null,
        targetPeriod: 'week',
      },
    });
  });

  it('rejects invalid conversion input before a Firestore write is attempted', () => {
    const result = buildScheduledItemDraft({
      kind: 'task',
      title: '',
      memo: '',
      assignee: 'user-A',
      dateText: '2026-05-10',
      timeText: '09:30',
      hasDueDate: true,
    });

    expect(result).toEqual({ ok: false, reason: 'タイトルを入力してください' });
    expect(mockedUpdateDoc).not.toHaveBeenCalled();
  });
});

describe('promoteInboxToScheduled quality checks', () => {
  it('writes only the scheduled event fields and preserves createdBy implicitly', async () => {
    const db = { name: 'firestore-test-db' } as never;
    const startAt = new Date('2026-05-10T09:30:00.000Z');

    await promoteInboxToScheduled(db, 'household-1', 'item-1', {
      type: 'event',
      title: '保育園面談',
      memo: '持ち物を確認',
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
        memo: '持ち物を確認',
        startAt,
        dueAt: null,
        targetPeriod: null,
        updatedAt: { type: 'serverTimestamp' },
      }
    );
    expect(mockedUpdateDoc.mock.calls[0]?.[1]).not.toHaveProperty('createdBy');
  });

  it('writes an undated todo as a scheduled task with dueAt null', async () => {
    const db = { name: 'firestore-test-db' } as never;

    await promoteInboxToScheduled(db, 'household-1', 'item-1', {
      type: 'task',
      title: '靴を買う',
      memo: '',
      assignee: 'whoever',
      dueAt: null,
      targetPeriod: null,
    });

    expect(mockedUpdateDoc).toHaveBeenCalledWith(expect.anything(), {
      status: 'scheduled',
      type: 'task',
      title: '靴を買う',
      assignee: 'whoever',
      memo: '',
      startAt: null,
      dueAt: null,
      targetPeriod: null,
      updatedAt: { type: 'serverTimestamp' },
    });
  });
});
