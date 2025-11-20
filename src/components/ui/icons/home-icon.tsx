import { cn } from '@/lib/utils'

interface HomeIconProps {
  className?: string
}

export function HomeIcon({ className }: HomeIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn('h-3.5 w-3.5', className)}
    >
      <title>Home</title>
      <path d="M21.92 11.3 12.62 2.15a.75.75 0 0 0-1.24 0L2.08 11.3A1 1 0 0 0 2 12.5v7.74A1.77 1.77 0 0 0 3.75 22h4.5A1.77 1.77 0 0 0 10 20.24v-3.49A1.77 1.77 0 0 1 11.75 15h.5A1.77 1.77 0 0 1 14 16.75v3.49A1.77 1.77 0 0 0 15.75 22h4.5A1.77 1.77 0 0 0 22 20.24V12.5a1 1 0 0 0-.08-1.2" />
    </svg>
  )
}
