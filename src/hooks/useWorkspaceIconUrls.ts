import { useState, useEffect, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import type { Workspace } from '@/types/common'

export function useWorkspaceIconUrls(workspaces: Workspace[]): Map<string, string> {
  const [workspaceIconUrls, setWorkspaceIconUrls] = useState<
    Map<string, string>
  >(new Map())
  const loadedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const loadIcons = async () => {
      const newUrls = new Map(workspaceIconUrls)
      
      for (const workspace of workspaces) {
        const iconPath = workspace.iconPath
        if (iconPath && !loadedRef.current.has(iconPath)) {
          try {
            const url = (await invoke('get_attachment_url', {
              filePath: iconPath,
            })) as string
            newUrls.set(iconPath, url)
            loadedRef.current.add(iconPath)
          } catch (error) {
            console.error(
              `Failed to load workspace icon for ${workspace.name}:`,
              error
            )
          }
        }
      }

      // Only update if we loaded new icons
      if (newUrls.size !== workspaceIconUrls.size) {
        setWorkspaceIconUrls(newUrls)
      }
    }

    if (workspaces.length > 0) {
      loadIcons()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaces])

  return workspaceIconUrls
}

