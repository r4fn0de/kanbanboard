import { Folder } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FavoriteBoard } from '@/hooks/useFavoriteBoards'

interface ProjectCardProps {
  board: FavoriteBoard
  onClick?: () => void
}

export function ProjectCard({ board, onClick }: ProjectCardProps) {
  const completionRate = board.totalCards > 0
    ? Math.round(((board.totalCards - board.activeCards) / board.totalCards) * 100)
    : 0

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-lg border bg-card p-4 space-y-3 cursor-pointer transition-all duration-200',
        'hover:border-primary/50'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Folder className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm truncate max-w-[150px]" title={board.title}>
              {board.title}
            </h3>
            <p className="text-xs text-muted-foreground">
              {board.activeCards} tasks • {completionRate}% complete
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Progress</span>
          <span>{completionRate}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-1.5">
          <div
            className="h-1.5 rounded-full bg-primary transition-all duration-300"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>
    </div>
  )
}
