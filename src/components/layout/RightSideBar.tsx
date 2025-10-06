import { cn } from '@/lib/utils'

interface RightSideBarProps {
  children?: React.ReactNode
  className?: string
}

export function RightSideBar({ children, className }: RightSideBarProps) {
  return (
    <div
      className={cn('flex h-full flex-col border-l rounded-r-[12px] border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900', className)}
    >
      {children}
    </div>
  )
}

export default RightSideBar
