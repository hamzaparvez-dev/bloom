import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Home,
  Plus,
  BarChart3,
  BookOpen,
  User,
  type LucideIcon,
} from 'lucide-react-native';
import { ThemeColors } from '../../constants/theme';

// ── Tab definitions ───────────────────────────────────────────────────────────
// Order: Home → Insights → + (center) → Learn → Profile

export type TabId = 'home' | 'insights' | 'learn' | 'profile';

export type TabPressId = TabId | 'add';

interface TabDef {
  id: TabPressId;
  label: string;
  icon: LucideIcon;
  isCenter?: boolean;
}

const TABS: TabDef[] = [
  { id: 'home',     label: 'Home',     icon: Home },
  { id: 'insights', label: 'Insights', icon: BarChart3 },
  { id: 'add',      label: '',         icon: Plus,      isCenter: true },
  { id: 'learn',    label: 'Learn',    icon: BookOpen },
  { id: 'profile',  label: 'Profile',  icon: User },
];

// ── Colors ────────────────────────────────────────────────────────────────────

const ACTIVE_COLOR  = ThemeColors.primary;     // #E8618C
const INACTIVE_COLOR = '#8E8E93';              // iOS system gray
const BAR_BG        = ThemeColors.surface;
const BORDER_COLOR  = '#E5E5EA';               // iOS separator

const FAB_SIZE = 58;
const FAB_RING = 4;
const GRADIENT_TOP = '#ff6b9a';
const GRADIENT_BOTTOM = '#ff4f7a';

// ── Component ─────────────────────────────────────────────────────────────────

interface TabBarProps {
  /** When null (e.g. Log screen open via +), no side tab uses active styling */
  activeTab: TabId | null;
  onTabPress: (tab: TabPressId) => void;
}

export function TabBar({ activeTab, onTabPress }: TabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, 8) },
      ]}
    >
      {TABS.map((tab) => {
        if (tab.isCenter) {
          return (
            <View key={tab.id} style={styles.centerWrap}>
              <Pressable
                onPress={() => onTabPress(tab.id)}
                style={({ pressed }) => [
                  styles.centerPressable,
                  pressed && styles.centerPressed,
                ]}
                hitSlop={{ top: 8, bottom: 4, left: 8, right: 8 }}
                android_ripple={{ color: 'rgba(255,255,255,0.35)', borderless: true, radius: FAB_SIZE }}
              >
                <View style={styles.fabOuterRing}>
                  <LinearGradient
                    colors={[GRADIENT_TOP, GRADIENT_BOTTOM]}
                    start={{ x: 0.15, y: 0 }}
                    end={{ x: 0.85, y: 1 }}
                    style={styles.fabGradient}
                  >
                    <tab.icon size={30} color="#FFFFFF" strokeWidth={3.2} />
                  </LinearGradient>
                </View>
              </Pressable>
            </View>
          );
        }

        const isActive = activeTab !== null && activeTab === tab.id;
        const color = isActive ? ACTIVE_COLOR : INACTIVE_COLOR;

        return (
          <Pressable
            key={tab.id}
            onPress={() => onTabPress(tab.id)}
            style={styles.tab}
            hitSlop={{ top: 8, bottom: 8 }}
          >
            <tab.icon
              size={22}
              color={color}
              strokeWidth={isActive ? 2.2 : 1.8}
            />
            <Text style={[styles.label, { color }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    backgroundColor: BAR_BG,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER_COLOR,
    paddingTop: 6,
  },

  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
    paddingVertical: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.05,
  },

  /** Pull FAB down so it overlaps the bar slightly — aligned with icon row */
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 6,
    marginBottom: -10,
  },
  centerPressable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.92,
  },
  /** Soft premium halo */
  fabOuterRing: {
    padding: FAB_RING,
    borderRadius: (FAB_SIZE + FAB_RING * 2) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  fabGradient: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
