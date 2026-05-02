import { isInPast } from '../utils/dateUtils';

describe('isInPast', () => {
  it('returns true for a date 1 minute in the past', () => {
    const oneMinuteAgo = new Date(Date.now() - 60_000);
    expect(isInPast(oneMinuteAgo)).toBe(true);
  });

  it('returns false for a date 1 minute in the future', () => {
    const oneMinuteLater = new Date(Date.now() + 60_000);
    expect(isInPast(oneMinuteLater)).toBe(false);
  });
});
