import { useGetCurrentUser, useListConversations, useOpenConversation } from '@workspace/api-client-react';
import type { Conversation } from '@workspace/api-client-react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AppButton, AppScreen, C, EmptyPanel, ErrorPanel, LoadingPanel, PageHeading, Panel } from '@/components/ui';

export default function MessagesScreen() {
  const profile = useGetCurrentUser();
  const conversations = useListConversations({ query: { enabled: Boolean(profile.data) } });
  const openConversation = useOpenConversation();
  const [actionError, setActionError] = useState('');
  const isOwner = profile.data?.role === 'owner';

  const openThread = (thread: Conversation) => {
    router.push({
      pathname: '/(tabs)/conversation/[id]',
      params: { id: thread.id, customerName: thread.customerName || 'Customer' },
    });
  };

  const startCustomerThread = async () => {
    setActionError('');
    try {
      const thread = conversations.data?.[0] ?? await openConversation.mutateAsync();
      openThread(thread);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not open your private conversation.');
    }
  };

  return (
    <AppScreen>
      <PageHeading
        eyebrow={isOwner ? 'Owner inbox' : 'Private messages'}
        title={isOwner ? 'Conversations' : 'Messages'}
        description={isOwner
          ? 'Manage private customer conversations. Only the business owner can access the full inbox.'
          : 'Your messages are private between you and Okenstyles Graphics And Tech.'}
      />

      {conversations.isLoading ? <LoadingPanel label="Loading your conversations…" /> : null}
      {conversations.isError ? <ErrorPanel message="Your conversation list could not be loaded." onRetry={() => void conversations.refetch()} /> : null}

      {isOwner ? (
        conversations.data?.length ? (
          <View style={{ gap: 9 }}>
            {conversations.data.map((thread) => (
              <Pressable key={thread.id} onPress={() => openThread(thread)}>
                <Panel style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0C2639', borderWidth: 1, borderColor: '#1A4B6E' }}>
                    <Ionicons name="person-outline" color={C.primary} size={20} />
                  </View>
                  <View style={{ flex: 1, gap: 5 }}>
                    <Text numberOfLines={1} style={{ color: C.foreground, fontFamily: 'DMSansBold', fontSize: 13 }}>{thread.customerName || 'Customer'}</Text>
                    <Text numberOfLines={2} style={{ color: C.mutedForeground, fontFamily: 'DMSans', fontSize: 11, lineHeight: 16 }}>{thread.lastMessage || 'No messages yet'}</Text>
                    <Text style={{ color: '#61718C', fontFamily: 'DMSans', fontSize: 9 }}>Private customer thread</Text>
                  </View>
                  <Ionicons name="chevron-forward" color={C.mutedForeground} size={17} />
                </Panel>
              </Pressable>
            ))}
          </View>
        ) : !conversations.isLoading && !conversations.isError ? (
          <EmptyPanel title="Inbox is clear" detail="New customer conversations will appear here." />
        ) : null
      ) : (
        <Panel>
          <View style={{ width: 52, height: 52, borderRadius: 17, backgroundColor: '#0B2639', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="lock-closed-outline" size={22} color={C.primary} />
          </View>
          <Text style={{ color: C.foreground, fontFamily: 'SpaceGroteskSemibold', fontSize: 17 }}>
            Okenstyles Graphics And Tech
          </Text>
          <Text style={{ color: C.mutedForeground, fontFamily: 'DMSans', fontSize: 12, lineHeight: 18 }}>
            Start or continue your private conversation about graphics, photo editing, phone repairs or an existing order.
          </Text>
          {conversations.data?.[0]?.lastMessage ? (
            <View style={{ borderRadius: 12, padding: 12, backgroundColor: '#0C1322', borderWidth: 1, borderColor: C.border }}>
              <Text style={{ color: C.mutedForeground, fontFamily: 'DMSans', fontSize: 11 }}>Latest message</Text>
              <Text numberOfLines={2} style={{ color: C.foreground, fontFamily: 'DMSans', fontSize: 12, marginTop: 5 }}>{conversations.data[0].lastMessage}</Text>
            </View>
          ) : null}
          <AppButton
            label={conversations.data?.length ? 'Continue private chat' : 'Start private chat'}
            onPress={() => void startCustomerThread()}
            loading={openConversation.isPending}
            disabled={conversations.isLoading || conversations.isError}
          />
          <Text style={{ color: '#74839A', fontFamily: 'DMSans', fontSize: 10, lineHeight: 15 }}>
            Customer accounts cannot message each other or open another customer’s conversation.
          </Text>
        </Panel>
      )}

      {actionError ? <Text accessibilityRole="alert" style={{ color: '#FF9CA5', fontFamily: 'DMSansMedium', fontSize: 12 }}>{actionError}</Text> : null}
    </AppScreen>
  );
}
