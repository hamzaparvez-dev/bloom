/** Static learn hub content — aligns with PRD S-44 → S-47, S-50 */

export interface LearnArticle {
  id: string
  title: string
  excerpt: string
  readMinutes: number
  category: string
  categoryKey: LearnCategoryKey
  /** Featured cards use a tinted block instead of remote images */
  accent: string
  accentBg: string
}

export type LearnCategoryKey = 'all' | 'cycle' | 'pregnancy' | 'fertility' | 'nutrition' | 'mental'

export const LEARN_CATEGORY_CHIPS: { key: LearnCategoryKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'cycle', label: 'Cycle' },
  { key: 'pregnancy', label: 'Pregnancy' },
  { key: 'fertility', label: 'Fertility' },
  { key: 'nutrition', label: 'Nutrition' },
  { key: 'mental', label: 'Mental health' },
]

export const LEARN_ARTICLES: LearnArticle[] = [
  {
    id: 'fw-guide',
    title: 'Understanding Your Fertile Window',
    excerpt: 'The complete guide to timing, signs, and what to track.',
    readMinutes: 5,
    category: 'Fertility',
    categoryKey: 'fertility',
    accent: '#E8618C',
    accentBg: '#FCEDF4',
  },
  {
    id: 'week-20',
    title: 'Week 20: What’s Happening With Your Baby Right Now',
    excerpt: 'Growth milestones, movement, and what to expect this week.',
    readMinutes: 7,
    category: 'Pregnancy',
    categoryKey: 'pregnancy',
    accent: '#73C2E8',
    accentBg: '#E8F4FC',
  },
  {
    id: 'stress-cycle',
    title: 'Stress & Your Cycle',
    excerpt: 'How cortisol interacts with hormones and practical coping tips.',
    readMinutes: 4,
    category: 'Mental health',
    categoryKey: 'mental',
    accent: '#9C8FC4',
    accentBg: '#F0EAFF',
  },
  {
    id: 'bloom-track',
    title: 'Track Your Bloom Fertility',
    excerpt: 'Short guide to logging BBT, LH, and cervical fluid together.',
    readMinutes: 3,
    category: 'Fertility',
    categoryKey: 'fertility',
    accent: '#6ECF9E',
    accentBg: '#EAFFE2',
  },
  {
    id: 'cycle-basics',
    title: 'Cycle basics: what counts as regular?',
    excerpt: 'Length, variation, and when to check in with a clinician.',
    readMinutes: 4,
    category: 'Cycle',
    categoryKey: 'cycle',
    accent: '#E8618C',
    accentBg: '#FCEDF4',
  },
]

export function getArticleById(id: string): LearnArticle | undefined {
  return LEARN_ARTICLES.find((a) => a.id === id)
}

export function filterArticlesByCategory(key: LearnCategoryKey): LearnArticle[] {
  if (key === 'all') return LEARN_ARTICLES
  return LEARN_ARTICLES.filter((a) => a.categoryKey === key)
}

export interface BrowseTopic {
  id: string
  title: string
  icon: 'droplets' | 'apple' | 'brain' | 'sprout' | 'baby' | 'pill'
  bg: string
  fg: string
}

export const BROWSE_TOPICS: BrowseTopic[] = [
  { id: 'cycle', title: 'Cycle & period', icon: 'droplets', bg: '#FFE4EC', fg: '#C44A73' },
  { id: 'nutrition', title: 'Nutrition', icon: 'apple', bg: '#EAFFE2', fg: '#2D6A4F' },
  { id: 'mental', title: 'Mental health', icon: 'brain', bg: '#F0EAFF', fg: '#6B5B95' },
  { id: 'fertility', title: 'Fertility', icon: 'sprout', bg: '#E8F5E9', fg: '#388E3C' },
  { id: 'pregnancy', title: 'Pregnancy', icon: 'baby', bg: '#E3F2FD', fg: '#1565C0' },
  { id: 'supplements', title: 'Supplements', icon: 'pill', bg: '#FFF3E0', fg: '#E65100' },
]

export interface ExpertQa {
  id: string
  tag: string
  question: string
  answerPreview: string
  answerFull: string
}

