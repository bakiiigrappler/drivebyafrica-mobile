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
import { t } from '@/lib/i18n';

const SECTIONS_FR = [
  {
    title: '1. Acceptation des conditions',
    content: `En accédant et en utilisant la plateforme Driveby Africa, vous acceptez d'être lié par ces conditions d'utilisation. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser notre service.`,
  },
  {
    title: '2. Description du service',
    content: `Driveby Africa est une plateforme d'intermédiation qui permet aux utilisateurs d'accéder aux enchères automobiles de Corée du Sud, Chine et Dubaï. Nous facilitons:`,
    bullets: [
      'La recherche et la consultation de véhicules disponibles aux enchères',
      'La participation aux enchères via notre système de proxy bidding',
      'Le paiement sécurisé des véhicules remportés',
      "L'organisation du transport et de l'expédition des véhicules",
      "L'assistance au dédouanement dans les pays de destination",
    ],
  },
  {
    title: '3. Inscription et compte utilisateur',
    content: `Pour utiliser nos services, vous devez créer un compte en fournissant des informations exactes et complètes. Vous êtes responsable de:`,
    bullets: [
      'La confidentialité de vos identifiants de connexion',
      'Toutes les activités effectuées depuis votre compte',
      'La mise à jour de vos informations personnelles',
    ],
  },
  {
    title: "4. Processus d'enchères",
    content: `Lorsque vous placez une enchère sur notre plateforme:`,
    bullets: [
      "Vous vous engagez à acheter le véhicule si votre enchère est gagnante",
      'Les enchères sont définitives et ne peuvent être annulées',
      "Le prix affiché est le prix FOB (Free On Board) auquel s'ajoutent les frais de service",
      "Les frais d'enchère (5%) sont non remboursables",
    ],
  },
  {
    title: '5. Paiement',
    content: `Le paiement du véhicule doit être effectué dans les 48 heures suivant la confirmation de l'enchère gagnante. Nous acceptons:`,
    bullets: [
      'Les cartes bancaires (Visa, Mastercard) via Stripe',
      'Le Mobile Money (Airtel Money, MTN Mobile Money, Orange Money)',
      'Les virements bancaires pour les montants supérieurs à 10 000 USD',
    ],
    footer: `En cas de non-paiement dans les délais, nous nous réservons le droit d'annuler la transaction et de suspendre votre compte.`,
  },
  {
    title: '6. Livraison et transport',
    content: `Les délais de livraison indiqués sont estimatifs et peuvent varier en fonction:`,
    bullets: [
      'De la disponibilité des navires',
      'Des conditions météorologiques',
      'Des procédures douanières',
      'Des jours fériés et événements exceptionnels',
    ],
    footer: `Driveby Africa ne peut être tenu responsable des retards indépendants de sa volonté.`,
  },
  {
    title: '7. Garantie et responsabilité',
    content: `Nous garantissons la conformité du véhicule livré avec sa description sur notre plateforme. Toutefois:`,
    bullets: [
      'Les véhicules sont vendus en l\'état, sans garantie mécanique',
      "Les photos et rapports d'inspection sont fournis à titre informatif",
      "L'acheteur est responsable de vérifier la conformité aux normes locales",
    ],
  },
  {
    title: '8. Annulation et remboursement',
    content: `L'annulation est possible dans les conditions suivantes:`,
    bullets: [
      'Dans les 24h suivant le paiement: remboursement intégral',
      'Après 24h et avant embarquement: remboursement moins 5% de frais',
      'Après embarquement: aucun remboursement possible',
    ],
    footer: `En cas de non-conformité majeure du véhicule, contactez notre service client pour étudier les options de compensation.`,
  },
  {
    title: '9. Propriété intellectuelle',
    content: `Tous les contenus de la plateforme (textes, images, logos, logiciels) sont la propriété de Driveby Africa ou de ses partenaires. Toute reproduction sans autorisation est interdite.`,
  },
  {
    title: '10. Modification des conditions',
    content: `Nous nous réservons le droit de modifier ces conditions à tout moment. Les modifications entrent en vigueur dès leur publication sur la plateforme.`,
  },
  {
    title: '11. Droit applicable',
    content: `Ces conditions sont régies par le droit de Hong Kong. Tout litige sera soumis à la compétence exclusive des tribunaux de Hong Kong.`,
  },
  {
    title: '12. Contact',
    content: `Pour toute question concernant ces conditions, contactez-nous:\n\nEmail: legal@driveby-africa.com\nWhatsApp: +241 77 00 00 00\nAdresse: Central Business District, Hong Kong`,
  },
];

