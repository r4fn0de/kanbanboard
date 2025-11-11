import { cn } from '@/lib/utils'

interface TriangleArrowDownIconProps {
  className?: string
}

export function TriangleArrowDownIcon({ className }: TriangleArrowDownIconProps) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('h-4 w-4', className)}
    >
      <title>Triangle Arrow Down</title>
      <path d="M19.2 2.2C18.4 3 18 7.5 18 15.7V28H14.1C9.09999 28 7.19999 30.1 8.99999 33.6C11.2 37.6 21.7 47 24 47C26.3 47 36.8 37.6 39 33.6C40.8 30.1 38.9 28 33.9 28H30V16.4C30 10.1 29.5 4 29 2.9C27.8 0.699999 21.2 0.199999 19.2 2.2Z" fill="currentColor"/>
    </svg>
  )
}