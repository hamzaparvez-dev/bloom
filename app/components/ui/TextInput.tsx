import React from 'react';
import {
  View,
  Text,
  TextInput as RNTextInput,
  StyleSheet,
} from 'react-native';
import { Colors } from '../../constants';

interface TextInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
}

export function TextInput({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType = 'default',
}: TextInputProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <RNTextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={Colors.muted}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    justifyContent: 'center',
    gap: 2,
    alignSelf: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.muted,
  },
  input: {
    fontSize: 15,
    fontWeight: '400',
    color: Colors.dark,
    padding: 0,
  },
});
