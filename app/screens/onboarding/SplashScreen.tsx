import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { ChevronRight } from 'lucide-react-native';
import { Colors } from '../../constants';
import { BloomLogoIcon } from '../../components/ui/BloomLogoIcon';
import { getImage } from '../../lib/app-images';

interface SplashScreenProps {
  onStart: () => void;
  onOpenReturningAuth?: () => void;
}

export function SplashScreen({ onStart, onOpenReturningAuth }: SplashScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.bgFill} pointerEvents="none" />

      {/* Decorative circles — plain View holds position, Animated.View only handles opacity */}
      <View style={styles.decorCircle1} pointerEvents="none">
        <Animated.View entering={FadeIn.delay(200)} style={StyleSheet.absoluteFill} />
      </View>
      <View style={styles.decorCircle2} pointerEvents="none">
        <Animated.View entering={FadeIn.delay(300)} style={StyleSheet.absoluteFill} />
      </View>
      <View style={styles.decorCircle3} pointerEvents="none">
        <Animated.View entering={FadeIn.delay(100)} style={StyleSheet.absoluteFill} />
      </View>

      <Image
        source={getImage('onboarding')}
        style={[styles.onboardingArt, { top: insets.top + 48 }]}
        contentFit="contain"
        pointerEvents="none"
        accessibilityIgnoresInvertColors
      />

      {/* Logo */}
      <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.logoArea}>
        <BloomLogoIcon size={120} />
        <Text style={styles.brandName}>bloom</Text>
        <Text style={styles.tagline}>Your fertility & pregnancy companion</Text>
      </Animated.View>

      {/* Start button */}
      <Animated.View entering={FadeInDown.delay(600)} style={[styles.bottomArea, { paddingBottom: insets.bottom + 40 }]}>
        <Pressable
          onPress={onStart}
          style={({ pressed }) => [
            styles.startButton,
            pressed && styles.startButtonPressed,
          ]}
        >
          <View style={styles.startButtonOuter}>
            <View style={styles.startButtonMiddle}>
              <View style={styles.startButtonInner}>
                <ChevronRight size={16} color={Colors.white} strokeWidth={3} />
              </View>
            </View>
          </View>
        </Pressable>

        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>

        {onOpenReturningAuth ? (
          <Pressable onPress={onOpenReturningAuth} hitSlop={12} style={styles.signInLinkWrap}>
            <Text style={styles.signInLink}>Already using Bloom? Sign in</Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
  },
  bgFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.bgDeep,
  },
  decorCircle1: {
    position: 'absolute',
    top: 120,
    left: -30,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#FCDDEA',
  },
  decorCircle2: {
    position: 'absolute',
    top: 100,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.purple,
  },
  decorCircle3: {
    position: 'absolute',
    top: 250,
    right: 60,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: Colors.orangeBg,
  },
  onboardingArt: {
    position: 'absolute',
    alignSelf: 'center',
    width: 280,
    height: 280,
    opacity: 0.42,
  },
  logoArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  brandName: {
    fontSize: 52,
    fontWeight: '800',
    color: Colors.pink,
    marginTop: 16,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '400',
    color: Colors.muted,
  },
  bottomArea: {
    alignItems: 'center',
    gap: 24,
  },
  startButton: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonPressed: {
    transform: [{ scale: 0.96 }],
  },
  startButtonOuter: {
    width: 79,
    height: 79,
    borderRadius: 40,
    backgroundColor: '#FFE7EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonMiddle: {
    width: 59,
    height: 59,
    borderRadius: 30,
    backgroundColor: '#FFD0D5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonInner: {
    width: 39,
    height: 39,
    borderRadius: 20,
    backgroundColor: '#FF647C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  dotActive: {
    backgroundColor: Colors.pink,
  },
  signInLinkWrap: {
    paddingVertical: 8,
  },
  signInLink: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.pink,
  },
});
