import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/hooks/use-theme'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useWorkspaceStore } from '@/store/workspace-store'
import { useUIStore } from '@/store/ui-store'
import { useBoards } from '@/services/kanban'
import { useWorkspaces } from '@/services/workspaces'
import { useWorkspaceIconUrls } from '@/hooks/useWorkspaceIconUrls'
import { SidebarHeader } from './SidebarHeader'
import { WorkspaceSelect } from './WorkspaceSelect'
import { ProjectList } from './ProjectList'
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { notify } from '@/lib/notifications'
import { CreateWorkspaceDialog } from '@/components/workspace/CreateWorkspaceDialog'
import { EditWorkspaceDialog } from '@/components/workspace/EditWorkspaceDialog'
import { DeleteWorkspaceDialog } from '@/components/workspace/DeleteWorkspaceDialog'
import { CreateProjectDialog } from '@/components/kanban/CreateProjectDialog'
import { ProjectSettingsDialog } from '@/components/kanban/ProjectSettingsDialog'
import { DeleteProjectDialog } from '@/components/kanban/DeleteProjectDialog'
import type { KanbanBoard } from '@/types/common'

interface LeftSideBarProps {
  children?: React.ReactNode
  className?: string
  forceSolidStyle?: boolean
  onWorkspaceSelectOpenChange?: (open: boolean) => void
  onProjectMenuOpenChange?: (open: boolean) => void
}

