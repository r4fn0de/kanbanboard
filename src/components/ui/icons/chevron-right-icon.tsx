import { cn } from '@/lib/utils'

interface ChevronRightIconProps {
  className?: string
}

export function ChevronRightIcon({ className }: ChevronRightIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn('h-4 w-4', className)}
    >
      <title>Chevron Right</title>
      <path d="M9.29 6.71 13.17 10.59 9.29 14.47 10.71 15.89 16 10.59 10.71 5.29z" />
    </svg>
  )
}
