import { cn } from '@/lib/utils'

interface PinIconProps {
  className?: string
}

export function PinIcon({ className }: PinIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn('h-4 w-4', className)}
    >
      <title>Pin</title>
      <path d="m3.71,21.71l5.29-5.29,2.29,2.29c.2.2.45.29.71.29s.51-.1.71-.29l2-2c.39-.39.39-1.02,0-1.41l-.79-.79,3.59-3.59.79.79c.39.39,1.02.39,1.41,0l2-2c.39-.39.39-1.02,0-1.41l-6-6c-.39-.39-1.02-.39-1.41,0l-2,2c-.39.39-.39,1.02,0,1.41l.79.79-3.59,3.59-.79-.79c-.39-.39-1.02-.39-1.41,0l-2,2c-.39.39-.39,1.02,0,1.41l2.29,2.29-5.29,5.29,1.41,1.41Z" />
    </svg>
  )
}
