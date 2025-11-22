import { useCallback, useMemo, useState } from 'react';

export type AppDateTimeSettings = {
  locale: string;
  timeZone: string;
};

export interface UseAppDateTimeReturn {
  settings: AppDateTimeSettings;
  setTimeZone: (timeZone: string) => void;
  setLocale: (locale: string) => void;
  formatDateTime: (
    value?: Date | string | number,
    options?: Intl.DateTimeFormatOptions,
  ) => string;
  formatDate: (
    value?: Date | string | number,
    options?: Intl.DateTimeFormatOptions,
  ) => string;
  formatTime: (
    value?: Date | string | number,
    options?: Intl.DateTimeFormatOptions,
  ) => string;
  getNow: () => Date;
}

const DEFAULT_SETTINGS: AppDateTimeSettings = {
  locale: 'en-PK',
  timeZone: 'Asia/Karachi',
};

const DEFAULT_DATETIME_OPTIONS: Intl.DateTimeFormatOptions = {
  dateStyle: 'medium',
  timeStyle: 'short',
};

const DEFAULT_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  dateStyle: 'medium',
};

const DEFAULT_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  timeStyle: 'short',
};

const normalizeInputDate = (value?: Date | string | number): Date => {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'number') {
    return new Date(value);
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? new Date() : new Date(parsed);
  }
  return new Date();
};

const formatWithIntl = (
  value: Date | string | number | undefined,
  locale: string,
  timeZone: string,
  options?: Intl.DateTimeFormatOptions,
): string => {
  try {
    const date = normalizeInputDate(value);
    return new Intl.DateTimeFormat(locale, { timeZone, ...options }).format(date);
  } catch (error) {
    console.warn('[useAppDateTime] Failed to format date:', error);
    return normalizeInputDate(value).toISOString();
  }
};

export function useAppDateTime(initialSettings?: Partial<AppDateTimeSettings>): UseAppDateTimeReturn {
  const [settings, setSettings] = useState<AppDateTimeSettings>({
    ...DEFAULT_SETTINGS,
    ...initialSettings,
  });

  const setTimeZone = useCallback((timeZone: string) => {
    setSettings((prev) => {
      if (!timeZone) {
        console.warn('[useAppDateTime] Ignoring empty timeZone');
        return prev;
      }
      return { ...prev, timeZone };
    });
    // TODO: Persist to local DB / store config.
  }, []);

  const setLocale = useCallback((locale: string) => {
    setSettings((prev) => {
      if (!locale) {
        console.warn('[useAppDateTime] Ignoring empty locale');
        return prev;
      }
      return { ...prev, locale };
    });
    // TODO: Persist to local DB / store config.
  }, []);

  const formatDateTime = useCallback(
    (value?: Date | string | number, options?: Intl.DateTimeFormatOptions) =>
      formatWithIntl(value, settings.locale, settings.timeZone, {
        ...DEFAULT_DATETIME_OPTIONS,
        ...options,
      }),
    [settings.locale, settings.timeZone],
  );

  const formatDate = useCallback(
    (value?: Date | string | number, options?: Intl.DateTimeFormatOptions) =>
      formatWithIntl(value, settings.locale, settings.timeZone, {
        ...DEFAULT_DATE_OPTIONS,
        ...options,
      }),
    [settings.locale, settings.timeZone],
  );

  const formatTime = useCallback(
    (value?: Date | string | number, options?: Intl.DateTimeFormatOptions) =>
      formatWithIntl(value, settings.locale, settings.timeZone, {
        ...DEFAULT_TIME_OPTIONS,
        ...options,
      }),
    [settings.locale, settings.timeZone],
  );

  const getNow = useCallback(() => new Date(), []);

  return useMemo(
    () => ({
      settings,
      setTimeZone,
      setLocale,
      formatDateTime,
      formatDate,
      formatTime,
      getNow,
    }),
    [settings, setTimeZone, setLocale, formatDateTime, formatDate, formatTime, getNow],
  );
}

export default useAppDateTime;

