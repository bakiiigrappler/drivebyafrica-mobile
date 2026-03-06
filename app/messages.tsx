import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors, AppTheme } from '@/constants/Colors';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { useAuthStore, useSettingsStore } from '@/store';
import { useCurrency } from '@/hooks';
import { supabase } from '@/lib/supabase';
import { t } from '@/lib/i18n';
import { API_URL } from '@/constants';
import { showGlobalSnackbar } from '@/contexts/SnackbarContext';

interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'user' | 'bot' | 'agent';
  content: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

const QUICK_QUESTIONS_FR = [
  'Comment obtenir un devis?',
  'Quels sont les delais de livraison?',
  'Quels modes de paiement acceptez-vous?',
  "Comment fonctionne l'inspection?",
];

const QUICK_QUESTIONS_EN = [
  'How do I get a quote?',
  'What are the delivery times?',
  'What payment methods do you accept?',
  'How does the inspection work?',
];

const QUICK_QUESTIONS_ZH = [
  '如何获取报价？',
  '交货时间是多少？',
  '接受哪些付款方式？',
  '检验是如何进行的？',
];

function getQuickQuestions(lang: string) {
  if (lang === 'en') return QUICK_QUESTIONS_EN;
  if (lang === 'zh') return QUICK_QUESTIONS_ZH;
  return QUICK_QUESTIONS_FR;
}

function generateLocalFallback(userMessage: string, lang: string): string {
  const msg = userMessage.toLowerCase();

  if (msg.includes('devis') || msg.includes('quote')) {
    return lang === 'en'
      ? "To get a quote, select a vehicle from our catalog and click 'Request a quote'. You'll receive a detailed estimate including vehicle price, transport and insurance."
      : "Pour obtenir un devis, sélectionnez un véhicule dans notre catalogue et cliquez sur 'Demander un devis'. Vous recevrez une estimation détaillée incluant le prix du véhicule, le transport et l'assurance.";
  }
  if (msg.includes('delai') || msg.includes('livraison') || msg.includes('delivery') || msg.includes('time')) {
    return lang === 'en'
      ? "Delivery times depend on the vehicle's origin:\n- South Korea: 4-6 weeks\n- China: 6-8 weeks\n- Dubai: 3-5 weeks"
      : "Les délais de livraison dépendent de l'origine du véhicule:\n- Corée du Sud: 4-6 semaines\n- Chine: 6-8 semaines\n- Dubaï: 3-5 semaines";
  }
  if (msg.includes('paiement') || msg.includes('payer') || msg.includes('payment')) {
    return lang === 'en'
      ? "We accept:\n- Bank card (Visa, Mastercard)\n- Mobile Money (Airtel, MTN, Orange)\n- Cash at our office\n\nThe deposit is $1,000 USD per vehicle."
      : "Nous acceptons:\n- Carte bancaire (Visa, Mastercard)\n- Mobile Money (Airtel, MTN, Orange)\n- Cash en agence\n\nL'acompte est de 1 000 USD par véhicule.";
  }
  if (msg.includes('inspection') || msg.includes('rapport') || msg.includes('report')) {
    return lang === 'en'
      ? "After paying the deposit, our experts perform a detailed inspection including HD photos, mechanical check, vehicle history and body condition. You receive this report before paying the balance."
      : "Après le paiement de l'acompte, nos experts effectuent une inspection détaillée: photos HD, vérification mécanique, historique du véhicule et état de la carrosserie. Vous recevez ce rapport avant de payer le solde.";
  }
  if (msg.includes('bonjour') || msg.includes('salut') || msg.includes('hello') || msg.includes('hi')) {
    return lang === 'en'
      ? "Hello! Welcome to Driveby Africa. I can help you find a vehicle from Korea, China or Dubai.\n\nWhat brand or type of vehicle are you looking for?"
      : "Bonjour! Bienvenue sur Driveby Africa. Je peux vous aider à trouver un véhicule depuis la Corée, la Chine ou Dubaï.\n\nQuelle marque ou quel type de véhicule recherchez-vous?";
  }

  return lang === 'en'
    ? "I can help you with:\n- Searching for a vehicle (brand, budget, year)\n- Getting a personalized quote\n- Tracking your current order\n- Understanding our purchase process\n\nWhat brand or vehicle type interests you?"
    : "Je peux vous aider avec:\n- Rechercher un véhicule (marque, budget, année)\n- Obtenir un devis personnalisé\n- Suivre votre commande en cours\n- Comprendre notre processus d'achat\n\nQuelle marque ou quel type de véhicule vous intéresse?";
}

