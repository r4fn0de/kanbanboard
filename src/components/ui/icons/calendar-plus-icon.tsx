import { cn } from '@/lib/utils'

interface CalendarPlusIconProps {
  className?: string
}

export function CalendarPlusIcon({ className }: CalendarPlusIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn('h-4 w-4', className)}
    >
      <title>Calendar Plus</title>
      <path d="m19,4h-2v-2h-2v2h-6v-2h-2v2h-2c-1.1,0-2,.9-2,2v1h18v-1c0-1.1-.9-2-2-2Z" />
      <path d="m3,20c0,1.1.9,2,2,2h14c1.1,0,2-.9,2-2v-12H3v12Zm5-6h3v-3h2v3h3v2h-3v3h-2v-3h-3v-2Z" />
    </svg>
  )
}
