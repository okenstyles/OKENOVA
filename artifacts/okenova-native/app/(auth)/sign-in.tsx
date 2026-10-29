import { useSignIn, useSSO } from '@clerk/expo';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { AppButton, AppScreen, BrandLockup, C, Field, GradientPanel, PageHeading } from '@/components/ui';

WebBrowser.maybeCompleteAuthSession();

function useWarmUpGoogleAuth() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}

export default function SignInScreen() {
  const { signIn, fetchStatus } = useSignIn();
  const { startSSOFlow } = useSSO();
  const router = useRouter();
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [needsCode, setNeedsCode] = useState(false);
  const [formError, setFormError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  useWarmUpGoogleAuth();

  const finalize = async () => {
    await signIn.finalize({
      navigate: async ({ session }) => {
        if (session?.currentTask) {
          setFormError('Your account needs an additional verification step. Contact the business owner for help.');
          return;
        }
        router.replace('/');
      },
    });
  };

  const submitPassword = async () => {
    setFormError('');
    const { error } = await signIn.password({ emailAddress: emailAddress.trim(), password });
    if (error) {
      setFormError(error.message || 'Check your email and password, then try again.');
      return;
    }
    if (signIn.status === 'complete') {
      await finalize();
      return;
    }

    if (signIn.status === 'needs_client_trust' || signIn.status === 'needs_second_factor') {
      const supportsEmailCode = signIn.supportedSecondFactors.some((factor) => factor.strategy === 'email_code');
      if (!supportsEmailCode) {
        setFormError('This account requires a verification method that is not configured for the native app.');
        return;
      }
      const { error: codeError } = await signIn.mfa.sendEmailCode();
      if (codeError) {
        setFormError(codeError.message || 'Could not send the verification code.');
        return;
      }
      setNeedsCode(true);
      return;
    }
    setFormError('Sign-in needs an additional step that is not supported in this app yet.');
  };

  const verifyCode = async () => {
    setFormError('');
    const { error } = await signIn.mfa.verifyEmailCode({ code: code.trim() });
    if (error) {
      setFormError(error.message || 'That verification code could not be accepted.');
      return;
    }
    if (signIn.status === 'complete') await finalize();
    else setFormError('The account still needs another verification step.');
  };

  const signInWithGoogle = async () => {
    setFormError('');
    setGoogleLoading(true);
    try {
      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: 'okenova-native',
        path: 'oauth-native-callback',
      });
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl,
      });
      if (!createdSessionId || !setActive) {
        setFormError('Google sign-in needs another account step. Try email and password or finish setup in Clerk.');
        return;
      }
      await setActive({
        session: createdSessionId,
        navigate: async () => router.replace('/'),
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Google sign-in could not be completed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const busy = fetchStatus === 'fetching' || googleLoading;

  return (
    <AppScreen contentStyle={{ flexGrow: 1, justifyContent: 'center', paddingTop: 30, paddingBottom: 40 }}>
      <View style={{ alignItems: 'center', marginBottom: 18 }}>
        <BrandLockup />
      </View>
      <GradientPanel>
        <PageHeading
          eyebrow="Secure account access"
          title={needsCode ? 'Verify your sign-in' : 'Welcome back'}
          description={needsCode ? 'Enter the email verification code to continue.' : 'Sign in to your private OKENOVΛ workspace.'}
        />
        {!needsCode ? (
          <>
            <Field
              label="Email address"
              value={emailAddress}
              onChangeText={setEmailAddress}
              placeholder="you@example.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              editable={!busy}
              returnKeyType="next"
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
              textContentType="password"
              editable={!busy}
              onSubmitEditing={() => void submitPassword()}
              returnKeyType="go"
            />
            <AppButton
              label="Sign in"
              onPress={() => void submitPassword()}
              loading={fetchStatus === 'fetching'}
              disabled={!emailAddress.trim() || !password}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 1 }}>
              <View style={{ height: 1, flex: 1, backgroundColor: '#34415B' }} />
              <Text style={{ color: C.mutedForeground, fontFamily: 'DMSans', fontSize: 11 }}>OR</Text>
              <View style={{ height: 1, flex: 1, backgroundColor: '#34415B' }} />
            </View>
            <AppButton
              label="Continue with Google"
              onPress={() => void signInWithGoogle()}
              variant="outline"
              loading={googleLoading}
              disabled={busy}
            />
            <Text style={{ color: C.mutedForeground, fontFamily: 'DMSans', fontSize: 11, lineHeight: 17 }}>
              Google authentication opens a secure system-browser sign-in. Email and password stay in the native app.
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, marginTop: 3 }}>
              <Text style={{ color: C.mutedForeground, fontFamily: 'DMSans', fontSize: 12 }}>New to OKENOVΛ?</Text>
              <Link href="/(auth)/sign-up" asChild>
                <Pressable accessibilityRole="link" hitSlop={8}>
                  <Text style={{ color: C.primary, fontFamily: 'DMSansBold', fontSize: 12 }}>Create account</Text>
                </Pressable>
              </Link>
            </View>
          </>
        ) : (
          <>
            <Field
              label="Email verification code"
              value={code}
              onChangeText={setCode}
              placeholder="Enter the code from your email"
              keyboardType="number-pad"
              autoComplete="one-time-code"
              editable={!busy}
            />
            <AppButton label="Verify and continue" onPress={() => void verifyCode()} loading={busy} disabled={!code.trim()} />
            <AppButton
              label="Send a new code"
              onPress={() => void signIn.mfa.sendEmailCode()}
              variant="quiet"
              compact
              disabled={busy}
            />
            <AppButton
              label="Back to sign in"
              onPress={() => {
                setNeedsCode(false);
                setCode('');
                setFormError('');
                signIn.reset();
              }}
              variant="quiet"
              compact
              disabled={busy}
            />
          </>
        )}
        {formError ? (
          <Text accessibilityRole="alert" style={{ color: '#FF9CA5', fontFamily: 'DMSansMedium', fontSize: 12, lineHeight: 18 }}>
            {formError}
          </Text>
        ) : null}
      </GradientPanel>
      <Text style={{ color: '#61718C', fontFamily: 'DMSans', fontSize: 10, textAlign: 'center', lineHeight: 16, marginTop: 12 }}>
        Admin access is assigned by the server to the verified owner account. Other accounts use customer access.
      </Text>
    </AppScreen>
  );
}
