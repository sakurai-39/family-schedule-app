import { doc, updateDoc } from 'firebase/firestore';
import { generateInviteCode, generateInviteCodeValue } from '../services/pairing';

jest.mock('firebase/firestore', () => ({
  doc: jest.fn((db: unknown, ...pathSegments: string[]) => ({ db, pathSegments })),
  updateDoc: jest.fn(() => Promise.resolve()),
}));

const mockedDoc = jest.mocked(doc);
const mockedUpdateDoc = jest.mocked(updateDoc);

beforeEach(() => {
  jest.clearAllMocks();
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
