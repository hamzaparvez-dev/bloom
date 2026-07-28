import React, { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants';

interface OnboardingScreenProps {
  children: ReactNode;
  headerHeight?: number;
}

export function OnboardingScreen({ children, headerHeight = 200 }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={[styles.header, { height: headerHeight }]} pointerEvents="none" />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.pinkSurface,
  },
});
