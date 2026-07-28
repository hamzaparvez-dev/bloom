import React from 'react'
import { Linking, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { EmptyStateLayout } from '../../components/ui/EmptyStateLayout'
import { getImage } from '../../lib/app-images'
import { ThemeColors } from '../../constants/theme'
import type { MainStackParamList } from '../../navigation/MainNavigator'

export function NotificationsOffScreen() {
  const insets = useSafeAreaInsets()
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>()

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}>
      <EmptyStateLayout
        illustration={getImage('empty')}
        title="Notifications are off"
        description="Enable notifications to get important updates, period reminders, and fertile window alerts."
        primaryLabel="Turn on"
        onPrimary={() => {
          void Linking.openSettings()
        }}
        secondaryLabel="Notification settings in Bloom"
        onSecondary={() => nav.navigate('NotifSettings')}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream },
})
