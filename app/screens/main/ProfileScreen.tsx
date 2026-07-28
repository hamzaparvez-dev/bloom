import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Baby,
  Bell,
  ChevronRight,
  Crown,
  Leaf,
  LogOut,
  Mail,
  MessageCircleQuestion,
  Ruler,
  Shield,
  Star,
  User,
} from 'lucide-react-native';
import { GroupedRow, GroupedSection } from '../../components/profile/GroupedList';
import { ThemeColors, ThemeRadius, ThemeSpacing } from '../../constants/theme';
import type { MainStackParamList } from '../../navigation/MainNavigator';
import { supabase } from '../../../supabaseClient';
import { useAuth } from '../../providers/AuthProvider';

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [cycleLen, setCycleLen] = useState(28);
  const [periodLen, setPeriodLen] = useState(5);
  const [units, setUnits] = useState<'metric' | 'imperial'>('metric');
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [premium, setPremium] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      let cancelled = false;
      void (async () => {
        const [profileRes, settingsRes] = await Promise.all([
          supabase.from('profiles').select('display_name, email, is_premium').eq('id', user.id).maybeSingle(),
          supabase
            .from('user_settings')
            .select('cycle_length, period_length, units, notifications_enabled')
            .eq('user_id', user.id)
            .maybeSingle(),
        ]);
        if (cancelled) return;
        if (profileRes.data) {
          setDisplayName(profileRes.data.display_name?.trim() ?? '');
          setEmail(profileRes.data.email ?? user.email ?? '');
          setPremium(!!profileRes.data.is_premium);
        } else {
          setEmail(user.email ?? '');
        }
        if (settingsRes.data) {
          setCycleLen(settingsRes.data.cycle_length ?? 28);
          setPeriodLen(settingsRes.data.period_length ?? 5);
          setUnits((settingsRes.data.units as 'metric' | 'imperial') ?? 'metric');
          setNotificationsOn(!!settingsRes.data.notifications_enabled);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [user?.id, user?.email]),
  );

  const onToggleNotifications = useCallback(
    async (next: boolean) => {
      if (!user?.id) return;
      setNotificationsOn(next);
      const { error } = await supabase
        .from('user_settings')
        .update({ notifications_enabled: next })
        .eq('user_id', user.id);
      if (error) setNotificationsOn(!next);
    },
    [user?.id],
  );

  const rateBloom = useCallback(() => {
    void Share.share({
      message: 'I’m tracking with Bloom — pregnancy & cycle care in one beautiful app.',
    });
  }, []);

  const logOut = useCallback(() => {
    nav.navigate('SignOutModal');
  }, [nav]);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: 120 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(displayName || email || '?').trim().charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={styles.name}>{displayName || 'Your profile'}</Text>
        <Text style={styles.email}>{email || user?.email || ''}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Journeys</Text>
        <View style={styles.card}>
          <Pressable
            onPress={() => nav.navigate('PregnancyHome')}
            style={({ pressed }) => [journeyStyles.row, pressed && journeyStyles.pressed, journeyStyles.border]}
          >
            <View style={[journeyStyles.iconWrap, { backgroundColor: '#F0EAFF' }]}>
              <Baby size={17} color="#8B5CF6" strokeWidth={2} />
            </View>
            <Text style={journeyStyles.label}>Pregnancy</Text>
            <ChevronRight size={16} color={ThemeColors.textLight} strokeWidth={2} />
          </Pressable>
          <Pressable
            onPress={() => nav.navigate('TTCHome')}
            style={({ pressed }) => [journeyStyles.row, pressed && journeyStyles.pressed]}
          >
            <View style={[journeyStyles.iconWrap, { backgroundColor: '#ECFDF5' }]}>
              <Leaf size={17} color="#10B981" strokeWidth={2} />
            </View>
            <Text style={journeyStyles.label}>Fertility & conception</Text>
            <ChevronRight size={16} color={ThemeColors.textLight} strokeWidth={2} />
          </Pressable>
        </View>
      </View>

      <GroupedSection title="Account">
        <GroupedRow
          icon={User}
          iconColor={ThemeColors.primary}
          iconBg={ThemeColors.pinkSurface}
          label="Edit profile"
          showChevron
          isLast={false}
          onPress={() => nav.navigate('EditProfile')}
        />
        <GroupedRow
          icon={Crown}
          iconColor={ThemeColors.peach}
          iconBg={ThemeColors.orangeBg}
          label="Subscription"
          value={premium ? 'Premium' : 'Free'}
          showChevron
          isLast={false}
          onPress={() => nav.navigate('ManageSubscription')}
        />
        <GroupedRow
          icon={Shield}
          iconColor={ThemeColors.lavender}
          iconBg="#F0EAFF"
          label="Data & privacy"
          showChevron
          isLast
          onPress={() => nav.navigate('DataPrivacy')}
        />
      </GroupedSection>

      <GroupedSection title="Preferences">
        <GroupedRow
          icon={Ruler}
          iconColor={ThemeColors.sky}
          iconBg="#E8F4FC"
          label="Cycle settings"
          value={`${cycleLen}d cycle · ${periodLen}d period`}
          showChevron
          isLast={false}
          onPress={() => nav.navigate('CycleSettings')}
        />
        <View style={prefRowStyles.row}>
          <View style={[prefRowStyles.iconWrap, { backgroundColor: ThemeColors.orangeBg }]}>
            <Bell size={17} color={ThemeColors.peach} strokeWidth={2} />
          </View>
          <Text style={prefRowStyles.label}>Push notifications</Text>
          <Switch
            value={notificationsOn}
            onValueChange={(v) => void onToggleNotifications(v)}
            trackColor={{ false: ThemeColors.border, true: ThemeColors.pinkSurface }}
            thumbColor={notificationsOn ? ThemeColors.primary : '#f4f3f4'}
          />
        </View>
        <GroupedRow
          icon={Mail}
          iconColor={ThemeColors.textMid}
          iconBg={ThemeColors.border}
          label="Units & format"
          value={units === 'metric' ? 'Metric' : 'Imperial'}
          showChevron
          isLast
          onPress={() => nav.navigate('UnitsFormat')}
        />
      </GroupedSection>

      <GroupedSection title="Support">
        <GroupedRow
          icon={MessageCircleQuestion}
          iconColor={ThemeColors.mint}
          iconBg={ThemeColors.greenBg}
          label="Help center"
          showChevron
          isLast={false}
          onPress={() => nav.navigate('HelpCenter')}
        />
        <GroupedRow
          icon={Mail}
          iconColor={ThemeColors.sky}
          iconBg="#E8F4FC"
          label="Contact us"
          showChevron
          isLast={false}
          onPress={() => nav.navigate('ContactUs')}
        />
        <GroupedRow
          icon={Star}
          iconColor={ThemeColors.primary}
          iconBg={ThemeColors.pinkSurface}
          label="Rate Bloom"
          showChevron
          isLast
          onPress={rateBloom}
        />
      </GroupedSection>

      <GroupedSection title="">
        <GroupedRow
          icon={LogOut}
          iconColor="#E05A5A"
          iconBg="#FDEDED"
          label="Log out"
          danger
          isLast
          onPress={logOut}
        />
      </GroupedSection>

      <Text style={styles.version}>Bloom v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream },
  content: { paddingHorizontal: ThemeSpacing.pagePad },

  avatarSection: { alignItems: 'center', paddingVertical: 16, marginBottom: 8 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: ThemeColors.pinkSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: ThemeColors.primary },
  name: { fontSize: 22, fontWeight: '700', color: ThemeColors.textDark },
  email: { fontSize: 14, fontWeight: '400', color: ThemeColors.textMid, marginTop: 2 },

  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: ThemeColors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    paddingLeft: 4,
  },
  card: { backgroundColor: ThemeColors.surface, borderRadius: ThemeRadius.card, overflow: 'hidden' },

  version: { textAlign: 'center', fontSize: 12, fontWeight: '400', color: ThemeColors.textLight, marginTop: 4 },
});

const journeyStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16, gap: 12 },
  pressed: { opacity: 0.7 },
  border: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ThemeColors.border },
  iconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontSize: 16, fontWeight: '500', color: ThemeColors.textDark },
});

const prefRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 12,
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ThemeColors.border,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flex: 1, fontSize: 16, fontWeight: '500', color: ThemeColors.textDark },
});
