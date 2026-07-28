import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { MainStackParamList } from '../../navigation/MainNavigator';
import { TabBar, type TabId, type TabPressId } from '../../components/ui/TabBar';
import { ThemeColors } from '../../constants/theme';
import { useCycleRefresh } from '../../context/cycle-refresh-context';
import { useAuth } from '../../providers/AuthProvider';
import { supabase } from '../../../supabaseClient';
import { fetchLogDatesWithActivity, loggedToday as userLoggedToday } from '../../lib/daily-habit';
import { syncHabitNudges } from '../../lib/habit-notifications';

import { PeriodHomeScreen } from './PeriodHomeScreen';
import { LogScreen } from './LogScreen';
import { InsightsScreen } from './InsightsScreen';
import { ProfileScreen } from './ProfileScreen';
import { LearnHubScreen } from '../learn/LearnHubScreen';

type TabsRoute = RouteProp<MainStackParamList, 'Tabs'>;

export function MainTabScreen() {
  const { user } = useAuth();
  const { bumpCycleRefresh } = useCycleRefresh();
  const navigation = useNavigation();
  const route = useRoute<TabsRoute>();
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [showLog, setShowLog] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const uid = user?.id;
      if (!uid || showLog) return;
      void (async () => {
        const [{ data: settings }, dates] = await Promise.all([
          supabase.from('user_settings').select('notifications_enabled').eq('user_id', uid).maybeSingle(),
          fetchLogDatesWithActivity(uid, 21),
        ]);
        await syncHabitNudges({
          loggedToday: userLoggedToday(dates),
          notificationsEnabled: !!settings?.notifications_enabled,
        });
      })();
    }, [user?.id, showLog]),
  );

  useFocusEffect(
    useCallback(() => {
      if (route.params?.openLog) {
        setShowLog(true);
        navigation.setParams({ openLog: undefined } as never);
      }
    }, [navigation, route.params?.openLog]),
  );

  const handleTabPress = (tab: TabPressId) => {
    if (tab === 'add') {
      setShowLog(true);
      return;
    }
    setShowLog(false);
    setActiveTab(tab);
  };

  const handleLogSaved = useCallback(() => {
    bumpCycleRefresh();
    setShowLog(false);
  }, [bumpCycleRefresh]);

  return (
    <View style={styles.root}>
      {showLog && <LogScreen onClose={() => setShowLog(false)} onSaved={handleLogSaved} />}
      {!showLog && activeTab === 'home' && <PeriodHomeScreen onOpenLog={() => setShowLog(true)} />}
      {!showLog && activeTab === 'insights' && <InsightsScreen />}
      {!showLog && activeTab === 'learn' && <LearnHubScreen />}
      {!showLog && activeTab === 'profile' && <ProfileScreen />}

      <TabBar activeTab={showLog ? null : activeTab} onTabPress={handleTabPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: ThemeColors.bgCream,
  },
});
