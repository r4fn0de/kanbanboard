import { memo } from 'react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Plus, MoreHorizontal, Folder } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { KanbanBoard } from '@/types/common'
import { PROJECT_ICON_MAP, DEFAULT_PROJECT_ICON } from './constants'

interface ProjectListProps {
  boards: KanbanBoard[]
  useTransparentStyle?: boolean
  isLoadingBoards?: boolean
  isLoadingWorkspaces?: boolean
  isBoardsError?: boolean
  isWorkspacesError?: boolean
  selectedWorkspaceId: string | null
  onOpenSettings: (board: KanbanBoard) => void
  onOpenDelete: (board: KanbanBoard) => void
  onCreateProject: () => void
}

function ProjectListItem({
  board,
  index,
  useTransparentStyle,
  onOpenSettings,
  onOpenDelete,
}: {
  board: KanbanBoard
  index: number
  useTransparentStyle: boolean
  onOpenSettings: (board: KanbanBoard) => void
  onOpenDelete: (board: KanbanBoard) => void
}) {
  const IconComponent = PROJECT_ICON_MAP[board.icon ?? ''] ?? Folder
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
            'flex grow items-center gap-2.5 rounded-lg px-3 py-1.5 text-left text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            useTransparentStyle
              ? isActive
                ? 'bg-white/20 text-white backdrop-blur-sm'
                : 'text-white/70 hover:bg-white/12 hover:text-white hover:backdrop-blur-sm'
              : isActive
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )
        }
      >
        {hasEmoji ? (
          <span className="text-base">{board.emoji}</span>
        ) : (
          <IconComponent className="h-4 w-4" style={{ color: projectColor }} />
        )}
        <span className="truncate font-medium">{board.title}</span>
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
                ? 'text-white/60 hover:bg-white/15 hover:text-white data-[state=open]:bg-white/15 data-[state=open]:text-white'
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
          className={cn(
            'w-44',
            useTransparentStyle &&
              'backdrop-blur-xl bg-popover/80 supports-[backdrop-filter]:bg-popover/60'
          )}
        >
          <DropdownMenuItem onSelect={() => onOpenSettings(board)}>
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => onOpenDelete(board)}
            className="text-destructive focus:text-destructive focus:bg-destructive/10 hover:text-destructive hover:bg-destructive/10"
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  )
}

export const ProjectList = memo(function ProjectList({
  boards,
  useTransparentStyle = false,
  isLoadingBoards = false,
  isLoadingWorkspaces = false,
  isBoardsError = false,
  isWorkspacesError = false,
  selectedWorkspaceId,
  onOpenSettings,
  onOpenDelete,
  onCreateProject,
}: ProjectListProps) {
  const isLoading = isLoadingBoards || isLoadingWorkspaces
  const isError = isBoardsError || isWorkspacesError

  return (
    <motion.nav
      className={cn(
        'mt-1 flex flex-col gap-2 px-4 pb-4 text-sm',
        useTransparentStyle ? 'text-white/85' : 'text-foreground'
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
            'flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            useTransparentStyle
              ? isActive
                ? 'bg-white/20 text-white backdrop-blur-sm'
                : 'text-white/70 hover:bg-white/12 hover:text-white hover:backdrop-blur-sm'
              : isActive
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
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
            useTransparentStyle ? 'text-white/85 font-semibold' : 'text-foreground'
          )}
        >
          <span className="font-bold">Projects</span>
        </div>

        <motion.div
          className="mt-2 flex flex-col gap-2 ml-6"
          initial={false}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <AnimatePresence mode="wait">
            {isLoading ? (
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
                      : 'text-muted-foreground'
                  )}
                >
                  <div
                    className={cn(
                      'h-3 w-3 animate-pulse rounded-full',
                      useTransparentStyle
                        ? 'bg-white/40'
                        : 'bg-muted-foreground/50'
                    )}
                  ></div>
                  <span>Loading…</span>
                </div>
              </motion.div>
            ) : isError ? (
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
            ) : boards.length > 0 ? (
              boards.map((board, index) => (
                <ProjectListItem
                  key={board.id}
                  board={board}
                  index={index}
                  useTransparentStyle={useTransparentStyle}
                  onOpenSettings={onOpenSettings}
                  onOpenDelete={onOpenDelete}
                />
              ))
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
                      : 'text-muted-foreground'
                  )}
                >
                  <div
                    className={cn(
                      'h-2 w-2 rounded-full',
                      useTransparentStyle
                        ? 'bg-white/40'
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
              'mt-2 flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              useTransparentStyle
                ? 'text-white/70 hover:bg-white/12 hover:text-white hover:backdrop-blur-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
            onClick={onCreateProject}
            disabled={!selectedWorkspaceId || isLoadingWorkspaces}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="font-medium">New Project</span>
          </Button>
        </motion.div>
      </div>
    </motion.nav>
  )
})

