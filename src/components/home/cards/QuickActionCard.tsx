import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'

interface QuickActionCardProps {
  icon: LucideIcon
  label: string
  description?: string
  shortcut?: string
  onClick?: () => void
  disabled?: boolean
  variant?: 'default' | 'primary' | 'secondary'
  delay?: number
}

export function QuickActionCard({
  icon: Icon,
  label,
  description,
  shortcut,
  onClick,
  disabled = false,
  variant = 'default',
  delay = 0,
}: QuickActionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Button
        variant="ghost"
        disabled={disabled}
        onClick={onClick}
        className={cn(
          'h-auto flex-col items-start gap-2 rounded-lg border bg-card p-4 transition-all duration-200 w-full',
          'hover:border-primary/50',
          disabled && 'opacity-50 cursor-not-allowed',
          variant === 'primary' && 'border-primary/20 hover:border-primary/50',
          variant === 'secondary' && 'border-secondary/20 hover:border-secondary/50'
        )}
      >
        <div className="flex w-full items-center justify-between">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, delay: delay + 0.1 }}
          >
            <Icon className="h-6 w-6 text-primary" />
          </motion.div>
          {shortcut && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: delay + 0.2 }}
              className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded"
            >
              {shortcut}
            </motion.span>
          )}
        </div>
        <div className="text-left">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.2 }}
            className="font-semibold"
          >
            {label}
          </motion.div>
          {description && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: delay + 0.3 }}
              className="text-xs text-muted-foreground mt-1"
            >
              {description}
            </motion.div>
          )}
        </div>
      </Button>
    </motion.div>
  )
}
