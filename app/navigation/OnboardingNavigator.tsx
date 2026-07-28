import React, { useMemo } from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useOnboardingDraftStore } from '../stores/onboarding-draft-store'
import { SplashScreen } from '../screens/onboarding/SplashScreen'
import { ModeSelectionScreen } from '../screens/onboarding/ModeSelectionScreen'
import { PersonalDetailsScreen } from '../screens/onboarding/PersonalDetailsScreen'
import { HeightPickerScreen } from '../screens/onboarding/HeightPickerScreen'
import { HealthGoalsScreen } from '../screens/onboarding/HealthGoalsScreen'
import { DueDateScreen } from '../screens/onboarding/DueDateScreen'
import { CalendarPreparingScreen } from '../screens/onboarding/CalendarPreparingScreen'
import { PermissionsScreen } from '../screens/onboarding/PermissionsScreen'
import { WelcomeSummaryScreen } from '../screens/onboarding/WelcomeSummaryScreen'
import { BloomEmailOtpAuthScreen } from '../screens/auth/BloomEmailOtpAuthScreen'

export type OnboardingStackParamList = {
  Splash: undefined
  ModeSelection: undefined
  PersonalDetails: undefined
  HeightPicker: undefined
  HealthGoals: undefined
  DueDate: undefined
  CalendarPreparing: undefined
  Permissions: undefined
  WelcomeSummary: undefined
  CreateAccount: undefined
}

const Stack = createNativeStackNavigator<OnboardingStackParamList>()

function isDraftReadyForAccount(): boolean {
  const d = useOnboardingDraftStore.getState()
  return Boolean(d.journeyMode && d.periodLength != null && d.cycleLength != null)
}

interface OnboardingNavigatorProps {
  onOpenReturningAuth?: () => void
  /** When the user already has a session but has not finished profile save, reopen account gate if the draft is complete. */
  initialEntry?: 'splash' | 'accountGate'
}

export function OnboardingNavigator({
  onOpenReturningAuth,
  initialEntry = 'splash',
}: OnboardingNavigatorProps) {
  const initialRouteName = useMemo(() => {
    if (initialEntry === 'accountGate' && isDraftReadyForAccount()) return 'CreateAccount'
    return 'Splash'
  }, [initialEntry])

  const setJourneyMode = useOnboardingDraftStore((s) => s.setJourneyMode)
  const setCycleBasics = useOnboardingDraftStore((s) => s.setCycleBasics)
  const setHealthGoals = useOnboardingDraftStore((s) => s.setHealthGoals)
  const setLastPeriodDate = useOnboardingDraftStore((s) => s.setLastPeriodDate)

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
        contentStyle: { backgroundColor: '#FFF4F7' },
      }}
    >
      <Stack.Screen name="Splash">
        {({ navigation }) => (
          <SplashScreen
            onStart={() => navigation.navigate('ModeSelection')}
            onOpenReturningAuth={onOpenReturningAuth}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="ModeSelection">
        {({ navigation }) => (
          <ModeSelectionScreen
            onContinue={(mode) => {
              setJourneyMode(mode)
              navigation.navigate('PersonalDetails')
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="PersonalDetails">
        {({ navigation }) => (
          <PersonalDetailsScreen
            onNext={({ periodLength, cycleLength }) => {
              setCycleBasics(periodLength, cycleLength)
              navigation.navigate('HeightPicker')
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="HeightPicker">
        {({ navigation }) => (
          <HeightPickerScreen onNext={(_heightCm) => navigation.navigate('HealthGoals')} />
        )}
      </Stack.Screen>

      <Stack.Screen name="HealthGoals">
        {({ navigation }) => (
          <HealthGoalsScreen
            onContinue={(goals) => {
              setHealthGoals(goals)
              navigation.navigate('DueDate')
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="DueDate">
        {({ navigation }) => (
          <DueDateScreen
            onConfirm={(date) => {
              setLastPeriodDate(date)
              navigation.navigate('CalendarPreparing')
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen
        name="CalendarPreparing"
        options={{ gestureEnabled: false }}
      >
        {({ navigation }) => (
          <CalendarPreparingScreen onReady={() => navigation.navigate('Permissions')} />
        )}
      </Stack.Screen>

      <Stack.Screen name="Permissions">
        {({ navigation }) => (
          <PermissionsScreen onAllow={() => navigation.navigate('WelcomeSummary')} />
        )}
      </Stack.Screen>

      <Stack.Screen name="WelcomeSummary">
        {({ navigation }) => (
          <WelcomeSummaryScreen onStart={() => navigation.navigate('CreateAccount')} />
        )}
      </Stack.Screen>

      <Stack.Screen
        name="CreateAccount"
        options={{ gestureEnabled: false, animation: 'slide_from_right' }}
      >
        {({ navigation }) => (
          <BloomEmailOtpAuthScreen
            mode="postOnboarding"
            onRequestBack={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  )
}
