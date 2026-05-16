import holidayJp from '@holiday-jp/holiday_jp';

export type CalendarDateTone = 'weekday' | 'saturday' | 'sunday' | 'holiday';

const holidayNameCache = new Map<string, string | null>();
const dateToneCache = new Map<string, CalendarDateTone>();

function getLocalDateCacheKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export function getJapaneseHolidayName(date: Date): string | null {
  const cacheKey = getLocalDateCacheKey(date);
  if (holidayNameCache.has(cacheKey)) {
    return holidayNameCache.get(cacheKey) ?? null;
  }

  const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const holiday = holidayJp.between(localDate, localDate)[0];

  const holidayName = holiday?.name ?? null;
  holidayNameCache.set(cacheKey, holidayName);

  return holidayName;
}

export function isJapaneseHoliday(date: Date): boolean {
  return getJapaneseHolidayName(date) !== null;
}

export function getCalendarDateTone(date: Date): CalendarDateTone {
  const cacheKey = getLocalDateCacheKey(date);
  const cachedTone = dateToneCache.get(cacheKey);
  if (cachedTone) {
    return cachedTone;
  }

  let tone: CalendarDateTone = 'weekday';

  if (isJapaneseHoliday(date)) {
    tone = 'holiday';
  } else if (date.getDay() === 0) {
    tone = 'sunday';
  } else if (date.getDay() === 6) {
    tone = 'saturday';
  }

  dateToneCache.set(cacheKey, tone);

  return tone;
}
