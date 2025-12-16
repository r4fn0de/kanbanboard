import { motion } from 'framer-motion'
import {
  PlusCircle,
  FolderKanban,
  Lightbulb,
  Zap,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface EmptyOnboardingProps {
  onCreateBoard?: () => void
}

export function EmptyOnboarding({ onCreateBoard }: EmptyOnboardingProps) {
  const features = [
    {
      icon: FolderKanban,
      title: 'Organize Projects',
      description:
        'Create boards to track your work and keep everything organized in one place.',
    },
    {
      icon: Zap,
      title: 'Boost Productivity',
      description:
        'Use drag-and-drop to manage tasks, set priorities, and meet deadlines efficiently.',
    },
    {
      icon: Lightbulb,
      title: 'Stay Focused',
      description:
        'Quick actions, smart widgets, and a clean interface help you stay on track.',
    },
  ]

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] w-full px-4 py-12">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="w-full max-w-4xl space-y-12 text-center"
      >
        {/* Hero Section */}
        <div className="space-y-6">
          <motion.div
            variants={item}
            className="mx-auto w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center shadow-sm"
          >
            <FolderKanban className="w-10 h-10 text-primary" />
          </motion.div>

          <motion.div variants={item} className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl text-foreground">
              Welcome to Modulo
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground leading-relaxed">
              Your productivity journey starts here. Create your first project
              to start organizing tasks and managing your workflow effectively.
            </p>
          </motion.div>

          <motion.div variants={item} className="pt-4">
            <Button
              onClick={onCreateBoard}
              size="lg"
              className="h-12 px-8 text-base rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
            >
              <PlusCircle className="mr-2 w-5 h-5" />
              Create Your First Project
              <ArrowRight className="ml-2 w-4 h-4 opacity-50" />
            </Button>
            <p className="mt-4 text-sm text-muted-foreground">
              It takes less than a minute to get started
            </p>
          </motion.div>
        </div>

        {/* Feature Grid */}
        <motion.div
          variants={item}
          className="grid gap-6 md:grid-cols-3 text-left"
        >
          {features.map(feature => (
            <Card
              key={feature.title}
              className="border-muted/40 bg-card/50 hover:bg-card hover:border-primary/20 transition-colors duration-300"
            >
              <CardHeader>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      </motion.div>
    </div>
  )
}
