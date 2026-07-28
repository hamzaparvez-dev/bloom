import React, { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Calendar, ChevronRight, Plus } from 'lucide-react-native'
import { ThemeColors, ThemeRadius } from '../../constants/theme'
import {
  fetchAppointments,
  filterAppointments,
  insertAppointment,
  type AppointmentKind,
  type AppointmentListItem,
} from '../../lib/appointments'
import { getActivePregnancyId } from '../../lib/active-pregnancy'
import { useAuth } from '../../providers/AuthProvider'

const PURPLE = '#8B5CF6'

const FILTERS = ['Upcoming', 'Past', 'Reminders'] as const

const TYPE_OPTIONS: { value: AppointmentKind; label: string }[] = [
  { value: 'checkup', label: 'Checkup' },
  { value: 'ultrasound', label: 'Ultrasound' },
  { value: 'test', label: 'Test / lab' },
  { value: 'other', label: 'Other' },
]

export function AppointmentsScreen() {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const [filter, setFilter] = useState(0)
  const [rows, setRows] = useState<AppointmentListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [apptType, setApptType] = useState<AppointmentKind>('checkup')
  const [when, setWhen] = useState(() => new Date())
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios')

  const load = useCallback(async () => {
    const uid = user?.id
    if (!uid) {
      setRows([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { rows: next, error } = await fetchAppointments(uid)
    if (error) console.warn('[Appointments]', error)
    setRows(next)
    setLoading(false)
  }, [user?.id])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load]),
  )

  const visible = useMemo(() => filterAppointments(rows, filter), [rows, filter])

  const openAdd = useCallback(() => {
    setTitle('')
    setApptType('checkup')
    setWhen(new Date())
    setShowPicker(Platform.OS === 'ios')
    setModalOpen(true)
  }, [])

  const save = useCallback(() => {
    const uid = user?.id
    if (!uid) {
      Alert.alert('Sign in required', 'Sign in to save appointments.')
      return
    }
    const t = title.trim()
    if (!t) {
      Alert.alert('Title', 'Enter an appointment title.')
      return
    }
    setSaving(true)
    void (async () => {
      const pregnancyId = await getActivePregnancyId(uid)
      const { error } = await insertAppointment({
        userId: uid,
        pregnancyId,
        title: t,
        date: when,
        type: apptType,
      })
      setSaving(false)
      if (error) {
        Alert.alert('Could not save', error)
        return
      }
      setModalOpen(false)
      await load()
    })()
  }, [title, when, apptType, user?.id, load])

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: 120 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <Text style={styles.title}>Appointments</Text>
        <Pressable onPress={openAdd} style={styles.addBtn}>
          <Plus size={14} color={PURPLE} strokeWidth={2.5} />
          <Text style={styles.addText}>Add</Text>
        </Pressable>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f, i) => (
          <Pressable
            key={f}
            onPress={() => setFilter(i)}
            style={[styles.filterChip, i === filter && styles.filterActive]}
          >
            <Text style={[styles.filterText, i === filter && styles.filterTextActive]}>{f}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.divider} />

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={ThemeColors.primary} />
        </View>
      ) : (
        <>
          {visible.map((appt) => (
            <Pressable
              key={appt.id}
              style={({ pressed }) => [styles.apptRow, pressed && { opacity: 0.7 }]}
            >
              <View style={[styles.apptBar, { backgroundColor: appt.tagColor }]} />
              <View style={styles.apptBody}>
                <Text style={styles.apptTitle}>{appt.title}</Text>
                <Text style={styles.apptDate}>{appt.dateLine}</Text>
                <View style={[styles.apptTag, { backgroundColor: appt.tagColor + '18' }]}>
                  <Text style={[styles.apptTagText, { color: appt.tagColor }]}>{appt.tag}</Text>
                </View>
              </View>
              <ChevronRight size={16} color={ThemeColors.textLight} strokeWidth={2} />
            </Pressable>
          ))}
          {visible.length === 0 ? (
            <Text style={styles.emptyText}>
              {filter === 1 ? 'No past appointments yet.' : 'No appointments in this view.'}
            </Text>
          ) : null}
        </>
      )}

      <Pressable
        onPress={openAdd}
        style={({ pressed }) => [styles.scheduleCta, pressed && { opacity: 0.7 }]}
      >
        <Calendar size={16} color={PURPLE} strokeWidth={2} />
        <Text style={styles.scheduleText}>Schedule a new appointment</Text>
      </Pressable>

      <Modal visible={modalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setModalOpen(false)} />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <Text style={styles.sheetTitle}>New appointment</Text>
            <Text style={styles.sheetLabel}>Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Anatomy scan"
              placeholderTextColor={ThemeColors.textLight}
              style={styles.sheetInput}
            />
            <Text style={styles.sheetLabel}>Type</Text>
            <View style={styles.typeRow}>
              {TYPE_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => setApptType(opt.value)}
                  style={[
                    styles.typeChip,
                    apptType === opt.value && styles.typeChipOn,
                  ]}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      apptType === opt.value && styles.typeChipTextOn,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.sheetLabel}>Date & time</Text>
            {showPicker ? (
              <DateTimePicker
                value={when}
                mode="datetime"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_event, d) => {
                  if (Platform.OS === 'android') setShowPicker(false)
                  if (d) setWhen(d)
                }}
              />
            ) : (
              <Pressable onPress={() => setShowPicker(true)} style={styles.pickFallback}>
                <Text style={styles.pickFallbackText}>{when.toLocaleString()}</Text>
              </Pressable>
            )}
            <View style={styles.sheetActions}>
              <Pressable onPress={() => setModalOpen(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={save}
                disabled={saving}
                style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.9 }]}
              >
                {saving ? (
                  <ActivityIndicator color={ThemeColors.white} />
                ) : (
                  <Text style={styles.saveText}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream },
  content: { paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: ThemeColors.textDark },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: ThemeRadius.pill,
    borderWidth: 1.5,
    borderColor: PURPLE,
  },
  addText: { fontSize: 13, fontWeight: '700', color: PURPLE },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: ThemeRadius.pill,
    backgroundColor: ThemeColors.surface,
    borderWidth: 1,
    borderColor: ThemeColors.border,
  },
  filterActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  filterText: { fontSize: 13, fontWeight: '600', color: ThemeColors.textMid },
  filterTextActive: { color: ThemeColors.white },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: ThemeColors.border, marginBottom: 8 },
  loader: { paddingVertical: 32, alignItems: 'center' },
  apptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ThemeColors.border,
  },
  apptBar: { width: 4, height: 52, borderRadius: 2, marginRight: 14 },
  apptBody: { flex: 1, gap: 3 },
  apptTitle: { fontSize: 16, fontWeight: '700', color: ThemeColors.textDark },
  apptDate: { fontSize: 13, fontWeight: '400', color: ThemeColors.textMid },
  apptTag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: ThemeRadius.pill, marginTop: 4 },
  apptTagText: { fontSize: 11, fontWeight: '600' },
  emptyText: { fontSize: 14, fontWeight: '400', color: ThemeColors.textLight, textAlign: 'center', marginVertical: 20 },
  scheduleCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
    borderRadius: ThemeRadius.card,
    borderWidth: 1.5,
    borderColor: ThemeColors.border,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  scheduleText: { fontSize: 15, fontWeight: '600', color: PURPLE },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: ThemeColors.surface,
    borderTopLeftRadius: ThemeRadius.lg,
    borderTopRightRadius: ThemeRadius.lg,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: ThemeColors.textDark, marginBottom: 12 },
  sheetLabel: { fontSize: 13, fontWeight: '600', color: ThemeColors.textLight, marginBottom: 6 },
  sheetInput: {
    borderWidth: 1,
    borderColor: ThemeColors.border,
    borderRadius: ThemeRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: ThemeColors.textDark,
    marginBottom: 14,
  },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: ThemeRadius.pill,
    borderWidth: 1,
    borderColor: ThemeColors.border,
    backgroundColor: ThemeColors.bgCream,
  },
  typeChipOn: { borderColor: PURPLE, backgroundColor: '#F3E8FF' },
  typeChipText: { fontSize: 13, fontWeight: '600', color: ThemeColors.textMid },
  typeChipTextOn: { color: PURPLE },
  pickFallback: { padding: 12, marginBottom: 12 },
  pickFallbackText: { fontSize: 15, color: ThemeColors.textDark },
  sheetActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 16 },
  cancelText: { fontSize: 16, fontWeight: '600', color: ThemeColors.textMid },
  saveBtn: {
    backgroundColor: ThemeColors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: ThemeRadius.button,
    minWidth: 100,
    alignItems: 'center',
  },
  saveText: { fontSize: 16, fontWeight: '700', color: ThemeColors.white },
})
