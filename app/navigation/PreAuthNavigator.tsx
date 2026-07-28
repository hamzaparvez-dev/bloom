import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { OnboardingNavigator } from './OnboardingNavigator'
import { BloomEmailOtpAuthScreen } from '../screens/auth/BloomEmailOtpAuthScreen'

export type PreAuthStackParamList = {
  Onboarding: undefined
  ReturningAuth: undefined
}

const Stack = createNativeStackNavigator<PreAuthStackParamList>()

export function PreAuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Onboarding"
      screenOptions={{ headerShown: false, animation: 'fade' }}
    >
      <Stack.Screen name="Onboarding">
        {({ navigation }) => (
          <OnboardingNavigator onOpenReturningAuth={() => navigation.navigate('ReturningAuth')} />
        )}
      </Stack.Screen>
      <Stack.Screen name="ReturningAuth" options={{ animation: 'slide_from_right' }}>
        {({ navigation }) => (
          <BloomEmailOtpAuthScreen
            mode="returning"
            onRequestBack={() => {
              if (navigation.canGoBack()) navigation.goBack()
              else navigation.navigate('Onboarding')
            }}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  )
}