export default function MessagesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthStore();
  const { language } = useSettingsStore();
  const { currency, currencyInfo } = useCurrency();
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // Load conversation on mount
  useEffect(() => {
    if (user) {
      loadConversation();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const loadConversation = async () => {
    try {
      // Find existing conversation
      const { data: conversations } = await supabase
        .from('chat_conversations' as any)
        .select('id, status')
        .eq('user_id', user!.id)
        .order('last_message_at', { ascending: false })
        .limit(1);

      if (conversations && conversations.length > 0) {
        const conv = conversations[0] as any;
        setConversationId(conv.id);

        // Load messages
        const { data: msgs } = await supabase
          .from('chat_messages' as any)
          .select('*')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: true });

        if (msgs) {
          setMessages(msgs as unknown as Message[]);
        }
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isSending || !user) return;

    setIsSending(true);
    setInputMessage('');

    // Optimistic user message
    const tempId = `temp-${Date.now()}`;
    const tempMsg: Message = {
      id: tempId,
      conversation_id: conversationId || '',
      sender_type: 'user',
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      let currentConvId = conversationId;

      // Create conversation if needed
      if (!currentConvId) {
        const { data: newConv, error: convError } = await supabase
          .from('chat_conversations' as any)
          .insert({ user_id: user.id, status: 'active' })
          .select()
          .single();

        if (convError) throw convError;
        currentConvId = (newConv as any).id;
        setConversationId(currentConvId);

        // Add welcome message from bot
        await supabase.from('chat_messages' as any).insert({
          conversation_id: currentConvId,
          sender_type: 'bot',
          content: language === 'en'
            ? "Hello! I'm the Driveby Africa virtual assistant. How can I help you today?"
            : language === 'zh'
            ? '你好！我是 Driveby Africa 的虚拟助手。我能帮您什么？'
            : "Bonjour! Je suis l'assistant virtuel de Driveby Africa. Comment puis-je vous aider?",
          metadata: { type: 'welcome' },
        });
      }

      // Insert user message
      const { data: savedMsg, error: msgError } = await supabase
        .from('chat_messages' as any)
        .insert({
          conversation_id: currentConvId,
          user_id: user.id,
          sender_type: 'user',
          content,
        })
        .select()
        .single();

      if (msgError) throw msgError;

      // Replace temp message
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? (savedMsg as unknown as Message) : m))
      );

      // Show typing indicator
      setIsTyping(true);

      // Get AI response via web API
      const { data: { session } } = await supabase.auth.getSession();
      let aiBotMessage: Message | null = null;
      try {
        const aiResponse = await fetch(`${API_URL}/api/chat/ai`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token
              ? { Authorization: `Bearer ${session.access_token}` }
              : {}),
          },
          body: JSON.stringify({
            conversationId: currentConvId,
            userMessage: content,
            currency: currency,
            exchangeRate: currencyInfo?.rateToUsd || 1,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          if (aiData.message) {
            aiBotMessage = aiData.message as Message;
          }
        }
      } catch (fetchErr) {
        console.warn('AI API unreachable, using fallback:', fetchErr);
      }

      setIsTyping(false);

      if (aiBotMessage) {
        setMessages((prev) => [...prev, aiBotMessage!]);
      } else {
        // Generate local fallback response and save to DB
        const fallbackContent = generateLocalFallback(content, language);
        const { data: botMsg } = await supabase
          .from('chat_messages' as any)
          .insert({
            conversation_id: currentConvId,
            sender_type: 'bot',
            content: fallbackContent,
            metadata: { type: 'fallback' },
          })
          .select()
          .single();

        if (botMsg) {
          setMessages((prev) => [...prev, botMsg as unknown as Message]);
        } else {
          setMessages((prev) => [...prev, {
            id: `fallback-${Date.now()}`,
            conversation_id: currentConvId!,
            sender_type: 'bot',
            content: fallbackContent,
            created_at: new Date().toISOString(),
          }]);
        }
      }
    } catch (error: any) {
      console.error('Send message error:', error?.message || error);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInputMessage(content);
      showGlobalSnackbar({
        message: t('common.error', language),
        type: 'error',
      });
    } finally {
      setIsSending(false);
      setIsTyping(false);
    }
  }, [isSending, user, conversationId, language, currency, currencyInfo]);

  const handleQuickQuestion = (question: string) => {
    sendMessage(question);
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString(
      language === 'zh' ? 'zh-CN' : language === 'en' ? 'en-US' : 'fr-FR',
      { hour: '2-digit', minute: '2-digit' }
    );
  };

  // Parse markdown links [text](url) in bot messages
  const renderContent = (content: string, isUser: boolean) => {
    if (isUser) {
      return (
        <ThemedText style={styles.messageText}>
          {content}
        </ThemedText>
      );
    }

    // Simple markdown link parser
    const parts: React.ReactNode[] = [];
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = linkRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <ThemedText key={key++} style={styles.botText}>
            {content.slice(lastIndex, match.index)}
          </ThemedText>
        );
      }
      const linkText = match[1];
      const linkUrl = match[2];
      parts.push(
        <ThemedText
          key={key++}
          style={[styles.botText, { color: AppTheme.orange, fontWeight: '600' }]}
          onPress={() => {
            if (linkUrl.startsWith('/cars/')) {
              const vehicleId = linkUrl.replace('/cars/', '');
              router.push(`/vehicle/${vehicleId}`);
            }
          }}
        >
          {linkText}
        </ThemedText>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push(
        <ThemedText key={key++} style={styles.botText}>
          {content.slice(lastIndex)}
        </ThemedText>
      );
    }

    if (parts.length === 0) {
      return <ThemedText style={styles.botText}>{content}</ThemedText>;
    }

    return <ThemedText style={styles.botText}>{parts}</ThemedText>;
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender_type === 'user';

    return (
      <View style={[styles.messageBubbleRow, isUser && styles.messageBubbleRowUser]}>
        {!isUser && (
          <View style={[styles.avatar, { backgroundColor: AppTheme.orange + '15' }]}>
            <Ionicons
              name={item.sender_type === 'agent' ? 'person' : 'sparkles'}
              size={16}
              color={item.sender_type === 'agent' ? '#22C55E' : AppTheme.orange}
            />
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isUser
              ? { backgroundColor: AppTheme.orange, borderBottomRightRadius: 4 }
              : { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, borderWidth: 1, borderBottomLeftRadius: 4 },
          ]}
        >
          {renderContent(item.content, isUser)}
          <ThemedText
            size="xs"
            style={[
              styles.messageTime,
              { color: isUser ? 'rgba(255,255,255,0.6)' : colors.textMuted },
            ]}
          >
            {formatTime(item.created_at)}
          </ThemedText>
        </View>
        {isUser && (
          <View style={[styles.avatar, { backgroundColor: '#3B82F6' + '15' }]}>
            <Ionicons name="person" size={16} color="#3B82F6" />
          </View>
        )}
      </View>
    );
  };

  // ── Not logged in ──
  if (!user) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: AppTheme.orange + '15' }]}>
            <Ionicons name="chatbubbles" size={48} color={AppTheme.orange} />
          </View>
          <ThemedText variant="title" size="lg" style={styles.emptyTitle}>
            {t('profile.messages', language)}
          </ThemedText>
          <ThemedText variant="muted" style={styles.emptySubtitle}>
            {language === 'en'
              ? 'Sign in to chat with our assistant'
              : language === 'zh'
              ? '登录以与我们的助手聊天'
              : 'Connectez-vous pour discuter avec notre assistant'}
          </ThemedText>
          <TouchableOpacity
            style={[styles.signInBtn, { backgroundColor: AppTheme.orange }]}
            onPress={() => router.push('/(auth)/login')}
          >
            <Ionicons name="log-in-outline" size={20} color="#FFF" />
            <ThemedText style={{ color: '#FFF', fontWeight: '700', marginLeft: 8 }}>
              {t('profile.signIn', language)}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  // ── Loading ──
  if (isLoading) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={AppTheme.orange} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
          <View style={[styles.headerAvatar, { backgroundColor: AppTheme.orange + '15' }]}>
            <Ionicons name="sparkles" size={20} color={AppTheme.orange} />
          </View>
          <View style={styles.headerText}>
            <ThemedText variant="title" size="base">
              Assistant Driveby
            </ThemedText>
            <View style={styles.onlineRow}>
              <View style={styles.onlineDot} />
              <ThemedText variant="muted" size="xs">
                {language === 'en' ? 'Online' : language === 'zh' ? '在线' : 'En ligne'}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Messages */}
        {messages.length === 0 ? (
          // Welcome state with quick questions
          <View style={styles.welcomeContainer}>
            <View style={[styles.welcomeIcon, { backgroundColor: AppTheme.orange + '15' }]}>
              <Ionicons name="sparkles" size={40} color={AppTheme.orange} />
            </View>
            <ThemedText variant="title" size="lg" style={styles.welcomeTitle}>
              {language === 'en'
                ? 'Welcome to Driveby Assistant!'
                : language === 'zh'
                ? '欢迎使用 Driveby 助手！'
                : "Bienvenue sur l'assistant Driveby!"}
            </ThemedText>
            <ThemedText variant="muted" style={styles.welcomeSubtitle}>
              {language === 'en'
                ? 'I can help you with vehicles, prices, and delivery times.'
                : language === 'zh'
                ? '我可以帮助您了解车辆、价格和交货时间。'
                : 'Je peux vous aider avec les vehicules, les prix et les delais.'}
            </ThemedText>

            <View style={styles.quickQuestions}>
              {getQuickQuestions(language).map((question, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.quickBtn, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
                  onPress={() => handleQuickQuestion(question)}
                >
                  <Ionicons name="help-circle-outline" size={16} color={AppTheme.orange} />
                  <ThemedText size="sm" style={styles.quickBtnText}>
                    {question}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={[styles.messagesList, { paddingBottom: 8 }]}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListFooterComponent={
              isTyping ? (
                <View style={[styles.messageBubbleRow]}>
                  <View style={[styles.avatar, { backgroundColor: AppTheme.orange + '15' }]}>
                    <Ionicons name="sparkles" size={16} color={AppTheme.orange} />
                  </View>
                  <View
                    style={[
                      styles.messageBubble,
                      { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, borderWidth: 1, borderBottomLeftRadius: 4 },
                    ]}
                  >
                    <View style={styles.typingDots}>
                      <View style={[styles.dot, { backgroundColor: colors.textMuted }]} />
                      <View style={[styles.dot, { backgroundColor: colors.textMuted, opacity: 0.7 }]} />
                      <View style={[styles.dot, { backgroundColor: colors.textMuted, opacity: 0.4 }]} />
                    </View>
                  </View>
                </View>
              ) : null
            }
          />
        )}

        {/* Input */}
        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: colors.cardBg,
              borderTopColor: colors.cardBorder,
              paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
            },
          ]}
        >
          <TextInput
            ref={inputRef}
            value={inputMessage}
            onChangeText={setInputMessage}
            placeholder={
              language === 'en'
                ? 'Write your message...'
                : language === 'zh'
                ? '输入您的消息...'
                : 'Ecrivez votre message...'
            }
            placeholderTextColor={colors.textMuted}
            style={[
              styles.input,
              {
                backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#F3F4F6',
                color: colors.textPrimary,
              },
            ]}
            multiline
            maxLength={5000}
            onSubmitEditing={() => sendMessage(inputMessage)}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              {
                backgroundColor: inputMessage.trim() && !isSending ? AppTheme.orange : colors.border,
              },
            ]}
            onPress={() => sendMessage(inputMessage)}
            disabled={!inputMessage.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="send" size={18} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { marginLeft: 12 },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' },

  // Welcome
  welcomeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  welcomeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  welcomeTitle: { textAlign: 'center', marginBottom: 8 },
  welcomeSubtitle: { textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  quickQuestions: { width: '100%', gap: 8 },
  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  quickBtnText: { flex: 1 },

  // Messages
  messagesList: { paddingHorizontal: 12, paddingTop: 12 },
  messageBubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
    gap: 8,
  },
  messageBubbleRowUser: { justifyContent: 'flex-end' },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  messageText: {
    color: '#FFF',
    fontSize: 14,
    lineHeight: 20,
  },
  botText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right',
  },

  // Typing indicator
  typingDots: { flexDirection: 'row', gap: 4, paddingVertical: 4, paddingHorizontal: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },

  // Input
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    minHeight: 42,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty / Auth
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { textAlign: 'center', marginBottom: 8 },
  emptySubtitle: { textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  signInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
});
