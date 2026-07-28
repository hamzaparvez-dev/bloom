/** Rule-based copy for Partner view — no OpenAI. */

import { ThemeColors } from '../constants/theme'

export type PartnerSummaryType = 'none' | 'fertile' | 'period' | 'normal'

export interface PartnerSummary {
  title: string
  subtitle: string
  type: PartnerSummaryType
}

export interface PartnerTip {
  id: string
  text: string
  priority: 'high' | 'medium' | 'low'
}

/** Labels and prompts (single source for screen copy). */
export const partnerScreenCopy = {
  screenTitle: 'Partner view',
  primaryCta: 'Plan today together',
  secondaryCta: 'Log activity',
  tipsSection: 'Tips for today',
  feedbackPrompt: 'Was this helpful?',
  supportLinePrefix: 'How to support',
  savedForToday: 'Saved for today',
  tipsAllDone: 'You are set for today. Check back tomorrow.',
} as const

/** Keep tips scannable (max ~10 words). */
function tip(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length <= 10) return words.join(' ')
  return words.slice(0, 10).join(' ')
}

export function getPartnerSummary(input: { cycleDay: number | null | undefined }): PartnerSummary {
  if (input.cycleDay == null || !Number.isFinite(Number(input.cycleDay))) {
    return {
      title: 'No data yet',
      subtitle: 'Ask your partner to start tracking',
      type: 'none',
    }
  }

  const d = Math.round(Number(input.cycleDay))

  if (d >= 11 && d <= 16) {
    const daysLeft = Math.max(0, 16 - d)
    const tail =
      daysLeft === 0
        ? 'Last day of peak window'
        : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left in window`
    return {
      title: 'High fertility today',
      subtitle: tip(`Best chance to conceive · ${tail}`),
      type: 'fertile',
    }
  }

  if (d <= 5) {
    return {
      title: 'Period phase',
      subtitle: 'Focus on comfort and support',
      type: 'period',
    }
  }

  return {
    title: 'Normal phase',
    subtitle: 'Energy and mood are usually steady',
    type: 'normal',
  }
}

export function getPartnerTips(input: { cycleDay: number | null | undefined }): PartnerTip[] {
  if (input.cycleDay == null || !Number.isFinite(Number(input.cycleDay))) {
    return [{ id: 'none-h-0', text: tip('Encourage tracking to unlock insights'), priority: 'high' }]
  }

  const d = Math.round(Number(input.cycleDay))

  if (d >= 11 && d <= 16) {
    return [
      { id: 'fertile-h-0', text: tip('Best time for intimacy'), priority: 'high' },
      { id: 'fertile-m-0', text: tip('Plan a relaxed date night'), priority: 'medium' },
      { id: 'fertile-l-0', text: tip('Reduce stress together'), priority: 'low' },
    ]
  }

  if (d <= 5) {
    return [
      { id: 'period-h-0', text: tip('Offer emotional support'), priority: 'high' },
      { id: 'period-m-0', text: tip('Help with daily tasks'), priority: 'medium' },
      { id: 'period-l-0', text: tip('Keep things low stress'), priority: 'low' },
    ]
  }

  return [
    { id: 'norm-m-0', text: tip('Maintain healthy routine'), priority: 'medium' },
    { id: 'norm-l-0', text: tip('Stay active together'), priority: 'low' },
  ]
}

export function summaryAccent(summary: PartnerSummary): { border: string; iconBg: string; iconColor: string } {
  if (summary.type === 'fertile') return { border: '#C8E6C9', iconBg: '#E8F5E9', iconColor: '#2E7D32' }
  if (summary.type === 'period') return { border: '#F5C4C0', iconBg: '#FDECEA', iconColor: '#C62828' }
  if (summary.type === 'normal') return { border: ThemeColors.border, iconBg: '#F0EAFF', iconColor: '#6B5B95' }
  return { border: ThemeColors.border, iconBg: '#EDE8F5', iconColor: ThemeColors.textMid }
}
