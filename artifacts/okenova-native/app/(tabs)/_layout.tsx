import { useGetCurrentUser } from '@workspace/api-client-react';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { ActivityIndicator, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, ErrorPanel } from '@/components/ui';

export default function TabLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const insets = useSafeAreaInsets();
  const profile = useGetCurrentUser({
    query: {
      enabled: isLoaded && Boolean(isSignedIn),
      staleTime: 0,
      refetchOnMount: 'always',
    },
  });

  if (!isLoaded) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background }}><ActivityIndicator color={C.primary} /></View>;
  }
  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;
  if (profile.isLoading) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background }}><ActivityIndicator color={C.primary} /><Text style={{ color: C.mutedForeground, marginTop: 12 }}>Confirming account access…</Text></View>;
  }
  if (profile.isError || !profile.data) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background, padding: 24 }}>
        <ErrorPanel message="The server could not confirm this account's permissions. Check your connection and try again." onRetry={() => void profile.refetch()} />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.mutedForeground,
        tabBarLabelStyle: { fontFamily: 'DMSansMedium', fontSize: 10, marginBottom: 2 },
        tabBarStyle: {
          backgroundColor: '#0B1120',
          borderTopColor: C.border,
          borderTopWidth: 1,
          height: 58 + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 7),
        },
        sceneStyle: { backgroundColor: C.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ focused, size }) => <Ionicons name="home-outline" color={focused ? C.primary : C.mutedForeground} size={size} /> }} />
      <Tabs.Screen name="messages" options={{ title: 'Messages', tabBarIcon: ({ focused, size }) => <Ionicons name="chatbubble-ellipses-outline" color={focused ? C.primary : C.mutedForeground} size={size} /> }} />
      <Tabs.Screen name="services" options={{ title: 'Services', tabBarIcon: ({ focused, size }) => <Ionicons name="briefcase-outline" color={focused ? C.primary : C.mutedForeground} size={size} /> }} />
      <Tabs.Screen name="orders" options={{ title: 'Orders', tabBarIcon: ({ focused, size }) => <Ionicons name="receipt-outline" color={focused ? C.primary : C.mutedForeground} size={size} /> }} />
      <Tabs.Screen name="announcements" options={{ title: 'Updates', tabBarIcon: ({ focused, size }) => <Ionicons name="megaphone-outline" color={focused ? C.primary : C.mutedForeground} size={size} /> }} />
      <Tabs.Screen name="assistant" options={{ href: null, title: 'Assistant' }} />
      <Tabs.Screen name="conversation/[id]" options={{ href: null, title: 'Conversation', tabBarStyle: { display: 'none' } }} />
    </Tabs>
  );
}
