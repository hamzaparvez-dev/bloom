import React from 'react';
import { Pressable } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';
import { ThemeColors } from '../constants/theme';

import { MainTabScreen } from '../screens/main/MainTabScreen';
import { CycleCalendarScreen } from '../screens/main/CycleCalendarScreen';
import { PeriodStartedScreen } from '../screens/main/PeriodStartedScreen';
import { SymptomPickerScreen } from '../screens/main/SymptomPickerScreen';
import { MoodTrackerScreen } from '../screens/main/MoodTrackerScreen';
import { FertileWindowScreen } from '../screens/main/FertileWindowScreen';
import { OvulationLogScreen } from '../screens/main/OvulationLogScreen';
import { BBTLogScreen } from '../screens/main/BBTLogScreen';

import { PregnancyHomeScreen } from '../screens/pregnancy/PregnancyHomeScreen';
import { BabyGrowthScreen } from '../screens/pregnancy/BabyGrowthScreen';
import { PregnancySymptomsScreen } from '../screens/pregnancy/PregnancySymptomsScreen';
import { KickCounterScreen } from '../screens/pregnancy/KickCounterScreen';
import { ContractionTimerScreen } from '../screens/pregnancy/ContractionTimerScreen';
import { WeightTrackerScreen } from '../screens/pregnancy/WeightTrackerScreen';
import { AppointmentsScreen } from '../screens/pregnancy/AppointmentsScreen';
import { HospitalBagScreen } from '../screens/pregnancy/HospitalBagScreen';
import { MilestoneJournalScreen } from '../screens/pregnancy/MilestoneJournalScreen';

import { TTCHomeScreen } from '../screens/ttc/TTCHomeScreen';
import { ConceptionTipsScreen } from '../screens/ttc/ConceptionTipsScreen';
import { FertilityScoreScreen } from '../screens/ttc/FertilityScoreScreen';
import { PartnerHealthScreen } from '../screens/ttc/PartnerHealthScreen';
import { TTCJournalScreen } from '../screens/ttc/TTCJournalScreen';
import { TTCJournalNewEntryScreen } from '../screens/ttc/TTCJournalNewEntryScreen';
import { FertilityLogScreen } from '../screens/ttc/FertilityLogScreen';
import { DoctorReportScreen } from '../screens/ttc/DoctorReportScreen';

import { CycleAnalysisScreen } from '../screens/insights/CycleAnalysisScreen';
import { SymptomPatternsScreen } from '../screens/insights/SymptomPatternsScreen';
import { InsightMoodPatternsScreen } from '../screens/insights/InsightMoodPatternsScreen';
import { SleepEnergyScreen } from '../screens/insights/SleepEnergyScreen';
import { PerimenopauseScreen } from '../screens/insights/PerimenopauseScreen';
import { PartnerModeScreen } from '../screens/insights/PartnerModeScreen';
import { HealthReportScreen } from '../screens/insights/HealthReportScreen';

import { ArticleDetailScreen } from '../screens/learn/ArticleDetailScreen';
import { CategoryBrowseScreen } from '../screens/learn/CategoryBrowseScreen';
import { TopicArticlesScreen } from '../screens/learn/TopicArticlesScreen';
import { AskExpertScreen } from '../screens/learn/AskExpertScreen';
import { CommunityScreen } from '../screens/learn/CommunityScreen';
import { CreateCommunityPostScreen } from '../screens/learn/CreateCommunityPostScreen';
import { PostDetailScreen } from '../screens/learn/PostDetailScreen';
import { RealStoriesScreen } from '../screens/learn/RealStoriesScreen';
import { RealStoryDetailScreen } from '../screens/learn/RealStoryDetailScreen';

