import {
  getListConversationMessagesQueryKey,
  getListConversationsQueryKey,
  useGetCurrentUser,
  useListConversationMessages,
  useSendConversationMessage,
} from '@workspace/api-client-react';
import type { ConversationMessage } from '@workspace/api-client-react';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, ErrorPanel, LoadingPanel } from '@/components/ui';

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export default function ConversationScreen() {
  const params = useLocalSearchParams<{ id?: string | string[]; customerName?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id ?? '';
  const customerName = Array.isArray(params.customerName) ? params.customerName[0] : params.customerName;
  const queryClient = useQueryClient();
  const profile = useGetCurrentUser();
  const messages = useListConversationMessages(id, {
    query: { enabled: Boolean(id), refetchInterval: 12000 },
  });
  const sendMessage = useSendConversationMessage({
    mutation: {
      onSuccess: async () => {
        setDraft('');
        setSendError('');
        await queryClient.invalidateQueries({ queryKey: getListConversationMessagesQueryKey(id) });
        await queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
      },
    },
  });
  const listRef = useRef<FlatList<ConversationMessage>>(null);
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState('');
  const isOwner = profile.data?.role === 'owner';

  const send = () => {
    const body = draft.trim();
    if (!body || !id || sendMessage.isPending) return;
    setSendError('');
    sendMessage.mutate(
      { conversationId: id, data: { body } },
      { onError: (error) => setSendError(error instanceof Error ? error.message : 'Message was not sent. Try again.') },
    );
  };

  const title = isOwner ? customerName || 'Customer' : 'Okenstyles Graphics And Tech';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={{ minHeight: 62, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: '#0B1120' }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to messages"
            onPress={() => router.back()}
            hitSlop={9}
            style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="arrow-back" color={C.foreground} size={21} />
          </Pressable>
          <View style={{ width: 37, height: 37, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0C2639', borderWidth: 1, borderColor: '#1A4B6E' }}>
            <Ionicons name={isOwner ? 'person-outline' : 'business-outline'} color={C.primary} size={17} />
          </View>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ color: C.foreground, fontFamily: 'DMSansBold', fontSize: 13 }}>{title}</Text>
            <Text style={{ color: C.mutedForeground, fontFamily: 'DMSans', fontSize: 10 }}>Private business conversation</Text>
          </View>
          <Ionicons name="lock-closed-outline" color={C.mutedForeground} size={16} />
        </View>

        {messages.isLoading ? <LoadingPanel label="Loading conversation…" /> : null}
        {messages.isError ? (
          <View style={{ padding: 16 }}>
            <ErrorPanel
              message="This conversation could not be opened. It may not belong to your account."
              onRetry={() => void messages.refetch()}
            />
          </View>
        ) : null}
        {!messages.isError ? (
          <FlatList
            ref={listRef}
            data={messages.data ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 15, paddingVertical: 18, gap: 10 }}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              messages.isLoading || messages.isError ? undefined : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <View style={{ width: 58, height: 58, borderRadius: 20, backgroundColor: '#0D2237', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="chatbubble-ellipses-outline" color={C.primary} size={25} />
                  </View>
                  <Text style={{ color: C.foreground, fontFamily: 'SpaceGroteskSemibold', fontSize: 16 }}>Start the conversation</Text>
                  <Text style={{ color: C.mutedForeground, fontFamily: 'DMSans', fontSize: 11, textAlign: 'center' }}>Messages here are visible only to this customer and the business owner.</Text>
                </View>
              )
            }
            renderItem={({ item }) => {
              const ownMessage = item.senderRole === profile.data?.role;
              return (
                <View style={{ alignSelf: ownMessage ? 'flex-end' : 'flex-start', maxWidth: '86%', gap: 4 }}>
                  <View style={{
                    backgroundColor: ownMessage ? '#075E91' : '#141E31',
                    borderWidth: 1,
                    borderColor: ownMessage ? '#1685B8' : C.border,
                    borderRadius: 16,
                    borderBottomRightRadius: ownMessage ? 5 : 16,
                    borderBottomLeftRadius: ownMessage ? 16 : 5,
                    paddingHorizontal: 13,
                    paddingVertical: 10,
                  }}>
                    <Text style={{ color: C.foreground, fontFamily: 'DMSans', fontSize: 13, lineHeight: 19 }}>{item.body}</Text>
                  </View>
                  <Text style={{ color: '#65748B', fontFamily: 'DMSans', fontSize: 9, alignSelf: ownMessage ? 'flex-end' : 'flex-start' }}>{formatTime(item.createdAt)}</Text>
                </View>
              );
            }}
          />
        ) : null}

        {sendError ? <Text accessibilityRole="alert" style={{ color: '#FF9CA5', fontFamily: 'DMSansMedium', fontSize: 11, paddingHorizontal: 15, paddingBottom: 7 }}>{sendError}</Text> : null}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 9, paddingHorizontal: 13, paddingTop: 10, paddingBottom: 8, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: '#0B1120' }}>
          <TextInput
            accessibilityLabel="Message"
            value={draft}
            onChangeText={setDraft}
            placeholder="Type a private message…"
            placeholderTextColor={C.mutedForeground}
            multiline
            maxLength={4000}
            editable={!sendMessage.isPending && !messages.isError}
            returnKeyType="send"
            submitBehavior="submit"
            onSubmitEditing={send}
            selectionColor={C.primary}
            keyboardAppearance="dark"
            style={{
              flex: 1,
              minHeight: 46,
              maxHeight: 120,
              color: C.foreground,
              backgroundColor: '#111B2C',
              borderWidth: 1,
              borderColor: C.border,
              borderRadius: 15,
              paddingHorizontal: 13,
              paddingTop: 12,
              paddingBottom: 11,
              fontFamily: 'DMSans',
              fontSize: 13,
              textAlignVertical: 'center',
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send message"
            onPress={send}
            disabled={!draft.trim() || sendMessage.isPending || messages.isError}
            style={({ pressed }) => ({
              width: 46,
              height: 46,
              borderRadius: 16,
              backgroundColor: draft.trim() ? C.primary : '#1A2538',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.82 : 1,
            })}
          >
            {sendMessage.isPending ? <ActivityIndicator color={C.primaryForeground} size="small" /> : <Ionicons name="send" color={draft.trim() ? C.primaryForeground : C.mutedForeground} size={18} />}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