const SECTIONS_EN = [
  {
    title: '1. Acceptance of terms',
    content: `By accessing and using the Driveby Africa platform, you agree to be bound by these terms of use. If you do not accept these terms, please do not use our service.`,
  },
  {
    title: '2. Service description',
    content: `Driveby Africa is an intermediation platform that allows users to access automobile auctions in South Korea, China, and Dubai. We facilitate:`,
    bullets: [
      'Searching and viewing vehicles available at auction',
      'Participating in auctions via our proxy bidding system',
      'Secure payment of winning vehicles',
      'Organization of transport and shipping of vehicles',
      'Customs clearance assistance in destination countries',
    ],
  },
  {
    title: '3. Registration and user account',
    content: `To use our services, you must create an account by providing accurate and complete information. You are responsible for:`,
    bullets: [
      'The confidentiality of your login credentials',
      'All activities carried out from your account',
      'Updating your personal information',
    ],
  },
  {
    title: '4. Auction process',
    content: `When you place a bid on our platform:`,
    bullets: [
      'You commit to purchasing the vehicle if your bid wins',
      'Bids are final and cannot be cancelled',
      'The displayed price is the FOB price plus service fees',
      'Auction fees (5%) are non-refundable',
    ],
  },
  {
    title: '5. Payment',
    content: `Vehicle payment must be made within 48 hours of the winning bid confirmation. We accept:`,
    bullets: [
      'Credit cards (Visa, Mastercard) via Stripe',
      'Mobile Money (Airtel Money, MTN Mobile Money, Orange Money)',
      'Bank transfers for amounts exceeding $10,000 USD',
    ],
    footer: `In case of non-payment within the deadline, we reserve the right to cancel the transaction and suspend your account.`,
  },
  {
    title: '6. Delivery and transport',
    content: `Delivery times indicated are estimates and may vary depending on:`,
    bullets: [
      'Ship availability',
      'Weather conditions',
      'Customs procedures',
      'Holidays and exceptional events',
    ],
    footer: `Driveby Africa cannot be held responsible for delays beyond its control.`,
  },
  {
    title: '7. Warranty and liability',
    content: `We guarantee that the delivered vehicle conforms to its description on our platform. However:`,
    bullets: [
      'Vehicles are sold as-is, without mechanical warranty',
      'Photos and inspection reports are provided for information only',
      'The buyer is responsible for verifying compliance with local standards',
    ],
  },
  {
    title: '8. Cancellation and refund',
    content: `Cancellation is possible under the following conditions:`,
    bullets: [
      'Within 24h of payment: full refund',
      'After 24h and before shipping: refund minus 5% fees',
      'After shipping: no refund possible',
    ],
    footer: `In case of major non-conformity of the vehicle, contact our customer service to explore compensation options.`,
  },
  {
    title: '9. Intellectual property',
    content: `All platform content (texts, images, logos, software) is the property of Driveby Africa or its partners. Any reproduction without authorization is prohibited.`,
  },
  {
    title: '10. Modification of terms',
    content: `We reserve the right to modify these terms at any time. Modifications take effect upon publication on the platform.`,
  },
  {
    title: '11. Applicable law',
    content: `These terms are governed by Hong Kong law. Any dispute shall be subject to the exclusive jurisdiction of Hong Kong courts.`,
  },
  {
    title: '12. Contact',
    content: `For any questions regarding these terms, contact us:\n\nEmail: legal@driveby-africa.com\nWhatsApp: +241 77 00 00 00\nAddress: Central Business District, Hong Kong`,
  },
];

