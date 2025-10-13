import { cn } from '@/lib/utils'
import { useTheme } from '@/hooks/use-theme'
import type { FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useState, useId } from 'react'
import { createPortal } from 'react-dom'
import type { LucideIcon } from 'lucide-react'
import type { Workspace } from '@/types/common'
import { invoke } from '@tauri-apps/api/core'
import { CreateWorkspaceDialog } from '@/components/workspace/CreateWorkspaceDialog'
import {
  Home,
  Folder,
  LayoutDashboard,
  Layers,
  Briefcase,
  ClipboardList,
  CalendarDays,
  BarChart3,
  Target,
  Rocket,
  Package,
  Users,
  MessagesSquare,
  Lightbulb,
  Palette,
  PenTool,
  LifeBuoy,
  MoreHorizontal,
  PanelLeft,
  PanelLeftClose,
  // PanelRight,
  // PanelRightClose,
  Plus,
  Settings,
  Image as ImageIcon,
  Loader2,
  GripVertical,
} from 'lucide-react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  useBoards,
  useCreateBoard,
  useDeleteBoard,
  useRenameBoard,
  useUpdateBoardIcon,
} from '@/services/kanban'
import {
  useWorkspaces,
  useUpdateWorkspace,
  useDeleteWorkspace,
} from '@/services/workspaces'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { motion, AnimatePresence } from 'framer-motion'
import { MacOSWindowControls } from '@/components/titlebar/MacOSWindowControls'
import { executeCommand, useCommandContext } from '@/lib/commands'
import { useUIStore } from '@/store/ui-store'
import { useWorkspaceStore } from '@/store/workspace-store'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface LeftSideBarProps {
  children?: React.ReactNode
  className?: string
  forceSolidStyle?: boolean
}

interface ProjectIconOption {
  value: string
  label: string
  icon: LucideIcon
}

interface ProjectIconSection {
  label: string
  options: readonly ProjectIconOption[]
}

const PROJECT_ICON_SECTIONS: readonly ProjectIconSection[] = [
  {
    label: 'General',
    options: [
      { value: 'Folder', label: 'Folder', icon: Folder },
      { value: 'LayoutDashboard', label: 'Dashboard', icon: LayoutDashboard },
      { value: 'Layers', label: 'Layers', icon: Layers },
      { value: 'Briefcase', label: 'Briefcase', icon: Briefcase },
    ],
  },
  {
    label: 'Planning',
    options: [
      { value: 'ClipboardList', label: 'Tasks', icon: ClipboardList },
      { value: 'CalendarDays', label: 'Schedule', icon: CalendarDays },
      { value: 'BarChart3', label: 'Analytics', icon: BarChart3 },
      { value: 'Target', label: 'Goals', icon: Target },
    ],
  },
  {
    label: 'Collaboration',
    options: [
      { value: 'Users', label: 'Team', icon: Users },
      { value: 'MessagesSquare', label: 'Discussions', icon: MessagesSquare },
      { value: 'LifeBuoy', label: 'Support', icon: LifeBuoy },
      { value: 'Lightbulb', label: 'Ideas', icon: Lightbulb },
    ],
  },
  {
    label: 'Execution',
    options: [
      { value: 'Rocket', label: 'Launch', icon: Rocket },
      { value: 'Package', label: 'Delivery', icon: Package },
      { value: 'Palette', label: 'Design', icon: Palette },
      { value: 'PenTool', label: 'Creation', icon: PenTool },
    ],
  },
] as const

const PROJECT_ICON_OPTIONS = PROJECT_ICON_SECTIONS.flatMap(
  section => section.options
)

const PROJECT_ICON_MAP = PROJECT_ICON_OPTIONS.reduce<
  Record<string, LucideIcon>
>((accumulator, option) => {
  accumulator[option.value] = option.icon
  return accumulator
}, {})

const DEFAULT_PROJECT_ICON = PROJECT_ICON_OPTIONS[0]?.value ?? 'Folder'
const DEFAULT_WORKSPACE_COLOR = '#6366F1'

const dropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.4',
      },
    },
  }),
}

interface SortableWorkspaceItemProps {
  workspace: Workspace
  renderWorkspaceBadge: (
    workspace: Workspace,
    size?: 'sm' | 'md'
  ) => React.ReactNode
}

function SortableWorkspaceItem({
  workspace,
  renderWorkspaceBadge,
}: SortableWorkspaceItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: workspace.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 w-full min-w-0',
        isDragging && 'pointer-events-none'
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing flex-shrink-0 touch-none"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground/40" />
      </div>
      <div className="flex-shrink-0">
        {renderWorkspaceBadge(workspace, 'sm')}
      </div>
      <span className="truncate text-sm font-medium flex-1">
        {workspace.name}
      </span>
    </div>
  )
}

