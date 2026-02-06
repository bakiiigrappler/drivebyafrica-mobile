/**
 * Payment Service - E-Billing Integration
 * Le portail E-Billing gère le choix du mode de paiement (Mobile Money, Carte)
 */

// E-Billing Configuration (Production/Staging)
const EBILLING = {
  URL: 'https://stg.billing-easy.com/api/v1/merchant/e_bills',
  PORTAL: 'https://staging.billing-easy.net',
  USER: 'Sowax',
  KEY: 'ca492d78-cbeb-4513-9525-c23b8f0ce0c1',
};

// PHP Backend for transaction tracking
const BACKEND_URL = 'https://emoneygabon.alwaysdata.net/la-map-gabon/api/payment';

export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'expired';

export interface PaymentResult {
  billId: string;
  externalReference: string;
  portalUrl: string;
}

export interface PaymentStatusResult {
  completed: boolean;
  status: PaymentStatus;
  walletCredited?: boolean;
}

/**
 * Encode string to Base64 (React Native compatible)
 */
function base64Encode(str: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';

  for (let i = 0; i < str.length; i += 3) {
    const b1 = str.charCodeAt(i);
    const b2 = i + 1 < str.length ? str.charCodeAt(i + 1) : 0;
    const b3 = i + 2 < str.length ? str.charCodeAt(i + 2) : 0;

    output += chars[b1 >> 2] + chars[((b1 & 3) << 4) | (b2 >> 4)];
    output += i + 1 < str.length ? chars[((b2 & 15) << 2) | (b3 >> 6)] : '=';
    output += i + 2 < str.length ? chars[b3 & 63] : '=';
  }

  return output;
}

/**
 * Generate a unique external reference for DriveBy Africa
 * Format: DBA_timestamp_random
 */
function generateExternalReference(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `DBA_${timestamp}_${random}`;
}

/**
 * Format phone number for E-Billing API (241 country code for Gabon)
 */
function formatPhoneNumber(phone?: string): string {
  if (!phone) {
    return '24174000000'; // Default Gabon number
  }

  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');

  // If starts with +, remove it (already cleaned above)
  // If starts with 00, remove it
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }

  // If starts with 241, it's already formatted
  if (cleaned.startsWith('241')) {
    return cleaned;
  }

  // If starts with 0 (local format), replace with 241
  if (cleaned.startsWith('0')) {
    return '241' + cleaned.substring(1);
  }

  // Otherwise, assume it's a local number without leading 0
  return '241' + cleaned;
}

/**
 * Create a payment and get the portal URL for WebView
 * Flux: 1. init.php -> 2. E-Billing invoice -> 3. WebView
 */
export async function createPayment(
  userId: string,
  amount: number,
  description: string,
  userEmail?: string,
  phoneNumber?: string
): Promise<PaymentResult> {
  const formattedPhone = formatPhoneNumber(phoneNumber);
  const externalReference = generateExternalReference();

  // 1. Register transaction in PHP backend with our external_reference
  console.log('Step 1: Registering transaction in backend...');
  console.log('Generated external_reference:', externalReference);

  const initResponse = await fetch(`${BACKEND_URL}/init.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      amount: Math.round(amount),
      phone_number: formattedPhone,
      payment_system: 'ebilling',
      transaction_type: 'deposit',
      currency: 'XAF',
      description: description.substring(0, 100),
      external_reference: externalReference,
    }),
  });

  const initData = await initResponse.json();
  console.log('Backend init response:', initData);

  if (!initData.success) {
    throw new Error(initData.message || 'Erreur lors de l\'initialisation de la transaction');
  }

  const transactionId = initData.data?.mysql_id;
  console.log('Transaction registered:', { transactionId, externalReference });

  // 2. Create E-Billing invoice with the external_reference from backend
  console.log('Step 2: Creating E-Billing invoice...');

  const auth = `Basic ${base64Encode(`${EBILLING.USER}:${EBILLING.KEY}`)}`;

  const requestBody = {
    payer_email: userEmail || `user_${userId}@drivebyafrica.com`,
    payer_msisdn: formattedPhone,
    amount: Math.round(amount),
    short_description: description.substring(0, 100),
    external_reference: externalReference,
    payer_name: 'Client Driveby Africa',
    expiry_period: 60,
    currency: 'XAF',
  };

  console.log('E-Billing request:', requestBody);

  const ebillingResponse = await fetch(EBILLING.URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': auth,
    },
    body: JSON.stringify(requestBody),
  });

  const ebillingData = await ebillingResponse.json();
  console.log('E-Billing response:', ebillingData);

  if (!ebillingResponse.ok) {
    console.error('E-Billing error:', ebillingResponse.status, ebillingData);
    throw new Error(ebillingData.message || `E-Billing API error: ${ebillingResponse.status}`);
  }

  const billId = ebillingData.e_bill?.bill_id;

  if (!billId) {
    throw new Error('Failed to create E-Billing invoice - no bill_id returned');
  }

  // 3. Return portal URL for WebView
  return {
    billId,
    externalReference,
    portalUrl: `${EBILLING.PORTAL}/?invoice=${billId}`,
  };
}

/**
 * Check the status of a payment
 * Response format: { success, data: { status, amount, wallet_credited, ... } }
 * Statuses: pending | processing | completed | failed | expired | cancelled
 */
export async function checkPaymentStatus(externalReference: string): Promise<PaymentStatusResult> {
  try {
    const url = `${BACKEND_URL}/check_status.php?external_reference=${externalReference}`;
    console.log('Checking payment status:', url);

    const response = await fetch(url);
    const responseData = await response.json();

    console.log('Payment status response:', responseData);

    if (!responseData.success) {
      // Transaction not found or error
      return { completed: false, status: 'pending' };
    }

    // Status is in responseData.data.status
    const status = responseData.data?.status || 'pending';

    console.log('Extracted status:', status);

    return {
      completed: status === 'completed',
      status: status as PaymentStatus,
      walletCredited: responseData.data?.wallet_credited,
    };
  } catch (error) {
    console.error('Check payment status error:', error);
    return { completed: false, status: 'pending' };
  }
}

/**
 * Format amount for display
 */
export function formatPaymentAmount(amount: number, currency: 'XAF' | 'USD' = 'XAF'): string {
  if (currency === 'XAF') {
    return Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';
  }
  return '$' + amount.toLocaleString('en-US');
}
