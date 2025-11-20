import { cn } from '@/lib/utils'

interface ListIconProps {
  className?: string
}

export function ListIcon({ className }: ListIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn('h-4 w-4', className)}
    >
      <title>List</title>
      <path d="M4 11h16v2H4zM4 6h16v2H4zM4 16h16v2H4z" />
    </svg>
  )
}
