import { cn } from '@/lib/utils'

interface KeyboardIconProps {
  className?: string
}

export function KeyboardIcon({ className }: KeyboardIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn('h-4 w-4', className)}
    >
      <title>Keyboard</title>
      <path d="m21,4H3c-1.1,0-2,.9-2,2v12c0,1.1.9,2,2,2h18c1.1,0,2-.9,2-2V6c0-1.1-.9-2-2-2Zm-8,3h2v2h-2v-2Zm0,4h2v2h-2v-2Zm-4-4h2v2h-2v-2Zm0,4h2v2h-2v-2Zm-4-4h2v2h-2v-2Zm0,4h2v2h-2v-2Zm12,6H7v-2h10v2Zm2-4h-2v-2h2v2Zm0-4h-2v-2h2v2Z" />
    </svg>
  )
}
