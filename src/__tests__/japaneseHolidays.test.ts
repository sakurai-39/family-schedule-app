import {
  getCalendarDateTone,
  getJapaneseHolidayName,
  isJapaneseHoliday,
} from '../utils/japaneseHolidays';

describe('japaneseHolidays', () => {
  it('detects Japanese public holidays by local date', () => {
    expect(isJapaneseHoliday(new Date(2026, 1, 11))).toBe(true);
    expect(getJapaneseHolidayName(new Date(2026, 1, 11))).toBe('建国記念の日');
  });

  it('does not mark ordinary weekdays as holidays', () => {
    expect(isJapaneseHoliday(new Date(2026, 1, 12))).toBe(false);
    expect(getJapaneseHolidayName(new Date(2026, 1, 12))).toBeNull();
  });

  it('classifies weekday holidays separately from normal weekdays', () => {
    expect(getCalendarDateTone(new Date(2026, 1, 11))).toBe('holiday');
    expect(getCalendarDateTone(new Date(2026, 1, 12))).toBe('weekday');
  });

  it('classifies Saturday and Sunday for calendar coloring', () => {
    expect(getCalendarDateTone(new Date(2026, 4, 9))).toBe('saturday');
    expect(getCalendarDateTone(new Date(2026, 4, 10))).toBe('sunday');
  });
});
