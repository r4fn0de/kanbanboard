import { cn } from '@/lib/utils'
import { useTheme } from '@/hooks/use-theme'
import type { FormEvent } from 'react'
import { useMemo, useState, useId } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  ChevronDown,
  ChevronRight,
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
  PanelRight,
  PanelRightClose,
  Plus,
  Settings,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { motion } from 'framer-motion'
import { MacOSWindowControls } from '@/components/titlebar/MacOSWindowControls'
import { executeCommand, useCommandContext } from '@/lib/commands'
import { useUIStore } from '@/store/ui-store'

interface LeftSideBarProps {
  children?: React.ReactNode
  className?: string
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

export function LeftSideBar({ children, className }: LeftSideBarProps) {
  const { transparencyEnabled } = useTheme()
  const [projectsOpen, setProjectsOpen] = useState(true)
  const [createProjectOpen, setCreateProjectOpen] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [renameProjectOpen, setRenameProjectOpen] = useState(false)
  const [renameProjectId, setRenameProjectId] = useState<string | null>(null)
  const [renameProjectName, setRenameProjectName] = useState('')
  const [renameProjectDescription, setRenameProjectDescription] = useState('')
  const [deleteProjectOpen, setDeleteProjectOpen] = useState(false)
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null)
  const [deleteProjectTitle, setDeleteProjectTitle] = useState('')
  const [changeIconOpen, setChangeIconOpen] = useState(false)
  const [changeIconProjectId, setChangeIconProjectId] = useState<string | null>(
    null
  )
  const [changeIconValue, setChangeIconValue] =
    useState<string>(DEFAULT_PROJECT_ICON)
  const projectNameId = useId()
  const projectDescriptionId = useId()
  const renameProjectNameId = useId()
  const renameProjectDescriptionId = useId()
  const navigate = useNavigate()
  const location = useLocation()
  const commandContext = useCommandContext()
  const {
    leftSidebarVisible,
    rightSidebarVisible,
    toggleLeftSidebar,
    toggleRightSidebar,
  } = useUIStore()

  const createBoard = useCreateBoard()
  const renameBoard = useRenameBoard()
  const deleteBoard = useDeleteBoard()
  const updateBoardIcon = useUpdateBoardIcon()
  const {
    data: boards = [],
    isLoading: isLoadingBoards,
    isError: isBoardsError,
  } = useBoards()

