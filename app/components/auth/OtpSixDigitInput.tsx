import React, { useCallback, useRef } from 'react'
import { View, TextInput, StyleSheet, NativeSyntheticEvent, TextInputKeyPressEventData } from 'react-native'
import { Colors, Spacing } from '../../constants'

const OTP_LEN = 6

interface OtpSixDigitInputProps {
  value: string
  onChange: (digits: string) => void
  disabled?: boolean
  hasError?: boolean
}

export function OtpSixDigitInput({ value, onChange, disabled, hasError }: OtpSixDigitInputProps) {
  const inputsRef = useRef<Array<TextInput | null>>([])
  const sanitized = value.replace(/\D/g, '').slice(0, OTP_LEN)

  const setFromString = useCallback(
    (next: string) => {
      const d = next.replace(/\D/g, '').slice(0, OTP_LEN)
      onChange(d)
    },
    [onChange],
  )

  const onChangeAtIndex = useCallback(
    (index: number, text: string) => {
      const digitsOnly = text.replace(/\D/g, '')
      if (digitsOnly.length > 1) {
        setFromString(digitsOnly)
        const nextLen = Math.min(digitsOnly.length, OTP_LEN)
        const ref = inputsRef.current[Math.min(nextLen, OTP_LEN - 1)]
        ref?.focus()
        return
      }
      const chars = sanitized.split('')
      while (chars.length < OTP_LEN) chars.push('')
      if (digitsOnly.length === 0) chars[index] = ''
      else chars[index] = digitsOnly[0] ?? ''
      setFromString(chars.join(''))
      if (digitsOnly.length === 1 && index < OTP_LEN - 1) inputsRef.current[index + 1]?.focus()
    },
    [sanitized, setFromString],
  )

  const onKeyPress = useCallback(
    (index: number, e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
      if (e.nativeEvent.key !== 'Backspace') return
      if (sanitized[index]) return
      if (index > 0) {
        const chars = sanitized.split('')
        while (chars.length < OTP_LEN) chars.push('')
        chars[index - 1] = ''
        setFromString(chars.join(''))
        inputsRef.current[index - 1]?.focus()
      }
    },
    [sanitized, setFromString],
  )

  return (
    <View style={styles.row}>
      {Array.from({ length: OTP_LEN }, (_, index) => {
        const char = sanitized[index] ?? ''
        const isActive = index === Math.min(sanitized.length, OTP_LEN - 1) && !disabled
        return (
          <TextInput
            key={index}
            ref={(r) => {
              inputsRef.current[index] = r
            }}
            style={[
              styles.cell,
              isActive && styles.cellActive,
              hasError && styles.cellError,
              disabled && styles.cellDisabled,
            ]}
            value={char}
            onChangeText={(t) => onChangeAtIndex(index, t)}
            onKeyPress={(e) => onKeyPress(index, e)}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            editable={!disabled}
            selectTextOnFocus
            maxLength={index === 0 ? OTP_LEN : 1}
            autoFocus={index === 0}
            accessibilityLabel={`Digit ${index + 1}`}
          />
        )
      })}
    </View>
  )
}

const cellWidthStyle = { flex: 1, minWidth: 0 }

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
    width: '100%',
  },
  cell: {
    ...cellWidthStyle,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    fontSize: 20,
    fontWeight: '600',
    color: Colors.dark,
    textAlign: 'center',
    paddingVertical: 0,
  },
  cellActive: {
    borderColor: Colors.pink,
    borderWidth: 2,
  },
  cellError: {
    borderColor: '#FF3B30',
  },
  cellDisabled: {
    opacity: 0.5,
  },
})
