import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants';

export function StatusBar() {
  return (
    <View style={styles.container}>
      <Text style={styles.time}>9:41</Text>
      <Text style={styles.icons}>●●● WiFi 100%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 14,
    height: 48,
  },
  time: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.dark,
  },
  icons: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.muted,
  },
});
