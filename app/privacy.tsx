import { View, StyleSheet, ScrollView } from 'react-native';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors, AppTheme } from '@/constants/Colors';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { useSettingsStore } from '@/store';

const SECTIONS_FR = [
  {
    title: '1. Introduction',
    content: `Driveby Africa s'engage à protéger la confidentialité de vos données personnelles. Cette politique explique comment nous collectons, utilisons et protégeons vos informations lorsque vous utilisez notre plateforme.`,
  },
  {
    title: '2. Données collectées',
    subsections: [
      {
        subtitle: "2.1 Données d'identification",
        bullets: [
          'Nom et prénom',
          'Adresse email',
          'Numéro de téléphone',
          'Adresse postale',
          "Pièce d'identité (pour la vérification du compte)",
        ],
      },
      {
        subtitle: '2.2 Données de transaction',
        bullets: [
          'Historique des enchères',
          'Véhicules achetés',
          'Informations de paiement (traitées de manière sécurisée par Stripe)',
          'Adresses de livraison',
        ],
      },
      {
        subtitle: '2.3 Données techniques',
        bullets: [
          'Adresse IP',
          'Type de navigateur et appareil',
          'Pages visitées et durée des sessions',
          'Cookies et identifiants de session',
        ],
      },
    ],
  },
  {
    title: '3. Utilisation des données',
    content: `Vos données sont utilisées pour:`,
    bullets: [
      'Créer et gérer votre compte utilisateur',
      'Traiter vos enchères et commandes',
      'Vous envoyer des notifications sur vos enchères (email, WhatsApp)',
      'Améliorer nos services et votre expérience utilisateur',
      'Prévenir la fraude et assurer la sécurité',
      'Respecter nos obligations légales',
    ],
  },
  {
    title: '4. Partage des données',
    content: `Nous ne vendons jamais vos données personnelles. Nous pouvons les partager avec:`,
    bullets: [
      'Partenaires logistiques: pour organiser le transport de votre véhicule',
      'Processeurs de paiement: Stripe pour sécuriser les transactions',
      'Services de communication: pour les notifications WhatsApp',
      'Autorités: si requis par la loi ou pour protéger nos droits',
    ],
  },
  {
    title: '5. Sécurité des données',
    content: `Nous mettons en œuvre des mesures de sécurité appropriées:`,
    bullets: [
      'Chiffrement SSL/TLS pour toutes les communications',
      'Stockage sécurisé des données avec chiffrement au repos',
      'Authentification à deux facteurs disponible',
      'Accès restreint aux données personnelles',
      'Audits de sécurité réguliers',
    ],
  },
  {
    title: '6. Conservation des données',
    content: `Nous conservons vos données pendant la durée nécessaire à la fourniture de nos services:`,
    bullets: [
      'Données de compte: tant que votre compte est actif',
      'Données de transaction: 10 ans (obligations comptables)',
      'Données de navigation: 13 mois maximum',
    ],
    footer: `Après suppression de votre compte, vos données personnelles sont anonymisées ou supprimées dans un délai de 30 jours, sauf obligation légale de conservation.`,
  },
  {
    title: '7. Vos droits',
    content: `Conformément à la réglementation applicable, vous disposez des droits suivants:`,
    bullets: [
      "Droit d'accès: obtenir une copie de vos données personnelles",
      'Droit de rectification: corriger vos données inexactes',
      "Droit à l'effacement: demander la suppression de vos données",
      'Droit à la portabilité: recevoir vos données dans un format structuré',
      "Droit d'opposition: vous opposer au traitement de vos données",
      'Droit de limitation: restreindre le traitement de vos données',
    ],
    footer: `Pour exercer ces droits, contactez-nous à privacy@driveby-africa.com`,
  },
  {
    title: '8. Communications marketing',
    content: `Avec votre consentement, nous pouvons vous envoyer des communications marketing par email ou WhatsApp. Vous pouvez vous désabonner à tout moment:`,
    bullets: [
      'Via le lien de désinscription dans nos emails',
      'En répondant "STOP" à nos messages WhatsApp',
      'Dans les paramètres de votre compte',
    ],
  },
  {
    title: '9. Transferts internationaux',
    content: `Vos données peuvent être transférées vers des pays hors de votre pays de résidence (notamment pour le traitement des commandes avec nos partenaires en Corée du Sud). Nous nous assurons que ces transferts respectent les garanties appropriées.`,
  },
  {
    title: '10. Mineurs',
    content: `Notre service n'est pas destiné aux personnes de moins de 18 ans. Nous ne collectons pas sciemment de données personnelles de mineurs.`,
  },
  {
    title: '11. Modifications',
    content: `Nous pouvons mettre à jour cette politique à tout moment. Les modifications importantes vous seront notifiées par email ou via notre plateforme.`,
  },
  {
    title: '12. Contact',
    content: `Pour toute question concernant cette politique ou vos données personnelles:\n\nEmail: privacy@driveby-africa.com\nWhatsApp: +241 77 00 00 00\nAdresse: Central Business District, Hong Kong`,
  },
];

