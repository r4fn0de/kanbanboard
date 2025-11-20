import { cn } from '@/lib/utils'

interface FolderIconProps {
  className?: string
}

export function FolderIcon({ className }: FolderIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn('h-3.5 w-3.5', className)}
    >
      <title>Folder</title>
      <path d="M20 4h-8.59L10 2.59C9.63 2.22 9.11 2 8.59 2H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2" />
    </svg>
  )
}
