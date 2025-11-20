import { cn } from '@/lib/utils'

interface HorizontalSliderIconProps {
  className?: string
}

export function HorizontalSliderIcon({ className }: HorizontalSliderIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn('h-3.5 w-3.5', className)}
    >
      <title>Horizontal Slider</title>
      <path d="m6,11c1.86,0,3.41-1.28,3.86-3h12.14v-2h-12.14c-.45-1.72-2-3-3.86-3-2.21,0-4,1.79-4,4s1.79,4,4,4Z" />
      <path d="m18,21c2.21,0,4-1.79,4-4s-1.79-4-4-4c-1.86,0-3.41,1.28-3.86,3H2v2h12.14c.45,1.72,2,3,3.86,3Z" />
    </svg>
  )
}
