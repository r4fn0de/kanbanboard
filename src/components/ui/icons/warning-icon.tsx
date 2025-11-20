import { cn } from '@/lib/utils'

interface WarningIconProps {
  className?: string
}

export function WarningIcon({ className }: WarningIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn('h-4 w-4', className)}
    >
      <title>Warning</title>
      <path d="M12.87 2.51c-.35-.63-1.4-.63-1.75 0l-9.99 18c-.17.31-.17.69.01.99.18.31.51.49.86.49h20c.35 0 .68-.19.86-.49a1 1 0 0 0 .01-.99zM13 19h-2v-2h2zm0-4h-2V9h2z" />
    </svg>
  )
}
