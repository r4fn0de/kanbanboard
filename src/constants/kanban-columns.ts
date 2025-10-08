export const COLUMN_COLOR_OPTIONS = [
  '#0F172A',
  '#1E293B',
  '#2563EB',
  '#6366F1',
  '#8B5CF6',
  '#EC4899',
  '#F97316',
  '#F59E0B',
  '#22C55E',
  '#0EA5E9',
] as const

export const COLUMN_ICON_VALUES = [
  'Circle',
  'Play',
  'CheckCircle',
  'Loader',
  'AlarmClock',
  'Bolt',
  'Sparkles',
  'Target',
  'CalendarCheck',
  'ClipboardList',
  'Lightbulb',
  'Flag',
  'Timer',
  'Ship',
  'Kanban',
  'TrendingUp',
  'Zap',
  'Rocket',
  'BadgeCheck',
] as const

export type ColumnIconValue = (typeof COLUMN_ICON_VALUES)[number]

export const DEFAULT_COLUMN_ICON: ColumnIconValue = COLUMN_ICON_VALUES[0]

export const FALLBACK_COLUMN_COLORS = [
  '#6366F1',
  '#F97316',
  '#0EA5E9',
  '#22C55E',
  '#EC4899',
  '#8B5CF6',
] as const
