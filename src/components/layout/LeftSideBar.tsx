import { cn } from '@/lib/utils'
import { useTheme } from '@/hooks/use-theme'

interface LeftSideBarProps {
  children?: React.ReactNode
  className?: string
}

export function LeftSideBar({ children, className }: LeftSideBarProps) {
  const { transparencyEnabled } = useTheme()

  const sidebarClasses = cn(
    'flex h-full flex-col border-r',
    transparencyEnabled
      ? 'border-border/30 bg-background/30 backdrop-blur-lg supports-[backdrop-filter]:bg-background/15 supports-[backdrop-filter]:backdrop-blur-2xl'
      : 'border-border bg-background'
  )

  return (
    <div
      className={cn(sidebarClasses, className)}
    >
      {children}
    </div>
  )
}

export default LeftSideBar
