import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { CalendarDays, Droplets, RefreshCw, X } from 'lucide-react-native';
import { Colors } from '../../constants';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { InputRow } from '../../components/ui/InputRow';
import { Button } from '../../components/ui/Button';
import { DatePickerSheet } from '../../components/ui/DatePickerSheet';

export interface PersonalDetailsPayload {
  dateOfBirth: string
  periodLength: number
  cycleLength: number
}

interface PersonalDetailsScreenProps {
  onNext: (details: PersonalDetailsPayload) => void
}

type DateField = 'dob';
type NumberField = 'period' | 'cycle';

const FIELD_LABELS: Record<DateField, string> = {
  dob: 'Date of Birth',
};

const NUMBER_LABELS: Record<NumberField, string> = {
  period: 'Period Duration',
  cycle: 'Cycle Length',
};

const MAX_DATE_TODAY = new Date().toISOString().split('T')[0];

function formatDisplayDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function PersonalDetailsScreen({ onNext }: PersonalDetailsScreenProps) {
  const insets = useSafeAreaInsets();

  // Date field stored as ISO string 'YYYY-MM-DD' or null
  const [dateOfBirth, setDateOfBirth] = useState<string | null>(null);

  // Number fields
  const [periodDuration, setPeriodDuration] = useState('');
  const [cycleLength, setCycleLength] = useState('');

  // Wheel date picker state
  const [activeDateField, setActiveDateField] = useState<DateField | null>(null);

  // Number input state
  const [activeNumberField, setActiveNumberField] = useState<NumberField | null>(null);
  const [numberDraft, setNumberDraft] = useState('');

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const openCalendar = (field: DateField) => setActiveDateField(field);

  const confirmDate = (iso: string) => {
    if (activeDateField === 'dob') setDateOfBirth(iso);
  };

  const openNumberInput = (field: NumberField) => {
    setNumberDraft(field === 'period' ? periodDuration : cycleLength);
    setActiveNumberField(field);
  };

  const confirmNumber = () => {
    const val = numberDraft.trim();
    if (!val) return;
    if (activeNumberField === 'period') setPeriodDuration(val);
    if (activeNumberField === 'cycle') setCycleLength(val);
    setActiveNumberField(null);
    setNumberDraft('');
  };

  // ─── Completion gate ─────────────────────────────────────────────────────

  const isComplete = useMemo(
    () =>
      !!dateOfBirth &&
      periodDuration.trim().length > 0 &&
      cycleLength.trim().length > 0,
    [dateOfBirth, periodDuration, cycleLength]
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.delay(100)}>
          <Text style={styles.title}>Tell us about you</Text>
          <Text style={styles.subtitle}>Helps us give accurate predictions</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200)}>
          <ProgressBar step={1} totalSteps={3} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300)} style={styles.fields}>
          <InputRow
            icon={CalendarDays}
            label="Date of Birth"
            value={dateOfBirth ? formatDisplayDate(dateOfBirth) : ''}
            placeholder="Select date"
            onPress={() => openCalendar('dob')}
          />
          <InputRow
            icon={Droplets}
            label="Period Duration"
            value={periodDuration ? `${periodDuration} days` : ''}
            placeholder="Enter days"
            onPress={() => openNumberInput('period')}
          />
          <InputRow
            icon={RefreshCw}
            label="Cycle Length"
            value={cycleLength ? `${cycleLength} days` : ''}
            placeholder="Enter days"
            onPress={() => openNumberInput('cycle')}
          />
        </Animated.View>
      </ScrollView>

      <Animated.View
        entering={FadeInDown.delay(500)}
        style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}
      >
        <Button
          title="Next →"
          disabled={!isComplete}
          onPress={() => {
            if (!dateOfBirth) return
            const p = parseInt(periodDuration, 10)
            const c = parseInt(cycleLength, 10)
            if (!Number.isFinite(p) || !Number.isFinite(c)) return
            onNext({ dateOfBirth, periodLength: p, cycleLength: c })
          }}
        />
      </Animated.View>

      {/* ── Wheel date picker sheet ── */}
      <DatePickerSheet
        visible={!!activeDateField}
        title={activeDateField ? FIELD_LABELS[activeDateField] : 'Select Date'}
        initialDate={activeDateField === 'dob' ? dateOfBirth : null}
        maxDate={MAX_DATE_TODAY}
        onClose={() => setActiveDateField(null)}
        onConfirm={confirmDate}
      />

      {/* ── Number input modal ── */}
      <Modal
        visible={!!activeNumberField}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveNumberField(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setActiveNumberField(null)} />
          <View style={[styles.numberCard, { marginBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {activeNumberField ? NUMBER_LABELS[activeNumberField] : ''}
              </Text>
              <Pressable onPress={() => setActiveNumberField(null)} hitSlop={12}>
                <X size={20} color={Colors.muted} strokeWidth={2} />
              </Pressable>
            </View>

            <TextInput
              value={numberDraft}
              onChangeText={(t) => setNumberDraft(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              placeholder="Enter days"
              placeholderTextColor={Colors.muted}
              style={styles.numberInput}
              autoFocus
              maxLength={2}
              returnKeyType="done"
              onSubmitEditing={confirmNumber}
            />

            <Button
              title="Save"
              onPress={confirmNumber}
              disabled={!numberDraft.trim()}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 60,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.dark,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: Colors.muted,
    marginBottom: 8,
  },
  fields: {
    gap: 12,
    marginTop: 8,
  },
  footer: {
    paddingTop: 16,
    paddingHorizontal: 20,
  },
  // ── Shared modal ──
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  // ── Number sheet header ──
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.dark,
  },
  // ── Number card ──
  numberCard: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    gap: 16,
    marginHorizontal: 0,
  },
  numberInput: {
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    fontSize: 22,
    fontWeight: '700',
    color: Colors.dark,
    textAlign: 'center',
    letterSpacing: 2,
  },
});
