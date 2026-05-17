import {
  validateDisplayName,
  validateTitle,
  validateMemo,
  validateInviteCode,
  normalizeInviteCodeInput,
  sanitizeText,
  isValidScheduledItem,
} from '../utils/validation';

describe('validateDisplayName', () => {
  it('accepts 1-6 character names', () => {
    expect(validateDisplayName('a').ok).toBe(true);
    expect(validateDisplayName('ゆうた').ok).toBe(true);
    expect(validateDisplayName('abcdef').ok).toBe(true);
  });
  it('rejects empty string', () => {
    expect(validateDisplayName('').ok).toBe(false);
  });
  it('rejects 7+ characters (full-width)', () => {
    expect(validateDisplayName('あいうえおかき').ok).toBe(false);
  });
  it('rejects 7+ characters (half-width)', () => {
    expect(validateDisplayName('abcdefg').ok).toBe(false);
  });
});

describe('validateTitle', () => {
  it('accepts 1-200 character title', () => {
    expect(validateTitle('a').ok).toBe(true);
    expect(validateTitle('a'.repeat(200)).ok).toBe(true);
  });
  it('rejects empty', () => {
    expect(validateTitle('').ok).toBe(false);
  });
  it('rejects 201+ characters', () => {
    expect(validateTitle('a'.repeat(201)).ok).toBe(false);
  });
});

describe('validateMemo', () => {
  it('accepts 0-1000 character memo (empty allowed)', () => {
    expect(validateMemo('').ok).toBe(true);
    expect(validateMemo('a'.repeat(1000)).ok).toBe(true);
  });
  it('rejects 1001+ characters', () => {
    expect(validateMemo('a'.repeat(1001)).ok).toBe(false);
  });
});

describe('validateInviteCode', () => {
  it('accepts exactly 6 numeric characters', () => {
    expect(validateInviteCode('123456').ok).toBe(true);
    expect(validateInviteCode('000000').ok).toBe(true);
  });
  it('rejects non-numeric', () => {
    expect(validateInviteCode('abcdef').ok).toBe(false);
    expect(validateInviteCode('12345a').ok).toBe(false);
  });
  it('rejects wrong length', () => {
    expect(validateInviteCode('12345').ok).toBe(false);
    expect(validateInviteCode('1234567').ok).toBe(false);
  });
});

describe('normalizeInviteCodeInput', () => {
  it('keeps only numeric characters and limits the value to 6 digits', () => {
    expect(normalizeInviteCodeInput(' 482-917 ')).toBe('482917');
    expect(normalizeInviteCodeInput('abc1234567')).toBe('123456');
    expect(normalizeInviteCodeInput('１２３456')).toBe('456');
  });
});

describe('sanitizeText', () => {
  it('strips dangerous control chars but preserves \\n, \\r, \\t', () => {
    expect(sanitizeText('helloworld')).toBe('helloworld');
    expect(sanitizeText('helloworld')).toBe('helloworld');
    expect(sanitizeText('helloworld')).toBe('helloworld');
    expect(sanitizeText('hello\nworld')).toBe('hello\nworld');
    expect(sanitizeText('hello\rworld')).toBe('hello\rworld');
    expect(sanitizeText('hello\tworld')).toBe('hello\tworld');
  });
  it('preserves emoji', () => {
    expect(sanitizeText('hello😀')).toBe('hello😀');
  });
  it('returns empty string unchanged', () => {
    expect(sanitizeText('')).toBe('');
  });
});

describe('isValidScheduledItem', () => {
  it('accepts a complete event draft', () => {
    expect(
      isValidScheduledItem({
        type: 'event',
        title: 'meeting',
        assignee: 'user-1',
        startAt: new Date(),
      })
    ).toBe(true);
  });
  it('accepts a task with dueAt', () => {
    expect(
      isValidScheduledItem({
        type: 'task',
        title: 'pay bill',
        assignee: 'both',
        dueAt: new Date(),
        targetPeriod: null,
      })
    ).toBe(true);
  });
  it('accepts a task with null dueAt (やることリスト)', () => {
    expect(
      isValidScheduledItem({
        type: 'task',
        title: 'buy milk',
        assignee: 'whoever',
        dueAt: null,
        targetPeriod: 'week',
      })
    ).toBe(true);
  });
  it('rejects a dated task with a rough target period', () => {
    expect(
      isValidScheduledItem({
        type: 'task',
        title: 'pay bill',
        assignee: 'both',
        dueAt: new Date(),
        targetPeriod: 'month',
      })
    ).toBe(false);
  });
  it('rejects event with missing startAt', () => {
    expect(
      isValidScheduledItem({
        type: 'event',
        title: 'meeting',
        assignee: 'user-1',
        startAt: null as unknown as Date,
      })
    ).toBe(false);
  });
  it('rejects empty title', () => {
    expect(
      isValidScheduledItem({
        type: 'event',
        title: '',
        assignee: 'user-1',
        startAt: new Date(),
      })
    ).toBe(false);
  });
});