import { EditProfileScreen } from '../screens/profile/EditProfileScreen';
import { DataPrivacyScreen } from '../screens/profile/DataPrivacyScreen';
import { DataExportScreen } from '../screens/profile/DataExportScreen';
import { PrivacyPolicyScreen } from '../screens/profile/PrivacyPolicyScreen';
import { TermsOfUseScreen } from '../screens/profile/TermsOfUseScreen';
import { CycleSettingsScreen } from '../screens/profile/CycleSettingsScreen';
import { NotifSettingsScreen } from '../screens/profile/NotifSettingsScreen';
import { UnitsFormatScreen } from '../screens/profile/UnitsFormatScreen';
import { HelpCenterScreen } from '../screens/profile/HelpCenterScreen';
import { ContactUsScreen } from '../screens/profile/ContactUsScreen';
import { PaywallScreen } from '../screens/profile/PaywallScreen';
import { ManageSubscriptionScreen } from '../screens/profile/ManageSubscriptionScreen';

import { EmptyJourneyScreen } from '../screens/system/EmptyJourneyScreen';
import { EmptyInsightsScreen } from '../screens/system/EmptyInsightsScreen';
import { EmptyInsightsSymptomsScreen } from '../screens/system/EmptyInsightsSymptomsScreen';
import { EmptyArticlesScreen } from '../screens/system/EmptyArticlesScreen';
import { NotificationsOffScreen } from '../screens/system/NotificationsOffScreen';
import { NotificationsCaughtUpScreen } from '../screens/system/NotificationsCaughtUpScreen';
import { NotificationsInboxScreen } from '../screens/system/NotificationsInboxScreen';
import { OfflineScreen } from '../screens/system/OfflineScreen';
import { TrialEndedScreen } from '../screens/system/TrialEndedScreen';
import { StartPeriodSheetScreen } from '../screens/system/StartPeriodSheetScreen';
import { AllSavedModalScreen } from '../screens/system/AllSavedModalScreen';
import { LogTodayModalScreen } from '../screens/system/LogTodayModalScreen';
import { SignOutModalScreen } from '../screens/system/SignOutModalScreen';
import { CycleRefreshProvider } from '../context/cycle-refresh-context';
import { AccessProvider } from '../hooks/useAccess';

export type MainStackParamList = {
  Tabs: { openLog?: boolean } | undefined;
  CycleCalendar: undefined;
  PeriodStarted: undefined;
  SymptomPicker: undefined;
  MoodTracker: undefined;
  FertileWindow: undefined;
  OvulationLog: undefined;
  BBTLog: undefined;
  PregnancyHome: undefined;
  BabyGrowth: undefined;
  PregnancySymptoms: undefined;
  KickCounter: undefined;
  ContractionTimer: undefined;
  WeightTracker: undefined;
  Appointments: undefined;
  HospitalBag: undefined;
  MilestoneJournal: undefined;
  TTCHome: undefined;
  ConceptionTips: undefined;
  FertilityScore: undefined;
  PartnerHealth: undefined;
  TTCJournal: undefined;
  TTCJournalNew: undefined;
  FertilityLog: undefined;
  DoctorReport: undefined;
  CycleAnalysis: undefined;
  SymptomPatterns: undefined;
  InsightMoodPatterns: undefined;
  SleepEnergy: undefined;
  Perimenopause: undefined;
  PartnerMode: undefined;
  HealthReport: { detailLevel?: 'summary' | 'full' } | undefined;
  ArticleDetail: { articleId: string };
  CategoryBrowse: undefined;
  TopicArticles: { topicId: string };
  AskExpert: undefined;
  Community: undefined;
  CreateCommunityPost: undefined;
  PostDetail: { postId: string };
  RealStories: undefined;
  RealStoryDetail: { storyId: string };
  EditProfile: undefined;
  DataPrivacy: undefined;
  DataExport: undefined;
  PrivacyPolicy: undefined;
  TermsOfUse: undefined;
  CycleSettings: undefined;
  NotifSettings: undefined;
  UnitsFormat: undefined;
  HelpCenter: undefined;
  ContactUs: undefined;
  Paywall: { contextHeadline?: string } | undefined;
  ManageSubscription: undefined;
  EmptyJourney: undefined;
  EmptyInsights: undefined;
  EmptyInsightsSymptoms: undefined;
  EmptyArticles: undefined;
  NotificationsOff: undefined;
  NotificationsCaughtUp: undefined;
  NotificationsInbox: undefined;
  Offline: undefined;
  TrialEnded: undefined;
  StartPeriodSheet: undefined;
  AllSavedModal: undefined;
  LogTodayModal: undefined;
  SignOutModal: undefined;
};

