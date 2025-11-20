import { cn } from '@/lib/utils'

interface CopyIconProps {
  className?: string
}

export function CopyIcon({ className }: CopyIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('h-4 w-4', className)}
    >
      <title>Copy</title>
      <rect width="14" height="14" x="8" y="2" rx="2" ry="2" />
      <path d="M8.5 18A2.5 2.5 0 0 1 6 15.5V8H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-2z" />
    </svg>
  )
}
