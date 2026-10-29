import {
  getListOrdersQueryKey,
  useGetCurrentUser,
  useListOrders,
  useUpdateOrder,
} from '@workspace/api-client-react';
import type { Order } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { AppButton, AppScreen, C, EmptyPanel, ErrorPanel, LoadingPanel, PageHeading, Panel, StatusBadge } from '@/components/ui';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function OrdersScreen() {
  const queryClient = useQueryClient();
  const profile = useGetCurrentUser();
  const orders = useListOrders();
  const updateOrder = useUpdateOrder();
  const [actionError, setActionError] = useState('');
  const isOwner = profile.data?.role === 'owner';

  const advanceOrder = async (order: Order) => {
    const status: Order['status'] = order.status === 'pending' ? 'in_progress' : 'completed';
    setActionError('');
    try {
      await updateOrder.mutateAsync({ orderId: order.id, data: { status } });
      await queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not update this order.');
    }
  };

  return (
    <AppScreen>
      <PageHeading
        eyebrow={isOwner ? 'Owner workspace' : 'Order tracking'}
        title={isOwner ? 'Service requests' : 'Your orders'}
        description={isOwner
          ? 'Review customer requests and advance each order as work progresses.'
          : 'Track each service request from submission through completion.'}
      />
      {orders.isLoading ? <LoadingPanel label="Loading orders…" /> : null}
      {orders.isError ? <ErrorPanel message="Orders could not be loaded." onRetry={() => void orders.refetch()} /> : null}
      {orders.data?.length ? (
        <View style={{ gap: 10 }}>
          {orders.data.map((order) => (
            <Panel key={order.id}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={{ color: C.foreground, fontFamily: 'SpaceGroteskSemibold', fontSize: 16 }}>{order.serviceName}</Text>
                  {isOwner ? <Text style={{ color: C.primary, fontFamily: 'DMSansMedium', fontSize: 11 }}>{order.customerName || 'Customer'}</Text> : null}
                </View>
                <StatusBadge status={order.status} />
              </View>
              <Text style={{ color: '#D2D9E5', fontFamily: 'DMSans', fontSize: 12, lineHeight: 19 }}>{order.details}</Text>
              <View style={{ borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <Text style={{ color: C.mutedForeground, fontFamily: 'DMSans', fontSize: 10 }}>Requested {formatDate(order.createdAt)}</Text>
                {isOwner && order.status !== 'completed' ? (
                  <AppButton
                    label={order.status === 'pending' ? 'Start work' : 'Mark complete'}
                    onPress={() => void advanceOrder(order)}
                    loading={updateOrder.isPending}
                    compact
                  />
                ) : null}
              </View>
            </Panel>
          ))}
        </View>
      ) : !orders.isLoading && !orders.isError ? (
        <EmptyPanel
          title="No service requests yet"
          detail={isOwner ? 'New customer requests will appear here.' : 'Choose a service to send your first request.'}
        />
      ) : null}
      {actionError ? <Text accessibilityRole="alert" style={{ color: '#FF9CA5', fontFamily: 'DMSansMedium', fontSize: 12 }}>{actionError}</Text> : null}
    </AppScreen>
  );
}
