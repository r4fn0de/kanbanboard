import { motion } from 'framer-motion'
import { PlusCircle, FolderKanban, Lightbulb, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyOnboardingProps {
  onCreateBoard?: () => void
}

export function EmptyOnboarding({ onCreateBoard }: EmptyOnboardingProps) {
  const features = [
    {
      icon: FolderKanban,
      title: 'Organize Projects',
      description: 'Create boards to track your work and keep everything organized',
    },
    {
      icon: Zap,
      title: 'Boost Productivity',
      description: 'Use drag-and-drop to manage tasks and deadlines efficiently',
    },
    {
      icon: Lightbulb,
      title: 'Stay Focused',
      description: 'Quick actions and smart widgets keep you on track',
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4"
    >
      <div className="max-w-2xl space-y-8">
        {/* Hero Section */}
        <div className="space-y-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="w-24 h-24 mx-auto bg-primary/10 rounded-full flex items-center justify-center"
          >
            <FolderKanban className="w-12 h-12 text-primary" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold tracking-tight">
              Welcome to Modulo! 🎉
            </h2>
            <p className="mt-2 text-lg text-muted-foreground">
              Your productivity journey starts here. Let's create your first project!
            </p>
          </motion.div>
        </div>

        {/* Feature List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="grid gap-4 md:grid-cols-3"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1, duration: 0.5 }}
              className="p-4 rounded-lg border bg-card space-y-2"
            >
              <feature.icon className="w-8 h-8 text-primary mx-auto" />
              <h3 className="font-semibold text-sm">{feature.title}</h3>
              <p className="text-xs text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="space-y-4"
        >
          <Button
            onClick={onCreateBoard}
            size="lg"
            className="gap-2 h-12 px-8 text-base"
          >
            <PlusCircle className="w-5 h-5" />
            Create Your First Project
          </Button>
          <p className="text-sm text-muted-foreground">
            It takes less than a minute to get started
          </p>
        </motion.div>
      </div>
    </motion.div>
  )
}