export function LeftSideBar({
  children,
  className,
  forceSolidStyle = false,
  onWorkspaceSelectOpenChange,
  onProjectMenuOpenChange,
}: LeftSideBarProps) {
  const { transparencyEnabled } = useTheme()
  const shouldReduceMotion = useReducedMotion()
  const [isUpdateCardHovered, setIsUpdateCardHovered] = useState(false)
  const [createProjectOpen, setCreateProjectOpen] = useState(false)
  const [settingsProjectOpen, setSettingsProjectOpen] = useState(false)
  const [settingsProjectBoard, setSettingsProjectBoard] =
    useState<KanbanBoard | null>(null)
  const [deleteProjectOpen, setDeleteProjectOpen] = useState(false)
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null)
  const [deleteProjectTitle, setDeleteProjectTitle] = useState('')
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false)
  const [editWorkspaceOpen, setEditWorkspaceOpen] = useState(false)
  const [editWorkspaceId, _setEditWorkspaceId] = useState<string | null>(null)
  const [editWorkspaceName, _setEditWorkspaceName] = useState('')
  const [editWorkspaceColor, _setEditWorkspaceColor] = useState('#6366F1')
  const [deleteWorkspaceOpen, setDeleteWorkspaceOpen] = useState(false)
  const [deleteWorkspaceId, _setDeleteWorkspaceId] = useState<string | null>(
    null
  )
  const [deleteWorkspaceName, _setDeleteWorkspaceName] = useState('')
  const [openProjectMenuBoardId, setOpenProjectMenuBoardId] = useState<
    string | null
  >(null)

  const { leftSidebarVisible, toggleLeftSidebar, leftSidebarLocked } =
    useUIStore()

  const {
    updateInfo,
    updateStatus,
    setUpdateInstalling,
    setUpdateInstalled,
    dismissUpdate,
  } = useUIStore()
  const selectedWorkspaceId = useWorkspaceStore(
    state => state.selectedWorkspaceId
  )
  const setSelectedWorkspaceId = useWorkspaceStore(
    state => state.setSelectedWorkspaceId
  )

  const {
    data: workspaces = [],
    isLoading: isLoadingWorkspaces,
    isError: isWorkspacesError,
    refetch: refetchWorkspaces,
  } = useWorkspaces()
  const {
    data: boards = [],
    isLoading: isLoadingBoards,
    isError: isBoardsError,
  } = useBoards()

  const workspaceIconUrls = useWorkspaceIconUrls(workspaces)

  // Restore last used workspace or select first available
  useEffect(() => {
    if (isLoadingWorkspaces) {
      return
    }

    if (!workspaces.length) {
      setSelectedWorkspaceId(null)
      return
    }

    // If no workspace is selected, try to restore last used or select first
    if (!selectedWorkspaceId) {
      // The persist middleware already restored selectedWorkspaceId from localStorage
      // If it's still null, select the first workspace
      if (workspaces[0]) {
        setSelectedWorkspaceId(workspaces[0].id)
      }
      return
    }

    // If selected workspace no longer exists, select first available
    if (!workspaces.some(ws => ws.id === selectedWorkspaceId)) {
      setSelectedWorkspaceId(workspaces[0]?.id ?? null)
    }
  }, [
    isLoadingWorkspaces,
    selectedWorkspaceId,
    setSelectedWorkspaceId,
    workspaces,
  ])

  const useTransparentStyle = transparencyEnabled && !forceSolidStyle

  // Close any open project dropdown menus when the main left sidebar is hidden
  useEffect(() => {
    if (!leftSidebarVisible) {
      setOpenProjectMenuBoardId(null)
    }
  }, [leftSidebarVisible])

  // Notify parent when any project menu is open (used by floating sidebar)
  useEffect(() => {
    onProjectMenuOpenChange?.(openProjectMenuBoardId !== null)
  }, [openProjectMenuBoardId, onProjectMenuOpenChange])

  const sidebarClasses = cn(
    'flex h-full flex-col rounded-l-[12px]',
    useTransparentStyle
      ? 'bg-background/5 backdrop-blur-xl supports-[backdrop-filter]:bg-background/3 supports-[backdrop-filter]:backdrop-blur-2xl'
      : 'bg-background'
  )

  const projectLinks = useMemo(() => {
    if (isLoadingBoards || isLoadingWorkspaces) {
      return null
    }

    if (isBoardsError || isWorkspacesError) {
      return []
    }

    if (!selectedWorkspaceId) {
      return []
    }

    return boards.filter(board => board.workspaceId === selectedWorkspaceId)
  }, [
    boards,
    isBoardsError,
    isLoadingBoards,
    isLoadingWorkspaces,
    isWorkspacesError,
    selectedWorkspaceId,
  ])

  const handleOpenSettings = (board: KanbanBoard) => {
    setSettingsProjectBoard(board)
    setSettingsProjectOpen(true)
  }

  const handleOpenDelete = (board: KanbanBoard) => {
    setDeleteProjectId(board.id)
    setDeleteProjectTitle(board.title)
    setDeleteProjectOpen(true)
  }

  const handleInstallUpdate = async () => {
    try {
      setUpdateInstalling()
      const update = await check()

      if (!update) {
        dismissUpdate()
        await notify('No updates available', undefined, { type: 'success' })
        return
      }

      await update.downloadAndInstall()
      setUpdateInstalled()
      await notify('Update installed', 'Restart to apply the new version', {
        type: 'success',
      })
    } catch (error) {
      await notify('Failed to install update', String(error), { type: 'error' })
    }
  }

  const handleRestartNow = async () => {
    try {
      await relaunch()
    } catch (error) {
      await notify('Failed to restart', String(error), { type: 'error' })
    }
  }

  return (
    <motion.div
      className={cn(sidebarClasses, className)}
      initial={false}
      transition={{
        duration: 0.5,
        ease: [0.25, 0.1, 0.25, 1.0], // Custom easing similar to Apple
      }}
    >
      <SidebarHeader
        useTransparentStyle={useTransparentStyle}
        leftSidebarVisible={leftSidebarVisible}
        toggleLeftSidebar={toggleLeftSidebar}
        leftSidebarLocked={leftSidebarLocked}
      />

      <div className="px-3 pb-3">
        <WorkspaceSelect
          workspaces={workspaces}
          value={selectedWorkspaceId}
          onChange={setSelectedWorkspaceId}
          onRequestCreateWorkspace={() => setCreateWorkspaceOpen(true)}
          iconUrls={workspaceIconUrls}
          useTransparentStyle={useTransparentStyle}
          isLoading={isLoadingWorkspaces}
          isError={isWorkspacesError}
          onRetry={() => void refetchWorkspaces()}
          onCreateWorkspaceDialogOpen={createWorkspaceOpen}
          onOpenChange={onWorkspaceSelectOpenChange}
        />
      </div>

      <ProjectList
        boards={projectLinks ?? []}
        useTransparentStyle={useTransparentStyle}
        isLoadingBoards={isLoadingBoards}
        isLoadingWorkspaces={isLoadingWorkspaces}
        isBoardsError={isBoardsError}
        isWorkspacesError={isWorkspacesError}
        selectedWorkspaceId={selectedWorkspaceId}
        onOpenSettings={handleOpenSettings}
        onOpenDelete={handleOpenDelete}
        onCreateProject={() => setCreateProjectOpen(true)}
        openMenuBoardId={openProjectMenuBoardId}
        onOpenMenuBoardChange={setOpenProjectMenuBoardId}
      />

      {children}

      <AnimatePresence initial={false}>
        {updateInfo && updateStatus ? (
          <motion.div
            key={`update-card-${updateInfo.version}`}
            className="mt-auto px-4 pb-4"
            layout
            onHoverStart={() => {
              if (updateStatus === 'available') setIsUpdateCardHovered(true)
            }}
            onHoverEnd={() => {
              if (updateStatus === 'available') setIsUpdateCardHovered(false)
            }}
            whileHover={
              shouldReduceMotion || updateStatus !== 'available'
                ? undefined
                : { y: -8 }
            }
            initial={
              shouldReduceMotion
                ? { opacity: 1 }
                : { opacity: 0, y: 10, scale: 0.98 }
            }
            animate={
              shouldReduceMotion
                ? { opacity: 1 }
                : { opacity: 1, y: 0, scale: 1 }
            }
            exit={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 10, scale: 0.98 }
            }
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { type: 'spring', stiffness: 520, damping: 42, mass: 0.9 }
            }
          >
            <Card
              className={cn(
                'py-4 gap-3 border-border/60 shadow-none overflow-hidden',
                useTransparentStyle
                  ? 'bg-background/10 backdrop-blur-xl supports-[backdrop-filter]:bg-background/10'
                  : 'bg-card'
              )}
            >
              <CardHeader className="px-4">
                <CardTitle className="text-base">Update available</CardTitle>
                <AnimatePresence initial={false} mode="popLayout">
                  {updateStatus !== 'available' || isUpdateCardHovered ? (
                    <motion.div
                      key="update-details"
                      initial={
                        shouldReduceMotion
                          ? { opacity: 1, y: 0 }
                          : { opacity: 0, y: 4 }
                      }
                      animate={
                        shouldReduceMotion
                          ? { opacity: 1, y: 0 }
                          : { opacity: 1, y: 0 }
                      }
                      exit={
                        shouldReduceMotion
                          ? { opacity: 0, y: 0 }
                          : { opacity: 0, y: 4 }
                      }
                      transition={
                        shouldReduceMotion
                          ? { duration: 0 }
                          : { duration: 0.18, ease: 'easeOut' }
                      }
                    >
                      <CardDescription className="text-xs">
                        Version {updateInfo.version}
                      </CardDescription>
                      {updateInfo.notes ? (
                        <CardDescription className="text-xs line-clamp-2">
                          {updateInfo.notes}
                        </CardDescription>
                      ) : null}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </CardHeader>

              <AnimatePresence initial={false} mode="popLayout">
                {updateStatus !== 'available' || isUpdateCardHovered ? (
                  <motion.div
                    key="update-actions"
                    initial={
                      shouldReduceMotion
                        ? { opacity: 1, y: 0 }
                        : { opacity: 0, y: 6 }
                    }
                    animate={
                      shouldReduceMotion
                        ? { opacity: 1, y: 0 }
                        : { opacity: 1, y: 0 }
                    }
                    exit={
                      shouldReduceMotion
                        ? { opacity: 0, y: 0 }
                        : { opacity: 0, y: 6 }
                    }
                    transition={
                      shouldReduceMotion
                        ? { duration: 0 }
                        : { duration: 0.18, ease: 'easeOut' }
                    }
                  >
                    <CardFooter className="px-4 pt-0 gap-2 flex-wrap">
                      {updateStatus === 'available' ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => void handleInstallUpdate()}
                          >
                            Install now
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={dismissUpdate}
                          >
                            Later
                          </Button>
                        </>
                      ) : updateStatus === 'installing' ? (
                        <>
                          <Button size="sm" disabled>
                            Installing…
                          </Button>
                          <Button size="sm" variant="secondary" disabled>
                            Later
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            onClick={() => void handleRestartNow()}
                          >
                            Restart now
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={dismissUpdate}
                          >
                            Later
                          </Button>
                        </>
                      )}
                    </CardFooter>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </Card>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <CreateWorkspaceDialog
        open={createWorkspaceOpen}
        onOpenChange={setCreateWorkspaceOpen}
        onSuccess={workspaceId => {
          setSelectedWorkspaceId(workspaceId)
        }}
      />

      <EditWorkspaceDialog
        open={editWorkspaceOpen}
        onOpenChange={setEditWorkspaceOpen}
        workspaceId={editWorkspaceId}
        initialName={editWorkspaceName}
        initialColor={editWorkspaceColor}
      />

      <DeleteWorkspaceDialog
        open={deleteWorkspaceOpen}
        onOpenChange={setDeleteWorkspaceOpen}
        workspaceId={deleteWorkspaceId}
        workspaceName={deleteWorkspaceName}
      />

      <CreateProjectDialog
        open={createProjectOpen}
        onOpenChange={setCreateProjectOpen}
        workspaceId={selectedWorkspaceId}
      />

      <ProjectSettingsDialog
        open={settingsProjectOpen}
        onOpenChange={setSettingsProjectOpen}
        board={settingsProjectBoard}
      />

      <DeleteProjectDialog
        open={deleteProjectOpen}
        onOpenChange={setDeleteProjectOpen}
        projectId={deleteProjectId}
        projectTitle={deleteProjectTitle}
      />
    </motion.div>
  )
}

export default LeftSideBar
