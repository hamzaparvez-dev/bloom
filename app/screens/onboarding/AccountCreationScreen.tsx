import React, { useState } from 'react';
import { Alert, View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Mail, ShieldCheck } from 'lucide-react-native';
import { Colors } from '../../constants';
import { Button } from '../../components/ui/Button';
import { TextInput } from '../../components/ui/TextInput';
import { setOnboardingCredentials } from '../../auth/onboarding-credentials';

interface AccountCreationScreenProps {
  onCreateAccount: () => void;
}

export function AccountCreationScreen({ onCreateAccount }: AccountCreationScreenProps) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerBg} pointerEvents="none" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Animated.View entering={FadeInDown.delay(100)}>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Save your data securely</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200)} style={styles.socialButtons}>
          <Button
            title="Continue with Google"
            variant="social"
            icon={<Mail size={18} color={Colors.dark} strokeWidth={2} />}
            onPress={() =>
              Alert.alert('Coming soon', 'Google sign-in will be available in a future update. Use email below for now.')
            }
          />
          <Button
            title="Continue with Apple"
            variant="socialDark"
            icon={<ShieldCheck size={18} color={Colors.white} strokeWidth={2} />}
            onPress={() =>
              Alert.alert('Coming soon', 'Sign in with Apple will be available in a future update. Use email below for now.')
            }
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300)}>
          <Text style={styles.divider}>— or sign up with email —</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400)} style={styles.fields}>
          <TextInput
            label="Email address"
            placeholder="you@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
          <TextInput
            label="Password"
            placeholder="••••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </Animated.View>
      </ScrollView>

      <Animated.View entering={FadeInDown.delay(500)} style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          title="Create Account →"
          onPress={() => {
            if (!email.trim() || !password) {
              Alert.alert('Missing fields', 'Enter email and password.');
              return;
            }
            if (password.length < 6) {
              Alert.alert('Password too short', 'Use at least 6 characters.');
              return;
            }
            setOnboardingCredentials(email, password);
            onCreateAccount();
          }}
        />
        <Text style={styles.terms}>
          By signing up you agree to our Terms & Privacy Policy
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  headerBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: Colors.pinkSurface,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 60,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.dark,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: Colors.muted,
    marginBottom: 8,
  },
  socialButtons: {
    gap: 12,
  },
  divider: {
    fontSize: 13,
    fontWeight: '400',
    color: Colors.muted,
    textAlign: 'center',
    marginVertical: 4,
  },
  fields: {
    gap: 12,
  },
  footer: {
    paddingTop: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 12,
  },
  terms: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.muted,
    textAlign: 'center',
    maxWidth: 270,
  },
});
