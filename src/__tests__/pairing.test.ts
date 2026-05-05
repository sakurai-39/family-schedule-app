import { generateInviteCodeValue } from '../services/pairing';

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
