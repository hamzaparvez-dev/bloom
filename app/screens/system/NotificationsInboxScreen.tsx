import React, { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ChevronRight } from 'lucide-react-native'
import { ThemeColors, ThemeRadius, ThemeSpacing } from '../../constants/theme'
import type { MainStackParamList } from '../../navigation/MainNavigator'
import { supabase } from '../../../supabaseClient'
import { useAuth } from '../../providers/AuthProvider'

interface NotifRow {
  id: string
  title: string
  timeLabel: string
  body: string
  is_read: boolean
  created_at: string
}

export function NotificationsInboxScreen() {
  const insets = useSafeAreaInsets()
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>()
  const { user } = useAuth()
  const [items, setItems] = useState<NotifRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const uid = user?.id
    if (!uid) {
      setItems([])
      setLoading(false)
      setError(null)
      return
    }
    setError(null)
    const { data, error: qErr } = await supabase
      .from('notifications')
      .select('id, title, body, is_read, created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(50)

    if (qErr) {
      setError(qErr.message)
      setItems([])
      setLoading(false)
      setRefreshing(false)
      return
    }

    const mapped: NotifRow[] = (data ?? []).map((row) => {
      let timeLabel = ''
      try {
        timeLabel = formatDistanceToNow(parseISO(row.created_at), { addSuffix: true })
      } catch {
        timeLabel = ''
      }
      return {
        id: row.id,
        title: row.title ?? 'Notification',
        body: row.body ?? '',
        is_read: !!row.is_read,
        created_at: row.created_at,
        timeLabel,
      }
    })
    setItems(mapped)
    setLoading(false)
    setRefreshing(false)
  }, [user?.id])

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      void load()
    }, [load]),
  )

  const onRefresh = () => {
    setRefreshing(true)
    void load()
  }

  const markRead = async (id: string) => {
    if (!user?.id) return
    await supabase.from('notifications').update({ is_read: true }).eq('id', id).eq('user_id', user.id)
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.header}>Notifications</Text>
      {error ? <Text style={styles.errorBanner}>{error}</Text> : null}
      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={ThemeColors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ThemeColors.primary} />}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {user?.id
                ? "You're all caught up. Reminders and insights will show up here."
                : 'Sign in to see notifications.'}
            </Text>
          }
          ListFooterComponent={
            __DEV__ ? (
              <View style={styles.footer}>
                <Text style={styles.footerLabel}>Empty states (dev)</Text>
                <Pressable onPress={() => nav.navigate('NotificationsCaughtUp')} style={styles.footerBtn}>
                  <Text style={styles.footerBtnText}>All caught up</Text>
                  <ChevronRight size={16} color={ThemeColors.textLight} strokeWidth={2} />
                </Pressable>
                <Pressable onPress={() => nav.navigate('NotificationsOff')} style={styles.footerBtn}>
                  <Text style={styles.footerBtnText}>Notifications off</Text>
                  <ChevronRight size={16} color={ThemeColors.textLight} strokeWidth={2} />
                </Pressable>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => void markRead(item.id)}
              style={[styles.card, !item.is_read && styles.cardUnread]}
            >
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardTime}>{item.timeLabel}</Text>
              {item.body ? <Text style={styles.cardBody}>{item.body}</Text> : null}
            </Pressable>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream, paddingHorizontal: ThemeSpacing.pagePad },
  header: { fontSize: 28, fontWeight: '800', color: ThemeColors.textDark, marginBottom: 16 },
  errorBanner: {
    fontSize: 13,
    fontWeight: '500',
    color: '#C62828',
    marginBottom: 12,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  list: { gap: 12 },
  empty: { fontSize: 15, fontWeight: '400', color: ThemeColors.textMid, lineHeight: 22, marginTop: 24 },
  card: {
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ThemeColors.border,
  },
  cardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: ThemeColors.primary,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: ThemeColors.textDark },
  cardTime: { fontSize: 12, fontWeight: '500', color: ThemeColors.textLight, marginTop: 4, marginBottom: 8 },
  cardBody: { fontSize: 15, fontWeight: '400', color: ThemeColors.textMid, lineHeight: 22 },
  footer: { marginTop: 24, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: ThemeColors.border },
  footerLabel: { fontSize: 12, fontWeight: '600', color: ThemeColors.textLight, marginBottom: 8, letterSpacing: 0.3 },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  footerBtnText: { fontSize: 15, fontWeight: '600', color: ThemeColors.lavender },
})
