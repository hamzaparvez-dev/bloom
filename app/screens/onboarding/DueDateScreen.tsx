import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Calendar } from 'react-native-calendars';
import { CalendarDays } from 'lucide-react-native';
import { Colors } from '../../constants';
import { Button } from '../../components/ui/Button';

interface DueDateScreenProps {
  onConfirm: (date: string) => void;
}

export function DueDateScreen({ onConfirm }: DueDateScreenProps) {
  const insets = useSafeAreaInsets();
  const [selectedDate, setSelectedDate] = useState('2026-03-01');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerBg} pointerEvents="none" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.delay(100)}>
          <Text style={styles.title}>{'When was your last\nperiod?'}</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200)} style={styles.calendar}>
          <Calendar
            current={selectedDate}
            onDayPress={(day) => setSelectedDate(day.dateString)}
            markedDates={{
              [selectedDate]: {
                selected: true,
                selectedColor: Colors.pink,
              },
            }}
            theme={{
              calendarBackground: Colors.white,
              textSectionTitleColor: Colors.muted,
              selectedDayBackgroundColor: Colors.pink,
              selectedDayTextColor: Colors.white,
              todayTextColor: Colors.pink,
              dayTextColor: Colors.dark,
              textDisabledColor: '#D3CFDE',
              monthTextColor: Colors.dark,
              textDayFontSize: 14,
              textMonthFontSize: 18,
              textMonthFontWeight: '600',
              textDayHeaderFontSize: 13,
              arrowColor: Colors.muted,
            }}
            style={styles.calendarWidget}
            enableSwipeMonths
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300)} style={styles.selectedDateRow}>
          <CalendarDays size={18} color={Colors.pink} strokeWidth={2} />
          <Text style={styles.selectedDate}>
            LMP: {selectedDate}
          </Text>
        </Animated.View>
      </ScrollView>

      <Animated.View entering={FadeInDown.delay(400)} style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button title="Confirm Date →" onPress={() => onConfirm(selectedDate)} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  headerBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: Colors.pinkSurface,
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
    lineHeight: 34,
    marginBottom: 8,
  },
  calendar: {
    width: '100%',
    borderRadius: 24,
    backgroundColor: Colors.white,
    padding: 12,
    alignSelf: 'center',
  },
  calendarWidget: {
    borderRadius: 16,
  },
  selectedDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  selectedDate: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.pink,
    textAlign: 'center',
  },
  footer: {
    paddingTop: 16,
    paddingHorizontal: 20,
  },
});
