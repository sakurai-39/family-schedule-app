import { buildScheduledItemDraft, parseLocalDateTime } from '../utils/scheduleDraft';

describe('parseLocalDateTime', () => {
  it('parses date and time strings as a local Date', () => {
    const date = parseLocalDateTime('2026-05-08', '09:30');

    expect(date).toEqual(new Date(2026, 4, 8, 9, 30));
  });

  it('returns null for invalid date strings', () => {
    expect(parseLocalDateTime('2026-02-30', '09:30')).toBeNull();
    expect(parseLocalDateTime('2026/05/08', '09:30')).toBeNull();
    expect(parseLocalDateTime('2026-05-08', '24:00')).toBeNull();
  });
});

describe('buildScheduledItemDraft', () => {
  it('builds an event draft with a required startAt', () => {
    const result = buildScheduledItemDraft({
      kind: 'event',
      title: '保育園面談',
      memo: '持ち物を確認',
      assignee: 'both',
      dateText: '2026-05-08',
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
        startAt: new Date(2026, 4, 8, 9, 30),
      },
    });
  });

  it('builds a dated task draft when task with hasDueDate=true', () => {
    const result = buildScheduledItemDraft({
      kind: 'task',
      title: '予防接種を予約',
      memo: '',
      assignee: 'user-A',
      dateText: '2026-05-09',
      timeText: '18:00',
      hasDueDate: true,
    });

    expect(result).toEqual({
      ok: true,
      draft: {
        type: 'task',
        title: '予防接種を予約',
        memo: '',
        assignee: 'user-A',
        dueAt: new Date(2026, 4, 9, 18, 0),
        targetPeriod: null,
      },
    });
  });

  it('builds an undated task draft with a rough target period', () => {
    const result = buildScheduledItemDraft({
      kind: 'task',
      title: '靴を買う',
      memo: '',
      assignee: 'whoever',
      dateText: '',
      timeText: '',
      hasDueDate: false,
      targetPeriod: 'month',
    });

    expect(result).toEqual({
      ok: true,
      draft: {
        type: 'task',
        title: '靴を買う',
        memo: '',
        assignee: 'whoever',
        dueAt: null,
        targetPeriod: 'month',
      },
    });
  });

  it('rejects missing title, assignee, and invalid dates before service calls', () => {
    expect(
      buildScheduledItemDraft({
        kind: 'event',
        title: '',
        memo: '',
        assignee: 'both',
        dateText: '2026-05-08',
        timeText: '09:30',
        hasDueDate: true,
      })
    ).toEqual({ ok: false, reason: 'タイトルを入力してください' });

    expect(
      buildScheduledItemDraft({
        kind: 'task',
        title: '予約',
        memo: '',
        assignee: null,
        dateText: '2026-05-08',
        timeText: '09:30',
        hasDueDate: true,
      })
    ).toEqual({ ok: false, reason: '担当者を選んでください' });

    expect(
      buildScheduledItemDraft({
        kind: 'event',
        title: '面談',
        memo: '',
        assignee: 'both',
        dateText: 'bad-date',
        timeText: '09:30',
        hasDueDate: true,
      })
    ).toEqual({ ok: false, reason: '日付と時刻を正しく入力してください' });
  });
});
