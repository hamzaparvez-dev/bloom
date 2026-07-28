import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Bell, HeartPulse, MapPin } from 'lucide-react-native';
import { Colors } from '../../constants';
import { ToggleRow } from '../../components/ui/ToggleRow';
import { Button } from '../../components/ui/Button';

interface PermissionsScreenProps {
  onAllow: () => void;
}

export function PermissionsScreen({ onAllow }: PermissionsScreenProps) {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState(false);
  const [healthData, setHealthData] = useState(false);
  const [location, setLocation] = useState(false);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerBg} pointerEvents="none" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.delay(100)}>
          <Text style={styles.title}>Enable permissions</Text>
          <Text style={styles.subtitle}>For the best experience, we need access to:</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200)} style={styles.toggles}>
          <ToggleRow
            icon={Bell}
            title="Notifications"
            subtitle="Period, ovulation & appointment reminders"
            enabled={notifications}
            onToggle={() => setNotifications(!notifications)}
          />
          <ToggleRow
            icon={HeartPulse}
            title="Health Data"
            subtitle="Sync with Apple Health & HealthKit"
            enabled={healthData}
            onToggle={() => setHealthData(!healthData)}
          />
          <ToggleRow
            icon={MapPin}
            title="Location"
            subtitle="Optional - for local clinic finder"
            enabled={location}
            onToggle={() => setLocation(!location)}
          />
        </Animated.View>
      </ScrollView>

      <Animated.View entering={FadeInDown.delay(400)} style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button title="Allow & Continue →" onPress={onAllow} />
        <Text style={styles.hint}>You can change these anytime in Settings</Text>
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
  toggles: {
    gap: 12,
  },
  footer: {
    paddingTop: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 12,
  },
  hint: {
    fontSize: 13,
    fontWeight: '400',
    color: Colors.muted,
    textAlign: 'center',
  },
});
