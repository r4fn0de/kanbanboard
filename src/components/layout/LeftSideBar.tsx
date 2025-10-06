import { cn } from '@/lib/utils'
import { useTheme } from '@/hooks/use-theme'
import type { FormEvent } from 'react'
import { useMemo, useState, useId } from 'react'
import { ChevronDown, ChevronRight, Home, Folder, MoreHorizontal, Plus } from 'lucide-react'
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
import { useBoards, useCreateBoard, useDeleteBoard, useRenameBoard } from '@/services/kanban'
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
  const projectNameId = useId()
  const projectDescriptionId = useId()
  const renameProjectNameId = useId()
  const renameProjectDescriptionId = useId()
  const navigate = useNavigate()
  const location = useLocation()

  const createBoard = useCreateBoard()
  const renameBoard = useRenameBoard()
  const deleteBoard = useDeleteBoard()
  const { data: boards = [], isLoading: isLoadingBoards, isError: isBoardsError } = useBoards()

  const sidebarClasses = cn(
    'flex h-full flex-col border-r',
    transparencyEnabled
      ? 'border-border/30 bg-background/30 backdrop-blur-lg supports-[backdrop-filter]:bg-background/15 supports-[backdrop-filter]:backdrop-blur-2xl'
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
          const message = error instanceof Error ? error.message : 'Unknown error'
          toast.error('Failed to delete project', { description: message })
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
    <div
      className={cn(sidebarClasses, className)}
    >
      <nav className="flex flex-col gap-1 p-3 text-sm text-foreground">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-left transition hover:bg-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isActive ? 'bg-foreground/10 text-foreground' : undefined
            )
          }
        >
          <Home className="h-4 w-4" />
          <span>Home</span>
        </NavLink>

        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => setProjectsOpen(prev => !prev)}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-left transition hover:bg-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {projectsOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span>Projects</span>
          </button>

          {projectsOpen ? (
            <div className="mt-1 flex flex-col gap-1 pl-7">
              {isLoadingBoards ? (
                <span className="px-3 py-1.5 text-sm text-muted-foreground">Loading…</span>
              ) : projectLinks && projectLinks.length ? (
                projectLinks.map(board => (
                  <div
                    key={board.id}
                    className="group relative flex items-center rounded-md px-1 py-0.5"
                  >
                    <NavLink
                      to={`/projects/${board.id}`}
                      className={({ isActive }) =>
                        cn(
                          'flex grow items-center gap-2 rounded-md pl-3 pr-10 py-1.5 text-left text-muted-foreground transition hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          isActive ? 'bg-foreground/10 text-foreground' : undefined
                        )
                      }
                    >
                      <Folder className="h-3.5 w-3.5" />
                      <span className="truncate">{board.title}</span>
                    </NavLink>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.92 }}
                          transition={{ duration: 0.18, ease: 'easeOut' }}
                          className={cn(
                            'absolute right-1 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground opacity-0 pointer-events-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            'group-hover:opacity-100 group-hover:pointer-events-auto',
                            'data-[state=open]:opacity-100 data-[state=open]:pointer-events-auto data-[state=open]:bg-foreground/10 data-[state=open]:text-foreground'
                          )}
                          aria-label={`Open actions for ${board.title}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </motion.button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side="right" align="start" className="w-44">
                        <DropdownMenuItem
                          onSelect={() => {
                            setRenameProjectId(board.id)
                            setRenameProjectName(board.title)
                            setRenameProjectDescription(board.description ?? '')
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
                ))
              ) : (
                <span className="px-3 py-1.5 text-sm text-muted-foreground">
                  No projects yet
                </span>
              )}
              <Button
                type="button"
                variant="ghost"
                className="mt-1 flex items-center gap-2 justify-start px-3 py-1.5 text-left text-muted-foreground hover:text-foreground"
                onClick={() => setCreateProjectOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Project</span>
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
              Update the project name and description to keep your workspace organized.
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
                    const message = error instanceof Error ? error.message : 'Unknown error'
                    toast.error('Failed to rename project', { description: message })
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
                onChange={event => setRenameProjectDescription(event.target.value)}
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

      <Dialog open={createProjectOpen} onOpenChange={open => setCreateProjectOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create project</DialogTitle>
            <DialogDescription>
              Give your project a clear name and optional description to help teammates understand its purpose.
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
                    toast.error('Failed to create project', { description: message })
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
              {deleteProjectTitle ? ` "${deleteProjectTitle}"` : ' this project'} and all of its
              data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBoard.isPending}>Cancel</AlertDialogCancel>
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