const SECTIONS_EN = [
  {
    title: '1. Introduction',
    content: `Driveby Africa is committed to protecting the confidentiality of your personal data. This policy explains how we collect, use, and protect your information when you use our platform.`,
  },
  {
    title: '2. Data collected',
    subsections: [
      {
        subtitle: '2.1 Identification data',
        bullets: [
          'First and last name',
          'Email address',
          'Phone number',
          'Postal address',
          'Identity document (for account verification)',
        ],
      },
      {
        subtitle: '2.2 Transaction data',
        bullets: [
          'Auction history',
          'Purchased vehicles',
          'Payment information (securely processed by Stripe)',
          'Delivery addresses',
        ],
      },
      {
        subtitle: '2.3 Technical data',
        bullets: [
          'IP address',
          'Browser and device type',
          'Pages visited and session duration',
          'Cookies and session identifiers',
        ],
      },
    ],
  },
  {
    title: '3. Use of data',
    content: `Your data is used to:`,
    bullets: [
      'Create and manage your user account',
      'Process your bids and orders',
      'Send you notifications about your bids (email, WhatsApp)',
      'Improve our services and your user experience',
      'Prevent fraud and ensure security',
      'Comply with our legal obligations',
    ],
  },
  {
    title: '4. Data sharing',
    content: `We never sell your personal data. We may share it with:`,
    bullets: [
      'Logistics partners: to organize the transport of your vehicle',
      'Payment processors: Stripe for secure transactions',
      'Communication services: for WhatsApp notifications',
      'Authorities: if required by law or to protect our rights',
    ],
  },
  {
    title: '5. Data security',
    content: `We implement appropriate security measures:`,
    bullets: [
      'SSL/TLS encryption for all communications',
      'Secure data storage with encryption at rest',
      'Two-factor authentication available',
      'Restricted access to personal data',
      'Regular security audits',
    ],
  },
  {
    title: '6. Data retention',
    content: `We retain your data for the period necessary to provide our services:`,
    bullets: [
      'Account data: as long as your account is active',
      'Transaction data: 10 years (accounting obligations)',
      'Browsing data: 13 months maximum',
    ],
    footer: `After account deletion, your personal data is anonymized or deleted within 30 days, except where legal retention is required.`,
  },
  {
    title: '7. Your rights',
    content: `In accordance with applicable regulations, you have the following rights:`,
    bullets: [
      'Right of access: obtain a copy of your personal data',
      'Right of rectification: correct inaccurate data',
      'Right to erasure: request deletion of your data',
      'Right to portability: receive your data in a structured format',
      'Right to object: object to the processing of your data',
      'Right to restriction: restrict the processing of your data',
    ],
    footer: `To exercise these rights, contact us at privacy@driveby-africa.com`,
  },
  {
    title: '8. Marketing communications',
    content: `With your consent, we may send you marketing communications by email or WhatsApp. You can unsubscribe at any time:`,
    bullets: [
      'Via the unsubscribe link in our emails',
      'By replying "STOP" to our WhatsApp messages',
      'In your account settings',
    ],
  },
  {
    title: '9. International transfers',
    content: `Your data may be transferred to countries outside your country of residence (particularly for order processing with our partners in South Korea). We ensure that these transfers comply with appropriate safeguards.`,
  },
  {
    title: '10. Minors',
    content: `Our service is not intended for persons under 18 years of age. We do not knowingly collect personal data from minors.`,
  },
  {
    title: '11. Modifications',
    content: `We may update this policy at any time. Significant changes will be notified to you by email or through our platform.`,
  },
  {
    title: '12. Contact',
    content: `For any questions regarding this policy or your personal data:\n\nEmail: privacy@driveby-africa.com\nWhatsApp: +241 77 00 00 00\nAddress: Central Business District, Hong Kong`,
  },
];

