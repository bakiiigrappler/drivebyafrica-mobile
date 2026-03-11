/**
 * Currency management for DriveBy Africa mobile app
 * All prices are stored in USD and converted to local currency on display
 */

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  rateToUsd: number;
  countries: string[];
}

// Complete list of all African currencies with fallback rates
export const CURRENCIES: CurrencyInfo[] = [
  // Base currencies
  { code: 'USD', name: 'Dollar américain', symbol: '$', rateToUsd: 1, countries: ['USA', 'RD Congo', 'Angola', 'Zimbabwe'] },
  { code: 'EUR', name: 'Euro', symbol: '€', rateToUsd: 0.92, countries: ['France', 'Belgique', 'Réunion', 'Mayotte'] },

  // Zone Franc CFA BEAC (Afrique Centrale)
  { code: 'XAF', name: 'Franc CFA BEAC', symbol: 'FCFA', rateToUsd: 630, countries: ['Cameroun', 'Gabon', 'Congo', 'Centrafrique', 'Tchad', 'Guinée Équatoriale'] },

  // Zone Franc CFA BCEAO (Afrique de l'Ouest)
  { code: 'XOF', name: 'Franc CFA BCEAO', symbol: 'FCFA', rateToUsd: 630, countries: ['Sénégal', 'Mali', 'Burkina Faso', 'Bénin', 'Togo', 'Niger', "Côte d'Ivoire", 'Guinée-Bissau'] },

  // Afrique de l'Ouest
  { code: 'NGN', name: 'Naira nigérian', symbol: '₦', rateToUsd: 1550, countries: ['Nigeria'] },
  { code: 'GHS', name: 'Cedi ghanéen', symbol: 'GH₵', rateToUsd: 15.5, countries: ['Ghana'] },
  { code: 'GNF', name: 'Franc guinéen', symbol: 'FG', rateToUsd: 8600, countries: ['Guinée'] },
  { code: 'SLE', name: 'Leone sierra-léonais', symbol: 'Le', rateToUsd: 22.5, countries: ['Sierra Leone'] },
  { code: 'LRD', name: 'Dollar libérien', symbol: 'L$', rateToUsd: 192, countries: ['Liberia'] },
  { code: 'GMD', name: 'Dalasi gambien', symbol: 'D', rateToUsd: 67, countries: ['Gambie'] },
  { code: 'MRU', name: 'Ouguiya mauritanien', symbol: 'UM', rateToUsd: 39.5, countries: ['Mauritanie'] },
  { code: 'CVE', name: 'Escudo cap-verdien', symbol: '$', rateToUsd: 103, countries: ['Cap-Vert'] },

  // Afrique Centrale
  { code: 'CDF', name: 'Franc congolais', symbol: 'FC', rateToUsd: 2800, countries: ['RD Congo'] },
  { code: 'AOA', name: 'Kwanza angolais', symbol: 'Kz', rateToUsd: 830, countries: ['Angola'] },
  { code: 'STN', name: 'Dobra santoméen', symbol: 'Db', rateToUsd: 23, countries: ['São Tomé-et-Príncipe'] },

  // Afrique de l'Est
  { code: 'KES', name: 'Shilling kényan', symbol: 'KSh', rateToUsd: 154, countries: ['Kenya'] },
  { code: 'TZS', name: 'Shilling tanzanien', symbol: 'TSh', rateToUsd: 2640, countries: ['Tanzanie'] },
  { code: 'UGX', name: 'Shilling ougandais', symbol: 'USh', rateToUsd: 3750, countries: ['Ouganda'] },
  { code: 'RWF', name: 'Franc rwandais', symbol: 'FRw', rateToUsd: 1280, countries: ['Rwanda'] },
  { code: 'BIF', name: 'Franc burundais', symbol: 'FBu', rateToUsd: 2850, countries: ['Burundi'] },
  { code: 'ETB', name: 'Birr éthiopien', symbol: 'Br', rateToUsd: 56.5, countries: ['Éthiopie'] },
  { code: 'DJF', name: 'Franc djiboutien', symbol: 'Fdj', rateToUsd: 178, countries: ['Djibouti'] },
  { code: 'ERN', name: 'Nakfa érythréen', symbol: 'Nkf', rateToUsd: 15, countries: ['Érythrée'] },
  { code: 'SOS', name: 'Shilling somalien', symbol: 'Sh.So.', rateToUsd: 571, countries: ['Somalie'] },
  { code: 'SSP', name: 'Livre sud-soudanaise', symbol: 'SSP', rateToUsd: 1300, countries: ['Soudan du Sud'] },

  // Afrique du Nord
  { code: 'MAD', name: 'Dirham marocain', symbol: 'DH', rateToUsd: 10.1, countries: ['Maroc'] },
  { code: 'DZD', name: 'Dinar algérien', symbol: 'DA', rateToUsd: 135, countries: ['Algérie'] },
  { code: 'TND', name: 'Dinar tunisien', symbol: 'DT', rateToUsd: 3.15, countries: ['Tunisie'] },
  { code: 'LYD', name: 'Dinar libyen', symbol: 'LD', rateToUsd: 4.85, countries: ['Libye'] },
  { code: 'EGP', name: 'Livre égyptienne', symbol: 'E£', rateToUsd: 50.5, countries: ['Égypte'] },
  { code: 'SDG', name: 'Livre soudanaise', symbol: 'SDG', rateToUsd: 600, countries: ['Soudan'] },

  // Afrique Australe
  { code: 'ZAR', name: 'Rand sud-africain', symbol: 'R', rateToUsd: 18.5, countries: ['Afrique du Sud', 'Eswatini', 'Lesotho', 'Namibie'] },
  { code: 'BWP', name: 'Pula botswanais', symbol: 'P', rateToUsd: 13.7, countries: ['Botswana'] },
  { code: 'MZN', name: 'Metical mozambicain', symbol: 'MT', rateToUsd: 63.5, countries: ['Mozambique'] },
  { code: 'ZMW', name: 'Kwacha zambien', symbol: 'ZK', rateToUsd: 27, countries: ['Zambie'] },
  { code: 'MWK', name: 'Kwacha malawien', symbol: 'MK', rateToUsd: 1750, countries: ['Malawi'] },
  { code: 'ZWG', name: 'Dollar zimbabwéen ZiG', symbol: 'ZiG', rateToUsd: 13.5, countries: ['Zimbabwe'] },
  { code: 'NAD', name: 'Dollar namibien', symbol: 'N$', rateToUsd: 18.5, countries: ['Namibie'] },
  { code: 'SZL', name: 'Lilangeni swazi', symbol: 'E', rateToUsd: 18.5, countries: ['Eswatini'] },
  { code: 'LSL', name: 'Loti lesothan', symbol: 'L', rateToUsd: 18.5, countries: ['Lesotho'] },

  // Îles de l'Océan Indien
  { code: 'MGA', name: 'Ariary malgache', symbol: 'Ar', rateToUsd: 4650, countries: ['Madagascar'] },
  { code: 'MUR', name: 'Roupie mauricienne', symbol: 'Rs', rateToUsd: 46, countries: ['Maurice'] },
  { code: 'SCR', name: 'Roupie seychelloise', symbol: 'SCR', rateToUsd: 14.5, countries: ['Seychelles'] },
  { code: 'KMF', name: 'Franc comorien', symbol: 'CF', rateToUsd: 460, countries: ['Comores'] },
];