const SECTIONS_ZH = [
  {
    title: '1. 条款接受',
    content: `访问和使用Driveby Africa平台，即表示您同意受这些使用条款的约束。如果您不接受这些条款，请不要使用我们的服务。`,
  },
  {
    title: '2. 服务描述',
    content: `Driveby Africa是一个中介平台，允许用户访问韩国、中国和迪拜的汽车拍卖。我们提供以下服务：`,
    bullets: [
      '搜索和查看拍卖中的可用车辆',
      '通过我们的代理竞标系统参与拍卖',
      '中标车辆的安全支付',
      '车辆运输和发货的组织',
      '目的地国家的清关协助',
    ],
  },
  {
    title: '3. 注册和用户账户',
    content: `要使用我们的服务，您必须通过提供准确完整的信息来创建账户。您有责任：`,
    bullets: [
      '保护您的登录凭据的机密性',
      '从您的账户执行的所有活动',
      '更新您的个人信息',
    ],
  },
  {
    title: '4. 拍卖流程',
    content: `当您在我们的平台上出价时：`,
    bullets: [
      '如果您的出价中标，您承诺购买该车辆',
      '出价是最终的，不能取消',
      '显示的价格是FOB价格加上服务费',
      '拍卖费用（5%）不可退还',
    ],
  },
  {
    title: '5. 付款',
    content: `车辆付款必须在中标确认后48小时内完成。我们接受：`,
    bullets: [
      '信用卡（Visa、Mastercard）通过Stripe',
      'Mobile Money（Airtel Money、MTN Mobile Money、Orange Money）',
      '超过10,000美元的银行转账',
    ],
    footer: `如果未在规定期限内付款，我们保留取消交易和暂停您账户的权利。`,
  },
  {
    title: '6. 交付和运输',
    content: `标注的交货时间为预估，可能因以下因素而异：`,
    bullets: [
      '船舶可用性',
      '天气条件',
      '海关手续',
      '假期和特殊事件',
    ],
    footer: `Driveby Africa对超出其控制范围的延误不承担责任。`,
  },
  {
    title: '7. 保修和责任',
    content: `我们保证交付的车辆符合平台上的描述。但是：`,
    bullets: [
      '车辆按现状出售，不提供机械保修',
      '照片和检查报告仅供参考',
      '买方有责任验证是否符合当地标准',
    ],
  },
  {
    title: '8. 取消和退款',
    content: `在以下条件下可以取消：`,
    bullets: [
      '付款后24小时内：全额退款',
      '24小时后、发货前：退款扣除5%费用',
      '发货后：不可退款',
    ],
    footer: `如果车辆存在重大不符合情况，请联系我们的客户服务以探讨补偿方案。`,
  },
  {
    title: '9. 知识产权',
    content: `平台上的所有内容（文本、图片、标志、软件）均为Driveby Africa或其合作伙伴的财产。未经授权的任何复制均被禁止。`,
  },
  {
    title: '10. 条款修改',
    content: `我们保留随时修改这些条款的权利。修改在平台上发布后立即生效。`,
  },
  {
    title: '11. 适用法律',
    content: `这些条款受香港法律管辖。任何争议应提交香港法院专属管辖。`,
  },
  {
    title: '12. 联系方式',
    content: `如对这些条款有任何疑问，请联系我们：\n\n邮箱：legal@driveby-africa.com\nWhatsApp：+241 77 00 00 00\n地址：香港中环商业区`,
  },
];

const TITLES: Record<string, string> = {
  fr: "Conditions d'utilisation",
  en: 'Terms of Service',
  zh: '服务条款',
};

const UPDATED: Record<string, string> = {
  fr: 'Dernière mise à jour: Janvier 2025',
  en: 'Last updated: January 2025',
  zh: '最后更新：2025年1月',
};

export default function TermsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language } = useSettingsStore();

  const sections = language === 'zh' ? SECTIONS_ZH : language === 'en' ? SECTIONS_EN : SECTIONS_FR;

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
            <ThemedText style={[styles.sectionContent, { color: colors.textSecondary }]}>
              {section.content}
            </ThemedText>
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
