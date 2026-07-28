import React, { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { MainStackParamList } from '../../navigation/MainNavigator'
import { Check, Sparkles, X } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { ThemeColors, ThemeRadius, ThemeSpacing } from '../../constants/theme'

const DARK = '#1A1A2E'
const DARK_CARD = '#252540'
const FEATURES = ['Unlimited insights & reports', 'Partner view & sharing', 'Priority expert answers']

export function TrialEndedScreen() {
  const insets = useSafeAreaInsets()
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>()
  const [plan, setPlan] = useState<'annual' | 'monthly'>('annual')

  return (
    <View style={styles.root}>
      <Pressable onPress={() => nav.goBack()} hitSlop={16} style={[styles.close, { top: insets.top + 8 }]}>
        <X size={24} color="#FFFFFF" strokeWidth={2} />
      </Pressable>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 52, paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={['#E8618C', '#9C8FC4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroIcon}
        >
          <Sparkles size={36} color="#FFFFFF" strokeWidth={2} />
        </LinearGradient>
        <Text style={styles.title}>Your free trial ended</Text>
        <Text style={styles.sub}>
          Upgrade to Premium to continue accessing all features without limits.
        </Text>
        <View style={styles.featureBlock}>
          {FEATURES.map((f) => (
            <View key={f} style={styles.featureRow}>
              <Check size={18} color="#6ECF9E" strokeWidth={2.5} />
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>
        <Pressable
          onPress={() => setPlan('annual')}
          style={[styles.plan, plan === 'annual' && styles.planOn]}
        >
          <Text style={styles.planTitle}>Annual</Text>
          <Text style={styles.planPrice}>$49.99 / year</Text>
        </Pressable>
        <Pressable
          onPress={() => setPlan('monthly')}
          style={[styles.plan, plan === 'monthly' && styles.planOn]}
        >
          <Text style={styles.planTitle}>Monthly</Text>
          <Text style={styles.planPrice}>$7.99 / month</Text>
        </Pressable>
        <Pressable
          onPress={() => nav.navigate('Paywall')}
          style={({ pressed }) => [styles.cta, pressed && { opacity: 0.92 }]}
        >
          <Text style={styles.ctaText}>Upgrade to Premium</Text>
        </Pressable>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DARK },
  close: { position: 'absolute', right: ThemeSpacing.pagePad, zIndex: 2, padding: 8 },
  content: { paddingHorizontal: ThemeSpacing.pagePad },
  heroIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  sub: {
    fontSize: 15,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  featureBlock: { marginBottom: 28, gap: 14 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureText: { fontSize: 16, fontWeight: '500', color: 'rgba(255,255,255,0.92)', flex: 1 },
  plan: {
    backgroundColor: DARK_CARD,
    borderRadius: ThemeRadius.card,
    padding: 18,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  planOn: { borderColor: ThemeColors.primary },
  planTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  planPrice: { fontSize: 15, fontWeight: '500', color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  cta: {
    backgroundColor: ThemeColors.primary,
    paddingVertical: 17,
    borderRadius: ThemeRadius.button,
    alignItems: 'center',
    marginTop: 8,
  },
  ctaText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
})
