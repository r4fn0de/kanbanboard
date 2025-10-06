import { BoardsView } from '@/components/kanban/BoardsView'
import { cn } from '@/lib/utils'

interface MainWindowContentProps {
  children?: React.ReactNode
  className?: string
}

export function MainWindowContent({
  children,
  className,
}: MainWindowContentProps) {
  return (
    <div className={cn('flex h-full flex-col bg-background', className)}>
      {children || <BoardsView />}
    </div>
  )
}

export default MainWindowContent