export function LeftSideBar({
  children,
  className,
  forceSolidStyle = false,
}: LeftSideBarProps) {
  const { transparencyEnabled } = useTheme()
  const [createProjectOpen, setCreateProjectOpen] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [projectIcon, setProjectIcon] = useState(DEFAULT_PROJECT_ICON)
  const [projectEmoji, setProjectEmoji] = useState('')
  const [projectColor, setProjectColor] = useState('#6366F1')
  const [useEmoji, setUseEmoji] = useState(false)
  const [settingsProjectOpen, setSettingsProjectOpen] = useState(false)
  const [settingsProjectId, setSettingsProjectId] = useState<string | null>(null)
  const [settingsProjectName, setSettingsProjectName] = useState('')
  const [settingsProjectDescription, setSettingsProjectDescription] = useState('')
  const [settingsProjectIcon, setSettingsProjectIcon] = useState(DEFAULT_PROJECT_ICON)
  const [settingsProjectEmoji, setSettingsProjectEmoji] = useState('')
  const [settingsProjectColor, setSettingsProjectColor] = useState('#6366F1')
  const [settingsUseEmoji, setSettingsUseEmoji] = useState(false)
  const [deleteProjectOpen, setDeleteProjectOpen] = useState(false)
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null)
  const [deleteProjectTitle, setDeleteProjectTitle] = useState('')
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false)
  // Workspace edit/delete states
  const [editWorkspaceOpen, setEditWorkspaceOpen] = useState(false)
  const [editWorkspaceId, setEditWorkspaceId] = useState<string | null>(null)
  const [editWorkspaceName, setEditWorkspaceName] = useState('')
  const [editWorkspaceColor, setEditWorkspaceColor] = useState(
    DEFAULT_WORKSPACE_COLOR
  )
  const [deleteWorkspaceOpen, setDeleteWorkspaceOpen] = useState(false)
  const [deleteWorkspaceId, setDeleteWorkspaceId] = useState<string | null>(
    null
  )
  const [deleteWorkspaceName, setDeleteWorkspaceName] = useState('')
  const [orderedWorkspaces, setOrderedWorkspaces] = useState<Workspace[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const projectNameId = useId()
  const projectDescriptionId = useId()
  const settingsProjectNameId = useId()
  const settingsProjectDescriptionId = useId()
  const navigate = useNavigate()
  const location = useLocation()
  const commandContext = useCommandContext()
  const { leftSidebarVisible, toggleLeftSidebar } = useUIStore()
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
  const updateWorkspace = useUpdateWorkspace()
  const deleteWorkspace = useDeleteWorkspace()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const currentWorkspace = useMemo(() => {
    if (!selectedWorkspaceId) return null
    return (
      workspaces.find(workspace => workspace.id === selectedWorkspaceId) ?? null
    )
  }, [selectedWorkspaceId, workspaces])

  const activeWorkspace = useMemo(() => {
    if (!activeId) return null
    return orderedWorkspaces.find(ws => ws.id === activeId) ?? null
  }, [activeId, orderedWorkspaces])

  const createBoard = useCreateBoard()
  const renameBoard = useRenameBoard()
  const deleteBoard = useDeleteBoard()
  const updateBoardIcon = useUpdateBoardIcon()
  const {
    data: boards = [],
    isLoading: isLoadingBoards,
    isError: isBoardsError,
  } = useBoards()

  // Sync ordered workspaces from localStorage or default to workspaces order
  useEffect(() => {
    if (workspaces.length === 0) {
      setOrderedWorkspaces([])
      return
    }

    const savedOrder = localStorage.getItem('workspaceOrder')
    if (savedOrder) {
      try {
        const orderIds: string[] = JSON.parse(savedOrder)
        const orderedMap = new Map(workspaces.map(ws => [ws.id, ws]))
        const ordered = orderIds
          .map(id => orderedMap.get(id))
          .filter((ws): ws is Workspace => ws !== undefined)

        // Add any new workspaces that aren't in the saved order
        const existingIds = new Set(orderIds)
        const newWorkspaces = workspaces.filter(ws => !existingIds.has(ws.id))

        setOrderedWorkspaces([...ordered, ...newWorkspaces])
      } catch {
        setOrderedWorkspaces(workspaces)
      }
    } else {
      setOrderedWorkspaces(workspaces)
    }
  }, [workspaces])

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
      ? 'bg-background/5 backdrop-blur-xl supports-[backdrop-filter]:bg-background/3 supports-[backdrop-filter]:backdrop-blur-2xl'
      : 'bg-background'
  )

  const handleConfirmDelete = () => {
    if (!deleteProjectId || deleteBoard.isPending) {
      return
    }

    const targetId = deleteProjectId

    deleteBoard.mutate(
      { id: targetId },
      {
        onSuccess: () => {
          toast.success('Project deleted')
          setDeleteProjectOpen(false)

          if (location.pathname === `/projects/${targetId}`) {
            navigate('/projects/all')
          }
        },
        onError: error => {
          const message =
            error instanceof Error ? error.message : 'Unknown error'
          toast.error('Failed to delete project', { description: message })
        },
      }
    )
  }


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

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
    // Add global cursor style and prevent text selection during drag
    document.body.style.cursor = 'grabbing'
    document.body.style.userSelect = 'none'
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event

    // Reset cursor and user selection
    document.body.style.cursor = ''
    document.body.style.userSelect = ''

    if (!over || active.id === over.id) {
      setActiveId(null)
      return
    }

    setOrderedWorkspaces(items => {
      const oldIndex = items.findIndex(item => item.id === active.id)
      const newIndex = items.findIndex(item => item.id === over.id)

      const newOrder = arrayMove(items, oldIndex, newIndex)

      // Save order to localStorage
      const orderIds = newOrder.map(ws => ws.id)
      localStorage.setItem('workspaceOrder', JSON.stringify(orderIds))

      return newOrder
    })

    setActiveId(null)
  }, [])

  const handleDragCancel = useCallback(() => {
    // Reset cursor and user selection
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    setActiveId(null)
  }, [])

  const [workspaceIconUrls, setWorkspaceIconUrls] = useState<
    Map<string, string>
  >(new Map())

  // Preload workspace icon URLs when workspaces change
  useEffect(() => {
    const loadIcons = async () => {
      for (const workspace of workspaces) {
        const iconPath = workspace.iconPath
        if (iconPath && !workspaceIconUrls.has(iconPath)) {
          try {
            const url = (await invoke('get_attachment_url', {
              filePath: iconPath,
            })) as string
            setWorkspaceIconUrls(prev => new Map(prev).set(iconPath, url))
          } catch (error) {
            console.error(
              `Failed to load workspace icon for ${workspace.name}:`,
              error
            )
          }
        }
      }
    }

    if (workspaces.length > 0) {
      loadIcons()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaces])

  const renderWorkspaceBadge = useCallback(
    (workspace: Workspace, size: 'sm' | 'md' = 'md') => {
      const iconUrl = workspace.iconPath
        ? workspaceIconUrls.get(workspace.iconPath)
        : null

      const dimensionClass = size === 'sm' ? 'h-5 w-5' : 'h-6 w-6'

      if (iconUrl) {
        return (
          <img
            src={iconUrl}
            alt={workspace.name}
            className={cn('rounded-full object-cover', dimensionClass)}
          />
        )
      }

      return (
        <span
          className={cn('rounded-full border border-border/40', dimensionClass)}
          style={{
            backgroundColor: workspace.color ?? DEFAULT_WORKSPACE_COLOR,
          }}
        />
      )
    },
    [workspaceIconUrls]
  )

  return (
    <motion.div
      className={cn(sidebarClasses, className)}
      initial={false}
      animate={{
        backgroundColor: useTransparentStyle
          ? 'rgba(255, 255, 255, 0.05)'
          : 'hsl(var(--background))',
      }}
      transition={{
        duration: 0.5,
        ease: [0.25, 0.1, 0.25, 1.0], // Custom easing similar to Apple
      }}
    >
      <div
        data-tauri-drag-region
        className="flex items-center justify-between px-4 pt-4 pb-3"
      >
        <MacOSWindowControls className="px-0" />
        <div className="flex items-center gap-1">
          <Button
            onClick={toggleLeftSidebar}
            variant="ghost"
            size="icon"
            className={cn(
              'h-6 w-6 hover:bg-accent/30',
              useTransparentStyle
                ? 'text-gray-200 hover:text-gray-200'
                : 'text-foreground/70 hover:text-foreground'
            )}
            title={
              leftSidebarVisible ? 'Hide Left Sidebar' : 'Show Left Sidebar'
            }
          >
            {leftSidebarVisible ? (
              <PanelLeftClose className="h-3 w-3" />
            ) : (
              <PanelLeft className="h-3 w-3" />
            )}
          </Button>
          <Button
            onClick={() => executeCommand('open-preferences', commandContext)}
            variant="ghost"
            size="icon"
            className={cn(
              'h-6 w-6 hover:bg-accent/30',
              useTransparentStyle
                ? 'text-gray-200 hover:text-gray-200'
                : 'text-foreground/70 hover:text-foreground'
            )}
            title="Settings"
          >
            <Settings className="h-3 w-3" />
          </Button>
          {/* <Button
            onClick={toggleRightSidebar}
            variant="ghost"
            size="icon"
            className={cn(
              'h-6 w-6 hover:bg-accent/30',
              useTransparentStyle
                ? 'text-gray-200 hover:text-gray-200'
                : 'text-foreground/70 hover:text-foreground'
            )}
            title={
              rightSidebarVisible ? 'Hide Right Sidebar' : 'Show Right Sidebar'
            }
          >
            {rightSidebarVisible ? (
              <PanelRightClose className="h-3 w-3" />
            ) : (
              <PanelRight className="h-3 w-3" />
            )}
          </Button> */}
        </div>
      </div>

      <div className="px-3 pb-3">
        {isLoadingWorkspaces ? (
          <div className="flex flex-1 items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading workspaces…
          </div>
        ) : isWorkspacesError ? (
          <div className="flex flex-1 items-center justify-between gap-1.5 text-xs text-destructive">
            <span>Failed to load workspaces</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => void refetchWorkspaces()}
            >
              Retry
            </Button>
          </div>
        ) : workspaces.length === 0 ? (
          <div className="flex flex-1 items-center gap-1.5 text-xs text-muted-foreground">
            <ImageIcon className="h-3.5 w-3.5" />
            No workspaces found
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <Select
              value={selectedWorkspaceId ?? undefined}
              onValueChange={value => setSelectedWorkspaceId(value)}
            >
              <SelectTrigger
                className={cn(
                  'w-full border-0 bg-transparent px-2.5 py-2 text-left shadow-none focus:ring-0 focus:ring-offset-0 min-w-0 hover:bg-accent/50 rounded-lg transition-colors',
                  useTransparentStyle &&
                    'text-white hover:text-white hover:bg-white/[0.08]'
                )}
              >
                <AnimatePresence mode="wait">
                  {currentWorkspace ? (
                    <motion.div
                      key={currentWorkspace.id}
                      className="flex items-center gap-2 min-w-0 flex-1"
                      initial={{ opacity: 0, filter: 'blur(4px)', x: -10 }}
                      animate={{ opacity: 1, filter: 'blur(0px)', x: 0 }}
                      exit={{ opacity: 0, filter: 'blur(4px)', x: 10 }}
                      transition={{
                        type: 'spring',
                        stiffness: 300,
                        damping: 30,
                        opacity: { duration: 0.2 },
                        filter: { duration: 0.3 },
                      }}
                    >
                      <div className="flex-shrink-0">
                        {renderWorkspaceBadge(currentWorkspace)}
                      </div>
                      <span
                        className={cn(
                          'truncate text-sm font-medium',
                          useTransparentStyle ? 'text-white' : 'text-foreground'
                        )}
                      >
                        {currentWorkspace.name}
                      </span>
                    </motion.div>
                  ) : (
                    <SelectValue placeholder="Select workspace" />
                  )}
                </AnimatePresence>
              </SelectTrigger>
              <SelectContent
                className={cn(
                  'min-w-[220px] max-w-[300px] p-1.5',
                  activeId &&
                    '[&>*:not([data-dnd-kit-sortable])]:pointer-events-none'
                )}
              >
                <SortableContext
                  items={orderedWorkspaces.map(ws => ws.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {orderedWorkspaces.map(workspace => (
                    <SelectItem
                      key={workspace.id}
                      value={workspace.id}
                      className="rounded-md px-2 py-2 my-0.5 data-[state=checked]:bg-accent/80"
                    >
                      <SortableWorkspaceItem
                        workspace={workspace}
                        renderWorkspaceBadge={renderWorkspaceBadge}
                      />
                    </SelectItem>
                  ))}
                </SortableContext>
                <SelectSeparator className="my-1.5" />
                <button
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                    'hover:bg-accent/80 text-muted-foreground hover:text-foreground'
                  )}
                  onClick={e => {
                    e.preventDefault()
                    setCreateWorkspaceOpen(true)
                  }}
                >
                  <Plus className="h-4 w-4" />
                  <span>New workspace</span>
                </button>
              </SelectContent>
            </Select>
            {createPortal(
              <DragOverlay dropAnimation={dropAnimation}>
                {activeWorkspace ? (
                  <div
                    className="flex items-center gap-2 rounded-md bg-background border border-border/20 shadow-xl px-2 py-2 min-w-[180px] cursor-grabbing"
                    style={{ zIndex: 10000 }}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                    <div className="flex-shrink-0">
                      {renderWorkspaceBadge(activeWorkspace, 'sm')}
                    </div>
                    <span className="truncate text-sm font-medium flex-1">
                      {activeWorkspace.name}
                    </span>
                  </div>
                ) : null}
              </DragOverlay>,
              document.body
            )}
          </DndContext>
        )}
      </div>

      <motion.nav
        className={cn(
          'mt-1 flex flex-col gap-2 px-4 pb-4 text-sm',
          useTransparentStyle
            ? 'text-gray-200 dark:text-gray-100'
            : 'text-foreground'
        )}
        initial={false}
        animate={{
          opacity: 1,
          filter: 'blur(0px)',
        }}
        transition={{
          duration: 0.4,
          delay: 0.1,
          ease: [0.25, 0.1, 0.25, 1.0],
        }}
      >
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border',
              useTransparentStyle
                ? isActive
                  ? 'bg-white/20 text-white shadow-lg shadow-black/10 backdrop-blur-md border-white/10'
                  : 'text-white/90 hover:bg-white/10 hover:backdrop-blur-sm border-transparent'
                : isActive
                  ? 'bg-accent text-accent-foreground shadow-sm border-transparent'
                  : 'text-foreground hover:bg-accent/80 border-transparent'
            )
          }
        >
          <Home className="h-3.5 w-3.5" />
          <span className="font-medium">Home</span>
        </NavLink>

        <div className="flex flex-col">
          <div
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-all duration-200',
              useTransparentStyle ? 'text-white/90' : 'text-foreground'
            )}
          >
            <span className="font-bold uppercase">Projects</span>
          </div>

          <motion.div
            className="mt-2 flex flex-col gap-2 ml-6"
            initial={false}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            <AnimatePresence mode="wait">
              {isLoadingBoards || isLoadingWorkspaces ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, filter: 'blur(4px)' }}
                  transition={{ duration: 0.3 }}
                >
                  <div
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm',
                      useTransparentStyle
                        ? 'text-white/60'
                        : 'text-gray-500 dark:text-gray-400'
                    )}
                  >
                    <div
                      className={cn(
                        'h-3 w-3 animate-pulse rounded-full',
                        useTransparentStyle
                          ? 'bg-white/30'
                          : 'bg-muted-foreground/50'
                      )}
                    ></div>
                    <span>Loading…</span>
                  </div>
                </motion.div>
              ) : isBoardsError || isWorkspacesError ? (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, filter: 'blur(4px)' }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-destructive">
                    <div className="h-2 w-2 rounded-full bg-destructive/60"></div>
                    <span>Failed to load projects</span>
                  </div>
                </motion.div>
              ) : projectLinks?.length ? (
                projectLinks.map((board, index) => {
                  const IconComponent =
                    PROJECT_ICON_MAP[board.icon ?? ''] ?? Folder
                  const hasEmoji = board.emoji && board.emoji.trim().length > 0
                  const projectColor = board.color || '#6366F1'

                  return (
                    <motion.div
                      key={board.id}
                      className="group relative flex items-center rounded-lg"
                      initial={{ opacity: 0, filter: 'blur(4px)', y: -10 }}
                      animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                      exit={{ opacity: 0, filter: 'blur(4px)', y: 10 }}
                      transition={{
                        type: 'spring',
                        stiffness: 300,
                        damping: 30,
                        delay: index * 0.03,
                        opacity: { duration: 0.2 },
                        filter: { duration: 0.3 },
                      }}
                    >
                      <NavLink
                        to={`/projects/${board.id}`}
                        className={({ isActive }) =>
                          cn(
                            'flex grow items-center gap-2.5 rounded-lg px-3 py-1.5 text-left text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border',
                            useTransparentStyle
                              ? isActive
                                ? 'bg-white/20 text-white shadow-lg shadow-black/10 backdrop-blur-md border-white/10'
                                : 'text-white/90 hover:bg-white/10 hover:backdrop-blur-sm border-transparent'
                              : isActive
                                ? 'bg-accent text-accent-foreground shadow-sm border-transparent'
                                : 'text-foreground hover:bg-accent/80 border-transparent'
                          )
                        }
                      >
                        {hasEmoji ? (
                          <span className="text-base">{board.emoji}</span>
                        ) : (
                          <IconComponent
                            className="h-3.5 w-3.5"
                            style={{ color: projectColor }}
                          />
                        )}
                        <span className="truncate font-medium">
                          {board.title}
                        </span>
                      </NavLink>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.92 }}
                            transition={{ duration: 0.18, ease: 'easeOut' }}
                            className={cn(
                              'absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-md opacity-0 pointer-events-none transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                              'group-hover:opacity-100 group-hover:pointer-events-auto',
                              'data-[state=open]:opacity-100 data-[state=open]:pointer-events-auto',
                              useTransparentStyle
                                ? 'text-white/70 hover:bg-white/20 hover:text-white data-[state=open]:bg-white/20 data-[state=open]:text-white'
                                : 'text-muted-foreground hover:bg-accent/20 data-[state=open]:bg-accent data-[state=open]:text-accent-foreground'
                            )}
                            aria-label={`Open actions for ${board.title}`}
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </motion.button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          side="right"
                          align="start"
                          className="w-44"
                        >
                          <DropdownMenuItem
                            onSelect={() => {
                              setSettingsProjectId(board.id)
                              setSettingsProjectName(board.title)
                              setSettingsProjectDescription(
                                board.description ?? ''
                              )
                              setSettingsProjectIcon(
                                board.icon ?? DEFAULT_PROJECT_ICON
                              )
                              setSettingsProjectEmoji(board.emoji ?? '')
                              setSettingsProjectColor(board.color ?? '#6366F1')
                              setSettingsUseEmoji(
                                Boolean(board.emoji && board.emoji.trim())
                              )
                              setSettingsProjectOpen(true)
                            }}
                          >
                            Settings
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => {
                              setDeleteProjectId(board.id)
                              setDeleteProjectTitle(board.title)
                              setDeleteProjectOpen(true)
                            }}
                            className="text-red-600 focus:text-red-600 focus:bg-red-50 hover:text-red-600 hover:bg-red-50 dark:text-red-400 dark:focus:text-red-300 dark:focus:bg-red-900/20 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </motion.div>
                  )
                })
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, filter: 'blur(4px)' }}
                  transition={{ duration: 0.3 }}
                >
                  <div
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm',
                      useTransparentStyle
                        ? 'text-white/60'
                        : 'text-gray-500 dark:text-gray-400'
                    )}
                  >
                    <div
                      className={cn(
                        'h-2 w-2 rounded-full',
                        useTransparentStyle
                          ? 'bg-white/30'
                          : 'bg-muted-foreground/50'
                      )}
                    ></div>
                    <span>No projects yet</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <Button
              type="button"
              variant="ghost"
              className={cn(
                'mt-2 flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-left text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                useTransparentStyle
                  ? 'text-white/90 hover:text-white hover:bg-white/10 hover:backdrop-blur-sm'
                  : 'text-foreground hover:bg-accent/80'
              )}
              onClick={() => setCreateProjectOpen(true)}
              disabled={!selectedWorkspaceId || isLoadingWorkspaces}
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="font-medium">New Project</span>
            </Button>
          </motion.div>
        </div>
      </motion.nav>

      {children}

      <CreateWorkspaceDialog
        open={createWorkspaceOpen}
        onOpenChange={setCreateWorkspaceOpen}
        onSuccess={workspaceId => {
          setSelectedWorkspaceId(workspaceId)
        }}
      />

      {/* Edit Workspace Dialog */}
      <Dialog
        open={editWorkspaceOpen}
        onOpenChange={open => {
          setEditWorkspaceOpen(open)
          if (!open) {
            setEditWorkspaceId(null)
            setEditWorkspaceName('')
            setEditWorkspaceColor(DEFAULT_WORKSPACE_COLOR)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit workspace</DialogTitle>
            <DialogDescription>
              Update the workspace name and color.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault()
              if (updateWorkspace.isPending || !editWorkspaceId) return

              const trimmedName = editWorkspaceName.trim()
              if (!trimmedName) {
                toast.error('Workspace name is required')
                return
              }

              updateWorkspace.mutate(
                {
                  id: editWorkspaceId,
                  name: trimmedName,
                  color: editWorkspaceColor,
                },
                {
                  onSuccess: () => {
                    toast.success('Workspace updated')
                    setEditWorkspaceOpen(false)
                  },
                  onError: error => {
                    const message =
                      error instanceof Error ? error.message : 'Unknown error'
                    toast.error('Failed to update workspace', {
                      description: message,
                    })
                  },
                }
              )
            }}
          >
            <div className="space-y-2">
              <Label>Workspace name</Label>
              <Input
                value={editWorkspaceName}
                onChange={event => setEditWorkspaceName(event.target.value)}
                placeholder="e.g. Product Team"
                autoFocus
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="color"
                  value={editWorkspaceColor}
                  onChange={event => setEditWorkspaceColor(event.target.value)}
                  className="h-10 w-16 cursor-pointer border border-border/60 bg-transparent p-1"
                />
                <span className="text-xs text-muted-foreground">
                  Used when no icon is set.
                </span>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditWorkspaceOpen(false)}
                disabled={updateWorkspace.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateWorkspace.isPending}>
                {updateWorkspace.isPending ? 'Updating…' : 'Update workspace'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Workspace Dialog */}
      <AlertDialog
        open={deleteWorkspaceOpen}
        onOpenChange={open => {
          setDeleteWorkspaceOpen(open)
          if (!open) {
            setDeleteWorkspaceId(null)
            setDeleteWorkspaceName('')
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete workspace</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete
              {deleteWorkspaceName
                ? ` "${deleteWorkspaceName}"`
                : ' this workspace'}
              .
              <br />
              <br />
              <strong>Note:</strong> You must move or delete all projects from
              this workspace before you can delete it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteWorkspace.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={event => {
                event.preventDefault()
                if (!deleteWorkspaceId) return

                deleteWorkspace.mutate(deleteWorkspaceId, {
                  onSuccess: () => {
                    toast.success('Workspace deleted')
                    setDeleteWorkspaceOpen(false)
                  },
                  onError: error => {
                    const message =
                      error instanceof Error ? error.message : 'Unknown error'
                    toast.error('Failed to delete workspace', {
                      description: message,
                    })
                  },
                })
              }}
              disabled={deleteWorkspace.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteWorkspace.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Project Settings Dialog */}
      <Dialog
        open={settingsProjectOpen}
        onOpenChange={open => {
          setSettingsProjectOpen(open)
          if (!open) {
            setSettingsProjectId(null)
            setSettingsProjectName('')
            setSettingsProjectDescription('')
            setSettingsProjectIcon(DEFAULT_PROJECT_ICON)
            setSettingsProjectEmoji('')
            setSettingsProjectColor('#6366F1')
            setSettingsUseEmoji(false)
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Project Settings</DialogTitle>
            <DialogDescription>
              Manage your project name, description, appearance, and customization.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-6"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault()
              if (renameBoard.isPending || updateBoardIcon.isPending || !settingsProjectId) {
                return
              }

              const trimmedName = settingsProjectName.trim()
              if (!trimmedName) {
                toast.error('Project name is required')
                return
              }

              // Update name and description
              renameBoard.mutate(
                {
                  id: settingsProjectId,
                  title: trimmedName,
                  description: settingsProjectDescription.trim() || undefined,
                },
                {
                  onSuccess: () => {
                    // Update icon/emoji after successful name update
                    updateBoardIcon.mutate(
                      {
                        id: settingsProjectId,
                        icon: settingsUseEmoji ? '' : settingsProjectIcon,
                      },
                      {
                        onSuccess: () => {
                          toast.success('Project settings updated')
                          setSettingsProjectOpen(false)
                        },
                        onError: error => {
                          const message =
                            error instanceof Error ? error.message : 'Unknown error'
                          toast.error('Failed to update project icon', {
                            description: message,
                          })
                        },
                      }
                    )
                  },
                  onError: error => {
                    const message =
                      error instanceof Error ? error.message : 'Unknown error'
                    toast.error('Failed to update project', {
                      description: message,
                    })
                  },
                }
              )
            }}
          >
            {/* Visual Preview */}
            <div className="flex items-center justify-center gap-4 py-4">
              <div
                className="relative flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg transition-all duration-200"
                style={{
                  backgroundColor: settingsUseEmoji ? settingsProjectColor : 'transparent',
                  transform: 'scale(1)',
                }}
              >
                {settingsUseEmoji && settingsProjectEmoji ? (
                  <span className="text-3xl">{settingsProjectEmoji}</span>
                ) : (() => {
                  const IconComponent = PROJECT_ICON_MAP[settingsProjectIcon] ?? Folder
                  return (
                    <IconComponent
                      className="h-12 w-12"
                      style={{ color: settingsProjectColor }}
                    />
                  )
                })()}
              </div>
            </div>

            {/* Project Name */}
            <div className="space-y-2">
              <Label htmlFor={settingsProjectNameId} className="text-sm font-medium">
                Project name
              </Label>
              <Input
                id={settingsProjectNameId}
                value={settingsProjectName}
                onChange={event => setSettingsProjectName(event.target.value)}
                placeholder="e.g. Marketing Launch"
                autoFocus
                required
                className="h-10"
              />
            </div>

            {/* Customization */}
            <div className="grid gap-4">
              {/* Icon or Emoji Toggle */}
              <div className="flex items-center gap-4 rounded-lg border border-border p-3">
                <button
                  type="button"
                  onClick={() => setSettingsUseEmoji(false)}
                  className={cn(
                    'flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors',
                    !settingsUseEmoji
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  )}
                >
                  Icon
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsUseEmoji(true)}
                  className={cn(
                    'flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors',
                    settingsUseEmoji
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  )}
                >
                  Emoji
                </button>
              </div>

              {/* Icon Selector */}
              {!settingsUseEmoji && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Icon</Label>
                  <Select value={settingsProjectIcon} onValueChange={setSettingsProjectIcon}>
                    <SelectTrigger className="h-10">
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          {(() => {
                            const IconComponent =
                              PROJECT_ICON_MAP[settingsProjectIcon] ?? Folder
                            return (
                              <>
                                <IconComponent className="h-4 w-4" />
                                <span>
                                  {PROJECT_ICON_OPTIONS.find(
                                    opt => opt.value === settingsProjectIcon
                                  )?.label ?? 'Select icon'}
                                </span>
                              </>
                            )
                          })()}
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_ICON_SECTIONS.map((section, sectionIndex) => (
                        <div key={section.label}>
                          {sectionIndex > 0 && <SelectSeparator />}
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                            {section.label}
                          </div>
                          {section.options.map(option => {
                            const IconComponent = option.icon
                            return (
                              <SelectItem key={option.value} value={option.value}>
                                <div className="flex items-center gap-2">
                                  <IconComponent className="h-4 w-4" />
                                  <span>{option.label}</span>
                                </div>
                              </SelectItem>
                            )
                          })}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Emoji Input */}
              {settingsUseEmoji && (
                <div className="space-y-2">
                  <Label htmlFor="settings-project-emoji" className="text-sm font-medium">
                    Emoji
                  </Label>
                  <Input
                    id="settings-project-emoji"
                    value={settingsProjectEmoji}
                    onChange={event => {
                      const value = event.target.value
                      if (value.length <= 2) {
                        setSettingsProjectEmoji(value)
                      }
                    }}
                    placeholder="😊"
                    className="h-12 text-center text-3xl"
                    maxLength={2}
                  />
                </div>
              )}

              {/* Color Picker */}
              <div className="space-y-2">
                <Label htmlFor="settings-project-color" className="text-sm font-medium">
                  Color
                </Label>
                <div className="flex gap-2">
                  <input
                    id="settings-project-color"
                    type="color"
                    value={settingsProjectColor}
                    onChange={event => setSettingsProjectColor(event.target.value)}
                    className="h-10 w-14 cursor-pointer rounded-md border border-input"
                  />
                  <Input
                    value={settingsProjectColor}
                    onChange={event => setSettingsProjectColor(event.target.value)}
                    placeholder="#6366F1"
                    className="h-10 flex-1 font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor={settingsProjectDescriptionId} className="text-sm font-medium">
                Description <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id={settingsProjectDescriptionId}
                value={settingsProjectDescription}
                onChange={event => setSettingsProjectDescription(event.target.value)}
                placeholder="What's this project about?"
                rows={3}
                className="resize-none"
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSettingsProjectOpen(false)}
                disabled={renameBoard.isPending || updateBoardIcon.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={renameBoard.isPending || updateBoardIcon.isPending}
              >
                {renameBoard.isPending || updateBoardIcon.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Save changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={createProjectOpen}
        onOpenChange={open => {
          setCreateProjectOpen(open)
          if (!open) {
            // Reset form on close
            setProjectName('')
            setProjectDescription('')
            setProjectIcon(DEFAULT_PROJECT_ICON)
            setProjectEmoji('')
            setProjectColor('#6366F1')
            setUseEmoji(false)
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create project</DialogTitle>
            <DialogDescription>
              Choose an icon or emoji and customize the color for your project.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-6"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault()
              if (createBoard.isPending) return

              const trimmedName = projectName.trim()
              if (!trimmedName) {
                toast.error('Project name is required')
                return
              }

              if (!selectedWorkspaceId) {
                toast.error('Select a workspace before creating a project')
                return
              }

              const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`

              createBoard.mutate(
                {
                  id,
                  workspaceId: selectedWorkspaceId,
                  title: trimmedName,
                  description: projectDescription.trim() || undefined,
                  icon: useEmoji ? undefined : projectIcon,
                  emoji: useEmoji && projectEmoji.trim() ? projectEmoji.trim() : undefined,
                  color: projectColor,
                },
                {
                  onSuccess: () => {
                    toast.success('Project created')
                    setProjectName('')
                    setProjectDescription('')
                    setProjectIcon(DEFAULT_PROJECT_ICON)
                    setProjectEmoji('')
                    setProjectColor('#6366F1')
                    setUseEmoji(false)
                    setCreateProjectOpen(false)
                  },
                  onError: error => {
                    const message =
                      error instanceof Error ? error.message : 'Unknown error'
                    toast.error('Failed to create project', {
                      description: message,
                    })
                  },
                }
              )
            }}
          >
            {/* Visual Preview */}
            <div className="flex items-center justify-center gap-4 py-6">
              <div
                className="relative flex h-20 w-20 items-center justify-center rounded-2xl shadow-lg transition-all duration-200"
                style={{
                  backgroundColor: useEmoji ? projectColor : 'transparent',
                  transform: 'scale(1)',
                }}
              >
                {useEmoji && projectEmoji ? (
                  <span className="text-4xl">{projectEmoji}</span>
                ) : (() => {
                  const IconComponent = PROJECT_ICON_MAP[projectIcon] ?? Folder
                  return (
                    <IconComponent
                      className="h-14 w-14"
                      style={{ color: projectColor }}
                    />
                  )
                })()}
              </div>
            </div>

            {/* Project Name */}
            <div className="space-y-2">
              <Label htmlFor={projectNameId} className="text-sm font-medium">
                Project name
              </Label>
              <Input
                id={projectNameId}
                value={projectName}
                onChange={event => setProjectName(event.target.value)}
                placeholder="e.g. Marketing Launch"
                autoFocus
                required
                className="h-10"
              />
            </div>

            {/* Customization Grid */}
            <div className="grid gap-4">
              {/* Icon or Emoji Toggle */}
              <div className="flex items-center gap-4 rounded-lg border border-border p-3">
                <button
                  type="button"
                  onClick={() => setUseEmoji(false)}
                  className={cn(
                    'flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors',
                    !useEmoji
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  )}
                >
                  Icon
                </button>
                <button
                  type="button"
                  onClick={() => setUseEmoji(true)}
                  className={cn(
                    'flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors',
                    useEmoji
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  )}
                >
                  Emoji
                </button>
              </div>

              {/* Icon Selector (only when not using emoji) */}
              {!useEmoji && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Icon</Label>
                  <Select value={projectIcon} onValueChange={setProjectIcon}>
                  <SelectTrigger className="h-10">
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const IconComponent =
                            PROJECT_ICON_MAP[projectIcon] ?? Folder
                          return (
                            <>
                              <IconComponent className="h-4 w-4" />
                              <span>
                                {PROJECT_ICON_OPTIONS.find(
                                  opt => opt.value === projectIcon
                                )?.label ?? 'Select icon'}
                              </span>
                            </>
                          )
                        })()}
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_ICON_SECTIONS.map((section, sectionIndex) => (
                      <div key={section.label}>
                        {sectionIndex > 0 && <SelectSeparator />}
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                          {section.label}
                        </div>
                        {section.options.map(option => {
                          const IconComponent = option.icon
                          return (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                <IconComponent className="h-4 w-4" />
                                <span>{option.label}</span>
                              </div>
                            </SelectItem>
                          )
                        })}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              )}

              {/* Emoji Input (only when using emoji) */}
              {useEmoji && (
                <div className="space-y-2">
                  <Label htmlFor="project-emoji" className="text-sm font-medium">
                    Emoji
                  </Label>
                  <Input
                    id="project-emoji"
                    value={projectEmoji}
                    onChange={event => {
                      // Only allow single emoji or clear
                      const value = event.target.value
                      if (value.length <= 2) {
                        setProjectEmoji(value)
                      }
                    }}
                    placeholder="😊"
                    className="h-12 text-center text-3xl"
                    maxLength={2}
                  />
                </div>
              )}

              {/* Color Picker */}
              <div className="space-y-2">
                <Label htmlFor="project-color" className="text-sm font-medium">
                  Color
                </Label>
                <div className="flex gap-2">
                  <input
                    id="project-color"
                    type="color"
                    value={projectColor}
                    onChange={event => setProjectColor(event.target.value)}
                    className="h-10 w-14 cursor-pointer rounded-md border border-input"
                  />
                  <Input
                    value={projectColor}
                    onChange={event => setProjectColor(event.target.value)}
                    placeholder="#6366F1"
                    className="h-10 flex-1 font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor={projectDescriptionId} className="text-sm font-medium">
                Description <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id={projectDescriptionId}
                value={projectDescription}
                onChange={event => setProjectDescription(event.target.value)}
                placeholder="What's this project about?"
                rows={3}
                className="resize-none"
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateProjectOpen(false)}
                disabled={createBoard.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createBoard.isPending}>
                {createBoard.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  'Create project'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteProjectOpen}
        onOpenChange={open => {
          setDeleteProjectOpen(open)
          if (!open) {
            setDeleteProjectId(null)
            setDeleteProjectTitle('')
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete
              {deleteProjectTitle
                ? ` "${deleteProjectTitle}"`
                : ' this project'}{' '}
              and all of its data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBoard.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={event => {
                event.preventDefault()
                handleConfirmDelete()
              }}
              disabled={deleteBoard.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteBoard.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}

export default LeftSideBar
