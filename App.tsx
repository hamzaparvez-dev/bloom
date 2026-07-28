import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { RootNavigator } from './app/navigation/RootNavigator';
import { AuthProvider } from './app/providers/AuthProvider';
import { RevenueCatProvider } from './app/providers/RevenueCatProvider';
import { SupabaseOAuthLinkHandler } from './app/components/system/SupabaseOAuthLinkHandler';
import { shouldSkipExpoNotifications } from './app/lib/expo-go-notifications';

if (!shouldSkipExpoNotifications()) {
  void import('expo-notifications').then((Notifications) => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  });
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AuthProvider>
          <RevenueCatProvider>
            <SupabaseOAuthLinkHandler />
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
          </RevenueCatProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
