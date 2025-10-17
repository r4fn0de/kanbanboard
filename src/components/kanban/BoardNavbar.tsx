import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  ChevronRight,
  Folder,
  LayoutDashboard,
  Layers,
  Briefcase,
  ClipboardList,
  CalendarDays,
  BarChart3,
  Target,
  Users,
  MessagesSquare,
  LifeBuoy,
  Lightbulb,
  Rocket,
  Package,
  Palette,
  PenTool,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface BoardNavbarProps {
  boardTitle: string
  boardIcon?: string
  boardEmoji?: string
  boardColor?: string
  workspaceName?: string
  activeTab?: string
  onTabChange?: (tab: string) => void
  taskControls?: ReactNode
  dueSummary?: {
    overdue: number
    today: number
    soon: number
  }
}

const tabs = [
  { id: 'tasks', label: 'Tasks' },
  { id: 'notes', label: 'Notes' },
  { id: 'draws', label: 'Draws' },
]

// Icon map for project icons
const ICON_MAP: Record<string, typeof Folder> = {
  Folder,
  LayoutDashboard,
  Layers,
  Briefcase,
  ClipboardList,
  CalendarDays,
  BarChart3,
  Target,
  Users,
  MessagesSquare,
  LifeBuoy,
  Lightbulb,
  Rocket,
  Package,
  Palette,
  PenTool,
}

export function BoardNavbar({
  boardTitle,
  boardIcon,
  boardEmoji,
  boardColor = '#6366F1',
  workspaceName,
  activeTab = 'tasks',
  onTabChange,
  taskControls,
  dueSummary,
}: BoardNavbarProps) {
  const showControls =
    (activeTab === 'tasks' || activeTab === 'notes') && (taskControls || dueSummary)

  const hasEmoji = boardEmoji && boardEmoji.trim().length > 0
  const IconComponent = boardIcon ? ICON_MAP[boardIcon] || Folder : Folder

  return (
    <div className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between gap-4 px-6 h-16">
        {/* Left Side: Breadcrumb & Tabs */}
        <div className="flex items-center gap-6 min-w-0 flex-1">
          {/* Breadcrumb with Project Info */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Project Icon/Emoji */}
            <div className="flex-shrink-0 flex h-9 w-9 items-center justify-center">
              {hasEmoji ? (
                <span className="text-2xl leading-none">{boardEmoji}</span>
              ) : (
                <IconComponent className="h-5 w-5" style={{ color: boardColor }} />
              )}
            </div>

            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 min-w-0">
              {workspaceName && (
                <>
                  <Link
                    to="/"
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {workspaceName}
                  </Link>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
                </>
              )}
              <h1 className="text-lg font-semibold text-foreground truncate">
                {boardTitle}
              </h1>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 flex-shrink-0 relative">
            {tabs.map(tab => {
              const isActive = activeTab === tab.id
              return (
                <div key={tab.id} className="relative">
                  {isActive && (
                    <motion.div
                      layoutId="activeTabBackground"
                      className="absolute inset-0 bg-accent rounded-md"
                      initial={false}
                      transition={{
                        type: 'spring',
                        stiffness: 500,
                        damping: 30,
                      }}
                    />
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'h-9 px-4 text-sm font-medium transition-colors duration-200 relative z-10',
                      isActive
                        ? 'text-foreground bg-transparent hover:bg-transparent'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                    )}
                    onClick={() => onTabChange?.(tab.id)}
                  >
                    {tab.label}
                  </Button>
                </div>
              )
            })}
          </nav>
        </div>

        {/* Right Side: Controls */}
        {showControls && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-3 flex-shrink-0"
          >
            {dueSummary && activeTab === 'tasks' ? (
              <div className="hidden md:flex items-center gap-2">
                {dueSummary.overdue > 0 && (
                  <Badge className="bg-rose-500/10 text-rose-600 border border-rose-500/20 dark:text-rose-300">
                    Overdue {dueSummary.overdue}
                  </Badge>
                )}
                {dueSummary.today > 0 && (
                  <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/20 dark:text-amber-300">
                    Due today {dueSummary.today}
                  </Badge>
                )}
                {dueSummary.soon > 0 && (
                  <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/20 dark:text-amber-300">
                    Due soon {dueSummary.soon}
                  </Badge>
                )}
                {dueSummary.overdue + dueSummary.today + dueSummary.soon === 0 && (
                  <Badge variant="outline">No upcoming deadlines</Badge>
                )}
              </div>
            ) : null}
            {taskControls}
          </motion.div>
        )}
      </div>
    </div>
  )
}
