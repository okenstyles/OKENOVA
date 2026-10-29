import { useSignUp } from '@clerk/expo';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AppButton, AppScreen, BrandLockup, C, Field, GradientPanel, PageHeading } from '@/components/ui';

export default function SignUpScreen() {
  const { signUp, fetchStatus } = useSignUp();
  const router = useRouter();
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'details' | 'verify'>('details');
  const [formError, setFormError] = useState('');
  const busy = fetchStatus === 'fetching';

  const createAccount = async () => {
    setFormError('');
    const { error } = await signUp.password({ emailAddress: emailAddress.trim(), password });
    if (error) {
      setFormError(error.message || 'Could not start account creation.');
      return;
    }
    const { error: codeError } = await signUp.verifications.sendEmailCode();
    if (codeError) {
      setFormError(codeError.message || 'Could not send the verification code.');
      return;
    }
    setStep('verify');
  };

  const verifyEmail = async () => {
    setFormError('');
    const { error } = await signUp.verifications.verifyEmailCode({ code: code.trim() });
    if (error) {
      setFormError(error.message || 'That verification code could not be accepted.');
      return;
    }
    if (signUp.status !== 'complete') {
      setFormError('Your account has additional requirements. Complete them in the Clerk sign-up settings.');
      return;
    }
    await signUp.finalize({
      navigate: async ({ session }) => {
        if (session?.currentTask) {
          setFormError('Your account needs another verification step before it can continue.');
          return;
        }
        router.replace('/');
      },
    });
  };

  return (
    <AppScreen contentStyle={{ flexGrow: 1, justifyContent: 'center', paddingTop: 30, paddingBottom: 40 }}>
      <View style={{ alignItems: 'center', marginBottom: 18 }}>
        <BrandLockup />
      </View>
      <GradientPanel>
        <PageHeading
          eyebrow="Customer registration"
          title={step === 'verify' ? 'Check your email' : 'Create your account'}
          description={step === 'verify' ? `Enter the code sent to ${emailAddress}.` : 'Create a customer account to request services and message the business privately.'}
        />
        {step === 'details' ? (
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
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Create a password"
              secureTextEntry
              textContentType="newPassword"
              editable={!busy}
            />
            <AppButton
              label="Create customer account"
              onPress={() => void createAccount()}
              loading={busy}
              disabled={!emailAddress.trim() || password.length < 8}
            />
            <View nativeID="clerk-captcha" />
            <Text style={{ color: C.mutedForeground, fontFamily: 'DMSans', fontSize: 11, lineHeight: 17 }}>
              New accounts start with customer permissions. Owner access is assigned separately by the server.
            </Text>
          </>
        ) : (
          <>
            <Field
              label="Verification code"
              value={code}
              onChangeText={setCode}
              placeholder="Enter the code from your email"
              keyboardType="number-pad"
              autoComplete="one-time-code"
              editable={!busy}
            />
            <AppButton label="Verify email" onPress={() => void verifyEmail()} loading={busy} disabled={!code.trim()} />
            <AppButton
              label="Send a new code"
              onPress={() => void signUp.verifications.sendEmailCode()}
              variant="quiet"
              compact
              disabled={busy}
            />
            <View nativeID="clerk-captcha" />
          </>
        )}
        {formError ? (
          <Text accessibilityRole="alert" style={{ color: '#FF9CA5', fontFamily: 'DMSansMedium', fontSize: 12, lineHeight: 18 }}>
            {formError}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, marginTop: 4 }}>
          <Text style={{ color: C.mutedForeground, fontFamily: 'DMSans', fontSize: 12 }}>Already registered?</Text>
          <Link href="/(auth)/sign-in" asChild>
            <Pressable accessibilityRole="link" hitSlop={8}>
              <Text style={{ color: C.primary, fontFamily: 'DMSansBold', fontSize: 12 }}>Sign in</Text>
            </Pressable>
          </Link>
        </View>
      </GradientPanel>
    </AppScreen>
  );
}
