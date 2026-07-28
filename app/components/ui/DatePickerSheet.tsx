import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'lucide-react-native';
import { Colors } from '../../constants';
import { Button } from './Button';

// ─── Constants ───────────────────────────────────────────────────────────────

const ITEM_H = 50;
const VISIBLE = 5; // must be odd
const PAD = Math.floor(VISIBLE / 2) * ITEM_H; // top/bottom padding = 2 × ITEM_H
const WHEEL_H = VISIBLE * ITEM_H; // 250

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const NOW = new Date();
const MAX_YEAR = NOW.getFullYear();
// show 100 years back up to today's year
const YEARS = Array.from({ length: 100 }, (_, i) => MAX_YEAR - 99 + i);
const YEAR_STRINGS = YEARS.map(String);

function getDaysInMonth(monthIdx: number, year: number): number {
  return new Date(year, monthIdx + 1, 0).getDate();
}

// ─── WheelColumn ─────────────────────────────────────────────────────────────

interface WheelColumnProps {
  items: string[];
  initialIndex: number;
  onSelect: (index: number) => void;
  flex?: number;
}

function WheelColumn({ items, initialIndex, onSelect, flex = 1 }: WheelColumnProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [activeIdx, setActiveIdx] = useState(initialIndex);
  // prevent re-scrolling on every parent re-render
  const skipEffect = useRef(false);

  useEffect(() => {
    if (skipEffect.current) return;
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: initialIndex * ITEM_H, animated: false });
    }, 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // only on mount (component re-keyed externally when needed)

  const handleScrollEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      const raw = e.nativeEvent.contentOffset.y;
      const idx = Math.max(0, Math.min(items.length - 1, Math.round(raw / ITEM_H)));
      skipEffect.current = true;
      setActiveIdx(idx);
      onSelect(idx);
    },
    [items.length, onSelect],
  );

  return (
    <View style={[col.wrapper, { flex }]}>
      {/* Pink selection band */}
      <View style={col.band} pointerEvents="none" />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        disableIntervalMomentum
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingVertical: PAD }}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
      >
        {items.map((label, i) => {
          const selected = i === activeIdx;
          return (
            <View key={label + i} style={col.item}>
              <Text
                numberOfLines={1}
                style={[col.label, selected ? col.active : col.inactive]}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Fade mask — top */}
      <LinearGradient
        colors={[Colors.white, 'rgba(255,255,255,0)']}
        style={[col.fade, { top: 0 }]}
        pointerEvents="none"
      />
      {/* Fade mask — bottom */}
      <LinearGradient
        colors={['rgba(255,255,255,0)', Colors.white]}
        style={[col.fade, { bottom: 0 }]}
        pointerEvents="none"
      />
    </View>
  );
}

const col = StyleSheet.create({
  wrapper: {
    height: WHEEL_H,
    overflow: 'hidden',
    position: 'relative',
  },
  band: {
    position: 'absolute',
    left: 6,
    right: 6,
    top: PAD,
    height: ITEM_H,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: Colors.pink,
    backgroundColor: 'rgba(232,96,140,0.06)',
    borderRadius: 10,
    zIndex: 2,
  },
  item: {
    height: ITEM_H,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  label: {
    fontSize: 16,
  },
  active: {
    color: Colors.dark,
    fontWeight: '700',
    fontSize: 17,
  },
  inactive: {
    color: Colors.muted,
    fontWeight: '400',
    fontSize: 15,
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: PAD,
    zIndex: 3,
  },
});

// ─── DatePickerSheet ──────────────────────────────────────────────────────────

export interface DatePickerSheetProps {
  visible: boolean;
  title?: string;
  /** ISO date string 'YYYY-MM-DD' — pre-fills the picker */
  initialDate?: string | null;
  /** ISO date string — max selectable date (defaults to today) */
  maxDate?: string;
  onClose: () => void;
  onConfirm: (isoDate: string) => void;
}

function parseDateProps(initialDate?: string | null, maxDate?: string) {
  const max = maxDate ? new Date(maxDate) : NOW;
  const init = initialDate ? new Date(initialDate) : max;
  const safeYear = Math.min(init.getFullYear(), max.getFullYear());
  const safeYearIdx = Math.max(0, YEARS.indexOf(safeYear));
  return {
    monthIdx: init.getMonth(),
    dayIdx: init.getDate() - 1,
    yearIdx: safeYearIdx !== -1 ? safeYearIdx : YEARS.length - 1,
  };
}

export function DatePickerSheet({
  visible,
  title = 'Select Date',
  initialDate,
  maxDate,
  onClose,
  onConfirm,
}: DatePickerSheetProps) {
  const init = parseDateProps(initialDate, maxDate);

  const [monthIdx, setMonthIdx] = useState(init.monthIdx);
  const [dayIdx, setDayIdx] = useState(init.dayIdx);
  const [yearIdx, setYearIdx] = useState(init.yearIdx);

  // Reset picker to the initialDate every time the sheet opens
  useEffect(() => {
    if (visible) {
      const { monthIdx: m, dayIdx: d, yearIdx: y } = parseDateProps(initialDate, maxDate);
      setMonthIdx(m);
      setDayIdx(d);
      setYearIdx(y);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const currentYear = YEARS[yearIdx] ?? MAX_YEAR;
  const daysInMonth = getDaysInMonth(monthIdx, currentYear);
  const clampedDayIdx = Math.min(dayIdx, daysInMonth - 1);

  // Build day strings for current month/year
  const dayItems = Array.from({ length: daysInMonth }, (_, i) =>
    String(i + 1).padStart(2, '0'),
  );

  const handleConfirm = () => {
    const y = YEARS[yearIdx];
    const m = String(monthIdx + 1).padStart(2, '0');
    const d = String(clampedDayIdx + 1).padStart(2, '0');
    onConfirm(`${y}-${m}-${d}`);
    onClose();
  };

  // key includes `visible` so columns remount (and re-scroll) each time the sheet opens
  const openKey = visible ? 'open' : 'closed';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={sheet.overlay}>
        {/* Tap backdrop to dismiss */}
        <Pressable style={sheet.backdrop} onPress={onClose} />

        <View style={sheet.card}>
          {/* Drag handle */}
          <View style={sheet.handle} />

          {/* Header */}
          <View style={sheet.header}>
            <Text style={sheet.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={16} style={sheet.closeBtn}>
              <X size={18} color={Colors.muted} strokeWidth={2.5} />
            </Pressable>
          </View>

          {/* Column header labels */}
          <View style={sheet.colLabels}>
            <Text style={[sheet.colLabel, { flex: 5 }]}>Month</Text>
            <Text style={[sheet.colLabel, { flex: 2 }]}>Day</Text>
            <Text style={[sheet.colLabel, { flex: 3 }]}>Year</Text>
          </View>

          {/* Wheel pickers */}
          <View style={sheet.wheels}>
            <WheelColumn
              key={`month-${openKey}`}
              flex={5}
              items={MONTHS}
              initialIndex={monthIdx}
              onSelect={setMonthIdx}
            />

            {/* Vertical dividers */}
            <View style={sheet.divider} />

            <WheelColumn
              key={`day-${daysInMonth}-${openKey}`}
              flex={2}
              items={dayItems}
              initialIndex={clampedDayIdx}
              onSelect={setDayIdx}
            />

            <View style={sheet.divider} />

            <WheelColumn
              key={`year-${openKey}`}
              flex={3}
              items={YEAR_STRINGS}
              initialIndex={yearIdx}
              onSelect={setYearIdx}
            />
          </View>

          {/* Confirm CTA */}
          <View style={sheet.actions}>
            <Button title="Confirm Date" onPress={handleConfirm} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const { width: SCREEN_W } = Dimensions.get('window');

const sheet = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(25,15,45,0.45)',
  },
  card: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 0,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.dark,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colLabels: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  colLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.muted,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  wheels: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: WHEEL_H * 0.6,
    backgroundColor: Colors.border,
    marginHorizontal: 2,
  },
  actions: {
    marginTop: 20,
  },
});
