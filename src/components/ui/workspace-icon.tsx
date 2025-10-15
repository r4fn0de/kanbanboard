import React, { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { cn } from '@/lib/utils'

interface WorkspaceIconProps {
  workspace: {
    id: string
    name: string
    color?: string | null
    iconPath?: string | null
  }
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'size-8',
  md: 'size-10',
  lg: 'size-12',
}

export function WorkspaceIcon({
  workspace,
  className,
  size = 'md',
}: WorkspaceIconProps) {
  const [iconUrl, setIconUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const loadIconUrl = async () => {
      if (!workspace.iconPath) {
        setIsLoading(false)
        return
      }

      try {
        const url = await invoke<string>('get_workspace_icon_url', {
          relativePath: workspace.iconPath,
        })
        setIconUrl(url)
        setHasError(false)
      } catch (error) {
        console.error('Failed to resolve workspace icon path:', error)
        setHasError(true)
      } finally {
        setIsLoading(false)
      }
    }

    loadIconUrl()
  }, [workspace.iconPath])

  const handleImageError = () => {
    setHasError(true)
    setIconUrl(null)
  }

  if (isLoading) {
    return (
      <div
        className={cn(
          sizeClasses[size],
          'rounded-full bg-muted animate-pulse',
          className
        )}
      />
    )
  }

  if (workspace.iconPath && iconUrl && !hasError) {
    return (
      <img
        src={iconUrl}
        alt=""
        className={cn(
          sizeClasses[size],
          'rounded-full object-cover',
          className
        )}
        onError={handleImageError}
      />
    )
  }

  // Fallback to colored circle with initial
  return (
    <div
      className={cn(
        sizeClasses[size],
        'rounded-full flex items-center justify-center text-white font-semibold',
        className
      )}
      style={{
        backgroundColor: workspace.color ?? '#6366F1',
      }}
    >
      {workspace.name.charAt(0).toUpperCase()}
    </div>
  )
}