export const EXPERT_QA: ExpertQa[] = [
  {
    id: 'e1',
    tag: 'Cycle',
    question: 'Is a 21-day cycle too short?',
    answerPreview: 'Cycles between 21–35 days can be normal if consistent for you…',
    answerFull:
      'Cycles between 21–35 days can be normal if they are consistent for you. Sudden shortening, heavy bleeding, or pain deserves a conversation with your clinician. Tracking 3+ cycles helps your care team see patterns.',
  },
  {
    id: 'e2',
    tag: 'Period',
    question: 'When should I test after a missed period?',
    answerPreview: 'Most home pregnancy tests are reliable from the first day of a missed period…',
    answerFull:
      'Most home pregnancy tests are reliable from the first day of a missed period. For the earliest detection, use first-morning urine and follow the kit instructions. If results are unclear, repeat in 48 hours or contact your provider.',
  },
]

export interface RealStory {
  id: string
  name: string
  tag: string
  tagColor: string
  tagBg: string
  summary: string
  cardBg: string
  fullStory: string
}

export const REAL_STORIES: RealStory[] = [
  {
    id: 's1',
    name: 'Maya',
    tag: 'Success story',
    tagColor: '#C44A73',
    tagBg: '#FCEDF4',
    summary: 'Two years TTC, one miscarriage, and our rainbow arrived in March.',
    cardBg: '#FFF0F5',
    fullStory:
      'After two years of trying and one loss, we focused on sleep, gentle movement, and a care team that listened. Our rainbow baby arrived in March. However your path unfolds, you deserve support that respects your whole story.',
  },
  {
    id: 's2',
    name: 'Jordan',
    tag: 'PCOS journey',
    tagColor: '#6B5B95',
    tagBg: '#F0EAFF',
    summary: 'Balancing insulin resistance, tracking cycles, and advocating in appointments.',
    cardBg: '#F3E5F5',
    fullStory:
      'PCOS showed up as long cycles and frustrating appointments. Tracking in Bloom helped me spot patterns; bringing charts to visits changed the conversation. Small nutrition shifts and metformin (per my doctor) finally steadied things.',
  },
]

export function getStoryById(id: string): RealStory | undefined {
  return REAL_STORIES.find((s) => s.id === id)
}

/** Long-form body for article detail (S-45) */
export const ARTICLE_BODIES: Record<string, string> = {
  'fw-guide': `Your fertile window is usually the few days before ovulation and the day of ovulation itself. Sperm can live several days in the reproductive tract, while the egg survives about 12–24 hours after release.

Signs of ovulation
• Egg-white cervical mucus
• Mild one-sided pelvic twinge (mittelschmerz)
• Sustained BBT rise after ovulation
• Positive LH tests (optional)

Tracking consistently in Bloom helps you see your personal pattern rather than relying on generic calendar estimates alone.`,
  'week-20': `At 20 weeks, many parents notice clearer kicks and rolls. Your care team may review anatomy scan results and discuss movement patterns.

What many people notice
• More defined sleep-wake rhythms for baby
• Round ligament stretching as the uterus grows
• Energy often a bit better than the first trimester

Always contact your clinician for decreased movement, bleeding, or concerning symptoms.`,
  'stress-cycle': `Stress does not “cancel” ovulation for everyone, but chronic high stress can interact with sleep, appetite, and hormones in ways that shift cycle length.

Small steps that help
• Regular sleep windows
• Gentle movement most days
• Brief daily mindfulness or breathing

If cycles change suddenly, keep logging and share the trend with your provider.`,
  'bloom-track': `Combine cervical fluid, optional LH strips, and BBT for the clearest at-home picture. Log at the same times when possible for BBT.

Tip: Mark travel, illness, and poor sleep in notes — they often explain temporary shifts.`,
  'cycle-basics': `A typical adult cycle is often described as 21–35 days. What matters most is what is normal for you over several months.

When to reach out
• Sudden changes after a stable pattern
• Very heavy bleeding or severe pain
• Trying to conceive for 12+ months (6+ if 35+)

Your Bloom logs make these conversations easier with your care team.`,
}
