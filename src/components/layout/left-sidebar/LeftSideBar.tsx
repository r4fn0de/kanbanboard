import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/hooks/use-theme'
import { motion } from 'framer-motion'
import { useWorkspaceStore } from '@/store/workspace-store'
import { useUIStore } from '@/store/ui-store'
import { useBoards } from '@/services/kanban'
import { useWorkspaces } from '@/services/workspaces'
import { useWorkspaceIconUrls } from '@/hooks/useWorkspaceIconUrls'
import { SidebarHeader } from './SidebarHeader'
import { WorkspaceSelect } from './WorkspaceSelect'
import { ProjectList } from './ProjectList'
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
}

export function LeftSideBar({
  children,
  className,
  forceSolidStyle = false,
}: LeftSideBarProps) {
  const { transparencyEnabled } = useTheme()
  const [createProjectOpen, setCreateProjectOpen] = useState(false)
  const [settingsProjectOpen, setSettingsProjectOpen] = useState(false)
  const [settingsProjectBoard, setSettingsProjectBoard] =
    useState<KanbanBoard | null>(null)
  const [deleteProjectOpen, setDeleteProjectOpen] = useState(false)
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null)
  const [deleteProjectTitle, setDeleteProjectTitle] = useState('')
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false)
  const [editWorkspaceOpen, setEditWorkspaceOpen] = useState(false)
  const [editWorkspaceId, setEditWorkspaceId] = useState<string | null>(null)
  const [editWorkspaceName, setEditWorkspaceName] = useState('')
  const [editWorkspaceColor, setEditWorkspaceColor] = useState('#6366F1')
  const [deleteWorkspaceOpen, setDeleteWorkspaceOpen] = useState(false)
  const [deleteWorkspaceId, setDeleteWorkspaceId] = useState<string | null>(null)
  const [deleteWorkspaceName, setDeleteWorkspaceName] = useState('')

  const { leftSidebarVisible, toggleLeftSidebar, leftSidebarLocked } =
    useUIStore()
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

  const sidebarClasses = cn(
    'flex h-full flex-col rounded-l-[12px]',
    useTransparentStyle
      ? 'bg-background/8 backdrop-blur-lg supports-[backdrop-filter]:bg-background/5 supports-[backdrop-filter]:backdrop-blur-xl'
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

  const currentWorkspace = useMemo(() => {
    if (!selectedWorkspaceId) return null
    return (
      workspaces.find(workspace => workspace.id === selectedWorkspaceId) ?? null
    )
  }, [selectedWorkspaceId, workspaces])

  const handleOpenSettings = (board: KanbanBoard) => {
    setSettingsProjectBoard(board)
    setSettingsProjectOpen(true)
  }

  const handleOpenDelete = (board: KanbanBoard) => {
    setDeleteProjectId(board.id)
    setDeleteProjectTitle(board.title)
    setDeleteProjectOpen(true)
  }

  const handleOpenEditWorkspace = () => {
    if (currentWorkspace) {
      setEditWorkspaceId(currentWorkspace.id)
      setEditWorkspaceName(currentWorkspace.name)
      setEditWorkspaceColor(currentWorkspace.color ?? '#6366F1')
      setEditWorkspaceOpen(true)
    }
  }

  const handleOpenDeleteWorkspace = () => {
    if (currentWorkspace) {
      setDeleteWorkspaceId(currentWorkspace.id)
      setDeleteWorkspaceName(currentWorkspace.name)
      setDeleteWorkspaceOpen(true)
    }
  }

  return (
    <motion.div
      className={cn(sidebarClasses, className)}
      initial={false}
      animate={{
        backgroundColor: useTransparentStyle
          ? 'rgba(255, 255, 255, 0)'
          : 'hsl(var(--background))',
      }}
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
      />

      {children}

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

