/**
 * Hook for currency conversion and formatting
 * Uses user's currency preference from settings store
 */

import { useCallback, useEffect, useMemo } from 'react';
import { useSettingsStore } from '@/store';
import {
  formatCurrency,
  formatUsdToLocal,
  formatUsdToLocalShort,
  convertFromUsd,
  convertToUsd,
  getRate,
  getCurrencyInfo,
  getAllCurrencies,
  isQuoteCurrency,
  getQuoteCurrency,
  setDynamicRates,
  QUOTE_CURRENCIES,
  type CurrencyInfo,
} from '@/lib/currency';
import { getExportTax, getEffectiveVehiclePrice } from '@/lib/pricing';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';

// Cache for API rates
let ratesLastFetched: number = 0;
const RATES_CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours
let fetchAttempted = false;

/**
 * Fetch exchange rates from API
 * Silently fails and uses default rates if API is unavailable
 */
async function fetchRates(): Promise<Record<string, number> | null> {
  // Skip if no valid credentials
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null;
  }

  // Only attempt fetch once per session to avoid repeated errors
  if (fetchAttempted) {
    return null;
  }
  fetchAttempted = true;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/currency_rates?is_active=eq.true&select=currency_code,rate_to_usd`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      // Table might not exist, silently use defaults
      return null;
    }

    const data = await response.json();

    // Validate response is an array
    if (!Array.isArray(data)) {
      return null;
    }

    const rates: Record<string, number> = {};
    data.forEach((c: { currency_code: string; rate_to_usd: number }) => {
      if (c.currency_code && c.rate_to_usd) {
        rates[c.currency_code] = Number(c.rate_to_usd);
      }
    });

    // Reset flag on success so we can refresh later
    if (Object.keys(rates).length > 0) {
      fetchAttempted = false;
    }

    return Object.keys(rates).length > 0 ? rates : null;
  } catch {
    // Silently fail - will use default rates from lib/currency.ts
    return null;
  }
}

export function useCurrency() {
  const currency = useSettingsStore((s) => s.currency);
  const setCurrency = useSettingsStore((s) => s.setCurrency);

  // Fetch rates on mount if cache is stale
  useEffect(() => {
    const now = Date.now();
    if (now - ratesLastFetched > RATES_CACHE_DURATION) {
      fetchRates().then((rates) => {
        if (rates) {
          setDynamicRates(rates);
          ratesLastFetched = now;
        }
      });
    }
  }, []);

  // Get current currency info
  const currencyInfo = useMemo(() => getCurrencyInfo(currency), [currency]);

  // Get current rate
  const rate = useMemo(() => getRate(currency), [currency]);

  // Format a price in USD to local currency
  const formatPrice = useCallback(
    (amountUsd: number) => formatUsdToLocal(amountUsd, currency),
    [currency]
  );

  // Format a price in USD to local currency (short format for filters)
  const formatPriceShort = useCallback(
    (amountUsd: number) => formatUsdToLocalShort(amountUsd, currency),
    [currency]
  );

  // Format a local currency amount
  const formatLocal = useCallback(
    (amount: number) => formatCurrency(amount, currency),
    [currency]
  );

  // Convert USD to local currency
  const convertToLocal = useCallback(
    (amountUsd: number) => convertFromUsd(amountUsd, currency),
    [currency]
  );

  // Convert local currency to USD
  const convertToUSD = useCallback(
    (amount: number) => convertToUsd(amount, currency),
    [currency]
  );

  // Get the effective vehicle price (including export tax) in USD
  const getVehiclePriceUsd = useCallback(
    (priceUsd: number, source: string) => getEffectiveVehiclePrice(priceUsd, source),
    []
  );

  // Format vehicle price including export tax
  const formatVehiclePrice = useCallback(
    (priceUsd: number, source: string) => {
      const effectivePrice = getEffectiveVehiclePrice(priceUsd, source);
      return formatUsdToLocal(effectivePrice, currency);
    },
    [currency]
  );

  // Format vehicle price in short format including export tax
  const formatVehiclePriceShort = useCallback(
    (priceUsd: number, source: string) => {
      const effectivePrice = getEffectiveVehiclePrice(priceUsd, source);
      return formatUsdToLocalShort(effectivePrice, currency);
    },
    [currency]
  );

  // Get export tax for a source
  const getExportTaxAmount = useCallback(
    (source: string) => getExportTax(source),
    []
  );

  // Format export tax in local currency
  const formatExportTax = useCallback(
    (source: string) => {
      const tax = getExportTax(source);
      if (tax === 0) return null;
      return formatUsdToLocal(tax, currency);
    },
    [currency]
  );

  // Check if current currency can be used for quotes
  const canUseForQuotes = useMemo(() => isQuoteCurrency(currency), [currency]);

  // Get the currency to use for quotes
  const quoteCurrency = useMemo(() => getQuoteCurrency(currency), [currency]);

  // Format price for quotes (uses quote currency)
  const formatQuotePrice = useCallback(
    (amountUsd: number) => formatUsdToLocal(amountUsd, quoteCurrency),
    [quoteCurrency]
  );

  return {
    // Current state
    currency,
    currencyInfo,
    rate,
    setCurrency,

    // Formatting
    formatPrice,
    formatPriceShort,
    formatLocal,
    formatVehiclePrice,
    formatVehiclePriceShort,
    formatExportTax,
    formatQuotePrice,

    // Conversion
    convertToLocal,
    convertToUSD,
    getVehiclePriceUsd,
    getExportTaxAmount,

    // Quote info
    canUseForQuotes,
    quoteCurrency,
    quoteCurrencies: QUOTE_CURRENCIES,

    // Helpers
    getAllCurrencies,
    getCurrencyInfo,
  };
}

// Re-export types
export type { CurrencyInfo };
