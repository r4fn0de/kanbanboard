import { cn } from '@/lib/utils'
import { useTheme } from '@/hooks/use-theme'
import type { FormEvent } from 'react'
import { useMemo, useState, useId } from 'react'
import { ChevronDown, ChevronRight, Home, Folder, Plus } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useCreateBoard } from '@/services/kanban'

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
  const projectNameId = useId()
  const projectDescriptionId = useId()

  const createBoard = useCreateBoard()

  const sidebarClasses = cn(
    'flex h-full flex-col border-r',
    transparencyEnabled
      ? 'border-border/30 bg-background/30 backdrop-blur-lg supports-[backdrop-filter]:bg-background/15 supports-[backdrop-filter]:backdrop-blur-2xl'
      : 'border-border bg-background'
  )

  const projectLinks = useMemo(
    () => [
      {
        to: '/projects/all',
        label: 'All Projects',
      },
      {
        to: '/projects/favorites',
        label: 'Favorites',
      },
    ],
    []
  )

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
              {projectLinks.map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 rounded-md px-3 py-1.5 text-left text-muted-foreground transition hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isActive ? 'bg-foreground/10 text-foreground' : undefined
                    )
                  }
                >
                  <Folder className="h-3.5 w-3.5" />
                  <span>{link.label}</span>
                </NavLink>
              ))}
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
    </div>
  )
}

export default LeftSideBar