const SECTIONS_ZH = [
  {
    title: '1. 简介',
    content: `Driveby Africa致力于保护您个人数据的机密性。本政策解释了当您使用我们的平台时，我们如何收集、使用和保护您的信息。`,
  },
  {
    title: '2. 收集的数据',
    subsections: [
      {
        subtitle: '2.1 身份数据',
        bullets: ['姓名', '电子邮箱', '电话号码', '邮寄地址', '身份证件（用于账户验证）'],
      },
      {
        subtitle: '2.2 交易数据',
        bullets: ['拍卖历史', '购买的车辆', '支付信息（通过Stripe安全处理）', '配送地址'],
      },
      {
        subtitle: '2.3 技术数据',
        bullets: ['IP地址', '浏览器和设备类型', '访问页面和会话时长', 'Cookie和会话标识符'],
      },
    ],
  },
  {
    title: '3. 数据使用',
    content: `您的数据用于：`,
    bullets: [
      '创建和管理您的用户账户',
      '处理您的出价和订单',
      '向您发送有关出价的通知（电子邮件、WhatsApp）',
      '改善我们的服务和您的用户体验',
      '防止欺诈并确保安全',
      '履行我们的法律义务',
    ],
  },
  {
    title: '4. 数据共享',
    content: `我们绝不出售您的个人数据。我们可能与以下方共享：`,
    bullets: [
      '物流合作伙伴：组织您的车辆运输',
      '支付处理商：Stripe用于安全交易',
      '通信服务：用于WhatsApp通知',
      '当局：如法律要求或为保护我们的权利',
    ],
  },
  {
    title: '5. 数据安全',
    content: `我们实施适当的安全措施：`,
    bullets: [
      '所有通信的SSL/TLS加密',
      '安全的数据存储和静态加密',
      '可用的双因素认证',
      '对个人数据的限制访问',
      '定期安全审计',
    ],
  },
  {
    title: '6. 数据保留',
    content: `我们在提供服务所需的期间内保留您的数据：`,
    bullets: [
      '账户数据：只要您的账户处于活动状态',
      '交易数据：10年（会计义务）',
      '浏览数据：最长13个月',
    ],
    footer: `账户删除后，您的个人数据将在30天内匿名化或删除，法律要求保留的除外。`,
  },
  {
    title: '7. 您的权利',
    content: `根据适用法规，您享有以下权利：`,
    bullets: [
      '访问权：获取您个人数据的副本',
      '更正权：更正不准确的数据',
      '删除权：请求删除您的数据',
      '可携带权：以结构化格式接收您的数据',
      '反对权：反对处理您的数据',
      '限制权：限制处理您的数据',
    ],
    footer: `要行使这些权利，请联系我们：privacy@driveby-africa.com`,
  },
  {
    title: '8. 营销通信',
    content: `经您同意，我们可能通过电子邮件或WhatsApp向您发送营销通信。您可以随时取消订阅：`,
    bullets: [
      '通过我们邮件中的退订链接',
      '回复"STOP"到我们的WhatsApp消息',
      '在您的账户设置中',
    ],
  },
  {
    title: '9. 国际传输',
    content: `您的数据可能被转移到您居住国以外的国家（特别是与我们在韩国的合作伙伴处理订单时）。我们确保这些传输符合适当的保障措施。`,
  },
  {
    title: '10. 未成年人',
    content: `我们的服务不面向18岁以下的人。我们不会故意收集未成年人的个人数据。`,
  },
  {
    title: '11. 修改',
    content: `我们可能随时更新此政策。重要更改将通过电子邮件或平台通知您。`,
  },
  {
    title: '12. 联系方式',
    content: `如对本政策或您的个人数据有任何疑问：\n\n邮箱：privacy@driveby-africa.com\nWhatsApp：+241 77 00 00 00\n地址：香港中环商业区`,
  },
];