// Build rate map for quick lookup
const RATE_MAP: Record<string, number> = {};
const CURRENCY_MAP: Record<string, CurrencyInfo> = {};
CURRENCIES.forEach(c => {
  RATE_MAP[c.code] = c.rateToUsd;
  CURRENCY_MAP[c.code] = c;
});

// Dynamic rates storage (fetched from API)
let dynamicRates: Record<string, number> | null = null;

/**
 * Set dynamic exchange rates from API
 */
export function setDynamicRates(rates: Record<string, number>) {
  dynamicRates = rates;
}

/**
 * Get dynamic rates
 */
export function getDynamicRates(): Record<string, number> | null {
  return dynamicRates;
}

/**
 * Get currency info by code
 */
export function getCurrencyInfo(code: string): CurrencyInfo | undefined {
  return CURRENCY_MAP[code];
}

/**
 * Get all available currencies
 */
export function getAllCurrencies(): CurrencyInfo[] {
  return CURRENCIES;
}

/**
 * Get the current exchange rate for a currency
 * Uses dynamic rates if available, falls back to defaults
 */
export function getRate(currency: string): number {
  if (dynamicRates && dynamicRates[currency] !== undefined) {
    return dynamicRates[currency];
  }
  return RATE_MAP[currency] || 1;
}

/**
 * Format number with proper thousand separators (spaces)
 */
