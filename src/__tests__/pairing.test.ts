import { collection, doc, getDocs, query, updateDoc, where, writeBatch } from 'firebase/firestore';
import {
  generateInviteCode,
  generateInviteCodeValue,
  joinHouseholdByCode,
} from '../services/pairing';

const mockBatchUpdate = jest.fn();
const mockBatchCommit = jest.fn(() => Promise.resolve());

jest.mock('firebase/firestore', () => ({
  collection: jest.fn((db: unknown, ...pathSegments: string[]) => ({ db, pathSegments })),
  doc: jest.fn((db: unknown, ...pathSegments: string[]) => ({ db, pathSegments })),
  getDocs: jest.fn(),
  query: jest.fn((collectionRef: unknown, ...constraints: unknown[]) => ({
    collectionRef,
    constraints,
  })),
  updateDoc: jest.fn(() => Promise.resolve()),
  where: jest.fn((fieldPath: string, opStr: string, value: unknown) => ({
    fieldPath,
    opStr,
    value,
  })),
  writeBatch: jest.fn(() => ({
    update: mockBatchUpdate,
    commit: mockBatchCommit,
  })),
}));

const mockedCollection = jest.mocked(collection);
const mockedDoc = jest.mocked(doc);
const mockedGetDocs = jest.mocked(getDocs);
const mockedQuery = jest.mocked(query);
const mockedUpdateDoc = jest.mocked(updateDoc);
const mockedWhere = jest.mocked(where);
const mockedWriteBatch = jest.mocked(writeBatch);

beforeEach(() => {
  jest.clearAllMocks();
  mockBatchCommit.mockResolvedValue(undefined);
});

describe('generateInviteCodeValue', () => {
  it('returns exactly 6 numeric characters', () => {
    const code = generateInviteCodeValue((values) => {
      values[0] = 123456;
      return values;
    });

    expect(code).toBe('123456');
    expect(code).toMatch(/^\d{6}$/);
  });

  it('preserves leading zeros', () => {
    const code = generateInviteCodeValue((values) => {
      values[0] = 42;
      return values;
    });

    expect(code).toBe('000042');
  });

  it('rejects out-of-range random values to avoid modulo bias', () => {
    const valuesToReturn = [4294000000, 654321];
    const code = generateInviteCodeValue((values) => {
      values[0] = valuesToReturn.shift() ?? 0;
      return values;
    });

    expect(code).toBe('654321');
    expect(valuesToReturn).toHaveLength(0);
  });
});

describe('generateInviteCode', () => {
  it('stores a generated code with a 24-hour expiry on the household', async () => {
    const db = { name: 'firestore-test-db' } as never;
    const now = new Date('2026-05-05T00:00:00.000Z');

    const code = await generateInviteCode(db, 'household-1', {
      generateCode: () => '482917',
      now: () => now,
    });

    expect(code).toBe('482917');
    expect(mockedDoc).toHaveBeenCalledWith(db, 'households', 'household-1');
    expect(mockedUpdateDoc).toHaveBeenCalledWith(
      { db, pathSegments: ['households', 'household-1'] },
      {
        inviteCode: '482917',
        inviteCodeExpiresAt: new Date('2026-05-06T00:00:00.000Z'),
      }
    );
  });

  it('rejects invalid generated codes before writing', async () => {
    const db = { name: 'firestore-test-db' } as never;

    await expect(
      generateInviteCode(db, 'household-1', {
        generateCode: () => 'abc123',
        now: () => new Date('2026-05-05T00:00:00.000Z'),
      })
    ).rejects.toThrow('数字のみで入力してください');

    expect(mockedUpdateDoc).not.toHaveBeenCalled();
  });
});

describe('joinHouseholdByCode', () => {
  it('adds the user to the matching active household and clears the invite code', async () => {
    const db = { name: 'firestore-test-db' } as never;
    const now = new Date('2026-05-05T00:00:00.000Z');
    mockedGetDocs.mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          id: 'household-1',
          data: () => ({
            inviteCode: '482917',
            inviteCodeExpiresAt: new Date('2026-05-06T00:00:00.000Z'),
            members: ['user-A'],
          }),
        },
      ],
    } as never);

    const householdId = await joinHouseholdByCode(db, 'user-B', '482917', {
      now: () => now,
    });

    expect(householdId).toBe('household-1');
    expect(mockedCollection).toHaveBeenCalledWith(db, 'households');
    expect(mockedWhere).toHaveBeenCalledWith('inviteCode', '==', '482917');
    expect(mockedWhere).toHaveBeenCalledWith('inviteCodeExpiresAt', '>', now);
    expect(mockedQuery).toHaveBeenCalled();
    expect(mockedWriteBatch).toHaveBeenCalledWith(db);
    expect(mockBatchUpdate).toHaveBeenCalledWith(
      { db, pathSegments: ['households', 'household-1'] },
      {
        members: ['user-A', 'user-B'],
        inviteCode: null,
        inviteCodeExpiresAt: null,
      }
    );
    expect(mockBatchUpdate).toHaveBeenCalledWith(
      { db, pathSegments: ['users', 'user-B'] },
      { householdId: 'household-1' }
    );
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });

  it('rejects expired invite codes before writing', async () => {
    const db = { name: 'firestore-test-db' } as never;
    mockedGetDocs.mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          id: 'household-1',
          data: () => ({
            inviteCode: '482917',
            inviteCodeExpiresAt: new Date('2026-05-04T23:59:59.999Z'),
            members: ['user-A'],
          }),
        },
      ],
    } as never);

    await expect(
      joinHouseholdByCode(db, 'user-B', '482917', {
        now: () => new Date('2026-05-05T00:00:00.000Z'),
      })
    ).rejects.toThrow('招待コードの有効期限が切れています');

    expect(mockBatchUpdate).not.toHaveBeenCalled();
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });

  it('rejects households that already have 2 members', async () => {
    const db = { name: 'firestore-test-db' } as never;
    mockedGetDocs.mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          id: 'household-1',
          data: () => ({
            inviteCode: '482917',
            inviteCodeExpiresAt: new Date('2026-05-06T00:00:00.000Z'),
            members: ['user-A', 'user-C'],
          }),
        },
      ],
    } as never);

    await expect(
      joinHouseholdByCode(db, 'user-B', '482917', {
        now: () => new Date('2026-05-05T00:00:00.000Z'),
      })
    ).rejects.toThrow('家族メンバーは2人までです');

    expect(mockBatchUpdate).not.toHaveBeenCalled();
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });
});
