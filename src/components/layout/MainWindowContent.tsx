import { Outlet } from 'react-router'
import { cn } from '@/lib/utils'
import { useTheme } from '@/hooks/use-theme'

interface MainWindowContentProps {
  children?: React.ReactNode
  className?: string
}

export function MainWindowContent({
  children,
  className,
}: MainWindowContentProps) {
  const { transparencyEnabled } = useTheme()

  return (
    <div
      className={cn(
        'flex h-full flex-col py-2 pr-2 pl-2',
        transparencyEnabled
          ? 'border-border/20 bg-background/5 backdrop-blur-xl supports-[backdrop-filter]:bg-background/3 supports-[backdrop-filter]:backdrop-blur-2xl'
          : 'bg-background',
        className
      )}
    >
      <div className="flex h-full flex-col rounded-lg border bg-card shadow-sm overflow-hidden">
        {children ?? <Outlet />}
      </div>
    </div>
  )
}

export default MainWindowContent
