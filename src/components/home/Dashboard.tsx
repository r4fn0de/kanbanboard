import { useState, useCallback } from 'react'
import { useWorkspaceStatus } from '@/hooks/useWorkspaceStatus'
import { useUIStore } from '@/store/ui-store'
import { useWorkspaceStore } from '@/store/workspace-store'
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor'
import { ActivitySection } from './sections/ActivitySection'
import { WidgetContainer } from './WidgetContainer'
import { Button } from '@/components/ui/button'
import { SettingsDialog } from './SettingsDialog'
import { EmptyOnboarding, NewUserOnboarding } from '@/components/onboarding'
import { CreateProjectDialog } from '@/components/kanban/CreateProjectDialog'

export function Dashboard() {
  usePerformanceMonitor('Dashboard')

  const { data: workspaceStatus, isLoading: statusLoading } =
    useWorkspaceStatus()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showNewUserTips, setShowNewUserTips] = useState(true)
  const { createProjectDialogOpen, setCreateProjectDialogOpen } = useUIStore()
  const selectedWorkspaceId = useWorkspaceStore(
    state => state.selectedWorkspaceId
  )

  const isNewUser = workspaceStatus?.isNewUser ?? false
  const isEmpty = workspaceStatus?.isEmpty ?? false

  const handleSettingsClose = useCallback(
    (open: boolean) => setSettingsOpen(open),
    []
  )
  const handleDismissNewUserTips = useCallback(
    () => setShowNewUserTips(false),
    []
  )
  const handleCreateBoard = useCallback(() => {
    // TODO: Open create board dialog
    console.log('Create board')
    setCreateProjectDialogOpen(true)
  }, [setCreateProjectDialogOpen])

  // Layout of sections is now fixed and minimal; widget layout is not dynamic here.

  // Show loading skeleton while checking workspace status
  if (statusLoading) {
    return (
      <div className="flex h-full flex-col gap-6 p-6 overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-muted animate-pulse rounded" />
            <div className="h-4 w-96 bg-muted animate-pulse rounded" />
          </div>
        </div>
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="h-6 w-32 bg-muted animate-pulse rounded" />
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-32 bg-muted animate-pulse rounded-lg"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show empty state onboarding when workspace is empty
  if (isEmpty) {
    return (
      <>
        <div className="flex h-full flex-col gap-6 p-6 overflow-y-auto">
          <div className="flex items-center justify-between">
            <div />
            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="ghost"
                onClick={handleCreateBoard}
                className="gap-2"
              >
                New project
              </Button>
            </div>
          </div>

          <EmptyOnboarding onCreateBoard={handleCreateBoard} />
        </div>

        <SettingsDialog
          open={settingsOpen}
          onOpenChange={handleSettingsClose}
        />

        <CreateProjectDialog
          open={createProjectDialogOpen}
          onOpenChange={setCreateProjectDialogOpen}
          workspaceId={selectedWorkspaceId}
        />
      </>
    )
  }

  return (
    <>
      <div className="flex h-full flex-col gap-6 p-6 overflow-y-auto">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Activity
              </h1>
              <p className="text-sm text-muted-foreground">
                See the latest changes across your projects.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleCreateBoard} className="gap-2">
                New project
              </Button>
            </div>
          </div>
        </div>

        {/* New User Onboarding Tips */}
        {isNewUser && showNewUserTips && (
          <NewUserOnboarding onDismiss={handleDismissNewUserTips} />
        )}

        <div className="space-y-6">
          <WidgetContainer title="Recent activity">
            <ActivitySection />
          </WidgetContainer>
        </div>
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={handleSettingsClose} />

      <CreateProjectDialog
        open={createProjectDialogOpen}
        onOpenChange={setCreateProjectDialogOpen}
        workspaceId={selectedWorkspaceId}
      />
    </>
  )
}
