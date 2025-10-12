import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface BoardNavbarProps {
  boardTitle: string
  activeTab?: string
  onTabChange?: (tab: string) => void
  taskControls?: ReactNode
}

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'notes', label: 'Notes' },
  { id: 'draws', label: 'Draws' },
]

export function BoardNavbar({
  boardTitle,
  activeTab = 'tasks',
  onTabChange,
  taskControls,
}: BoardNavbarProps) {
  const showControls = (activeTab === 'tasks' || activeTab === 'notes') && taskControls

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between h-14 px-6">
        <div className="flex items-center gap-4">
          {/* Board Title */}
          <div className="flex items-center gap-4 mr-8">
            <h1 className="text-lg font-semibold text-foreground">
              {boardTitle}
            </h1>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1">
            {tabs.map(tab => (
              <Button
                key={tab.id}
                variant="ghost"
                className={cn(
                  'h-9 px-4 text-sm font-medium transition-colors',
                  'hover:bg-accent/50 hover:text-accent-foreground',
                  activeTab === tab.id
                    ? 'text-foreground bg-accent/30'
                    : 'text-muted-foreground'
                )}
                onClick={() => onTabChange?.(tab.id)}
              >
                {tab.label}
              </Button>
            ))}
          </nav>
        </div>

        {/* Controls - Visible on Tasks and Notes tabs */}
        {showControls && (
          <div className="flex items-center gap-2">
            {taskControls}
          </div>
        )}
      </div>
    </div>
  )
}
