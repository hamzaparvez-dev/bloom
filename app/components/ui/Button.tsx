import React from 'react';
import { Text, Pressable, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Colors, Typography } from '../../constants';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'social' | 'socialDark';
  icon?: React.ReactNode;
  style?: ViewStyle;
  disabled?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  style,
  disabled,
}: ButtonProps) {
  const containerStyle = [
    styles.base,
    variant === 'primary' && styles.primary,
    variant === 'social' && styles.social,
    variant === 'socialDark' && styles.socialDark,
    disabled && styles.disabled,
    style,
  ];

  const textStyle: TextStyle[] = [
    styles.text,
    variant === 'primary' && styles.textPrimary,
    variant === 'social' && styles.textSocial,
    variant === 'socialDark' && styles.textSocialDark,
  ].filter(Boolean) as TextStyle[];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        ...containerStyle,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {icon}
      <Text style={textStyle}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: 8,
  },
  primary: {
    backgroundColor: Colors.pink,
  },
  social: {
    backgroundColor: Colors.white,
  },
  socialDark: {
    backgroundColor: Colors.dark,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  text: {
    ...Typography.button,
  },
  textPrimary: {
    color: Colors.white,
  },
  textSocial: {
    color: Colors.dark,
    fontSize: 16,
    fontWeight: '600',
  },
  textSocialDark: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
