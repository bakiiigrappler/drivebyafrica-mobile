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

// Deposit amounts
export const DEPOSIT_PER_VEHICLE_USD = 1000;
export const DEPOSIT_PER_VEHICLE_XAF = 600000;

// Shipping type multipliers
export const SHIPPING_MULTIPLIERS = {
  container: 1,    // Full container
  groupage: 0.5,   // Shared container (50% of shipping cost)
};

// Shipping cost by source country
interface ShippingCostBySource {
  korea: number;
  china: number;
  dubai: number;
}

// Shipping destinations with costs by source
export interface ShippingDestination {
  id: string;
  name: string;
  country: string;
  flag: string;
  shippingCost: ShippingCostBySource;       // 20HQ container
  shippingCost40ft: ShippingCostBySource;   // 40HQ container
  shippingCostRoro: ShippingCostBySource;   // RORO
  shippingCostFlatRack: ShippingCostBySource; // Flat Rack
}

// Zero cost placeholder for roro/flat_rack (real values come from API)
const ZERO_COST: ShippingCostBySource = { korea: 0, china: 0, dubai: 0 };

// Default shipping destinations (fallback if API fails)
export const DEFAULT_DESTINATIONS: ShippingDestination[] = [
  { id: 'dakar', name: 'Dakar', country: 'Sénégal', flag: '🇸🇳', shippingCost: { korea: 4600, china: 5200, dubai: 4200 }, shippingCost40ft: { korea: 7400, china: 8300, dubai: 6700 }, shippingCostRoro: ZERO_COST, shippingCostFlatRack: ZERO_COST },
  { id: 'abidjan', name: 'Abidjan', country: 'Côte d\'Ivoire', flag: '🇨🇮', shippingCost: { korea: 4500, china: 5000, dubai: 4100 }, shippingCost40ft: { korea: 7200, china: 8000, dubai: 6600 }, shippingCostRoro: ZERO_COST, shippingCostFlatRack: ZERO_COST },
  { id: 'lagos', name: 'Lagos', country: 'Nigeria', flag: '🇳🇬', shippingCost: { korea: 4400, china: 4900, dubai: 4000 }, shippingCost40ft: { korea: 7000, china: 7800, dubai: 6400 }, shippingCostRoro: ZERO_COST, shippingCostFlatRack: ZERO_COST },
  { id: 'douala', name: 'Douala', country: 'Cameroun', flag: '🇨🇲', shippingCost: { korea: 4300, china: 4800, dubai: 3900 }, shippingCost40ft: { korea: 6900, china: 7700, dubai: 6200 }, shippingCostRoro: ZERO_COST, shippingCostFlatRack: ZERO_COST },
  { id: 'libreville', name: 'Libreville', country: 'Gabon', flag: '🇬🇦', shippingCost: { korea: 4400, china: 4900, dubai: 4000 }, shippingCost40ft: { korea: 7000, china: 7800, dubai: 6400 }, shippingCostRoro: ZERO_COST, shippingCostFlatRack: ZERO_COST },
  { id: 'pointe-noire', name: 'Pointe-Noire', country: 'Congo', flag: '🇨🇬', shippingCost: { korea: 4500, china: 5000, dubai: 4100 }, shippingCost40ft: { korea: 7200, china: 8000, dubai: 6600 }, shippingCostRoro: ZERO_COST, shippingCostFlatRack: ZERO_COST },
  { id: 'mombasa', name: 'Mombasa', country: 'Kenya', flag: '🇰🇪', shippingCost: { korea: 3800, china: 4300, dubai: 3200 }, shippingCost40ft: { korea: 6100, china: 6900, dubai: 5100 }, shippingCostRoro: ZERO_COST, shippingCostFlatRack: ZERO_COST },
  { id: 'dar-es-salaam', name: 'Dar es Salaam', country: 'Tanzanie', flag: '🇹🇿', shippingCost: { korea: 3900, china: 4400, dubai: 3300 }, shippingCost40ft: { korea: 6200, china: 7000, dubai: 5300 }, shippingCostRoro: ZERO_COST, shippingCostFlatRack: ZERO_COST },
  { id: 'durban', name: 'Durban', country: 'Afrique du Sud', flag: '🇿🇦', shippingCost: { korea: 4200, china: 4700, dubai: 3600 }, shippingCost40ft: { korea: 6700, china: 7500, dubai: 5800 }, shippingCostRoro: ZERO_COST, shippingCostFlatRack: ZERO_COST },
  { id: 'tema', name: 'Tema', country: 'Ghana', flag: '🇬🇭', shippingCost: { korea: 4500, china: 5000, dubai: 4100 }, shippingCost40ft: { korea: 7200, china: 8000, dubai: 6600 }, shippingCostRoro: ZERO_COST, shippingCostFlatRack: ZERO_COST },
  { id: 'cotonou', name: 'Cotonou', country: 'Bénin', flag: '🇧🇯', shippingCost: { korea: 4400, china: 4900, dubai: 4000 }, shippingCost40ft: { korea: 7000, china: 7800, dubai: 6400 }, shippingCostRoro: ZERO_COST, shippingCostFlatRack: ZERO_COST },
  { id: 'lome', name: 'Lomé', country: 'Togo', flag: '🇹🇬', shippingCost: { korea: 4450, china: 4950, dubai: 4050 }, shippingCost40ft: { korea: 7100, china: 7900, dubai: 6500 }, shippingCostRoro: ZERO_COST, shippingCostFlatRack: ZERO_COST },
  { id: 'conakry', name: 'Conakry', country: 'Guinée', flag: '🇬🇳', shippingCost: { korea: 4700, china: 5200, dubai: 4300 }, shippingCost40ft: { korea: 7500, china: 8300, dubai: 6900 }, shippingCostRoro: ZERO_COST, shippingCostFlatRack: ZERO_COST },
  { id: 'banjul', name: 'Banjul', country: 'Gambie', flag: '🇬🇲', shippingCost: { korea: 4650, china: 5150, dubai: 4250 }, shippingCost40ft: { korea: 7400, china: 8200, dubai: 6800 }, shippingCostRoro: ZERO_COST, shippingCostFlatRack: ZERO_COST },
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

/**
 * Calculate import costs for multiple vehicles sharing a 40ft container.
 * Vehicle prices are expected to include export tax (FOB).
 */
export interface MultiVehicleCostResult {
  vehicleCount: number;
  vehiclesTotalUSD: number;
  vehiclesTotalXAF: number;
  shippingCost40ftUSD: number;
  shippingCost40ftXAF: number;
  insuranceCostXAF: number;
  inspectionFeeTotalXAF: number;
  depositTotalUSD: number;
  depositTotalXAF: number;
  totalXAF: number;
  totalUSD: number;
  perVehicle: Array<{
    vehiclePriceUSD: number;
    vehiclePriceXAF: number;
    inspectionFeeXAF: number;
  }>;
}

export function calculateMultiVehicleImportCosts(params: {
  vehicles: Array<{ vehiclePriceUSD: number }>;
  shippingCost40ftUSD: number;
  xafRate?: number;
}): MultiVehicleCostResult {
  const { vehicles, shippingCost40ftUSD, xafRate = XAF_RATE } = params;
  const count = vehicles.length;

  const perVehicle = vehicles.map((v) => ({
    vehiclePriceUSD: v.vehiclePriceUSD,
    vehiclePriceXAF: Math.round(v.vehiclePriceUSD * xafRate),
    inspectionFeeXAF: INSPECTION_FEE_XAF,
  }));

  const vehiclesTotalUSD = vehicles.reduce((s, v) => s + v.vehiclePriceUSD, 0);
  const vehiclesTotalXAF = Math.round(vehiclesTotalUSD * xafRate);
  const shippingCost40ftXAF = Math.round(shippingCost40ftUSD * xafRate);
  const inspectionFeeTotalXAF = INSPECTION_FEE_XAF * count;

  // Insurance: 2.5% of (vehicles FOB + shipping)
  const insuranceCostXAF = Math.round((vehiclesTotalXAF + shippingCost40ftXAF) * INSURANCE_RATE);

  const totalXAF = vehiclesTotalXAF + shippingCost40ftXAF + insuranceCostXAF + inspectionFeeTotalXAF;

  return {
    vehicleCount: count,
    vehiclesTotalUSD,
    vehiclesTotalXAF,
    shippingCost40ftUSD,
    shippingCost40ftXAF,
    insuranceCostXAF,
    inspectionFeeTotalXAF,
    depositTotalUSD: DEPOSIT_PER_VEHICLE_USD * count,
    depositTotalXAF: DEPOSIT_PER_VEHICLE_XAF * count,
    totalXAF,
    totalUSD: Math.round(totalXAF / xafRate),
    perVehicle,
  };
}
