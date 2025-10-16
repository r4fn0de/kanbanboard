import type { ChangeEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/shadcn'
import '@blocknote/shadcn/style.css'
import type { BlockNoteEditor, PartialBlock } from '@blocknote/core'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Pin, PinOff, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Note } from '@/services/notes'
import { useUpdateNote, useDeleteNote, useNotes } from '@/services/notes'
import { toast } from 'sonner'
import { useTheme } from '@/hooks/use-theme'
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

function getTitleFromBlocks(blocks: PartialBlock[]): string {
  if (!blocks || blocks.length === 0) {
    return 'Untitled'
  }

  const firstBlock = blocks[0]

  // Verifica se é um heading
  if (firstBlock?.type === 'heading' && firstBlock.content) {
    if (typeof firstBlock.content === 'string') {
      return firstBlock.content
    }
    if (Array.isArray(firstBlock.content)) {
      return firstBlock.content
        .map((item: any) => (item.type === 'text' ? item.text : ''))
        .join('')
    }
  }

  // Fallback para paragraph ou qualquer outro tipo
  if (firstBlock?.content) {
    if (typeof firstBlock.content === 'string') {
      return firstBlock.content
    }
    if (Array.isArray(firstBlock.content)) {
      return firstBlock.content
        .map((item: any) => (item.type === 'text' ? item.text : ''))
        .join('')
    }
  }

  return 'Untitled'
}

export function NoteEditor({ note, boardId, onBack }: NoteEditorProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [titleDraft, setTitleDraft] = useState(note.title ?? '')
  const previousNoteIdRef = useRef(note.id)
  const saveTimeoutRef = useRef<NodeJS.Timeout>()
  const titleSaveTimeoutRef = useRef<NodeJS.Timeout>()
  const lastSavedContentRef = useRef<string>('')
  const lastSavedTitleRef = useRef<string>('')
  const isLoadingContent = useRef(false)

  const { theme: currentTheme } = useTheme()

  const resolvedEditorTheme = useMemo<'light' | 'dark'>(() => {
    if (currentTheme === 'system') {
      if (typeof document !== 'undefined') {
        return document.documentElement.classList.contains('dark')
          ? 'dark'
          : 'light'
      }
      return 'light'
    }
    return currentTheme === 'dark' ? 'dark' : 'light'
  }, [currentTheme])

  const updateNote = useUpdateNote(boardId)
  const deleteNote = useDeleteNote(boardId)
  const { data: notes = [] } = useNotes(boardId)

  const currentNote = notes.find(n => n.id === note.id) || note

  // Cria o editor vazio - SEM initialContent
  const editor: BlockNoteEditor = useCreateBlockNote()

  // Carregar conteúdo inicial quando o editor estiver pronto
  useEffect(() => {
    if (!editor || isLoadingContent.current) return

    const loadContent = async () => {
      isLoadingContent.current = true

      try {
        if (note.content) {
          const parsed = JSON.parse(note.content)
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Substitui todo o conteúdo do editor
            await editor.replaceBlocks(editor.document, parsed)
          }
        }
      } catch (error) {
        console.error('Failed to load note content:', error)
        // Se falhar, o editor permanece com conteúdo padrão
      } finally {
        isLoadingContent.current = false
      }
    }

    loadContent()
  }, [editor, note.id]) // Recarrega quando muda a nota

  // Optimized save function with early exit and debouncing
  const saveContent = useCallback(
    (
      blocks: PartialBlock[],
      options: { force?: boolean; overrideTitle?: string } = {}
    ) => {
      // Não salva se estiver carregando conteúdo
      if (isLoadingContent.current) return

      const contentStr = JSON.stringify(blocks)
      const derivedTitle = getTitleFromBlocks(blocks)
      const titleToSave = options.overrideTitle ?? derivedTitle

      // Early exit if nothing has changed (unless force save is true)
      if (
        !options.force &&
        contentStr === lastSavedContentRef.current &&
        titleToSave === lastSavedTitleRef.current
      ) {
        return
      }

      console.log('Saving note:', {
        title: titleToSave,
        contentLength: contentStr.length,
      })

      // Update refs immediately to prevent duplicate saves
      lastSavedContentRef.current = contentStr
      lastSavedTitleRef.current = titleToSave

      updateNote.mutate(
        {
          id: note.id,
          boardId,
          content: contentStr,
          title: titleToSave,
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
    },
    [note.id, boardId, updateNote]
  )

  // Watch for editor changes with optimized debouncing
  useEffect(() => {
    if (!editor) return

    const handleChange = () => {
      const blocks = editor.document

      // Clear previous timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      // Debounce save with 500ms (balanced performance)
      saveTimeoutRef.current = setTimeout(() => {
        saveContent(blocks)
      }, 500)
    }

    // Subscribe to editor changes
    editor.onChange(handleChange)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = undefined
      }
    }
  }, [editor, saveContent])

  // Sync external title changes into local state
  useEffect(() => {
    setTitleDraft(note.title ?? '')
  }, [note.title])

  const handleTitleChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      const value = event.target.value
      setTitleDraft(value)

      if (titleSaveTimeoutRef.current) {
        clearTimeout(titleSaveTimeoutRef.current)
      }

      titleSaveTimeoutRef.current = setTimeout(() => {
        saveContent(editor.document, { force: true, overrideTitle: value })
      }, 400)
    },
    [editor, saveContent]
  )

  const handleTitleBlur = useCallback(() => {
    if (titleSaveTimeoutRef.current) {
      clearTimeout(titleSaveTimeoutRef.current)
      titleSaveTimeoutRef.current = undefined
    }
    saveContent(editor.document, { force: true, overrideTitle: titleDraft })
  }, [editor, saveContent, titleDraft])

  const handleTitleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        handleTitleBlur()
        editor.focus()
      }
    },
    [editor, handleTitleBlur]
  )

  useEffect(() => {
    return () => {
      if (titleSaveTimeoutRef.current) {
        clearTimeout(titleSaveTimeoutRef.current)
      }
    }
  }, [])

  // Reset quando mudar de nota
  useEffect(() => {
    if (previousNoteIdRef.current === note.id) {
      return
    }

    previousNoteIdRef.current = note.id

    // Reset saved refs
    lastSavedContentRef.current = ''
    lastSavedTitleRef.current = ''
  }, [note.id])

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

      {/* Editor */}
      <div className="flex-1 overflow-auto px-6">
        <div className="mx-auto w-full max-w-4xl pb-4">
          <textarea
            value={titleDraft}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            placeholder="Untitled note"
            className="w-full resize-none bg-transparent text-3xl font-semibold text-foreground outline-none"
            rows={1}
            style={{
              lineHeight: '1.2',
              minHeight: '3rem',
            }}
          />
        </div>
        <BlockNoteView
          editor={editor}
          theme={resolvedEditorTheme}
          className="blocknote-view"
        />
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