const TITLES: Record<string, string> = {
  fr: 'Politique de confidentialité',
  en: 'Privacy Policy',
  zh: '隐私政策',
};

const UPDATED: Record<string, string> = {
  fr: 'Dernière mise à jour: Janvier 2025',
  en: 'Last updated: January 2025',
  zh: '最后更新：2025年1月',
};

type Section = {
  title: string;
  content?: string;
  bullets?: string[];
  footer?: string;
  subsections?: { subtitle: string; bullets: string[] }[];
};

export default function PrivacyScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language } = useSettingsStore();

  const sections: Section[] = language === 'zh' ? SECTIONS_ZH : language === 'en' ? SECTIONS_EN : SECTIONS_FR;

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 8, backgroundColor: '#000' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <ThemedText variant="title" size="lg" style={{ color: '#FFF' }}>
          {TITLES[language] || TITLES.en}
        </ThemedText>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Updated date */}
        <ThemedText variant="muted" size="sm" style={styles.updated}>
          {UPDATED[language] || UPDATED.en}
        </ThemedText>

        {sections.map((section, index) => (
          <View key={index} style={[styles.section, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <ThemedText style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {section.title}
            </ThemedText>
            {section.content && (
              <ThemedText style={[styles.sectionContent, { color: colors.textSecondary }]}>
                {section.content}
              </ThemedText>
            )}
            {section.subsections && section.subsections.map((sub, si) => (
              <View key={si} style={styles.subsection}>
                <ThemedText style={[styles.subsectionTitle, { color: colors.textPrimary }]}>
                  {sub.subtitle}
                </ThemedText>
                {sub.bullets.map((bullet, bi) => (
                  <View key={bi} style={styles.bulletRow}>
                    <ThemedText style={[styles.bulletDot, { color: AppTheme.orange }]}>{'  \u2022  '}</ThemedText>
                    <ThemedText style={[styles.bulletText, { color: colors.textSecondary }]}>
                      {bullet}
                    </ThemedText>
                  </View>
                ))}
              </View>
            ))}
            {section.bullets && section.bullets.map((bullet, i) => (
              <View key={i} style={styles.bulletRow}>
                <ThemedText style={[styles.bulletDot, { color: AppTheme.orange }]}>{'  \u2022  '}</ThemedText>
                <ThemedText style={[styles.bulletText, { color: colors.textSecondary }]}>
                  {bullet}
                </ThemedText>
              </View>
            ))}
            {section.footer && (
              <ThemedText style={[styles.sectionContent, { color: colors.textSecondary, marginTop: 12 }]}>
                {section.footer}
              </ThemedText>
            )}
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerBackBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  updated: {
    textAlign: 'center',
    marginBottom: 16,
  },
  section: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 14,
    lineHeight: 22,
  },
  subsection: {
    marginTop: 12,
  },
  subsectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
    paddingRight: 16,
  },
  bulletDot: {
    fontSize: 14,
    lineHeight: 22,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
  },
});
