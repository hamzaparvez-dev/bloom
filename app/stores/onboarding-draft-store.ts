import { create } from 'zustand'

export type OnboardingJourneyMode = 'cycle' | 'pregnant' | 'ttc'

export interface OnboardingDraftState {
  journeyMode: OnboardingJourneyMode | null
  periodLength: number | null
  cycleLength: number | null
  healthGoalIds: string[]
  lastPeriodDate: string | null
  setJourneyMode: (mode: OnboardingJourneyMode) => void
  setCycleBasics: (periodLength: number, cycleLength: number) => void
  setHealthGoals: (ids: string[]) => void
  setLastPeriodDate: (isoDate: string) => void
  reset: () => void
}

const initial = {
  journeyMode: null as OnboardingJourneyMode | null,
  periodLength: null as number | null,
  cycleLength: null as number | null,
  healthGoalIds: [] as string[],
  lastPeriodDate: null as string | null,
}

export const useOnboardingDraftStore = create<OnboardingDraftState>((set) => ({
  ...initial,
  setJourneyMode: (journeyMode) => set({ journeyMode }),
  setCycleBasics: (periodLength, cycleLength) => set({ periodLength, cycleLength }),
  setHealthGoals: (healthGoalIds) => set({ healthGoalIds }),
  setLastPeriodDate: (lastPeriodDate) => set({ lastPeriodDate }),
  reset: () => set(initial),
}))
