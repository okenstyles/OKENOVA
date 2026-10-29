import { useAuth } from '@clerk/expo';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import colors from '@/constants/colors';

export default function IndexRoute() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.dark.background }}>
        <ActivityIndicator color={colors.dark.primary} />
      </View>
    );
  }
  return <Redirect href={isSignedIn ? '/(tabs)' : '/(auth)/sign-in'} />;
}
