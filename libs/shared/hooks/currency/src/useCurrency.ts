import { useEffect, useState, useCallback } from 'react';

export type Currency = 'USD' | 'EUR' | 'GBP' | 'PKR' | 'INR' | 'CAD' | 'AUD';

export interface CurrencyConfig {
  code: Currency;
  symbol: string;
  name: string;
  decimalPlaces: number;
  symbolPosition: 'before' | 'after';
  thousandsSeparator: string;
  decimalSeparator: string;
}

const CURRENCY_CONFIGS: Record<Currency, CurrencyConfig> = {
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    decimalPlaces: 2,
    symbolPosition: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.',
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    decimalPlaces: 2,
    symbolPosition: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.',
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    decimalPlaces: 2,
    symbolPosition: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.',
  },
  PKR: {
    code: 'PKR',
    symbol: '₨',
    name: 'Pakistani Rupee',
    decimalPlaces: 2,
    symbolPosition: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.',
  },
  INR: {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    decimalPlaces: 2,
    symbolPosition: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.',
  },
  CAD: {
    code: 'CAD',
    symbol: 'C$',
    name: 'Canadian Dollar',
    decimalPlaces: 2,
    symbolPosition: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.',
  },
  AUD: {
    code: 'AUD',
    symbol: 'A$',
    name: 'Australian Dollar',
    decimalPlaces: 2,
    symbolPosition: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.',
  },
};

interface UseCurrencyOptions {
  defaultCurrency?: Currency;
  localStorageKey?: string;
}

export interface UseCurrencyReturn {
  currency: Currency;
  currencyConfig: CurrencyConfig;
  setCurrency: (currency: Currency) => void;
  formatAmount: (amount: number | string, options?: FormatOptions) => string;
  parseAmount: (formattedAmount: string) => number;
  symbol: string;
  getAllCurrencies: () => CurrencyConfig[];
}

export interface FormatOptions {
  showSymbol?: boolean;
  showCode?: boolean;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

export function useCurrency(options: UseCurrencyOptions = {}): UseCurrencyReturn {
  const {
    defaultCurrency = 'USD',
    localStorageKey = 'app-currency',
  } = options;

  const [currency, setCurrencyState] = useState<Currency>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(localStorageKey);
      if (stored && stored in CURRENCY_CONFIGS) {
        return stored as Currency;
      }
    }
    return defaultCurrency;
  });

  const currencyConfig = CURRENCY_CONFIGS[currency];

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(localStorageKey, currency);
    }
  }, [currency, localStorageKey]);

  const setCurrency = useCallback((newCurrency: Currency) => {
    if (newCurrency in CURRENCY_CONFIGS) {
      setCurrencyState(newCurrency);
    } else {
      console.warn(`Invalid currency code: ${newCurrency}`);
    }
  }, []);

  const formatAmount = useCallback(
    (amount: number | string, formatOptions: FormatOptions = {}): string => {
      const {
        showSymbol = true,
        showCode = false,
        minimumFractionDigits = currencyConfig.decimalPlaces,
        maximumFractionDigits = currencyConfig.decimalPlaces,
      } = formatOptions;

      const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

      if (isNaN(numericAmount)) {
        return showSymbol ? `${currencyConfig.symbol}0.00` : '0.00';
      }

      const parts = numericAmount.toFixed(maximumFractionDigits).split('.');
      const integerPart = parts[0];
      const decimalPart = parts[1] || '';

      const formattedInteger = integerPart.replace(
        /\B(?=(\d{3})+(?!\d))/g,
        currencyConfig.thousandsSeparator
      );

      let formattedAmount = formattedInteger;
      if (minimumFractionDigits > 0 || decimalPart) {
        formattedAmount += currencyConfig.decimalSeparator +
          decimalPart.padEnd(minimumFractionDigits, '0');
      }

      if (showSymbol && showCode) {
        return currencyConfig.symbolPosition === 'before'
          ? `${currencyConfig.symbol}${formattedAmount} ${currency}`
          : `${formattedAmount}${currencyConfig.symbol} ${currency}`;
      } else if (showSymbol) {
        return currencyConfig.symbolPosition === 'before'
          ? `${currencyConfig.symbol}${formattedAmount}`
          : `${formattedAmount}${currencyConfig.symbol}`;
      } else if (showCode) {
        return `${formattedAmount} ${currency}`;
      }

      return formattedAmount;
    },
    [currency, currencyConfig]
  );

  const parseAmount = useCallback(
    (formattedAmount: string): number => {
      const cleaned = formattedAmount
        .replace(new RegExp(`\\${currencyConfig.symbol}`, 'g'), '')
        .replace(new RegExp(currency, 'g'), '')
        .replace(new RegExp(`\\${currencyConfig.thousandsSeparator}`, 'g'), '')
        .replace(new RegExp(`\\${currencyConfig.decimalSeparator}`, 'g'), '.')
        .trim();

      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    },
    [currency, currencyConfig]
  );

  const getAllCurrencies = useCallback((): CurrencyConfig[] => {
    return Object.values(CURRENCY_CONFIGS);
  }, []);

  return {
    currency,
    currencyConfig,
    setCurrency,
    formatAmount,
    parseAmount,
    symbol: currencyConfig.symbol,
    getAllCurrencies,
  };
}

export { CURRENCY_CONFIGS };
