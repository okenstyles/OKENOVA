import {
  getListConversationMessagesQueryKey,
  getListConversationsQueryKey,
  useGetCurrentUser,
  useListConversationMessages,
  useListConversations,
  useListOrders,
  useSendConversationMessage,
} from '@workspace/api-client-react';
import type { ConversationMessage } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AppButton, AppScreen, C, EmptyPanel, ErrorPanel, Field, LoadingPanel, PageHeading, Panel } from '@/components/ui';

type DraftMode = 'reply' | 'summary' | 'requests';

export default function AssistantScreen() {
  const queryClient = useQueryClient();
  const profile = useGetCurrentUser();
  const conversations = useListConversations({ query: { enabled: profile.data?.role === 'owner' } });
  const orders = useListOrders({ query: { enabled: profile.data?.role === 'owner' } });
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState('');
  const [actionError, setActionError] = useState('');
  const selectedThread = conversations.data?.find((thread) => thread.id === selectedId);
  const messages = useListConversationMessages(selectedId, {
    query: { enabled: profile.data?.role === 'owner' && Boolean(selectedId) },
  });

  useEffect(() => {
    if (!selectedId && conversations.data?.[0]) setSelectedId(conversations.data[0].id);
    if (selectedId && conversations.data && !conversations.data.some((thread) => thread.id === selectedId)) {
      setSelectedId(conversations.data[0]?.id ?? '');
    }
  }, [conversations.data, selectedId]);

  const sendMessage = useSendConversationMessage({
    mutation: {
      onSuccess: async () => {
        setDraft('');
        setActionError('');
        await queryClient.invalidateQueries({ queryKey: getListConversationMessagesQueryKey(selectedId) });
        await queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
      },
    },
  });

  if (profile.data?.role !== 'owner') {
    return (
      <AppScreen>
        <PageHeading eyebrow="Owner tool" title="Assistant" />
        <ErrorPanel message="This page is only available to the business owner." />
      </AppScreen>
    );
  }

  const createDraft = (mode: DraftMode) => {
    const conversationText = (messages.data ?? []).map((item: ConversationMessage) => item.body).join(' · ');
    if (mode === 'reply') {
      setDraft(`Thanks for reaching out. ${conversationText ? `I’ve reviewed your note: “${conversationText.slice(0, 140)}${conversationText.length > 140 ? '…' : ''}” ` : ''}I’ll take a closer look and get back to you with the next steps.`);
    } else if (mode === 'summary') {
      setDraft(conversationText ? `Recent conversation: ${conversationText}` : 'No messages in this conversation yet. Start with the customer’s goals, then confirm the next step.');
    } else {
      setDraft(`There are ${orders.data?.length ?? 0} orders in the workspace. Review the order details and confirm scope and timing before making changes.`);
    }
  };

  const approveDraft = () => {
    if (!selectedId || !draft.trim()) return;
    setActionError('');
    sendMessage.mutate({ conversationId: selectedId, data: { body: draft.trim() } }, {
      onError: (error) => setActionError(error instanceof Error ? error.message : 'Could not send the approved reply.'),
    });
  };

  return (
    <AppScreen>
      <PageHeading
        eyebrow="Owner tools · local drafts"
        title="AI assistant"
        description="These are local sample writing tools, not a connected AI service. Review and approve every draft before it is sent."
      />
      {conversations.isLoading ? <LoadingPanel label="Loading owner conversations…" /> : null}
      {conversations.isError ? <ErrorPanel message="The owner inbox could not be loaded." onRetry={() => void conversations.refetch()} /> : null}

      <Panel>
        <Text style={{ color: C.foreground, fontFamily: 'SpaceGroteskSemibold', fontSize: 16 }}>Choose a private conversation</Text>
        {conversations.data?.length ? (
          <View style={{ gap: 8 }}>
            {conversations.data.map((thread) => (
              <Pressable
                key={thread.id}
                onPress={() => {
                  setSelectedId(thread.id);
                  setDraft('');
                  setActionError('');
                }}
                style={{
                  borderWidth: 1,
                  borderColor: selectedId === thread.id ? C.primary : C.border,
                  backgroundColor: selectedId === thread.id ? '#10273B' : '#0C1322',
                  borderRadius: 12,
                  padding: 11,
                }}
              >
                <Text style={{ color: C.foreground, fontFamily: 'DMSansBold', fontSize: 12 }}>{thread.customerName || 'Customer'}</Text>
                <Text numberOfLines={1} style={{ color: C.mutedForeground, fontFamily: 'DMSans', fontSize: 10, marginTop: 4 }}>{thread.lastMessage || 'No messages yet'}</Text>
              </Pressable>
            ))}
          </View>
        ) : !conversations.isLoading && !conversations.isError ? (
          <EmptyPanel title="No customer threads" detail="A draft can be prepared, but it cannot be sent until a conversation exists." />
        ) : null}
      </Panel>

      <Panel>
        <Text style={{ color: C.foreground, fontFamily: 'SpaceGroteskSemibold', fontSize: 16 }}>Draft tools</Text>
        <Text style={{ color: C.mutedForeground, fontFamily: 'DMSans', fontSize: 11, lineHeight: 17 }}>
          Sample text is created locally. Nothing is sent until you edit the draft and tap “Approve and send”.
        </Text>
        <View style={{ gap: 8 }}>
          <AppButton label="Draft a reply" onPress={() => createDraft('reply')} compact />
          <AppButton label="Summarize chat" onPress={() => createDraft('summary')} variant="quiet" compact />
          <AppButton label="Organize requests" onPress={() => createDraft('requests')} variant="quiet" compact />
        </View>
      </Panel>

      <Panel>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Text style={{ color: C.foreground, fontFamily: 'SpaceGroteskSemibold', fontSize: 16 }}>Draft editor</Text>
          <Text style={{ color: draft ? C.warning : C.mutedForeground, fontFamily: 'DMSansBold', fontSize: 9, textTransform: 'uppercase' }}>
            {draft ? 'Pending approval' : 'No draft'}
          </Text>
        </View>
        {selectedThread ? (
          <Text style={{ color: C.mutedForeground, fontFamily: 'DMSans', fontSize: 11 }}>For {selectedThread.customerName || 'Customer'}</Text>
        ) : null}
        {messages.isLoading && selectedId ? <LoadingPanel label="Loading conversation context…" /> : null}
        <Field
          accessibilityLabel="Edit reply draft"
          value={draft}
          onChangeText={setDraft}
          placeholder="Choose a sample action to prepare a local draft…"
          multiline
          maxLength={4000}
          editable={!sendMessage.isPending}
        />
        <Text style={{ color: C.mutedForeground, fontFamily: 'DMSans', fontSize: 10, textAlign: 'right' }}>{draft.length}/4000</Text>
        <View style={{ gap: 8 }}>
          <AppButton label="Discard draft" onPress={() => setDraft('')} variant="quiet" compact disabled={!draft} />
          <AppButton
            label="Approve and send"
            onPress={approveDraft}
            loading={sendMessage.isPending}
            disabled={!draft.trim() || !selectedId || messages.isError}
          />
        </View>
        {actionError ? <Text accessibilityRole="alert" style={{ color: '#FF9CA5', fontFamily: 'DMSansMedium', fontSize: 12 }}>{actionError}</Text> : null}
      </Panel>
    </AppScreen>
  );
}
