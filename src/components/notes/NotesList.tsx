import { Pin, Calendar, Trash2 } from 'lucide-react'
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

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const pinnedNotes = filteredNotes.filter(note => note.pinned)
  const unpinnedNotes = filteredNotes.filter(note => !note.pinned)

  return (
    <div className="flex h-full flex-col">
      {/* Notes List */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading notes...</div>
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
                  <Pin className="h-3.5 w-3.5" />
                  Pinned Notes
                </div>
                <div className="space-y-2">
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
                <div className="space-y-2">
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
  // Extract plain text from content for preview, excluding title block
  const getPreviewText = (content: string): string => {
    try {
      const parsed = JSON.parse(content)
      const extractText = (nodes: unknown[]): string => {
        return nodes
          .map((node: unknown) => {
            const n = node as {
              text?: string
              children?: unknown[]
              id?: string
            }
            // Skip title block to avoid duplicating content
            if (n.id === 'title-block') return ''
            if (n.text) return n.text
            if (n.children) return extractText(n.children)
            return ''
          })
          .join(' ')
          .replace(/\s+/g, ' ') // Normalize whitespace
      }
      const text = extractText(parsed).trim()
      return text || 'No content'
    } catch {
      // For old format content, return as-is
      return content || 'No content'
    }
  }

  const preview = getPreviewText(note.content)
  const updatedAt = formatDistanceToNow(new Date(note.updatedAt), {
    addSuffix: true,
  })
  const createdAt = formatDistanceToNow(new Date(note.createdAt), {
    addSuffix: true,
  })

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
            {note.pinned && (
              <Pin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-3 mb-3 flex-1">
            {preview}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
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
          <Pin className="mr-2 h-4 w-4" />
          {note.pinned ? 'Unpin' : 'Pin'}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onClick={handleDelete}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
