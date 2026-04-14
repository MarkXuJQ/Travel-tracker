export type JourneyDatePrecision = 'year' | 'month' | 'day' | 'year-range';

export interface ParsedJourneyDate {
  raw: string;
  normalized: string;
  precision: JourneyDatePrecision | null;
  year: number | null;
  month: number | null;
  day: number | null;
  rangeEndYear: number | null;
  isValid: boolean;
}

function toSanitizedDateInput(value?: string) {
  if (!value) return '';

  return value
    .trim()
    .replace(/\s+/g, '')
    .replace(/[./]/g, '-')
    .replace(/[~～—–]/g, '-')
    .replace(/至/g, '-')
    .replace(/年/g, '-')
    .replace(/月/g, '-')
    .replace(/日/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function isValidDay(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function parseJourneyDate(value?: string): ParsedJourneyDate {
  const raw = value?.trim() ?? '';
  const sanitized = toSanitizedDateInput(value);

  if (!sanitized) {
    return {
      raw,
      normalized: '',
      precision: null,
      year: null,
      month: null,
      day: null,
      rangeEndYear: null,
      isValid: false,
    };
  }

  const yearRangeMatch = sanitized.match(/^(\d{4})-(\d{4})$/);
  if (yearRangeMatch) {
    const startYear = Number.parseInt(yearRangeMatch[1], 10);
    const endYear = Number.parseInt(yearRangeMatch[2], 10);

    if (
      Number.isInteger(startYear)
      && Number.isInteger(endYear)
      && startYear >= 1000
      && endYear <= 9999
      && startYear <= endYear
    ) {
      return {
        raw,
        normalized: `${startYear}-${endYear}`,
        precision: 'year-range',
        year: startYear,
        month: null,
        day: null,
        rangeEndYear: endYear,
        isValid: true,
      };
    }
  }

  if (!/^\d{4}(?:-\d{1,2}){0,2}$/.test(sanitized)) {
    return {
      raw,
      normalized: sanitized,
      precision: null,
      year: null,
      month: null,
      day: null,
      rangeEndYear: null,
      isValid: false,
    };
  }

  const [yearPart, monthPart, dayPart] = sanitized.split('-');
  const year = Number.parseInt(yearPart, 10);

  if (!Number.isInteger(year) || year < 1000 || year > 9999) {
    return {
      raw,
      normalized: sanitized,
      precision: null,
      year: null,
      month: null,
      day: null,
      rangeEndYear: null,
      isValid: false,
    };
  }

  if (!monthPart) {
    return {
      raw,
      normalized: String(year),
      precision: 'year',
      year,
      month: null,
      day: null,
      rangeEndYear: null,
      isValid: true,
    };
  }

  const month = Number.parseInt(monthPart, 10);
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return {
      raw,
      normalized: sanitized,
      precision: null,
      year: null,
      month: null,
      day: null,
      rangeEndYear: null,
      isValid: false,
    };
  }

  if (!dayPart) {
    return {
      raw,
      normalized: `${year}-${String(month).padStart(2, '0')}`,
      precision: 'month',
      year,
      month,
      day: null,
      rangeEndYear: null,
      isValid: true,
    };
  }

  const day = Number.parseInt(dayPart, 10);
  if (!Number.isInteger(day) || day < 1 || !isValidDay(year, month, day)) {
    return {
      raw,
      normalized: sanitized,
      precision: null,
      year: null,
      month: null,
      day: null,
      rangeEndYear: null,
      isValid: false,
    };
  }

  return {
    raw,
    normalized: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    precision: 'day',
    year,
    month,
    day,
    rangeEndYear: null,
    isValid: true,
  };
}

export function normalizeJourneyDate(value?: string) {
  const parsed = parseJourneyDate(value);
  return parsed.isValid ? parsed.normalized : null;
}

export function formatJourneyDate(value?: string) {
  const parsed = parseJourneyDate(value);
  if (!parsed.isValid) return value?.trim() ?? '';

  if (parsed.precision === 'year-range' && parsed.year !== null && parsed.rangeEndYear !== null) {
    return `${parsed.year}-${parsed.rangeEndYear}`;
  }

  if (parsed.precision === 'year') {
    return String(parsed.year);
  }

  if (parsed.precision === 'month') {
    return `${parsed.year}.${String(parsed.month).padStart(2, '0')}`;
  }

  return `${parsed.year}.${String(parsed.month).padStart(2, '0')}.${String(parsed.day).padStart(2, '0')}`;
}

export function getJourneyDateTimestamp(value?: string) {
  const parsed = parseJourneyDate(value);
  if (!parsed.isValid || parsed.year === null) return 0;

  return Date.UTC(parsed.year, (parsed.month ?? 1) - 1, parsed.day ?? 1);
}
