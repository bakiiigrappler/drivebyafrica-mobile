export interface Country {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
}

// African countries first, then other common countries
export const COUNTRIES: Country[] = [
  // Africa
  { code: 'CI', name: "Côte d'Ivoire", dialCode: '+225', flag: '🇨🇮' },
  { code: 'SN', name: 'Sénégal', dialCode: '+221', flag: '🇸🇳' },
  { code: 'ML', name: 'Mali', dialCode: '+223', flag: '🇲🇱' },
  { code: 'BF', name: 'Burkina Faso', dialCode: '+226', flag: '🇧🇫' },
  { code: 'GN', name: 'Guinée', dialCode: '+224', flag: '🇬🇳' },
  { code: 'BJ', name: 'Bénin', dialCode: '+229', flag: '🇧🇯' },
  { code: 'TG', name: 'Togo', dialCode: '+228', flag: '🇹🇬' },
  { code: 'NE', name: 'Niger', dialCode: '+227', flag: '🇳🇪' },
  { code: 'GH', name: 'Ghana', dialCode: '+233', flag: '🇬🇭' },
  { code: 'NG', name: 'Nigeria', dialCode: '+234', flag: '🇳🇬' },
  { code: 'CM', name: 'Cameroun', dialCode: '+237', flag: '🇨🇲' },
  { code: 'GA', name: 'Gabon', dialCode: '+241', flag: '🇬🇦' },
  { code: 'CG', name: 'Congo', dialCode: '+242', flag: '🇨🇬' },
  { code: 'CD', name: 'RD Congo', dialCode: '+243', flag: '🇨🇩' },
  { code: 'MA', name: 'Maroc', dialCode: '+212', flag: '🇲🇦' },
  { code: 'DZ', name: 'Algérie', dialCode: '+213', flag: '🇩🇿' },
  { code: 'TN', name: 'Tunisie', dialCode: '+216', flag: '🇹🇳' },
  { code: 'EG', name: 'Égypte', dialCode: '+20', flag: '🇪🇬' },
  { code: 'KE', name: 'Kenya', dialCode: '+254', flag: '🇰🇪' },
  { code: 'TZ', name: 'Tanzanie', dialCode: '+255', flag: '🇹🇿' },
  { code: 'UG', name: 'Ouganda', dialCode: '+256', flag: '🇺🇬' },
  { code: 'RW', name: 'Rwanda', dialCode: '+250', flag: '🇷🇼' },
  { code: 'ZA', name: 'Afrique du Sud', dialCode: '+27', flag: '🇿🇦' },
  { code: 'MG', name: 'Madagascar', dialCode: '+261', flag: '🇲🇬' },
  { code: 'MU', name: 'Maurice', dialCode: '+230', flag: '🇲🇺' },

  // Europe
  { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷' },
  { code: 'BE', name: 'Belgique', dialCode: '+32', flag: '🇧🇪' },
  { code: 'CH', name: 'Suisse', dialCode: '+41', flag: '🇨🇭' },
  { code: 'DE', name: 'Allemagne', dialCode: '+49', flag: '🇩🇪' },
  { code: 'GB', name: 'Royaume-Uni', dialCode: '+44', flag: '🇬🇧' },
  { code: 'ES', name: 'Espagne', dialCode: '+34', flag: '🇪🇸' },
  { code: 'IT', name: 'Italie', dialCode: '+39', flag: '🇮🇹' },
  { code: 'PT', name: 'Portugal', dialCode: '+351', flag: '🇵🇹' },
  { code: 'NL', name: 'Pays-Bas', dialCode: '+31', flag: '🇳🇱' },

  // Americas
  { code: 'US', name: 'États-Unis', dialCode: '+1', flag: '🇺🇸' },
  { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦' },
  { code: 'BR', name: 'Brésil', dialCode: '+55', flag: '🇧🇷' },

  // Asia & Others
  { code: 'CN', name: 'Chine', dialCode: '+86', flag: '🇨🇳' },
  { code: 'JP', name: 'Japon', dialCode: '+81', flag: '🇯🇵' },
  { code: 'IN', name: 'Inde', dialCode: '+91', flag: '🇮🇳' },
  { code: 'AE', name: 'Émirats arabes unis', dialCode: '+971', flag: '🇦🇪' },
  { code: 'SA', name: 'Arabie Saoudite', dialCode: '+966', flag: '🇸🇦' },
  { code: 'LB', name: 'Liban', dialCode: '+961', flag: '🇱🇧' },
  { code: 'TR', name: 'Turquie', dialCode: '+90', flag: '🇹🇷' },
];

export const DEFAULT_COUNTRY = COUNTRIES[0]; // Côte d'Ivoire

export const getCountryByCode = (code: string): Country | undefined => {
  return COUNTRIES.find(c => c.code === code);
};

export const getCountryByDialCode = (dialCode: string): Country | undefined => {
  return COUNTRIES.find(c => c.dialCode === dialCode);
};