  const sidebarClasses = cn(
    'flex h-full flex-col rounded-l-[12px]',
    transparencyEnabled
      ? 'border-border/20 bg-background/5 backdrop-blur-xl supports-[backdrop-filter]:bg-background/3 supports-[backdrop-filter]:backdrop-blur-2xl'
      : 'border-border bg-background'
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

  const handleConfirmIconChange = () => {
    if (!changeIconProjectId || updateBoardIcon.isPending) {
      return
    }

    const targetId = changeIconProjectId
    const iconValue = changeIconValue || DEFAULT_PROJECT_ICON

    if (projectLinks) {
      const targetBoard = projectLinks.find(board => board.id === targetId)
      if (
        targetBoard &&
        (targetBoard.icon ?? DEFAULT_PROJECT_ICON) === iconValue
      ) {
        setChangeIconOpen(false)
        setChangeIconProjectId(null)
        setChangeIconValue(DEFAULT_PROJECT_ICON)
        return
      }
    }

    updateBoardIcon.mutate(
      { id: targetId, icon: iconValue },
      {
        onSuccess: () => {
          toast.success('Project icon updated')
          setChangeIconOpen(false)
          setChangeIconProjectId(null)
          setChangeIconValue(DEFAULT_PROJECT_ICON)
        },
        onError: error => {
          const message =
            error instanceof Error ? error.message : 'Unknown error'
          toast.error('Failed to update project icon', { description: message })
        },
      }
    )
  }

  const projectLinks = useMemo(() => {
    if (isLoadingBoards) {
      return null
    }

    if (isBoardsError) {
      return []
    }

    return boards
  }, [boards, isBoardsError, isLoadingBoards])

  return (
    <div className={cn(sidebarClasses, className)}>
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
            className="h-6 w-6 text-foreground/70 hover:text-foreground"
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
            className="h-6 w-6 text-foreground/70 hover:text-foreground"
            title="Settings"
          >
            <Settings className="h-3 w-3" />
          </Button>
          <Button
            onClick={toggleRightSidebar}
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-foreground/70 hover:text-foreground"
            title={
              rightSidebarVisible ? 'Hide Right Sidebar' : 'Show Right Sidebar'
            }
          >
            {rightSidebarVisible ? (
              <PanelRightClose className="h-3 w-3" />
            ) : (
              <PanelRight className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      <nav
        className={cn(
          'mt-1 flex flex-col gap-2 px-4 pb-4 text-sm',
          transparencyEnabled
            ? 'text-gray-900 dark:text-gray-100'
            : 'text-foreground'
        )}
      >
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all duration-200 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              transparencyEnabled
                ? isActive
                  ? 'bg-accent text-accent-foreground shadow-sm backdrop-blur-sm'
                  : 'text-foreground hover:bg-accent/10'
                : isActive
                  ? 'bg-accent text-accent-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent/10'
            )
          }
        >
          <Home className="h-4 w-4" />
          <span className="font-medium">Home</span>
        </NavLink>

        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => setProjectsOpen(prev => !prev)}
            className={cn(
              'flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all duration-200 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              transparencyEnabled
                ? 'text-foreground hover:bg-accent/10'
                : 'text-muted-foreground hover:bg-accent/10'
            )}
          >
            {projectsOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span className="font-medium">Projects</span>
          </button>

          {projectsOpen ? (
            <div className="mt-2 flex flex-col gap-2 ml-6">
              {isLoadingBoards ? (
                <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                  <div className="h-3 w-3 animate-pulse rounded-full bg-muted-foreground/50"></div>
                  <span>Loading…</span>
                </div>
              ) : projectLinks && projectLinks.length ? (
                projectLinks.map(board => {
                  const IconComponent =
                    PROJECT_ICON_MAP[board.icon ?? ''] ?? Folder

                  return (
                    <div
                      key={board.id}
                      className="group relative flex items-center rounded-lg"
                    >
                      <NavLink
                        to={`/projects/${board.id}`}
                        className={({ isActive }) =>
                          cn(
                            'flex grow items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all duration-200 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            transparencyEnabled
                              ? isActive
                                ? 'bg-accent text-accent-foreground shadow-sm backdrop-blur-sm'
                                : 'text-foreground hover:bg-accent/10'
                              : isActive
                                ? 'bg-accent text-accent-foreground shadow-sm'
                                : 'text-muted-foreground hover:bg-accent/10'
                          )
                        }
                      >
                        <IconComponent className="h-4 w-4" />
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
                              'absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground opacity-0 pointer-events-none transition-all duration-200 hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                              'group-hover:opacity-100 group-hover:pointer-events-auto',
                              'data-[state=open]:opacity-100 data-[state=open]:pointer-events-auto data-[state=open]:bg-accent data-[state=open]:text-accent-foreground'
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
                              setChangeIconProjectId(board.id)
                              setChangeIconValue(
                                board.icon ?? DEFAULT_PROJECT_ICON
                              )
                              setChangeIconOpen(true)
                            }}
                          >
                            Change Icon
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => {
                              setRenameProjectId(board.id)
                              setRenameProjectName(board.title)
                              setRenameProjectDescription(
                                board.description ?? ''
                              )
                              setRenameProjectOpen(true)
                            }}
                          >
                            Rename
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
                    </div>
                  )
                })
              ) : (
                <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground/50"></div>
                  <span>No projects yet</span>
                </div>
              )}
              <Button
                type="button"
                variant="ghost"
                className={cn(
                  'mt-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all duration-200 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  transparencyEnabled
                    ? 'text-foreground hover:bg-accent/10'
                    : 'text-muted-foreground hover:bg-accent/10'
                )}
                onClick={() => setCreateProjectOpen(true)}
              >
                <Plus className="h-4 w-4" />
                <span className="font-medium">New Project</span>
              </Button>
            </div>
          ) : null}
        </div>
      </nav>

      {children}

      <Dialog
        open={renameProjectOpen}
        onOpenChange={open => {
          setRenameProjectOpen(open)
          if (!open) {
            setRenameProjectId(null)
            setRenameProjectName('')
            setRenameProjectDescription('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename project</DialogTitle>
            <DialogDescription>
              Update the project name and description to keep your workspace
              organized.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault()

              if (renameBoard.isPending || !renameProjectId) {
                return
              }

              const trimmedName = renameProjectName.trim()

              if (!trimmedName) {
                toast.error('Project name is required')
                return
              }

              renameBoard.mutate(
                {
                  id: renameProjectId,
                  title: trimmedName,
                  description: renameProjectDescription.trim() || undefined,
                },
                {
                  onSuccess: () => {
                    toast.success('Project updated')
                    setRenameProjectOpen(false)
                  },
                  onError: error => {
                    const message =
                      error instanceof Error ? error.message : 'Unknown error'
                    toast.error('Failed to rename project', {
                      description: message,
                    })
                  },
                }
              )
            }}
          >
            <div className="space-y-2">
              <Label htmlFor={renameProjectNameId}>Project name</Label>
              <Input
                id={renameProjectNameId}
                value={renameProjectName}
                onChange={event => setRenameProjectName(event.target.value)}
                placeholder="e.g. Marketing Launch"
                autoFocus
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={renameProjectDescriptionId}>Description</Label>
              <Textarea
                id={renameProjectDescriptionId}
                value={renameProjectDescription}
                onChange={event =>
                  setRenameProjectDescription(event.target.value)
                }
                placeholder="Optional context to help your team get started"
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenameProjectOpen(false)}
                disabled={renameBoard.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={renameBoard.isPending}>
                {renameBoard.isPending ? 'Updating…' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={changeIconOpen}
        onOpenChange={open => {
          setChangeIconOpen(open)
          if (!open) {
            setChangeIconProjectId(null)
            setChangeIconValue(DEFAULT_PROJECT_ICON)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change project icon</DialogTitle>
            <DialogDescription>
              Choose an icon to represent this project in the sidebar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {PROJECT_ICON_SECTIONS.map(section => (
              <div key={section.label} className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {section.label}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {section.options.map(option => {
                    const IconComponent = option.icon
                    const isSelected = changeIconValue === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setChangeIconValue(option.value)}
                        disabled={updateBoardIcon.isPending}
                        aria-pressed={isSelected}
                        className={cn(
                          'flex h-16 flex-col items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition',
                          isSelected
                            ? 'border-primary bg-primary/10 text-primary shadow-sm dark:bg-primary/20'
                            : 'border-transparent bg-accent/10 text-accent-foreground hover:border-accent hover:bg-accent/20'
                        )}
                      >
                        <IconComponent className="h-5 w-5" />
                        <span className="truncate text-xs font-medium">
                          {option.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setChangeIconOpen(false)
                setChangeIconProjectId(null)
                setChangeIconValue(DEFAULT_PROJECT_ICON)
              }}
              disabled={updateBoardIcon.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmIconChange}
              disabled={updateBoardIcon.isPending || !changeIconProjectId}
            >
              {updateBoardIcon.isPending ? 'Updating…' : 'Save icon'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={createProjectOpen}
        onOpenChange={open => setCreateProjectOpen(open)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create project</DialogTitle>
            <DialogDescription>
              Give your project a clear name and optional description to help
              teammates understand its purpose.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault()
              if (createBoard.isPending) return

              const trimmedName = projectName.trim()
              if (!trimmedName) {
                toast.error('Project name is required')
                return
              }

              const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`

              createBoard.mutate(
                {
                  id,
                  title: trimmedName,
                  description: projectDescription.trim() || undefined,
                  icon: DEFAULT_PROJECT_ICON,
                },
                {
                  onSuccess: () => {
                    toast.success('Project created')
                    setProjectName('')
                    setProjectDescription('')
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
            <div className="space-y-2">
              <Label htmlFor={projectNameId}>Project name</Label>
              <Input
                id={projectNameId}
                value={projectName}
                onChange={event => setProjectName(event.target.value)}
                placeholder="e.g. Marketing Launch"
                autoFocus
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={projectDescriptionId}>Description</Label>
              <Textarea
                id={projectDescriptionId}
                value={projectDescription}
                onChange={event => setProjectDescription(event.target.value)}
                placeholder="Optional context to help your team get started"
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateProjectOpen(false)}
                disabled={createBoard.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createBoard.isPending}>
                {createBoard.isPending ? 'Creating…' : 'Create project'}
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
    </div>
  )
}

export default LeftSideBar
