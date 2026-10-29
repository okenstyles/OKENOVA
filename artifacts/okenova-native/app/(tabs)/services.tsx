import {
  getListServicesQueryKey,
  useCreateOrder,
  useGetCurrentUser,
  useListServices,
  useUpdateService,
} from '@workspace/api-client-react';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { AppButton, AppScreen, C, EmptyPanel, ErrorPanel, Field, LoadingPanel, PageHeading, Panel } from '@/components/ui';

export default function ServicesScreen() {
  const queryClient = useQueryClient();
  const profile = useGetCurrentUser();
  const services = useListServices();
  const createOrder = useCreateOrder();
  const updateService = useUpdateService();
  const [selectedId, setSelectedId] = useState('');
  const [details, setDetails] = useState('');
  const [formError, setFormError] = useState('');
  const isOwner = profile.data?.role === 'owner';

  const requestService = async () => {
    if (!selectedId || !details.trim()) {
      setFormError('Choose a service and describe what you need.');
      return;
    }
    setFormError('');
    try {
      await createOrder.mutateAsync({ data: { serviceId: selectedId, details: details.trim() } });
      setDetails('');
      setSelectedId('');
      await queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      Alert.alert('Request submitted', 'Your service request is now in your Orders list.');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not submit this request.');
    }
  };

  const toggleAvailability = async (serviceId: string, available: boolean) => {
    try {
      await updateService.mutateAsync({ serviceId, data: { available: !available } });
      await queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not update service availability.');
    }
  };

  return (
    <AppScreen>
      <PageHeading
        eyebrow={isOwner ? 'Owner tools' : 'Business services'}
        title="Services"
        description={isOwner ? 'Review the service catalog and control availability.' : 'Choose a service and send a request directly to the business.'}
      />

      {services.isLoading ? <LoadingPanel label="Loading services…" /> : null}
      {services.isError ? <ErrorPanel message="The service list could not be loaded." onRetry={() => void services.refetch()} /> : null}
      {services.data?.length ? (
        <View style={{ gap: 10 }}>
          {services.data.map((service) => {
            const isSelected = selectedId === service.id;
            return (
              <Panel key={service.id} style={{ borderColor: isSelected ? '#237FB0' : C.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <View style={{ flex: 1, gap: 7 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 35, height: 35, borderRadius: 12, backgroundColor: '#0B2639', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="sparkles-outline" color={C.primary} size={17} />
                      </View>
                      <Text style={{ flex: 1, color: C.foreground, fontFamily: 'SpaceGroteskSemibold', fontSize: 16 }}>{service.name}</Text>
                    </View>
                    <Text style={{ color: C.primary, fontFamily: 'DMSansBold', fontSize: 10, letterSpacing: 0.8 }}>{service.category.toUpperCase()}</Text>
                    <Text style={{ color: C.mutedForeground, fontFamily: 'DMSans', fontSize: 12, lineHeight: 18 }}>{service.description}</Text>
                    {service.priceLabel ? <Text style={{ color: '#C9D6E9', fontFamily: 'DMSansMedium', fontSize: 11 }}>{service.priceLabel}</Text> : null}
                  </View>
                  <View style={{ width: 7, height: 7, borderRadius: 4, marginTop: 6, backgroundColor: service.available ? C.success : C.mutedForeground }} />
                </View>
                <View style={{ flexDirection: 'row', gap: 9 }}>
                  {isOwner ? (
                    <AppButton
                      label={service.available ? 'Mark unavailable' : 'Make available'}
                      onPress={() => void toggleAvailability(service.id, service.available)}
                      variant="quiet"
                      compact
                      loading={updateService.isPending}
                    />
                  ) : service.available ? (
                    <AppButton
                      label={isSelected ? 'Selected' : 'Request this service'}
                      onPress={() => {
                        setSelectedId(service.id);
                        setFormError('');
                      }}
                      compact
                    />
                  ) : (
                    <Text style={{ color: C.mutedForeground, fontFamily: 'DMSansMedium', fontSize: 11, paddingVertical: 10 }}>Currently unavailable</Text>
                  )}
                </View>
              </Panel>
            );
          })}
        </View>
      ) : !services.isLoading && !services.isError ? (
        <EmptyPanel title="No services listed" detail="The business service catalog has not been configured yet." />
      ) : null}

      {selectedId && !isOwner ? (
        <Panel>
          <Text style={{ color: C.foreground, fontFamily: 'SpaceGroteskSemibold', fontSize: 16 }}>Describe your request</Text>
          <Field
            label="What would you like done?"
            value={details}
            onChangeText={setDetails}
            placeholder="Add the details the business needs to review…"
            multiline
            maxLength={4000}
            editable={!createOrder.isPending}
          />
          <Text style={{ color: C.mutedForeground, fontFamily: 'DMSans', fontSize: 10, textAlign: 'right' }}>{details.length}/4000</Text>
          <AppButton label="Send service request" onPress={() => void requestService()} loading={createOrder.isPending} disabled={!details.trim()} />
        </Panel>
      ) : null}
      {formError ? <Text accessibilityRole="alert" style={{ color: '#FF9CA5', fontFamily: 'DMSansMedium', fontSize: 12 }}>{formError}</Text> : null}
    </AppScreen>
  );
}
