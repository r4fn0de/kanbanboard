import { cn } from '@/lib/utils'

interface DashboardAltIconProps {
  className?: string
}

export function DashboardAltIcon({ className }: DashboardAltIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn('h-3.5 w-3.5', className)}
    >
      <title>Dashboard</title>
      <rect x="13" y="3" width="8" height="10" rx="1" ry="1" />
      <rect x="3" y="3" width="8" height="6" rx="1" ry="1" />
      <rect x="13" y="15" width="8" height="6" rx="1" ry="1" />
      <rect x="3" y="11" width="8" height="10" rx="1" ry="1" />
    </svg>
  )
}
