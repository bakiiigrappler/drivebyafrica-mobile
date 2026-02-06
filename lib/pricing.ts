/**
 * Pricing constants and utilities for vehicle imports
 */

// Fixed fees
export const INSURANCE_RATE = 0.025; // 2.5% cargo insurance
export const INSPECTION_FEE_XAF = 225000; // 225,000 FCFA for inspection and documents
export const INSPECTION_FEE_USD = 350; // ~350 USD for inspection and documents

// XAF to USD rate
export const XAF_RATE = 615;

// Export taxes by source country (in USD)
export const EXPORT_TAX_USD: Record<string, number> = {
  china: 980, // China export tax: 980 USD
  korea: 0,
  dubai: 0,
};

// Shipping type multipliers
export const SHIPPING_MULTIPLIERS = {
  container: 1,    // Full container
  groupage: 0.5,   // Shared container (50% of shipping cost)
};

// Shipping destinations with costs by source
export interface ShippingDestination {
  id: string;
  name: string;
  country: string;
  flag: string;
  shippingCost: {
    korea: number;
    china: number;
    dubai: number;
  };
}

// Default shipping destinations (fallback if API fails)
export const DEFAULT_DESTINATIONS: ShippingDestination[] = [
  { id: 'dakar', name: 'Dakar', country: 'Sénégal', flag: '🇸🇳', shippingCost: { korea: 4600, china: 5200, dubai: 4200 } },
  { id: 'abidjan', name: 'Abidjan', country: 'Côte d\'Ivoire', flag: '🇨🇮', shippingCost: { korea: 4500, china: 5000, dubai: 4100 } },
  { id: 'lagos', name: 'Lagos', country: 'Nigeria', flag: '🇳🇬', shippingCost: { korea: 4400, china: 4900, dubai: 4000 } },
  { id: 'douala', name: 'Douala', country: 'Cameroun', flag: '🇨🇲', shippingCost: { korea: 4300, china: 4800, dubai: 3900 } },
  { id: 'libreville', name: 'Libreville', country: 'Gabon', flag: '🇬🇦', shippingCost: { korea: 4400, china: 4900, dubai: 4000 } },
  { id: 'pointe-noire', name: 'Pointe-Noire', country: 'Congo', flag: '🇨🇬', shippingCost: { korea: 4500, china: 5000, dubai: 4100 } },
  { id: 'mombasa', name: 'Mombasa', country: 'Kenya', flag: '🇰🇪', shippingCost: { korea: 3800, china: 4300, dubai: 3200 } },
  { id: 'dar-es-salaam', name: 'Dar es Salaam', country: 'Tanzanie', flag: '🇹🇿', shippingCost: { korea: 3900, china: 4400, dubai: 3300 } },
  { id: 'durban', name: 'Durban', country: 'Afrique du Sud', flag: '🇿🇦', shippingCost: { korea: 4200, china: 4700, dubai: 3600 } },
  { id: 'tema', name: 'Tema', country: 'Ghana', flag: '🇬🇭', shippingCost: { korea: 4500, china: 5000, dubai: 4100 } },
  { id: 'cotonou', name: 'Cotonou', country: 'Bénin', flag: '🇧🇯', shippingCost: { korea: 4400, china: 4900, dubai: 4000 } },
  { id: 'lome', name: 'Lomé', country: 'Togo', flag: '🇹🇬', shippingCost: { korea: 4450, china: 4950, dubai: 4050 } },
  { id: 'conakry', name: 'Conakry', country: 'Guinée', flag: '🇬🇳', shippingCost: { korea: 4700, china: 5200, dubai: 4300 } },
  { id: 'banjul', name: 'Banjul', country: 'Gambie', flag: '🇬🇲', shippingCost: { korea: 4650, china: 5150, dubai: 4250 } },
];

/**
 * Get the export tax for a vehicle source
 */
export function getExportTax(source: string): number {
  return EXPORT_TAX_USD[source] || 0;
}

/**
 * Get the effective vehicle price including export tax
 */
export function getEffectiveVehiclePrice(priceUSD: number, source: string): number {
  return priceUSD + getExportTax(source);
}

/**
 * Calculate all import costs for a vehicle
 */
export interface ImportCostCalculation {
  vehiclePriceUSD: number;
  exportTaxUSD: number;
  effectivePriceUSD: number;
  vehiclePriceXAF: number;
  exportTaxXAF: number;
  shippingCostXAF: number;
  insuranceCostXAF: number;
  inspectionFeeXAF: number;
  totalXAF: number;
  totalUSD: number;
}

export function calculateImportCosts(params: {
  vehiclePriceUSD: number;
  vehicleSource: string;
  shippingCostUSD: number;
  xafRate?: number;
  shippingMultiplier?: number;
}): ImportCostCalculation {
  const {
    vehiclePriceUSD,
    vehicleSource,
    shippingCostUSD,
    xafRate = XAF_RATE,
    shippingMultiplier = 1,
  } = params;

  // Export tax (only for China)
  const exportTaxUSD = getExportTax(vehicleSource);
  const effectivePriceUSD = vehiclePriceUSD + exportTaxUSD;

  // Convert to XAF
  const vehiclePriceXAF = vehiclePriceUSD * xafRate;
  const exportTaxXAF = exportTaxUSD * xafRate;
  const adjustedShippingCostUSD = shippingCostUSD * shippingMultiplier;
  const shippingCostXAF = adjustedShippingCostUSD * xafRate;

  // Insurance: 2.5% of (vehicle price + export tax + shipping)
  const insuranceCostXAF = (vehiclePriceXAF + exportTaxXAF + shippingCostXAF) * INSURANCE_RATE;
  const inspectionFeeXAF = INSPECTION_FEE_XAF;

  // Total
  const totalXAF = vehiclePriceXAF + exportTaxXAF + shippingCostXAF + insuranceCostXAF + inspectionFeeXAF;
  const totalUSD = Math.round(totalXAF / xafRate);

  return {
    vehiclePriceUSD,
    exportTaxUSD,
    effectivePriceUSD,
    vehiclePriceXAF: Math.round(vehiclePriceXAF),
    exportTaxXAF: Math.round(exportTaxXAF),
    shippingCostXAF: Math.round(shippingCostXAF),
    insuranceCostXAF: Math.round(insuranceCostXAF),
    inspectionFeeXAF: Math.round(inspectionFeeXAF),
    totalXAF: Math.round(totalXAF),
    totalUSD,
  };
}

/**
 * Format a number as FCFA currency
 */
export function formatFCFA(amount: number): string {
  return Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';
}

/**
 * Format a number as USD currency
 */
export function formatUSD(amount: number): string {
  return '$' + Math.round(amount).toLocaleString();
}

/**
 * Generate a unique quote number
 */
export function generateQuoteNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `DBA-${timestamp}-${random}`;
}
