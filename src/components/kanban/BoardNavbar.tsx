import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { preloadTldraw } from '@/components/whiteboard/preloadTldraw'
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
  { id: 'whiteboard', label: 'Whiteboard' },
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
  const hasEmoji = boardEmoji && boardEmoji.trim().length > 0
  const IconComponent = boardIcon ? ICON_MAP[boardIcon] || Folder : Folder
  const dueSummaryData = activeTab === 'tasks' && dueSummary ? dueSummary : null
  const shouldRenderControls = Boolean(taskControls)
  const shouldRenderControlSection =
    shouldRenderControls || Boolean(dueSummaryData)

  return (
    <div className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-4 px-4 py-3 md:px-6 lg:h-16 overflow-hidden">
        {/* Breadcrumb with Project Info */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center">
            {hasEmoji ? (
              <span className="text-2xl leading-none">{boardEmoji}</span>
            ) : (
              <IconComponent
                className="h-5 w-5"
                style={{ color: boardColor }}
              />
            )}
          </div>

          <div className="flex items-center gap-2 min-w-0">
            {workspaceName && (
              <>
                <Link
                  to="/"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {workspaceName}
                </Link>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground/50" />
              </>
            )}
            <h1 className="truncate text-lg font-semibold text-foreground">
              {boardTitle}
            </h1>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex min-w-0 flex-1">
              <ScrollArea className="max-w-full">
                <nav className="relative flex min-w-max items-center gap-1 pr-3">
                  {tabs.map(tab => {
                    const isActive = activeTab === tab.id
                    const isWhiteboardTab = tab.id === 'whiteboard'
                    return (
                      <div key={tab.id} className="group relative shrink-0">
                        {isActive ? (
                          <motion.div
                            layoutId="activeTabBackground"
                            className="absolute inset-0 rounded-md bg-accent"
                            initial={false}
                            transition={{
                              type: 'spring',
                              stiffness: 500,
                              damping: 30,
                            }}
                          />
                        ) : (
                          <div className="pointer-events-none absolute inset-0 rounded-md bg-accent/40 opacity-0 transition-opacity group-hover:opacity-100" />
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            'relative z-10 h-9 px-3 text-sm font-medium transition-colors duration-200 whitespace-nowrap md:px-4',
                            isActive
                              ? 'bg-transparent text-foreground hover:bg-transparent'
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                          onMouseEnter={() => {
                            if (isWhiteboardTab) {
                              preloadTldraw()
                            }
                          }}
                          onFocus={() => {
                            if (isWhiteboardTab) {
                              preloadTldraw()
                            }
                          }}
                          onClick={() => onTabChange?.(tab.id)}
                        >
                          {tab.label}
                        </Button>
                      </div>
                    )
                  })}
                </nav>
                <ScrollBar orientation="horizontal" className="mt-2" />
              </ScrollArea>
            </div>

            {shouldRenderControlSection ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="flex shrink-0 items-center gap-3"
              >
                {dueSummaryData ? (
                  <div className="hidden min-w-max items-center gap-2 text-xs sm:flex sm:text-sm">
                    {dueSummaryData.overdue > 0 && (
                      <Badge variant="destructive">
                        Overdue {dueSummaryData.overdue}
                      </Badge>
                    )}
                    {dueSummaryData.today > 0 && (
                      <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-300 rounded-md">
                        Due today {dueSummaryData.today}
                      </Badge>
                    )}
                    {dueSummaryData.soon > 0 && (
                      <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-300 rounded-md">
                        Due soon {dueSummaryData.soon}
                      </Badge>
                    )}
                    {dueSummaryData.overdue +
                      dueSummaryData.today +
                      dueSummaryData.soon ===
                      0 && (
                      <Badge variant="secondary">No upcoming deadlines</Badge>
                    )}
                  </div>
                ) : null}
                {taskControls}
              </motion.div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
