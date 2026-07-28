import React from 'react'
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Calendar, ClipboardList, StickyNote, type LucideIcon } from 'lucide-react-native'
import { ThemeColors, ThemeRadius, ThemeSpacing } from '../../constants/theme'

export type LogFabHubAction = 'period' | 'symptoms' | 'note'

interface LogFabHubModalProps {
  visible: boolean
  onClose: () => void
  onSelect: (action: LogFabHubAction) => void
  /** Optional — opens the legacy full Log tab screen */
  onOpenFullLog?: () => void
}

const ROWS: { action: LogFabHubAction; title: string; subtitle: string; icon: LucideIcon }[] = [
  {
    action: 'period',
    title: 'Log period',
    subtitle: 'Mark when your period started or ended',
    icon: Calendar,
  },
  {
    action: 'symptoms',
    title: 'Log symptoms',
    subtitle: 'Track how you feel today',
    icon: ClipboardList,
  },
  {
    action: 'note',
    title: 'Quick note',
    subtitle: 'Capture a thought or mood in seconds',
    icon: StickyNote,
  },
]

export function LogFabHubModal({ visible, onClose, onSelect, onOpenFullLog }: LogFabHubModalProps) {
  const insets = useSafeAreaInsets()

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close menu" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 56 }]}>
          <View style={styles.grabber} />
          <Text style={styles.sheetTitle}>Log</Text>
          <Text style={styles.sheetSub}>Choose what you want to add</Text>
          {ROWS.map((row) => {
            const Icon = row.icon
            return (
              <Pressable
                key={row.action}
                onPress={() => onSelect(row.action)}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                android_ripple={{ color: 'rgba(232, 97, 140, 0.12)' }}
              >
                <View style={styles.rowIcon}>
                  <Icon size={22} color={ThemeColors.primary} strokeWidth={2.2} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{row.title}</Text>
                  <Text style={styles.rowSub}>{row.subtitle}</Text>
                </View>
              </Pressable>
            )
          })}
          {onOpenFullLog ? (
            <Pressable
              onPress={() => {
                onClose()
                onOpenFullLog()
              }}
              style={({ pressed }) => [styles.fullLog, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.fullLogText}>Open full log</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(26, 15, 46, 0.45)',
  },
  sheet: {
    backgroundColor: ThemeColors.surface,
    borderTopLeftRadius: ThemeRadius.lg,
    borderTopRightRadius: ThemeRadius.lg,
    paddingHorizontal: ThemeSpacing.pagePad,
    paddingTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: { elevation: 12 },
    }),
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: ThemeColors.border,
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: ThemeColors.textDark, marginBottom: 4 },
  sheetSub: { fontSize: 14, fontWeight: '500', color: ThemeColors.textLight, marginBottom: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: ThemeRadius.md,
    gap: 14,
    marginBottom: 4,
  },
  rowPressed: { opacity: 0.85 },
  rowIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: ThemeColors.pinkSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 17, fontWeight: '700', color: ThemeColors.textDark },
  rowSub: { fontSize: 13, fontWeight: '400', color: ThemeColors.textMid, marginTop: 2 },
  fullLog: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  fullLogText: { fontSize: 15, fontWeight: '600', color: ThemeColors.textLight },
})
