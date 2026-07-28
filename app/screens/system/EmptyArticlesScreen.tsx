import React from 'react'
import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { EmptyStateLayout } from '../../components/ui/EmptyStateLayout'
import { getImage } from '../../lib/app-images'
import { ThemeColors } from '../../constants/theme'
import type { MainStackParamList } from '../../navigation/MainNavigator'

export function EmptyArticlesScreen() {
  const insets = useSafeAreaInsets()
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>()

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}>
      <EmptyStateLayout
        illustration={getImage('empty')}
        title="No articles found"
        description="Try another topic or browse the full library for guides that match your journey."
        primaryLabel="Browse topics"
        onPrimary={() => nav.navigate('CategoryBrowse')}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream },
})
