import React, { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { useFonts } from 'expo-font';
import { ClerkProvider, useAuth } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { setAuthTokenGetter, setBaseUrl } from '@workspace/api-client-react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Image, Text, View } from 'react-native';
import colors from '@/constants/colors';

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();
const domain = process.env.EXPO_PUBLIC_DOMAIN?.trim();
const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
const proxyUrl = process.env.EXPO_PUBLIC_CLERK_PROXY_URL?.trim() || undefined;

if (domain) {
  setBaseUrl(domain.startsWith('http') ? domain : `https://${domain}`);
}

function ApiTokenBridge({ children }: React.PropsWithChildren) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    setAuthTokenGetter(() => (isSignedIn ? getToken() : null));
    setReady(true);
    return () => setAuthTokenGetter(null);
  }, [getToken, isLoaded, isSignedIn]);

  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.dark.background,
        }}
      >
        <ActivityIndicator color={colors.dark.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      {children}
    </>
  );
}

function NativeNavigation() {
  return (
    <ApiTokenBridge>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.dark.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </ApiTokenBridge>
  );
}

function MissingConfiguration() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 28,
        backgroundColor: colors.dark.background,
      }}
    >
      <Text style={{ color: colors.dark.foreground, fontSize: 19, fontWeight: '700', textAlign: 'center' }}>
        OKENOVΛ native sign-in is not configured
      </Text>
      <Text style={{ color: colors.dark.mutedForeground, marginTop: 10, textAlign: 'center', lineHeight: 21 }}>
        Add the Clerk publishable key to the native preview environment. No account data or secret key is stored in this app.
      </Text>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    DMSans: DMSans_400Regular,
    DMSansMedium: DMSans_500Medium,
    DMSansSemibold: DMSans_600SemiBold,
    DMSansBold: DMSans_700Bold,
    SpaceGrotesk: SpaceGrotesk_500Medium,
    SpaceGroteskSemibold: SpaceGrotesk_600SemiBold,
    SpaceGroteskBold: SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.dark.background,
        }}
      >
        <Image source={require('../assets/images/okenova-mark.png')} style={{ width: 92, height: 92 }} resizeMode="contain" />
        <Text style={{ color: colors.dark.foreground, marginTop: 12, fontSize: 18, fontWeight: '700' }}>OKENOVΛ</Text>
        <ActivityIndicator color={colors.dark.primary} style={{ marginTop: 20 }} />
      </View>
    );
  }
  if (!publishableKey) return <MissingConfiguration />;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ClerkProvider
            publishableKey={publishableKey}
            tokenCache={tokenCache}
            proxyUrl={proxyUrl}
          >
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <NativeNavigation />
            </KeyboardProvider>
          </GestureHandlerRootView>
          </ClerkProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
