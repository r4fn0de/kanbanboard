import { cn } from '@/lib/utils'

interface TodoStatusIconProps {
  className?: string
}

export function TodoStatusIcon({ className }: TodoStatusIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 18 18"
      fill="none"
      className={cn('h-4 w-4', className)}
    >
      <title>To Do</title>
      <circle cx="9" cy="9" r="8.5" stroke="currentColor" />
    </svg>
  )
}
