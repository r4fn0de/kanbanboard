import { memo, useState } from 'react'
import { cn } from '@/lib/utils'
import type { Workspace } from '@/types/common'
import { DEFAULT_WORKSPACE_COLOR } from './constants'

interface WorkspaceBadgeProps {
  workspace: Workspace
  size?: 'sm' | 'md'
  iconUrl?: string | null
}

export const WorkspaceBadge = memo(function WorkspaceBadge({
  workspace,
  size = 'md',
  iconUrl,
}: WorkspaceBadgeProps) {
  const [imageError, setImageError] = useState(false)
  const dimensionClass = size === 'sm' ? 'h-5 w-5' : 'h-6 w-6'

  // Use colored badge if image failed to load or no icon provided
  if (!iconUrl || imageError) {
    return (
      <span
        className={cn(
          'rounded-full flex items-center justify-center text-white font-semibold',
          size === 'sm' ? 'text-[10px]' : 'text-xs',
          dimensionClass
        )}
        style={{
          backgroundColor: workspace.color ?? DEFAULT_WORKSPACE_COLOR,
        }}
      >
        {workspace.name.charAt(0).toUpperCase()}
      </span>
    )
  }

  // Show image if available and not errored
  return (
    <img
      src={iconUrl}
      alt={workspace.name}
      className={cn('rounded-full object-cover', dimensionClass)}
      onError={() => setImageError(true)}
    />
  )
})

