import { calculateTargetDate } from '../utils/taskTargetPeriod';

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
});
