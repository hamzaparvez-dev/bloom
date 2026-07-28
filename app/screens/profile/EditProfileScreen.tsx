import React, { useCallback, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ThemeColors, ThemeRadius, ThemeSpacing } from '../../constants/theme'
import { supabase } from '../../../supabaseClient'
import { useAuth } from '../../providers/AuthProvider'

export function EditProfileScreen() {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [emailDisplay, setEmailDisplay] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const uid = user?.id
    if (!uid) {
      setLoading(false)
      setName('')
      setEmailDisplay(user?.email ?? '')
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('display_name, email')
      .eq('id', uid)
      .maybeSingle()
    if (error) {
      console.warn('[EditProfile]', error.message)
      setName('')
      setEmailDisplay(user?.email ?? '')
    } else {
      setName(data?.display_name?.trim() ?? '')
      setEmailDisplay(data?.email?.trim() || user?.email || '')
    }
    setLoading(false)
  }, [user?.id, user?.email])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load]),
  )

  const save = () => {
    const uid = user?.id
    if (!uid) {
      Alert.alert('Sign in required', 'Sign in to update your profile.')
      return
    }
    const trimmed = name.trim()
    if (!trimmed) {
      Alert.alert('Name required', 'Enter a display name.')
      return
    }
    setSaving(true)
    void (async () => {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: trimmed,
          updated_at: new Date().toISOString(),
        })
        .eq('id', uid)
      setSaving(false)
      if (error) {
        Alert.alert('Could not save', error.message)
        return
      }
      Alert.alert('Saved', 'Your profile has been updated.')
    })()
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: 8, paddingBottom: insets.bottom + 32 }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={ThemeColors.primary} />
        </View>
      ) : null}
      <Text style={styles.hint}>
        Display name is saved to your Bloom account. Email is managed by your sign-in provider.
      </Text>
      <View style={styles.field}>
        <Text style={styles.label}>Display name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          style={styles.input}
          placeholder="Your name"
          placeholderTextColor={ThemeColors.textLight}
          editable={!loading}
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          value={emailDisplay}
          style={[styles.input, styles.inputDisabled]}
          placeholder="Email"
          placeholderTextColor={ThemeColors.textLight}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={false}
        />
      </View>
      <Pressable
        onPress={save}
        disabled={saving || loading}
        style={({ pressed }) => [
          styles.save,
          pressed && { opacity: 0.9 },
          (saving || loading) && { opacity: 0.6 },
        ]}
      >
        <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save'}</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream },
  content: { paddingHorizontal: ThemeSpacing.pagePad },
  loading: { paddingVertical: 16, alignItems: 'center' },
  hint: { fontSize: 14, fontWeight: '400', color: ThemeColors.textMid, marginBottom: 20, lineHeight: 20 },
  field: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '600', color: ThemeColors.textLight, marginBottom: 8, paddingLeft: 2 },
  input: {
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ThemeColors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '500',
    color: ThemeColors.textDark,
  },
  inputDisabled: {
    opacity: 0.75,
    backgroundColor: ThemeColors.bgCream,
  },
  save: {
    marginTop: 8,
    backgroundColor: ThemeColors.primary,
    paddingVertical: 16,
    borderRadius: ThemeRadius.button,
    alignItems: 'center',
  },
  saveText: { fontSize: 17, fontWeight: '700', color: ThemeColors.white },
})