function formatWithSpaces(num: number): string {
  return Math.round(num)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Format a price in a specific currency
 */
export function formatCurrency(amount: number, currency: string = 'XAF'): string {
  // XAF/XOF use "FCFA" suffix
  if (currency === 'XAF' || currency === 'XOF') {
    return `${formatWithSpaces(amount)} FCFA`;
  }

  // NGN - symbol prefix
  if (currency === 'NGN') {
    return `₦${formatWithSpaces(amount)}`;
  }

  // USD - dollar prefix
  if (currency === 'USD') {
    return `$${formatWithSpaces(amount)}`;
  }

  // EUR - symbol suffix
  if (currency === 'EUR') {
    return `${formatWithSpaces(amount)} €`;
  }

  // GHS - Cedi prefix
  if (currency === 'GHS') {
    return `GH₵${formatWithSpaces(amount)}`;
  }

  // KES - Shilling prefix
  if (currency === 'KES') {
    return `KSh ${formatWithSpaces(amount)}`;
  }

  // ZAR - Rand prefix
  if (currency === 'ZAR') {
    return `R ${formatWithSpaces(amount)}`;
  }

  // MAD - Dirham suffix
  if (currency === 'MAD') {
    return `${formatWithSpaces(amount)} DH`;
  }

  // EGP - Pound prefix
  if (currency === 'EGP') {
    return `E£${formatWithSpaces(amount)}`;
  }

  // MGA - Ariary suffix
  if (currency === 'MGA') {
    return `${formatWithSpaces(amount)} Ar`;
  }

  // Default - currency code suffix
  return `${formatWithSpaces(amount)} ${currency}`;
}

/**
 * Convert USD amount to local currency
 */
export function convertFromUsd(amountUsd: number, targetCurrency: string): number {
  const rate = getRate(targetCurrency);
  return amountUsd * rate;
}

/**
 * Convert local currency to USD
 */
export function convertToUsd(amount: number, fromCurrency: string): number {
  const rate = getRate(fromCurrency);
  return amount / rate;
}

/**
 * Format USD amount in local currency
 */
export function formatUsdToLocal(amountUsd: number, targetCurrency: string = 'XAF'): string {
  const converted = convertFromUsd(amountUsd, targetCurrency);
  return formatCurrency(converted, targetCurrency);
}

/**
 * Format USD to local currency with abbreviated format (1M, 500K)
 * Useful for compact display in filters
 */
export function formatUsdToLocalShort(amountUsd: number, targetCurrency: string = 'XAF'): string {
  const converted = convertFromUsd(amountUsd, targetCurrency);

  if (converted >= 1_000_000_000) {
    const billions = converted / 1_000_000_000;
    const formatted = billions % 1 === 0 ? billions.toString() : billions.toFixed(1);
    return `${formatted}B`;
  }

  if (converted >= 1_000_000) {
    const millions = converted / 1_000_000;
    const formatted = millions % 1 === 0 ? millions.toString() : millions.toFixed(1);
    return `${formatted}M`;
  }

  if (converted >= 1_000) {
    const thousands = converted / 1_000;
    const formatted = thousands % 1 === 0 ? thousands.toString() : thousands.toFixed(0);
    return `${formatted}K`;
  }

  return Math.round(converted).toString();
}

/**
 * Get the default currency for a country
 */
export function getDefaultCurrencyForCountry(country: string): string {
  const normalized = country.toLowerCase().trim();

  // Map common country names to currencies
  const countryToCurrency: Record<string, string> = {
    'gabon': 'XAF',
    'cameroun': 'XAF',
    'cameroon': 'XAF',
    'congo': 'XAF',
    'centrafrique': 'XAF',
    'tchad': 'XAF',
    'chad': 'XAF',
    'guinée équatoriale': 'XAF',
    'equatorial guinea': 'XAF',
    'sénégal': 'XOF',
    'senegal': 'XOF',
    'mali': 'XOF',
    'burkina faso': 'XOF',
    'bénin': 'XOF',
    'benin': 'XOF',
    'togo': 'XOF',
    'niger': 'XOF',
    "côte d'ivoire": 'XOF',
    'ivory coast': 'XOF',
    'guinée-bissau': 'XOF',
    'guinea-bissau': 'XOF',
    'nigeria': 'NGN',
    'ghana': 'GHS',
    'guinée': 'GNF',
    'guinea': 'GNF',
    'kenya': 'KES',
    'tanzanie': 'TZS',
    'tanzania': 'TZS',
    'ouganda': 'UGX',
    'uganda': 'UGX',
    'rwanda': 'RWF',
    'burundi': 'BIF',
    'éthiopie': 'ETB',
    'ethiopia': 'ETB',
    'maroc': 'MAD',
    'morocco': 'MAD',
    'algérie': 'DZD',
    'algeria': 'DZD',
    'tunisie': 'TND',
    'tunisia': 'TND',
    'égypte': 'EGP',
    'egypt': 'EGP',
    'afrique du sud': 'ZAR',
    'south africa': 'ZAR',
    'madagascar': 'MGA',
    'maurice': 'MUR',
    'mauritius': 'MUR',
    'rd congo': 'CDF',
    'drc': 'CDF',
    'angola': 'AOA',
    'mozambique': 'MZN',
    'zambie': 'ZMW',
    'zambia': 'ZMW',
    'zimbabwe': 'ZWG',
  };

  return countryToCurrency[normalized] || 'XAF';
}

/**
 * Currencies accepted for official quotes
 * Other currencies will generate quotes in USD
 */
export const QUOTE_CURRENCIES = ['USD', 'EUR', 'XAF'];

/**
 * Check if a currency can be used for official quotes
 */
export function isQuoteCurrency(currency: string): boolean {
  return QUOTE_CURRENCIES.includes(currency);
}

/**
 * Get the display currency for quotes
 * Returns the currency if it's a quote currency, otherwise USD
 */
export function getQuoteCurrency(userCurrency: string): string {
  return isQuoteCurrency(userCurrency) ? userCurrency : 'USD';
}
