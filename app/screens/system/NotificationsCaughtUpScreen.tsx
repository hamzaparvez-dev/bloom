import React from 'react'
import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { EmptyStateLayout } from '../../components/ui/EmptyStateLayout'
import { ThemeColors } from '../../constants/theme'
import { getImage } from '../../lib/app-images'
import type { MainStackParamList } from '../../navigation/MainNavigator'

export function NotificationsCaughtUpScreen() {
  const insets = useSafeAreaInsets()
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>()

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}>
      <EmptyStateLayout
        illustration={getImage('empty')}
        title="You're all caught up"
        description="There are no new notifications at the moment. We'll let you know when something needs your attention."
        primaryLabel="Browse articles"
        onPrimary={() => nav.navigate('CategoryBrowse')}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream },
})
