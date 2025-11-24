import { cn } from '@/lib/utils'

interface LeftSidebarIconProps {
  className?: string
  collapsed?: boolean
}

export function LeftSidebarIcon({
  className,
  collapsed = false,
}: LeftSidebarIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn('h-3.5 w-3.5', className)}
    >
      <title>{collapsed ? 'Show Left Sidebar' : 'Hide Left Sidebar'}</title>
      <path d="m20,4H4c-1.1,0-2,.9-2,2v12c0,1.1.9,2,2,2h16c1.1,0,2-.9,2-2V6c0-1.1-.9-2-2-2ZM4,6h6v12h-6V6Z" />
      <path d="M6 8H8V10H6z" />
      <path d="M6 12H8V14H6z" />
    </svg>
  )
}
