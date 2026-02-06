export * from './Colors';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://drivebyafrica.com';

export const ITEMS_PER_PAGE = 20;

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  XAF: 'FCFA',
  NGN: '₦',
};
