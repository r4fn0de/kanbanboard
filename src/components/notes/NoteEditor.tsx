import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Plate, usePlateEditor } from 'platejs/react'
import { EditorKit } from '@/components/editor/editor-kit'
import { Editor, EditorContainer } from '@/components/ui/editor'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Pin, PinOff, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Note } from '@/services/notes'
import { useUpdateNote, useDeleteNote } from '@/services/notes'
import { toast } from 'sonner'
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

interface NoteEditorProps {
  note: Note
  boardId: string
  onBack: () => void
}

function createEmptyEditorValue() {
  return [{ type: 'p', children: [{ text: '' }] }]
}

function parseNoteContent(rawContent?: string | null) {
  if (!rawContent) {
    return createEmptyEditorValue()
  }

  try {
    const parsed = JSON.parse(rawContent)
    return Array.isArray(parsed) ? parsed : createEmptyEditorValue()
  } catch {
    return [{ type: 'p', children: [{ text: rawContent }] }]
  }
}

export function NoteEditor({ note, boardId, onBack }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(() => parseNoteContent(note.content))
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isSavingTitle, setIsSavingTitle] = useState(false)
  const previousNoteIdRef = useRef(note.id)

  const updateNote = useUpdateNote(boardId)
  const deleteNote = useDeleteNote(boardId)

  const editor = usePlateEditor({
    plugins: EditorKit,
    value: content,
  })

  // Watch for editor changes and save immediately
  React.useEffect(() => {
    if (!editor) return

    const handleChange = () => {
      const newValue = editor.children
      setContent(newValue)
      
      // Save immediately on every change
      const contentStr = JSON.stringify(newValue)
      updateNote.mutate(
        { id: note.id, boardId, content: contentStr },
        {
          onError: (error) => {
            toast.error('Failed to save note', {
              description: error instanceof Error ? error.message : 'Unknown error',
            })
          },
        }
      )
    }

    // Subscribe to editor changes
    editor.onChange = handleChange

    return () => {
      editor.onChange = undefined
    }
  }, [editor, note.id, boardId, updateNote])

  useEffect(() => {
    if (previousNoteIdRef.current === note.id) {
      return
    }

    previousNoteIdRef.current = note.id
    setTitle(note.title)
    setContent(parseNoteContent(note.content))
    setIsSavingTitle(false)
  }, [note.id, note.title, note.content])

  // Auto-save title changes
  useEffect(() => {
    if (title === note.title) {
      setIsSavingTitle(false)
      return
    }

    setIsSavingTitle(true)
    const timer = setTimeout(() => {
      updateNote.mutate(
        { id: note.id, boardId, title },
        {
          onSettled: () => {
            setIsSavingTitle(false)
          },
        }
      )
    }, 1000)

    return () => {
      clearTimeout(timer)
    }
  }, [title, note.title, note.id, boardId, updateNote])


  const handleTogglePin = useCallback(() => {
    updateNote.mutate(
      { id: note.id, boardId, pinned: !note.pinned },
      {
        onSuccess: () => {
          toast.success(note.pinned ? 'Note unpinned' : 'Note pinned')
        },
      }
    )
  }, [note.id, boardId, note.pinned, updateNote])

  const handleDelete = useCallback(() => {
    deleteNote.mutate({ id: note.id }, {
      onSuccess: () => {
        onBack()
      },
    })
  }, [note.id, deleteNote, onBack])

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            {isSavingTitle && (
              <span className="text-xs text-muted-foreground">Saving...</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleTogglePin}
            className={cn(
              'h-8 w-8',
              note.pinned && 'text-primary'
            )}
            title={note.pinned ? 'Unpin note' : 'Pin note'}
          >
            {note.pinned ? (
              <PinOff className="h-4 w-4" />
            ) : (
              <Pin className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleteDialogOpen(true)}
            className="h-8 w-8 text-destructive hover:text-destructive"
            title="Delete note"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Title Input */}
      <div className="border-b px-6 py-4">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title..."
          className="border-0 text-3xl font-bold focus-visible:ring-0 px-0"
        />
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto px-6">
        <Plate editor={editor}>
          <EditorContainer>
            <Editor placeholder="Start writing..." />
          </EditorContainer>
        </Plate>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{note.title}&rdquo;? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
