import { cn } from '@/lib/utils'

interface SearchIconProps {
  className?: string
}

export function SearchIcon({ className }: SearchIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn('h-4 w-4', className)}
    >
      <title>Search</title>
      <path d="M10 18c1.85 0 3.54-.63 4.9-1.69l5.1 5.1L21.41 20l-5.1-5.1A8 8 0 0 0 18 10c0-4.41-3.59-8-8-8s-8 3.59-8 8 3.59 8 8 8" />
    </svg>
  )
}
