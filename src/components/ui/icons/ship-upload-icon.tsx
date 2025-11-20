import { cn } from '@/lib/utils'

interface ShipUploadIconProps {
  className?: string
}

export function ShipUploadIcon({ className }: ShipUploadIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn('h-4 w-4', className)}
    >
      <title>Upload</title>
      <path d="M13 16V9h4l-5-6-5 6h4v7z" />
      <path d="M19 19H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2z" />
    </svg>
  )
}
