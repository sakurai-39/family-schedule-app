import holidayJp from '@holiday-jp/holiday_jp';

export type CalendarDateTone = 'weekday' | 'saturday' | 'sunday' | 'holiday';

export function getJapaneseHolidayName(date: Date): string | null {
  const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const holiday = holidayJp.between(localDate, localDate)[0];

  return holiday?.name ?? null;
}

export function isJapaneseHoliday(date: Date): boolean {
  return getJapaneseHolidayName(date) !== null;
}

export function getCalendarDateTone(date: Date): CalendarDateTone {
  if (isJapaneseHoliday(date)) {
    return 'holiday';
  }

  if (date.getDay() === 0) {
    return 'sunday';
  }

  if (date.getDay() === 6) {
    return 'saturday';
  }

  return 'weekday';
}
