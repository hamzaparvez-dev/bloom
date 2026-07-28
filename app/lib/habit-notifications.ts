import { Platform } from 'react-native'
import { shouldSkipExpoNotifications } from './expo-go-notifications'

const HABIT_ID = 'bloom-daily-habit-nudge'

function atHour(base: Date, hour: number, minute: number): Date {
  const d = new Date(base)
  d.setHours(hour, minute, 0, 0)
  return d
}

/** Next single nudge: morning 9:00 or evening 20:00, else tomorrow 9:00. Max one scheduled. */
function nextNudgeDate(now: Date, loggedToday: boolean): Date | null {
  if (loggedToday) return null
  const nine = atHour(now, 9, 0)
  const eightPm = atHour(now, 20, 0)
  if (now < nine) return nine
  if (now < eightPm) return eightPm
  const tmr = new Date(now)
  tmr.setDate(tmr.getDate() + 1)
  return atHour(tmr, 9, 0)
}

export async function ensureAndroidHabitChannel() {
  if (shouldSkipExpoNotifications()) return
  if (Platform.OS !== 'android') return
  const Notifications = await import('expo-notifications')
  await Notifications.setNotificationChannelAsync('habit', {
    name: 'Daily check-in',
    importance: Notifications.AndroidImportance.DEFAULT,
  })
}

export async function syncHabitNudges(input: {
  loggedToday: boolean
  notificationsEnabled: boolean
}): Promise<void> {
  if (shouldSkipExpoNotifications()) return

  const Notifications = await import('expo-notifications')

  try {
    await Notifications.cancelScheduledNotificationAsync(HABIT_ID)
  } catch {
    /* none */
  }

  if (!input.notificationsEnabled || input.loggedToday) return

  const perm = await Notifications.getPermissionsAsync()
  if (perm.status !== 'granted' && perm.canAskAgain) await Notifications.requestPermissionsAsync()
  const after = await Notifications.getPermissionsAsync()
  if (after.status !== 'granted') return

  await ensureAndroidHabitChannel()

  const next = nextNudgeDate(new Date(), input.loggedToday)
  if (!next) return

  const body = next.getHours() === 20 ? 'Quick check-in before bed?' : 'Log today in 10 seconds. Stay on track.'

  await Notifications.scheduleNotificationAsync({
    identifier: HABIT_ID,
    content: { title: 'Bloom', body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: next,
      ...(Platform.OS === 'android' ? { channelId: 'habit' } : {}),
    },
  })
}
