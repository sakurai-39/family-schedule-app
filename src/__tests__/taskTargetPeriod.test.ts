import { calculateTargetDate, formatTargetDate } from '../utils/taskTargetPeriod';

describe('calculateTargetDate', () => {
  it('week: 登録日 + 7日を返す', () => {
    const createdAt = new Date(2026, 4, 17); // 2026-05-17
    const result = calculateTargetDate(createdAt, 'week');
    expect(result).toEqual(new Date(2026, 4, 24));
  });

  it('month: 翌月の同日を返す', () => {
    const createdAt = new Date(2026, 4, 17); // 2026-05-17
    const result = calculateTargetDate(createdAt, 'month');
    expect(result).toEqual(new Date(2026, 5, 17)); // 2026-06-17
  });

  it('month: 翌月に同日がない場合は月末日にクランプ', () => {
    const createdAt = new Date(2026, 0, 31); // 2026-01-31
    const result = calculateTargetDate(createdAt, 'month');
    expect(result).toEqual(new Date(2026, 1, 28)); // 2026-02-28
  });

  it('month: うるう年の月末調整', () => {
    const createdAt = new Date(2024, 0, 31); // 2024-01-31
    const result = calculateTargetDate(createdAt, 'month');
    expect(result).toEqual(new Date(2024, 1, 29)); // 2024-02-29
  });

  it('six_months: 6か月後の同日を返す', () => {
    const createdAt = new Date(2026, 4, 17); // 2026-05-17
    const result = calculateTargetDate(createdAt, 'six_months');
    expect(result).toEqual(new Date(2026, 10, 17)); // 2026-11-17
  });

  it('six_months: 月末調整あり', () => {
    const createdAt = new Date(2026, 7, 31); // 2026-08-31
    const result = calculateTargetDate(createdAt, 'six_months');
    expect(result).toEqual(new Date(2027, 1, 28)); // 2027-02-28
  });

  it('year: 翌年の同日を返す', () => {
    const createdAt = new Date(2026, 4, 17); // 2026-05-17
    const result = calculateTargetDate(createdAt, 'year');
    expect(result).toEqual(new Date(2027, 4, 17)); // 2027-05-17
  });

  it('year: うるう年 2/29 → 翌年 2/28', () => {
    const createdAt = new Date(2024, 1, 29); // 2024-02-29
    const result = calculateTargetDate(createdAt, 'year');
    expect(result).toEqual(new Date(2025, 1, 28)); // 2025-02-28
  });

  it('null period の場合は null を返す', () => {
    const createdAt = new Date(2026, 4, 17);
    expect(calculateTargetDate(createdAt, null)).toBeNull();
  });
});

describe('formatTargetDate', () => {
  it('同年内: M/D頃 を返す', () => {
    const targetDate = new Date(2026, 4, 17); // 2026-05-17
    const now = new Date(2026, 3, 1); // 2026-04-01
    expect(formatTargetDate(targetDate, now)).toBe('5/17頃');
  });

  it('別年: YYYY/M/D頃 を返す', () => {
    const targetDate = new Date(2027, 4, 17); // 2027-05-17
    const now = new Date(2026, 11, 1); // 2026-12-01
    expect(formatTargetDate(targetDate, now)).toBe('2027/5/17頃');
  });

  it('null 入力で null を返す', () => {
    const now = new Date(2026, 3, 1);
    expect(formatTargetDate(null, now)).toBeNull();
  });
});
