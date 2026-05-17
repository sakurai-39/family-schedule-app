import { calculateTargetDate } from '../utils/taskTargetPeriod';

describe('calculateTargetDate', () => {
  it('week: 登録日 + 7日を返す', () => {
    const createdAt = new Date(2026, 4, 17); // 2026-05-17
    const result = calculateTargetDate(createdAt, 'week');
    expect(result).toEqual(new Date(2026, 4, 24));
  });
});
