import { motion } from 'framer-motion'
import { Sparkles, ArrowRight, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface NewUserOnboardingProps {
  onDismiss?: () => void
  onOpenSearch?: () => void
}

export function NewUserOnboarding({ onDismiss, onOpenSearch }: NewUserOnboardingProps) {
  const tips = [
    {
      icon: Search,
      title: 'Quick Search',
      description: 'Press Cmd+K (Ctrl+K) to quickly find anything',
    },
    {
      icon: ArrowRight,
      title: 'Drag & Drop',
      description: 'Reorder widgets and cards by dragging them',
    },
    {
      icon: Sparkles,
      title: 'Stay Organized',
      description: 'Use labels, priorities, and deadlines for better tracking',
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="mb-8 rounded-lg border bg-gradient-to-r from-primary/5 via-primary/5 to-purple-500/5 p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Welcome! Here are some quick tips</h3>
          </div>

          <div className="grid gap-3 md:grid-cols-3 mt-4">
            {tips.map((tip, index) => (
              <motion.div
                key={tip.title}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                className="flex gap-3 p-3 rounded-md bg-background/50"
              >
                <tip.icon className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{tip.title}</p>
                  <p className="text-xs text-muted-foreground">{tip.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="text-muted-foreground hover:text-foreground"
        >
          Got it
        </Button>
      </div>
    </motion.div>
  )
}
