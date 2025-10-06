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
  MoreHorizontal,
  Plus,
  ClipboardList,
  Briefcase,
  Rocket,
  Lightbulb,
  Target,
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

interface LeftSideBarProps {
  children?: React.ReactNode
  className?: string
}

const PROJECT_ICON_OPTIONS = [
  { value: 'Folder', label: 'Folder', icon: Folder },
  { value: 'ClipboardList', label: 'Tasks', icon: ClipboardList },
  { value: 'Briefcase', label: 'Briefcase', icon: Briefcase },
  { value: 'Rocket', label: 'Launch', icon: Rocket },
  { value: 'Lightbulb', label: 'Idea', icon: Lightbulb },
  { value: 'Target', label: 'Goals', icon: Target },
] as const

const PROJECT_ICON_MAP = PROJECT_ICON_OPTIONS.reduce<
  Record<string, LucideIcon>
>((accumulator, option) => {
  accumulator[option.value] = option.icon
  return accumulator
}, {})

const DEFAULT_PROJECT_ICON = PROJECT_ICON_OPTIONS[0].value

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
    'flex h-full flex-col border-r rounded-l-[12px]',
    transparencyEnabled
      ? 'border-gray-200/40 bg-gray-50/60 backdrop-blur-xl supports-[backdrop-filter]:bg-gray-50/40 supports-[backdrop-filter]:backdrop-blur-2xl dark:border-gray-700/40 dark:bg-gray-900/60 dark:supports-[backdrop-filter]:bg-gray-900/40'
      : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900'
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
      <nav className="flex flex-col gap-2 p-4 text-sm text-foreground">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all duration-200 hover:bg-gray-200/60 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-gray-800/60',
              isActive
                ? 'bg-gray-200/80 text-foreground shadow-sm dark:bg-gray-800/80'
                : 'text-gray-600 dark:text-gray-400'
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
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all duration-200 hover:bg-gray-200/60 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-gray-600 dark:text-gray-400 dark:hover:bg-gray-800/60"
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
                  <div className="h-3 w-3 animate-pulse rounded-full bg-gray-300 dark:bg-gray-600"></div>
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
                            'flex grow items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all duration-200 hover:bg-gray-200/60 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-gray-800/60',
                            isActive
                              ? 'bg-gray-200/80 text-foreground shadow-sm dark:bg-gray-800/80'
                              : 'text-gray-600 dark:text-gray-400'
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
                              'absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-md text-gray-500 opacity-0 pointer-events-none transition-all duration-200 hover:bg-gray-300/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-gray-400 dark:hover:bg-gray-700/60',
                              'group-hover:opacity-100 group-hover:pointer-events-auto',
                              'data-[state=open]:opacity-100 data-[state=open]:pointer-events-auto data-[state=open]:bg-gray-300/80 data-[state=open]:text-gray-700 dark:data-[state=open]:bg-gray-700/80 dark:data-[state=open]:text-gray-300'
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
                            className="text-destructive focus:text-destructive"
                          >
                            Delete
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => navigate(`/projects/${board.id}`)}
                          >
                            Open
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )
                })
              ) : (
                <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                  <div className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                  <span>No projects yet</span>
                </div>
              )}
              <Button
                type="button"
                variant="ghost"
                className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-gray-600 transition-all duration-200 hover:bg-gray-200/60 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-gray-400 dark:hover:bg-gray-800/60"
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
          <div className="grid gap-3 sm:grid-cols-3">
            {PROJECT_ICON_OPTIONS.map(option => {
              const IconComponent = option.icon
              const isSelected = changeIconValue === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setChangeIconValue(option.value)}
                  disabled={updateBoardIcon.isPending}
                  className={cn(
                    'flex h-20 flex-col items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition',
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary dark:bg-primary/20'
                      : 'border-transparent bg-gray-100 text-gray-600 hover:border-gray-300 hover:bg-gray-100/80 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-gray-600'
                  )}
                >
                  <IconComponent className="h-5 w-5" />
                  <span>{option.label}</span>
                </button>
              )
            })}
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
