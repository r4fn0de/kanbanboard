import { useMemo } from 'react'
import { PinIcon, TrashIcon, CalendarIcon } from '@/components/ui/icons'
import { cn } from '@/lib/utils'
import type { Note } from '@/services/notes'
import { useNotes, useUpdateNote, useDeleteNote } from '@/services/notes'
import { formatDistanceToNow } from 'date-fns'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { Skeleton } from '@/components/ui/skeleton'
const NOTE_LIST_SKELETON_KEYS = [
  'notes-loading-1',
  'notes-loading-2',
  'notes-loading-3',
  'notes-loading-4',
]

interface NotesListProps {
  boardId: string
  onSelectNote: (note: Note) => void
  searchQuery: string
}

export function NotesList({
  boardId,
  onSelectNote,
  searchQuery,
}: NotesListProps) {
  const { data: notes = [], isLoading } = useNotes(boardId)
  const normalizedQuery = searchQuery.trim().toLowerCase()

  const processedNotes = useMemo(() => {
    const matchesQuery = normalizedQuery
      ? notes.filter(note => note.title.toLowerCase().includes(normalizedQuery))
      : notes

    return [...matchesQuery].sort((a, b) => {
      const pinnedDiff = Number(b.pinned) - Number(a.pinned)
      if (pinnedDiff !== 0) return pinnedDiff

      const aUpdated = new Date(a.updatedAt).getTime()
      const bUpdated = new Date(b.updatedAt).getTime()
      return bUpdated - aUpdated
    })
  }, [notes, normalizedQuery])

  const filteredNotes = processedNotes
  const pinnedNotes = processedNotes.filter(note => note.pinned)
  const unpinnedNotes = processedNotes.filter(note => !note.pinned)

  return (
    <div className="flex h-full flex-col">
      {/* Notes List */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {NOTE_LIST_SKELETON_KEYS.map(key => (
                <Skeleton key={key} className="h-48 rounded-xl" />
              ))}
            </div>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="text-muted-foreground">
              {searchQuery
                ? 'No notes found matching your search'
                : 'No notes yet. Click "New Note" to get started.'}
            </div>
          </div>
        ) : (
          <div className="p-6">
            {/* Pinned Notes */}
            {pinnedNotes.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-muted-foreground">
                  <PinIcon className="h-3.5 w-3.5" />
                  Pinned Notes
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {pinnedNotes.map(note => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onClick={() => onSelectNote(note)}
                      boardId={boardId}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Other Notes */}
            {unpinnedNotes.length > 0 && (
              <div>
                {pinnedNotes.length > 0 && (
                  <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-muted-foreground">
                    All Notes
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {unpinnedNotes.map(note => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onClick={() => onSelectNote(note)}
                      boardId={boardId}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

interface NoteCardProps {
  note: Note
  onClick: () => void
  boardId: string
}

function NoteCard({ note, onClick, boardId }: NoteCardProps) {
  const updateNote = useUpdateNote(boardId)
  const deleteNote = useDeleteNote(boardId)

  const handleTogglePin = () => {
    updateNote.mutate(
      { id: note.id, boardId, pinned: !note.pinned },
      {
        onSuccess: () => {
          // Toast already handled in the hook
        },
      }
    )
  }

  const handleDelete = () => {
    deleteNote.mutate(
      { id: note.id },
      {
        onSuccess: () => {
          // Toast already handled in the hook
        },
      }
    )
  }
  const updatedAt = useMemo(
    () =>
      formatDistanceToNow(new Date(note.updatedAt), {
        addSuffix: true,
      }),
    [note.updatedAt]
  )
  const createdAt = useMemo(
    () =>
      formatDistanceToNow(new Date(note.createdAt), {
        addSuffix: true,
      }),
    [note.createdAt]
  )

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className={cn(
            'w-full rounded-lg border bg-card p-4 text-left transition-all hover:bg-accent/50 hover:shadow-sm',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="font-semibold line-clamp-1">{note.title}</h3>
            <div className="flex items-center gap-1">
              {note.pinned && (
                <PinIcon className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              )}
            </div>
          </div>

          {/* Rich content preview */}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarIcon className="h-3 w-3" />
            <span>Created {createdAt}</span>
            {note.updatedAt !== note.createdAt && (
              <>
                <span className="text-muted-foreground/50">•</span>
                <span>Updated {updatedAt}</span>
              </>
            )}
          </div>
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={handleTogglePin}>
          <PinIcon className="mr-2 h-4 w-4" />
          {note.pinned ? 'Unpin' : 'Pin'}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onClick={handleDelete}>
          <TrashIcon className="mr-2 h-4 w-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
