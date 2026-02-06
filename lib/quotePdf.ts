import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

interface QuotePdfData {
  quoteNumber: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  vehicleSource: string;
  vehiclePriceUSD: number;
  destination: {
    name: string;
    country: string;
  };
  shippingType: 'container' | 'groupage';
  costs: {
    vehiclePriceXAF: number;
    shippingCostXAF: number;
    insuranceCostXAF: number;
    inspectionFeeXAF: number;
    totalXAF: number;
  };
  userName?: string;
  userEmail?: string;
  validUntil?: string;
  createdAt?: string;
}

const SOURCE_NAMES: Record<string, string> = {
  korea: 'Corée du Sud',
  china: 'Chine',
  dubai: 'Dubaï',
};

const SOURCE_FLAGS: Record<string, string> = {
  korea: '🇰🇷',
  china: '🇨🇳',
  dubai: '🇦🇪',
};

const SHIPPING_LABELS: Record<string, string> = {
  container: 'Container complet (20ft)',
  groupage: 'Groupage (-50%)',
};

const formatCurrency = (amount: number): string => {
  return Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';
};

const formatDate = (dateStr?: string): string => {
  const date = dateStr ? new Date(dateStr) : new Date();
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const generateQuoteHtml = (data: QuotePdfData): string => {
  const validUntilDate = data.validUntil
    ? formatDate(data.validUntil)
    : formatDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      color: #111827;
      background: white;
      padding: 20px;
    }
    .header-bar {
      background: #F97316;
      height: 8px;
      margin: -20px -20px 20px -20px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
    }
    .logo-orange { color: #F97316; }
    .logo-dark { color: #111827; }
    .quote-box {
      background: #FFF7ED;
      border: 1px solid #F97316;
      padding: 12px;
      border-radius: 8px;
      min-width: 160px;
    }
    .quote-label {
      font-size: 10px;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .quote-number {
      font-size: 14px;
      font-weight: bold;
      color: #F97316;
      margin: 4px 0;
    }
    .quote-date {
      font-size: 10px;
      color: #9CA3AF;
    }
    .title {
      font-size: 18px;
      font-weight: bold;
      color: #111827;
      margin-bottom: 4px;
    }
    .subtitle {
      font-size: 10px;
      color: #9CA3AF;
      margin-bottom: 16px;
    }
    .grid {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
    }
    .card {
      flex: 1;
      background: #F3F4F6;
      padding: 12px;
      border-radius: 8px;
    }
    .card-title {
      font-size: 10px;
      font-weight: bold;
      color: #F97316;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .card-label {
      font-size: 9px;
      color: #9CA3AF;
      margin-bottom: 2px;
    }
    .card-value {
      font-size: 11px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 8px;
    }
    .shipping-box {
      background: #EFF6FF;
      border: 1px solid #2563EB;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 16px;
    }
    .shipping-title {
      font-size: 10px;
      font-weight: bold;
      color: #2563EB;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .shipping-info {
      font-size: 10px;
      color: #111827;
    }
    .costs-title {
      font-size: 12px;
      font-weight: bold;
      color: #F97316;
      margin-bottom: 8px;
    }
    .costs-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    .costs-table th {
      background: #F97316;
      color: white;
      font-size: 10px;
      font-weight: bold;
      padding: 8px 12px;
      text-align: left;
    }
    .costs-table th:last-child {
      text-align: right;
    }
    .costs-table td {
      padding: 10px 12px;
      font-size: 11px;
      border-bottom: 1px solid #E5E7EB;
    }
    .costs-table td:last-child {
      text-align: right;
      font-weight: 600;
      font-family: monospace;
    }
    .costs-table tr:nth-child(even) {
      background: #F9FAFB;
    }
    .total-row {
      background: #FFF7ED !important;
    }
    .total-row td {
      font-weight: bold;
      border: 1px solid #F97316;
    }
    .total-row td:last-child {
      color: #F97316;
      font-size: 14px;
    }
    .deposit-box {
      background: #ECFDF5;
      border: 1px solid #22C55E;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 16px;
    }
    .deposit-title {
      font-size: 11px;
      font-weight: bold;
      color: #22C55E;
      margin-bottom: 8px;
    }
    .deposit-amount {
      font-size: 20px;
      font-weight: 900;
      color: #111827;
    }
    .deposit-equiv {
      font-size: 12px;
      color: #6B7280;
      margin-left: 8px;
    }
    .deposit-note {
      font-size: 9px;
      color: #22C55E;
      margin-top: 8px;
    }
    .steps-title {
      font-size: 12px;
      font-weight: bold;
      color: #F97316;
      margin-bottom: 10px;
    }
    .step {
      display: flex;
      align-items: center;
      margin-bottom: 6px;
    }
    .step-num {
      width: 18px;
      height: 18px;
      background: #F97316;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: bold;
      margin-right: 8px;
      flex-shrink: 0;
    }
    .step-text {
      font-size: 10px;
      color: #4B5563;
    }
    .note {
      font-size: 9px;
      color: #9CA3AF;
      font-style: italic;
      margin: 16px 0;
      line-height: 1.5;
    }
    .footer {
      background: #F3F4F6;
      padding: 16px;
      border-radius: 8px;
      margin-top: 16px;
    }
    .footer-title {
      font-size: 10px;
      font-weight: bold;
      color: #F97316;
      margin-bottom: 8px;
    }
    .footer-grid {
      display: flex;
      gap: 20px;
    }
    .footer-item {
      font-size: 10px;
    }
    .footer-label {
      color: #9CA3AF;
      font-size: 9px;
    }
    .footer-value {
      color: #111827;
      font-weight: 500;
    }
    .bottom-bar {
      background: #F97316;
      height: 6px;
      margin: 20px -20px -20px -20px;
    }
    .tagline {
      text-align: center;
      font-size: 9px;
      color: #9CA3AF;
      margin-top: 12px;
    }
  </style>
</head>
<body>
  <div class="header-bar"></div>

  <div class="header">
    <div>
      <div class="logo">
        <span class="logo-orange">driveby</span><span class="logo-dark">AFRICA</span>
      </div>
      <div style="font-size: 10px; color: #6B7280; margin-top: 4px;">
        Votre partenaire d'importation automobile
      </div>
    </div>
    <div class="quote-box">
      <div class="quote-label">Devis N°</div>
      <div class="quote-number">${data.quoteNumber}</div>
      <div class="quote-date">Date: ${formatDate(data.createdAt)}</div>
      <div class="quote-date">Valable jusqu'au: ${validUntilDate}</div>
    </div>
  </div>

  <div class="title">DEVIS D'IMPORTATION VÉHICULE</div>
  <div class="subtitle">Valable 7 jours à compter de la date d'émission</div>

  <div class="grid">
    <div class="card">
      <div class="card-title">Client</div>
      ${data.userName ? `
        <div class="card-label">Nom</div>
        <div class="card-value">${data.userName}</div>
      ` : ''}
      ${data.userEmail ? `
        <div class="card-label">Email</div>
        <div class="card-value">${data.userEmail}</div>
      ` : ''}
    </div>
    <div class="card">
      <div class="card-title">Véhicule</div>
      <div class="card-label">Marque / Modèle</div>
      <div class="card-value">${data.vehicleMake} ${data.vehicleModel}</div>
      <div class="card-label">Année: ${data.vehicleYear}</div>
      <div class="card-label">Origine: ${SOURCE_NAMES[data.vehicleSource] || data.vehicleSource} ${SOURCE_FLAGS[data.vehicleSource] || ''}</div>
    </div>
  </div>

  <div class="shipping-box">
    <div class="shipping-title">Expédition</div>
    <div class="shipping-info">
      <strong>Destination:</strong> ${data.destination.name}, ${data.destination.country}
      &nbsp;&nbsp;|&nbsp;&nbsp;
      <strong>Type:</strong> ${SHIPPING_LABELS[data.shippingType] || data.shippingType}
    </div>
  </div>

  <div class="costs-title">DÉTAIL DES COÛTS</div>
  <table class="costs-table">
    <thead>
      <tr>
        <th>Description</th>
        <th>Montant (FCFA)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Prix du véhicule (FOB)</td>
        <td>${formatCurrency(data.costs.vehiclePriceXAF)}</td>
      </tr>
      <tr>
        <td>Transport maritime - ${SHIPPING_LABELS[data.shippingType] || data.shippingType}</td>
        <td>${formatCurrency(data.costs.shippingCostXAF)}</td>
      </tr>
      <tr>
        <td>Assurance cargo (2.5%)</td>
        <td>${formatCurrency(data.costs.insuranceCostXAF)}</td>
      </tr>
      <tr>
        <td>Inspection & Documents</td>
        <td>${formatCurrency(data.costs.inspectionFeeXAF)}</td>
      </tr>
      <tr class="total-row">
        <td>TOTAL ESTIMÉ</td>
        <td>${formatCurrency(data.costs.totalXAF)}</td>
      </tr>
    </tbody>
  </table>

  <div class="deposit-box">
    <div class="deposit-title">ACOMPTE REQUIS POUR BLOQUER LE VÉHICULE</div>
    <div>
      <span class="deposit-amount">1 000 USD</span>
      <span class="deposit-equiv">(600 000 FCFA)</span>
    </div>
    <div class="deposit-note">
      Cet acompte déclenche le rapport d'inspection détaillé du véhicule
    </div>
  </div>

  <div class="steps-title">PROCHAINES ÉTAPES</div>
  <div class="step">
    <div class="step-num">1</div>
    <div class="step-text">Versez l'acompte de 1 000$ pour bloquer le véhicule</div>
  </div>
  <div class="step">
    <div class="step-num">2</div>
    <div class="step-text">Recevez le rapport d'inspection détaillé par WhatsApp</div>
  </div>
  <div class="step">
    <div class="step-num">3</div>
    <div class="step-text">Validez et réglez le solde pour lancer l'expédition</div>
  </div>
  <div class="step">
    <div class="step-num">4</div>
    <div class="step-text">Suivez votre véhicule jusqu'à la livraison</div>
  </div>

  <div class="note">
    * Ce devis est une estimation basée sur les tarifs actuels. Les frais de dédouanement ne sont pas inclus
    et varient selon la réglementation de ${data.destination.country}. Devis valable 7 jours à compter de la date d'émission.
  </div>

  <div class="footer">
    <div class="footer-title">CONTACTEZ-NOUS</div>
    <div class="footer-grid">
      <div class="footer-item">
        <div class="footer-label">Email</div>
        <div class="footer-value">contact@driveby-africa.com</div>
      </div>
      <div class="footer-item">
        <div class="footer-label">WhatsApp</div>
        <div class="footer-value">+241 77 00 00 00</div>
      </div>
      <div class="footer-item">
        <div class="footer-label">Site Web</div>
        <div class="footer-value">www.drivebyafrica.com</div>
      </div>
    </div>
  </div>

  <div class="tagline">
    Driveby Africa - Votre partenaire d'importation automobile en Afrique
  </div>

  <div class="bottom-bar"></div>
</body>
</html>
`;
};

export async function generateQuotePdf(data: QuotePdfData): Promise<string> {
  const html = generateQuoteHtml(data);

  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  // Move to a permanent location with a proper name
  const fileName = `Devis-${data.quoteNumber}.pdf`;
  const newUri = `${FileSystem.documentDirectory}${fileName}`;

  await FileSystem.moveAsync({
    from: uri,
    to: newUri,
  });

  return newUri;
}

export async function shareQuotePdf(pdfUri: string, quoteNumber: string): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();

  if (!isAvailable) {
    throw new Error('Le partage n\'est pas disponible sur cet appareil');
  }

  await Sharing.shareAsync(pdfUri, {
    mimeType: 'application/pdf',
    dialogTitle: `Devis ${quoteNumber}`,
    UTI: 'com.adobe.pdf',
  });
}

export async function generateAndShareQuotePdf(data: QuotePdfData): Promise<void> {
  const pdfUri = await generateQuotePdf(data);
  await shareQuotePdf(pdfUri, data.quoteNumber);
}
