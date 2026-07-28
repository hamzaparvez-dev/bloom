import React from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { OnboardingNavigator } from './OnboardingNavigator'
import { MainNavigator } from './MainNavigator'
import { PreAuthNavigator } from './PreAuthNavigator'
import { useAuth } from '../providers/AuthProvider'

export type RootStackParamList = {
  Onboarding: undefined
  MainApp: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()

export function RootNavigator() {
  const { session, initializing, profileLoading, postAuthProfileLock, onboardingCompleted } = useAuth()

  if (initializing || (session && (profileLoading || postAuthProfileLock))) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (!session) {
    return <PreAuthNavigator />
  }

  if (!onboardingCompleted) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="Onboarding" options={{ gestureEnabled: false }}>
          {() => <OnboardingNavigator initialEntry="accountGate" />}
        </Stack.Screen>
      </Stack.Navigator>
    )
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="MainApp" component={MainNavigator} options={{ gestureEnabled: false }} />
    </Stack.Navigator>
  )
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF4F7',
  },
})
