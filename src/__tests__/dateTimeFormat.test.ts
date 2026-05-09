import { formatDateInput, formatTimeInput, parseDateTimeOrFallback } from '../utils/dateTimeFormat';

describe('formatDateInput', () => {
  it('formats Date as YYYY-MM-DD with zero padding', () => {
    expect(formatDateInput(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(formatDateInput(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('preserves the local calendar day regardless of time', () => {
    expect(formatDateInput(new Date(2026, 4, 8, 23, 59))).toBe('2026-05-08');
    expect(formatDateInput(new Date(2026, 4, 8, 0, 0))).toBe('2026-05-08');
  });
});

describe('formatTimeInput', () => {
  it('formats Date as HH:mm with zero padding', () => {
    expect(formatTimeInput(new Date(2026, 4, 8, 9, 5))).toBe('09:05');
    expect(formatTimeInput(new Date(2026, 4, 8, 23, 59))).toBe('23:59');
    expect(formatTimeInput(new Date(2026, 4, 8, 0, 0))).toBe('00:00');
  });
});

describe('parseDateTimeOrFallback', () => {
  it('parses valid YYYY-MM-DD and HH:mm into a local Date', () => {
    const fallback = new Date(2026, 0, 1, 0, 0);
    const result = parseDateTimeOrFallback('2026-05-08', '09:30', fallback);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(4);
    expect(result.getDate()).toBe(8);
    expect(result.getHours()).toBe(9);
    expect(result.getMinutes()).toBe(30);
  });

  it('returns the fallback when dateText is empty', () => {
    const fallback = new Date(2030, 5, 15, 12, 0);
    expect(parseDateTimeOrFallback('', '09:30', fallback)).toBe(fallback);
  });

  it('returns the fallback when timeText is empty', () => {
    const fallback = new Date(2030, 5, 15, 12, 0);
    expect(parseDateTimeOrFallback('2026-05-08', '', fallback)).toBe(fallback);
  });

  it('returns the fallback when format is invalid', () => {
    const fallback = new Date(2030, 5, 15, 12, 0);
    expect(parseDateTimeOrFallback('2026/05/08', '09:30', fallback)).toBe(fallback);
    expect(parseDateTimeOrFallback('2026-05-08', '9:30', fallback)).toBe(fallback);
  });

  it('returns the fallback when calendar values are out of range', () => {
    const fallback = new Date(2030, 5, 15, 12, 0);
    expect(parseDateTimeOrFallback('2026-13-08', '09:30', fallback)).toBe(fallback);
    expect(parseDateTimeOrFallback('2026-02-31', '09:30', fallback)).toBe(fallback);
    expect(parseDateTimeOrFallback('2026-05-08', '24:00', fallback)).toBe(fallback);
  });
});
