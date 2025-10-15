import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { Plate, usePlateEditor } from 'platejs/react'
import type { Value } from 'platejs'
import type { TElement, TText } from 'platejs'
import { EditorKit } from '@/components/editor/editor-kit'
import { Editor, EditorContainer } from '@/components/ui/editor'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Pin, PinOff, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Note } from '@/services/notes'
import { useUpdateNote, useDeleteNote, useNotes } from '@/services/notes'
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

function parseNoteContent(note: Note): Value {
  if (!note.content) {
    return [
      { 
        type: 'h1', 
        children: [{ text: note.title || '' }],
        id: 'title-block'
      },
      { 
        type: 'p', 
        children: [{ text: '' }] 
      }
    ] as Value
  }

  try {
    const parsed = JSON.parse(note.content)
    if (Array.isArray(parsed)) {
      // Check if first block is title
      const hasTitle = parsed[0]?.id === 'title-block'
      if (!hasTitle) {
        return [
          { 
            type: 'h1', 
            children: [{ text: note.title || '' }],
            id: 'title-block'
          },
          ...parsed
        ] as Value
      }
      return parsed as Value
    }
  } catch {
    // Parse failed, create new structure
  }

  return [
    { 
      type: 'h1', 
      children: [{ text: note.title || '' }],
      id: 'title-block'
    },
    { 
      type: 'p', 
      children: [{ text: typeof note.content === 'string' ? note.content : '' }] 
    }
  ] as Value
}

export function NoteEditor({ note, boardId, onBack }: NoteEditorProps) {
  const [content, setContent] = useState<Value>(() => parseNoteContent(note))
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const previousNoteIdRef = useRef(note.id)
  const saveTimeoutRef = useRef<NodeJS.Timeout>()
  const lastSavedContentRef = useRef<string>('')
  const lastSavedTitleRef = useRef<string>('')

  const updateNote = useUpdateNote(boardId)
  const deleteNote = useDeleteNote(boardId)
  const { data: notes = [] } = useNotes(boardId)

  const currentNote = notes.find(n => n.id === note.id) || note

  const editor = usePlateEditor({
    plugins: EditorKit,
    value: content,
  })

  // Extract title from first block - optimized with memoization
  const getTitleFromContent = useCallback((editorContent: Value) => {
    const titleBlock = editorContent.find((block: TElement | TText) => {
      return 'id' in block && block.id === 'title-block'
    }) as TElement | undefined
    
    if (titleBlock?.children) {
      return titleBlock.children
        .map((child: TElement | TText) => ('text' in child ? child.text : ''))
        .join('')
    }
    return ''
  }, [])

  // Optimized save function with early exit and debouncing
  const saveContent = useCallback((editorContent: Value, forceSave = false) => {
    const contentStr = JSON.stringify(editorContent)
    const title = getTitleFromContent(editorContent) || 'Untitled'

    // Early exit if nothing has changed (unless force save is true)
    if (!forceSave && contentStr === lastSavedContentRef.current && 
        title === lastSavedTitleRef.current) {
      console.log('Save skipped: content unchanged')
      return
    }

    console.log('Saving note:', { title, contentLength: contentStr.length })

    // Update refs immediately to prevent duplicate saves
    lastSavedContentRef.current = contentStr
    lastSavedTitleRef.current = title

    updateNote.mutate(
      { 
        id: note.id, 
        boardId, 
        content: contentStr,
        title
      },
      {
        onSuccess: () => {
          console.log('Note saved successfully')
        },
        onError: error => {
          console.error('Failed to save note:', error)
          toast.error('Failed to save note', {
            description:
              error instanceof Error ? error.message : 'Unknown error',
          })
        },
      }
    )
  }, [note.id, boardId, updateNote, getTitleFromContent])

  // Watch for editor changes with optimized debouncing
  useEffect(() => {
    if (!editor) return

    const handleChange = () => {
      const newValue = editor.children as Value
      setContent(newValue)

      // Clear previous timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      // Debounce save with 500ms (balanced performance)
      saveTimeoutRef.current = setTimeout(() => {
        saveContent(newValue)
      }, 500)
    }

    editor.onChange = handleChange

    return () => {
      editor.onChange = undefined
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = undefined
      }
    }
  }, [editor, saveContent])

  // Initialize saved state and reset when switching notes
  useEffect(() => {
    if (previousNoteIdRef.current === note.id) {
      return
    }

    previousNoteIdRef.current = note.id
    const newContent = parseNoteContent(note)
    setContent(newContent)
    
    // Initialize saved refs - force first save
    const initialContentStr = JSON.stringify(newContent)
    const initialTitle = getTitleFromContent(newContent) || 'Untitled'
    
    // Set refs but don't prevent initial save
    lastSavedContentRef.current = ''
    lastSavedTitleRef.current = ''
    
    // Initial save after component mounts
    setTimeout(() => {
      saveContent(newContent, true)
    }, 100)
  }, [note, getTitleFromContent, saveContent])

  const handleTogglePin = useCallback(() => {
    updateNote.mutate(
      { id: note.id, boardId, pinned: !currentNote.pinned },
      {
        onSuccess: () => {
          toast.success(currentNote.pinned ? 'Note unpinned' : 'Note pinned')
        },
      }
    )
  }, [note.id, boardId, currentNote.pinned, updateNote])

  const handleDelete = useCallback(() => {
    deleteNote.mutate(
      { id: note.id },
      {
        onSuccess: () => {
          onBack()
        },
      }
    )
  }, [note.id, deleteNote, onBack])

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-8 w-8"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleTogglePin}
            className={cn('h-8 w-8', currentNote.pinned && 'text-primary')}
            title={currentNote.pinned ? 'Unpin note' : 'Pin note'}
          >
            {currentNote.pinned ? (
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

      {/* Editor with integrated title */}
      <div className="flex-1 overflow-auto px-6">
        <Plate editor={editor}>
          <EditorContainer className="notion-editor-style">
            <Editor 
              placeholder="Untitled"
              className="focus:outline-none"
            />
          </EditorContainer>
        </Plate>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this note? This action cannot be
              undone.
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
