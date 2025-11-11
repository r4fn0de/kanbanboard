import { cn } from '@/lib/utils'

interface TriangleArrowUpIconProps {
  className?: string
}

export function TriangleArrowUpIcon({ className }: TriangleArrowUpIconProps) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('h-4 w-4', className)}
    >
      <title>Triangle Arrow Up</title>
      <path d="M16.1 6.50001C9 13.3 7.2 16.3 9 18.5C9.7 19.4 11.9 20 14.1 20H18V32.3C18 46 18.4 47 24 47C29.6 47 30 46 30 32.3V20H33.9C38.9 20 40.8 17.9 39 14.4C36.8 10.4 26.3 1.00001 24 1.00001C22.8 1.00001 19.4 3.30001 16.1 6.50001Z" fill="currentColor"/>
    </svg>
  )
}