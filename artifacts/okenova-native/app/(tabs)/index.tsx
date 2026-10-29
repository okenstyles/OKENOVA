import { useClerk } from '@clerk/expo';
import {
  getListAnnouncementsQueryKey,
  getListConversationsQueryKey,
  getListOrdersQueryKey,
  getListServicesQueryKey,
  useGetCurrentUser,
  useListAnnouncements,
  useListConversations,
  useListOrders,
} from '@workspace/api-client-react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Pressable, Text, View } from 'react-native';
import { AppButton, AppScreen, BrandLockup, C, EmptyPanel, ErrorPanel, GradientPanel, LoadingPanel, Panel, PageHeading, SectionTitle, StatusBadge } from '@/components/ui';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function DashboardScreen() {
  const { signOut } = useClerk();
  const queryClient = useQueryClient();
  const profile = useGetCurrentUser();
  const conversations = useListConversations({ query: { enabled: Boolean(profile.data) } });
  const orders = useListOrders({ query: { enabled: Boolean(profile.data) } });
  const announcements = useListAnnouncements({ query: { enabled: Boolean(profile.data) } });
  const isOwner = profile.data?.role === 'owner';

  const refresh = () => {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getListAnnouncementsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() }),
    ]);
  };

  return (
    <AppScreen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <BrandLockup compact />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          onPress={() => void signOut()}
          style={{ width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.border }}
        >
          <Ionicons name="log-out-outline" color={C.mutedForeground} size={19} />
        </Pressable>
      </View>

      <GradientPanel style={{ padding: 20 }}>
        <Text style={{ color: C.primary, fontFamily: 'DMSansBold', fontSize: 10, letterSpacing: 1.3 }}>
          {isOwner ? 'OWNER WORKSPACE' : 'YOUR BUSINESS CONNECTION'}
        </Text>
        <Text style={{ color: C.foreground, fontFamily: 'SpaceGroteskBold', fontSize: 25, lineHeight: 32 }}>
          {isOwner ? 'Welcome back' : `Welcome${profile.data?.displayName ? `, ${profile.data.displayName.split(' ')[0]}` : ''}`}
        </Text>
        <Text style={{ color: '#B3C0D5', fontFamily: 'DMSans', fontSize: 12, lineHeight: 18 }}>
          {isOwner
            ? 'Keep customer conversations, service requests and orders moving.'
            : 'Message Okenstyles Graphics And Tech, request a service and track your orders.'}
        </Text>
        <AppButton
          label={isOwner ? 'Open owner inbox' : 'Message the business'}
          onPress={() => router.push('/(tabs)/messages')}
          compact
        />
      </GradientPanel>

      {profile.isError ? (
        <ErrorPanel message="Your account profile could not be refreshed." onRetry={() => void profile.refetch()} />
      ) : null}

      <View>
        <SectionTitle title={isOwner ? 'Business overview' : 'Your activity'} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <SummaryTile
            label={isOwner ? 'Customer threads' : 'Private chat'}
            value={conversations.isLoading ? '…' : `${conversations.data?.length ?? 0}`}
            note={isOwner ? 'Owner-only inbox' : 'Business only'}
          />
          <SummaryTile
            label={isOwner ? 'Open orders' : 'Your orders'}
            value={orders.isLoading ? '…' : `${orders.data?.filter((item) => item.status !== 'completed').length ?? 0}`}
            note={isOwner ? 'Pending or active' : 'Not yet completed'}
          />
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          <SummaryTile
            label="Updates"
            value={announcements.isLoading ? '…' : `${announcements.data?.length ?? 0}`}
            note="Business announcements"
          />
          <SummaryTile
            label="Access"
            value={isOwner ? 'Admin' : 'Customer'}
            note="Confirmed by server"
          />
        </View>
      </View>

      <View>
        <SectionTitle
          title={isOwner ? 'Recent conversations' : 'Recent messages'}
          action="View all"
          onAction={() => router.push('/(tabs)/messages')}
        />
        {conversations.isLoading ? <LoadingPanel label="Loading conversations…" /> : null}
        {conversations.isError ? <ErrorPanel message="Conversations could not be loaded." onRetry={() => void conversations.refetch()} /> : null}
        {conversations.data?.length ? (
          conversations.data.slice(0, 3).map((thread) => (
            <Pressable
              key={thread.id}
              onPress={() => router.push({ pathname: '/(tabs)/conversation/[id]', params: { id: thread.id, customerName: thread.customerName ?? 'Customer' } })}
              style={{ marginBottom: 8 }}
            >
              <Panel style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 13 }}>
                <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: '#0B2639', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="chatbubble-ellipses-outline" color={C.primary} size={18} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text numberOfLines={1} style={{ color: C.foreground, fontFamily: 'DMSansBold', fontSize: 12 }}>
                    {isOwner ? thread.customerName || 'Customer' : 'Okenstyles Graphics And Tech'}
                  </Text>
                  <Text numberOfLines={1} style={{ color: C.mutedForeground, fontFamily: 'DMSans', fontSize: 11 }}>
                    {thread.lastMessage || 'Start your private conversation'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" color={C.mutedForeground} size={16} />
              </Panel>
            </Pressable>
          ))
        ) : !conversations.isLoading && !conversations.isError ? (
          <EmptyPanel title="No conversations yet" detail="Open Messages to start a private thread with the business." />
        ) : null}
      </View>

      <View>
        <SectionTitle
          title={isOwner ? 'Recent orders' : 'Your service requests'}
          action="View all"
          onAction={() => router.push('/(tabs)/orders')}
        />
        {orders.isLoading ? <LoadingPanel label="Loading orders…" /> : null}
        {orders.isError ? <ErrorPanel message="Orders could not be loaded." onRetry={() => void orders.refetch()} /> : null}
        {orders.data?.length ? (
          orders.data.slice(0, 3).map((order) => (
            <Panel key={order.id} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ color: C.foreground, fontFamily: 'DMSansBold', fontSize: 13 }}>{order.serviceName}</Text>
                  {isOwner ? <Text style={{ color: C.mutedForeground, fontFamily: 'DMSans', fontSize: 11 }}>{order.customerName || 'Customer'}</Text> : null}
                  <Text numberOfLines={2} style={{ color: C.mutedForeground, fontFamily: 'DMSans', fontSize: 11, lineHeight: 16 }}>{order.details}</Text>
                </View>
                <StatusBadge status={order.status} />
              </View>
              <Text style={{ color: '#64738C', fontFamily: 'DMSans', fontSize: 10 }}>{formatDate(order.createdAt)}</Text>
            </Panel>
          ))
        ) : !orders.isLoading && !orders.isError ? (
          <EmptyPanel title="No orders yet" detail="Your service requests will appear here with their current status." />
        ) : null}
      </View>

      {isOwner ? (
        <View>
          <SectionTitle title="Owner tools" />
          <View style={{ gap: 9 }}>
            <AppButton label="Draft a reply" onPress={() => router.push('/(tabs)/assistant')} variant="quiet" />
            <AppButton label="Publish an announcement" onPress={() => router.push('/(tabs)/announcements')} variant="quiet" />
          </View>
        </View>
      ) : null}

      <View style={{ gap: 7, paddingTop: 2 }}>
        <Text style={{ color: '#61718C', fontFamily: 'DMSans', fontSize: 10, lineHeight: 16, textAlign: 'center' }}>
          Private customer-to-business communication. Customer accounts cannot see each other’s conversations.
        </Text>
        <Pressable accessibilityRole="button" onPress={refresh} hitSlop={8}>
          <Text style={{ color: C.primary, fontFamily: 'DMSansMedium', fontSize: 11, textAlign: 'center' }}>Refresh workspace</Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}

function SummaryTile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <Panel style={{ flex: 1, minHeight: 102, justifyContent: 'space-between', padding: 13, gap: 5 }}>
      <Text style={{ color: C.mutedForeground, fontFamily: 'DMSansMedium', fontSize: 10 }}>{label}</Text>
      <Text style={{ color: C.foreground, fontFamily: 'SpaceGroteskBold', fontSize: 22 }}>{value}</Text>
      <Text style={{ color: '#72829A', fontFamily: 'DMSans', fontSize: 9 }}>{note}</Text>
    </Panel>
  );
}