const Stack = createNativeStackNavigator<MainStackParamList>();

function BackButton() {
  const nav = useNavigation();
  return (
    <Pressable onPress={() => nav.goBack()} hitSlop={12} style={{ marginLeft: -4 }}>
      <ChevronLeft size={24} color={ThemeColors.textDark} strokeWidth={2} />
    </Pressable>
  );
}

const detailScreenOptions = {
  headerShown: true as const,
  headerShadowVisible: false,
  headerStyle: { backgroundColor: ThemeColors.bgCream },
  headerTitleStyle: { fontSize: 17, fontWeight: '600' as const, color: ThemeColors.textDark },
  headerLeft: () => <BackButton />,
  headerBackVisible: false,
};

const transparentModalOptions = {
  headerShown: false as const,
  presentation: 'transparentModal' as const,
  animation: 'fade' as const,
  contentStyle: { backgroundColor: 'transparent' },
};

export function MainNavigator() {
  return (
    <AccessProvider>
    <CycleRefreshProvider>
    <Stack.Navigator>
      <Stack.Screen
        name="Tabs"
        component={MainTabScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CycleCalendar"
        component={CycleCalendarScreen}
        options={{ ...detailScreenOptions, headerTitle: '' }}
      />
      <Stack.Screen
        name="PeriodStarted"
        component={PeriodStartedScreen}
        options={{ ...detailScreenOptions, headerTitle: '' }}
      />
      <Stack.Screen
        name="SymptomPicker"
        component={SymptomPickerScreen}
        options={{ ...detailScreenOptions, headerTitle: '' }}
      />
      <Stack.Screen
        name="MoodTracker"
        component={MoodTrackerScreen}
        options={{ ...detailScreenOptions, headerTitle: '' }}
      />
      <Stack.Screen
        name="FertileWindow"
        component={FertileWindowScreen}
        options={{ ...detailScreenOptions, headerTitle: '' }}
      />
      <Stack.Screen
        name="OvulationLog"
        component={OvulationLogScreen}
        options={{ ...detailScreenOptions, headerTitle: '' }}
      />
      <Stack.Screen
        name="BBTLog"
        component={BBTLogScreen}
        options={{ ...detailScreenOptions, headerTitle: '' }}
      />
      <Stack.Screen
        name="PregnancyHome"
        component={PregnancyHomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="BabyGrowth"
        component={BabyGrowthScreen}
        options={{ ...detailScreenOptions, headerTitle: 'Week 24' }}
      />
      <Stack.Screen
        name="PregnancySymptoms"
        component={PregnancySymptomsScreen}
        options={{ ...detailScreenOptions, headerTitle: '' }}
      />
      <Stack.Screen
        name="KickCounter"
        component={KickCounterScreen}
        options={{ ...detailScreenOptions, headerTitle: 'Kick Counter' }}
      />
      <Stack.Screen
        name="ContractionTimer"
        component={ContractionTimerScreen}
        options={{ ...detailScreenOptions, headerTitle: 'Contraction Timer' }}
      />
      <Stack.Screen
        name="WeightTracker"
        component={WeightTrackerScreen}
        options={{ ...detailScreenOptions, headerTitle: 'Weight Tracker' }}
      />
      <Stack.Screen
        name="Appointments"
        component={AppointmentsScreen}
        options={{ ...detailScreenOptions, headerTitle: '' }}
      />
      <Stack.Screen
        name="HospitalBag"
        component={HospitalBagScreen}
        options={{ ...detailScreenOptions, headerTitle: 'Hospital Bag' }}
      />
      <Stack.Screen
        name="MilestoneJournal"
        component={MilestoneJournalScreen}
        options={{ ...detailScreenOptions, headerTitle: '' }}
      />
      <Stack.Screen name="TTCHome" component={TTCHomeScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="ConceptionTips"
        component={ConceptionTipsScreen}
        options={{ ...detailScreenOptions, headerTitle: '' }}
      />
      <Stack.Screen
        name="FertilityScore"
        component={FertilityScoreScreen}
        options={{ ...detailScreenOptions, headerTitle: '' }}
      />
      <Stack.Screen
        name="PartnerHealth"
        component={PartnerHealthScreen}
        options={{ ...detailScreenOptions, headerTitle: '' }}
      />
      <Stack.Screen
        name="TTCJournal"
        component={TTCJournalScreen}
        options={{ ...detailScreenOptions, headerTitle: '' }}
      />
      <Stack.Screen
        name="TTCJournalNew"
        component={TTCJournalNewEntryScreen}
        options={{ ...detailScreenOptions, headerTitle: 'New entry' }}
      />
      <Stack.Screen
        name="FertilityLog"
        component={FertilityLogScreen}
        options={{ ...detailScreenOptions, headerTitle: '' }}
      />
      <Stack.Screen
        name="DoctorReport"
        component={DoctorReportScreen}
        options={{ ...detailScreenOptions, headerTitle: '' }}
      />
      <Stack.Screen
        name="CycleAnalysis"
        component={CycleAnalysisScreen}
        options={{ ...detailScreenOptions, headerTitle: '' }}
      />
      <Stack.Screen
        name="SymptomPatterns"
        component={SymptomPatternsScreen}
        options={{ ...detailScreenOptions, headerTitle: '' }}
      />
      <Stack.Screen
        name="InsightMoodPatterns"
        component={InsightMoodPatternsScreen}
        options={{ ...detailScreenOptions, headerTitle: '' }}
      />
      <Stack.Screen
        name="SleepEnergy"
        component={SleepEnergyScreen}
        options={{ ...detailScreenOptions, headerTitle: '' }}
      />
      <Stack.Screen
        name="Perimenopause"
        component={PerimenopauseScreen}
        options={{ ...detailScreenOptions, headerTitle: '' }}
      />
      <Stack.Screen
        name="PartnerMode"
        component={PartnerModeScreen}
        options={{ ...detailScreenOptions, headerTitle: '' }}
      />
      <Stack.Screen
        name="HealthReport"
        component={HealthReportScreen}
        options={{ ...detailScreenOptions, headerTitle: '' }}
      />
      <Stack.Screen
        name="ArticleDetail"
        component={ArticleDetailScreen}
        options={{ ...detailScreenOptions, headerTitle: '' }}
      />
      <Stack.Screen
        name="CategoryBrowse"
        component={CategoryBrowseScreen}
        options={{ ...detailScreenOptions, headerTitle: '' }}
      />
      <Stack.Screen
        name="TopicArticles"
        component={TopicArticlesScreen}
        options={{ ...detailScreenOptions, headerTitle: '' }}
      />
      <Stack.Screen
        name="AskExpert"
        component={AskExpertScreen}
        options={{ ...detailScreenOptions, headerTitle: '' }}
      />
      <Stack.Screen
        name="Community"
        component={CommunityScreen}
        options={{ ...detailScreenOptions, headerTitle: '' }}
      />
      <Stack.Screen
        name="CreateCommunityPost"
        component={CreateCommunityPostScreen}
        options={{ ...detailScreenOptions, headerTitle: '' }}
      />
      <Stack.Screen
        name="PostDetail"
        component={PostDetailScreen}
        options={{ ...detailScreenOptions, headerTitle: '' }}
      />
      <Stack.Screen
        name="RealStories"
        component={RealStoriesScreen}
        options={{ ...detailScreenOptions, headerTitle: '' }}
      />
      <Stack.Screen
        name="RealStoryDetail"
        component={RealStoryDetailScreen}
        options={{ ...detailScreenOptions, headerTitle: '' }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ ...detailScreenOptions, headerTitle: 'Edit profile' }}
      />
      <Stack.Screen
        name="DataPrivacy"
        component={DataPrivacyScreen}
        options={{ ...detailScreenOptions, headerTitle: 'Data & privacy' }}
      />
      <Stack.Screen
        name="DataExport"
        component={DataExportScreen}
        options={{ ...detailScreenOptions, headerTitle: 'Export data' }}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{ ...detailScreenOptions, headerTitle: 'Privacy policy' }}
      />
      <Stack.Screen
        name="TermsOfUse"
        component={TermsOfUseScreen}
        options={{ ...detailScreenOptions, headerTitle: 'Terms of use' }}
      />
      <Stack.Screen
        name="CycleSettings"
        component={CycleSettingsScreen}
        options={{ ...detailScreenOptions, headerTitle: 'Cycle settings' }}
      />
      <Stack.Screen
        name="NotifSettings"
        component={NotifSettingsScreen}
        options={{ ...detailScreenOptions, headerTitle: 'Notifications' }}
      />
      <Stack.Screen
        name="UnitsFormat"
        component={UnitsFormatScreen}
        options={{ ...detailScreenOptions, headerTitle: 'Units & format' }}
      />
      <Stack.Screen
        name="HelpCenter"
        component={HelpCenterScreen}
        options={{ ...detailScreenOptions, headerTitle: 'Help center' }}
      />
      <Stack.Screen
        name="ContactUs"
        component={ContactUsScreen}
        options={{ ...detailScreenOptions, headerTitle: 'Contact us' }}
      />
      <Stack.Screen
        name="ManageSubscription"
        component={ManageSubscriptionScreen}
        options={{ ...detailScreenOptions, headerTitle: 'Subscription' }}
      />
      <Stack.Screen
        name="Paywall"
        component={PaywallScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
          contentStyle: { backgroundColor: '#1A1A2E' },
        }}
      />
      <Stack.Screen
        name="NotificationsInbox"
        component={NotificationsInboxScreen}
        options={{ ...detailScreenOptions, headerTitle: 'Notifications' }}
      />
      <Stack.Screen
        name="EmptyJourney"
        component={EmptyJourneyScreen}
        options={{ ...detailScreenOptions, headerTitle: '' }}
      />
      <Stack.Screen
        name="EmptyInsights"
        component={EmptyInsightsScreen}
        options={{ ...detailScreenOptions, headerTitle: '' }}
      />
      <Stack.Screen
        name="EmptyInsightsSymptoms"
        component={EmptyInsightsSymptomsScreen}
        options={{ ...detailScreenOptions, headerTitle: '' }}
      />
      <Stack.Screen
        name="EmptyArticles"
        component={EmptyArticlesScreen}
        options={{ ...detailScreenOptions, headerTitle: '' }}
      />
      <Stack.Screen
        name="NotificationsOff"
        component={NotificationsOffScreen}
        options={{ ...detailScreenOptions, headerTitle: '' }}
      />
      <Stack.Screen
        name="NotificationsCaughtUp"
        component={NotificationsCaughtUpScreen}
        options={{ ...detailScreenOptions, headerTitle: '' }}
      />
      <Stack.Screen
        name="Offline"
        component={OfflineScreen}
        options={{ ...detailScreenOptions, headerTitle: '' }}
      />
      <Stack.Screen
        name="TrialEnded"
        component={TrialEndedScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
          contentStyle: { backgroundColor: '#1A1A2E' },
        }}
      />
      <Stack.Screen
        name="StartPeriodSheet"
        component={StartPeriodSheetScreen}
        options={transparentModalOptions}
      />
      <Stack.Screen
        name="AllSavedModal"
        component={AllSavedModalScreen}
        options={transparentModalOptions}
      />
      <Stack.Screen
        name="LogTodayModal"
        component={LogTodayModalScreen}
        options={transparentModalOptions}
      />
      <Stack.Screen
        name="SignOutModal"
        component={SignOutModalScreen}
        options={transparentModalOptions}
      />
    </Stack.Navigator>
    </CycleRefreshProvider>
    </AccessProvider>
  );
}
