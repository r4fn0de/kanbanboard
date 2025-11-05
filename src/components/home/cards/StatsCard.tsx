import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface StatsCardProps {
  icon: LucideIcon
  label: string
  value: number
  total?: number
  variant?: 'default' | 'primary' | 'success' | 'danger' | 'warning'
  loading?: boolean
  delay?: number
}

const variantClasses = {
  default: 'text-muted-foreground',
  primary: 'text-blue-500',
  success: 'text-green-500',
  danger: 'text-red-500',
  warning: 'text-yellow-500',
}

export function StatsCard({
  icon: Icon,
  label,
  value,
  total,
  variant = 'default',
  loading = false,
  delay = 0,
}: StatsCardProps) {
  const percentage = total ? (value / total) * 100 : null

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-4 space-y-2 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-5 w-5 bg-muted rounded" />
          {percentage !== null && <div className="h-3 w-8 bg-muted rounded" />}
        </div>
        <div className="space-y-2">
          <div className="h-8 w-16 bg-muted rounded" />
          <div className="h-4 w-24 bg-muted rounded" />
        </div>
        {total !== null && <div className="h-1 w-full bg-muted rounded" />}
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={cn(
        'rounded-lg border bg-card p-4 space-y-2 transition-all duration-200 cursor-default'
      )}
    >
      <div className="flex items-center justify-between">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, delay: delay + 0.1 }}
        >
          <Icon className={cn('h-5 w-5', variantClasses[variant])} />
        </motion.div>
        {percentage !== null && (
          <span className="text-xs text-muted-foreground font-medium">
            {percentage.toFixed(0)}%
          </span>
        )}
      </div>
      <div>
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5, delay: delay + 0.2 }}
          className="text-2xl font-bold"
        >
          {value}
        </motion.div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
      {total !== null && (
        <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, delay: delay + 0.3, ease: 'easeOut' }}
            className={cn(
              'h-1 rounded-full',
              variant === 'success' && 'bg-green-500',
              variant === 'danger' && 'bg-red-500',
              variant === 'warning' && 'bg-yellow-500',
              variant === 'primary' && 'bg-blue-500',
              variant === 'default' && 'bg-gray-500'
            )}
          />
        </div>
      )}
    </motion.div>
  )
}
