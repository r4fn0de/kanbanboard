import { cn } from '@/lib/utils'

interface KanbanIconProps {
  className?: string
}

export function KanbanIcon({ className }: KanbanIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      className={cn('h-4 w-4', className)}
    >
      <title>Kanban</title>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M1 6a5 5 0 0 1 5 -5h12a5 5 0 0 1 5 5v12a5 5 0 0 1 -5 5H6a5 5 0 0 1 -5 -5V6Zm4 0a1 1 0 0 1 1 -1h3.5a1 1 0 0 1 1 1v11a1 1 0 0 1 -1 1H6a1 1 0 0 1 -1 -1V6Zm9.5 -1a1 1 0 0 0 -1 1v5.5a1 1 0 0 0 1 1H18a1 1 0 0 0 1 -1V6a1 1 0 0 0 -1 -1h-3.5Z"
        clipRule="evenodd"
        strokeWidth="1"
      />
    </svg>
  )
}