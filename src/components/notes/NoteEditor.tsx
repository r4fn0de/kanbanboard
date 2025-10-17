import type { ChangeEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/shadcn'
import '@blocknote/shadcn/style.css'
import type { BlockNoteEditor, PartialBlock } from '@blocknote/core'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ChevronRight, Pin, PinOff, Trash2 } from 'lucide-react'
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
import {
  FormattingToolbarController,
  FormattingToolbar,
  BasicTextStyleButton,
  TextAlignButton,
  LinkToolbarController,
  useComponentsContext,
} from '@blocknote/react'
import { Popover } from '@base-ui-components/react/popover'
import { Tooltip } from '@base-ui-components/react/tooltip'


const LINK_FEATURE_ENABLED = false


function useLinkEditorState(editor: BlockNoteEditor, onRequestClose?: () => void) {
  const editorRef = useRef(editor)
  const [url, setUrl] = useState('')
  const [hasExistingLink, setHasExistingLink] = useState(false)

  const updateLinkState = useCallback(() => {
    const currentUrl = editorRef.current.getSelectedLinkUrl?.() ?? ''
    setUrl(currentUrl)
    setHasExistingLink(Boolean(currentUrl))
  }, [])

  useEffect(() => {
    updateLinkState()

    const unsubscribe = editorRef.current.onSelectionChange?.(updateLinkState)

    return () => {
      unsubscribe?.()
    }
  }, [updateLinkState])

  const applyLink = useCallback(() => {
    const trimmedUrl = url.trim()
    if (!trimmedUrl) {
      return
    }

    try {
      editorRef.current.focus()
      editorRef.current.createLink(trimmedUrl)
      setHasExistingLink(true)
      setUrl(trimmedUrl)
      onRequestClose?.()
      updateLinkState()
    } catch (error) {
      console.error('Error editing link:', error)
    }
  }, [url, onRequestClose, updateLinkState])

  const removeLink = useCallback(() => {
    try {
      editorRef.current.focus()
      editorRef.current.createLink('')
      setHasExistingLink(false)
      setUrl('')
      onRequestClose?.()
      updateLinkState()
    } catch (error) {
      console.error('Error removing link:', error)
    }
  }, [onRequestClose, updateLinkState])

  return {
    url,
    setUrl,
    hasExistingLink,
    applyLink,
    removeLink,
    refresh: updateLinkState,
  }
}


function LinkEditorForm({
  editor,
  onRequestClose,
  openForCreateOnNoLink = false,
}: {
  editor: BlockNoteEditor
  onRequestClose?: () => void
  openForCreateOnNoLink?: boolean
}) {
  const { url, setUrl, hasExistingLink, applyLink, removeLink, refresh } = useLinkEditorState(editor, onRequestClose)
  const [isEditing, setIsEditing] = useState(() => !hasExistingLink && openForCreateOnNoLink)

  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (hasExistingLink) {
      setIsEditing(false)
    } else {
      setIsEditing(openForCreateOnNoLink)
    }
  }, [hasExistingLink, openForCreateOnNoLink])

  useEffect(() => {
    if (!hasExistingLink && !openForCreateOnNoLink) {
      onRequestClose?.()
    }
  }, [hasExistingLink, openForCreateOnNoLink, onRequestClose])

  useEffect(() => {
    if (!copied) return
    const timeout = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timeout)
  }, [copied])

  if (!isEditing && hasExistingLink && url) {
    const handleCopy = () => {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(url).then(() => setCopied(true)).catch(() => setCopied(false))
      }
    }

    return (
      <div className="flex min-w-[260px] items-center gap-2 rounded-md bg-card px-3 py-2 shadow-lg">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-foreground">
            🌐
          </span>
          <span className="truncate text-foreground" title={url}>{url || 'No link'}</span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted"
            title={copied ? 'Copied!' : 'Copy link'}
          >
            {copied ? '✓' : '⧉'}
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted"
            title="Edit link"
          >
            ✏️
          </button>
          <button
            type="button"
            onClick={removeLink}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-destructive transition-colors hover:bg-destructive/10"
            title="Remove link"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  if (!isEditing && !openForCreateOnNoLink) {
    return null
  }

  return (
    <form
      className="flex min-w-[260px] items-center gap-2 rounded-md bg-card px-3 py-2 shadow-lg"
      onSubmit={event => {
        event.preventDefault()
        applyLink()
        setIsEditing(false)
        refresh()
      }}
    >
      <input
        type="url"
        value={url}
        onChange={event => setUrl(event.target.value)}
        placeholder="Enter or paste a link"
        className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        autoFocus
      />
      <button
        type="submit"
        disabled={!url.trim()}
        className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        title={hasExistingLink ? 'Update link' : 'Add link'}
      >
        ✓
      </button>
    </form>
  )
}


const CustomLinkToolbar: React.FC<{ editor: BlockNoteEditor; onRequestClose?: () => void }> = LINK_FEATURE_ENABLED
  ? ({ editor, onRequestClose }) => {
      const Components = useComponentsContext()
      const LinkToolbarRoot = Components?.LinkToolbar?.Root

      if (!LinkToolbarRoot) {
        return null
      }

      return (
        <LinkToolbarRoot className="bg-transparent border-none shadow-none p-0">
          <LinkEditorForm editor={editor} onRequestClose={onRequestClose} openForCreateOnNoLink={false} />
        </LinkToolbarRoot>
      )
    }
  : () => null


const BLOCK_TYPE_OPTIONS = [
  { label: 'Paragraph', type: 'paragraph', icon: 'P' },
  { label: 'Heading 1', type: 'heading', level: 1, icon: 'H1' },
  { label: 'Heading 2', type: 'heading', level: 2, icon: 'H2' },
  { label: 'Heading 3', type: 'heading', level: 3, icon: 'H3' },
  { label: 'Heading 4', type: 'heading', level: 4, icon: 'H4' },
  { label: 'Heading 5', type: 'heading', level: 5, icon: 'H5' },
  { label: 'Heading 6', type: 'heading', level: 6, icon: 'H6' },
  { label: 'Toggle Heading 1', type: 'heading', level: 1, toggle: true, icon: 'TH1' },
  { label: 'Toggle Heading 2', type: 'heading', level: 2, toggle: true, icon: 'TH2' },
  { label: 'Toggle Heading 3', type: 'heading', level: 3, toggle: true, icon: 'TH3' },
  { label: 'Quote', type: 'quote', icon: '"' },
  { label: 'Toggle List', type: 'toggleListItem', icon: '▶' },
  { label: 'Bullet List', type: 'bulletListItem', icon: '•' },
  { label: 'Numbered List', type: 'numberedListItem', icon: '1.' },
  { label: 'Check List', type: 'checkListItem', icon: '☐' },
]


const COLOR_PRESETS = {
  basic: ['black', 'gray', 'brown'],
  colors: ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'],
}


function ToolbarButtonWithTooltip({ children, tooltip }: { children: React.ReactNode; tooltip: string }) {
  return (
    <Tooltip.Root delay={0} closeDelay={0}>
      <Tooltip.Trigger data-baseui-tooltip-trigger>
        {children}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner side="top" align="center">
          <Tooltip.Popup className="bg-popover text-popover-foreground border border-border rounded-md px-2 py-1 text-sm shadow-md" data-baseui-tooltip-popup>
            {tooltip}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}


function CustomBlockTypeButton({ editor }: { editor: BlockNoteEditor }) {
  const Components = useComponentsContext()

  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const unsubscribe = editor.onSelectionChange?.(() => {
      setIsOpen(false)
    })

    return () => {
      unsubscribe?.()
    }
  }, [editor])

  const handleBlockTypeSelect = (option: typeof BLOCK_TYPE_OPTIONS[0]) => {
    console.log('Selecting block type:', option);

    const currentBlock = editor.getTextCursorPosition().block;

    switch (option.type) {
      case 'heading':
        editor.updateBlock(currentBlock, {
          type: 'heading',
          props: { level: option.level }
        });
        break;
      case 'quote':
        editor.updateBlock(currentBlock, {
          type: 'quote'
        });
        break;
      case 'bulletListItem':
        editor.updateBlock(currentBlock, {
          type: 'bulletListItem'
        });
        break;
      case 'numberedListItem':
        editor.updateBlock(currentBlock, {
          type: 'numberedListItem'
        });
        break;
      case 'toggleListItem':
        editor.updateBlock(currentBlock, {
          type: 'toggleListItem'
        });
        break;
      default:
        editor.updateBlock(currentBlock, {
          type: 'paragraph'
        });
    }

    setIsOpen(false);
  }

  const getCurrentBlockType = () => {
    try {
      const block = editor.getTextCursorPosition().block;
      if (block.type === 'heading') {
        return `H${block.props?.level || 1}`;
      }
      return block.type.charAt(0).toUpperCase() + block.type.slice(1);
    } catch {
      return 'P';
    }
  }

  if (!Components?.FormattingToolbar?.Button) {
    return null
  }

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger>
        <Components.FormattingToolbar.Button
          mainTooltip="Block Type"
        >
          <span className="text-xs font-mono tracking-wide">{getCurrentBlockType()}</span>
        </Components.FormattingToolbar.Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start">
          <Popover.Popup className="bg-popover border border-border rounded-xl shadow-xl py-3 min-w-[220px] max-h-[320px] overflow-y-auto">
            <div className="px-3 pb-2">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground/70">Select block style</p>
            </div>
            <div className="space-y-0.5">
              {BLOCK_TYPE_OPTIONS.map((option, index) => (
                <button
                  key={`${option.type}-${option.level || 0}-${index}`}
                  onClick={() => handleBlockTypeSelect(option)}
                  className="group w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-all hover:bg-muted/50 dark:hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  title={option.label}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background text-xs font-mono text-muted-foreground transition-colors group-hover:border-primary/60 group-hover:text-primary dark:group-hover:border-primary/40">
                    {option.icon}
                  </span>
                  <span className="flex-1 truncate font-medium text-foreground transition-colors group-hover:text-primary">
                    {option.label}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/60 transition-colors group-hover:text-primary" />
                </button>
              ))}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}


const CustomLinkButton: React.FC<{ editor: BlockNoteEditor }> = LINK_FEATURE_ENABLED
  ? ({ editor }) => {
      const Components = useComponentsContext()
      const [isOpen, setIsOpen] = useState(false)

      if (!Components?.FormattingToolbar?.Button) {
        return null
      }

      return (
        <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
          <Popover.Trigger>
            <Components.FormattingToolbar.Button
              onClick={() => setIsOpen(true)}
              mainTooltip="Insert Link"
              isSelected={Boolean(editor.getSelectedLinkUrl?.())}
            >
              <span className="text-sm font-medium">Link</span>
            </Components.FormattingToolbar.Button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner side="top" align="center">
              <Popover.Popup className="bg-transparent border-none shadow-none p-0">
                <LinkEditorForm
                  editor={editor}
                  onRequestClose={() => setIsOpen(false)}
                  openForCreateOnNoLink
                />
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      )
    }
  : () => null


function CustomColorButton({ editor }: { editor: BlockNoteEditor }) {
  const Components = useComponentsContext()

  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const unsubscribe = editor.onSelectionChange?.(() => {
      setIsOpen(false)
    })

    return () => {
      unsubscribe?.()
    }
  }, [editor])

  const handleTextColorSelect = (color: string) => {
    editor.toggleStyles({ textColor: color });
    setIsOpen(false);
  }

  const handleBackgroundColorSelect = (color: string) => {
    editor.toggleStyles({ backgroundColor: color });
    setIsOpen(false);
  }

  const currentTextColor = editor.getActiveStyles().textColor
  const currentBackgroundColor = editor.getActiveStyles().backgroundColor

  if (!Components?.FormattingToolbar?.Button) {
    return null
  }

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger>
        <Components.FormattingToolbar.Button
          mainTooltip="Colors"
          isSelected={!!currentTextColor || !!currentBackgroundColor}
        >
          <div className="flex items-center gap-1">
            <span>A</span>
            <div
              className="w-3 h-3 rounded border border-border"
              style={{
                backgroundColor: currentTextColor || '#000',
                borderColor: currentTextColor ? '#ccc' : '#999',
              }}
            />
          </div>
        </Components.FormattingToolbar.Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start">
          <Popover.Popup className="bg-card border border-border rounded-md shadow-lg p-3 min-w-[200px]">
            <div className="space-y-3">
              {/* Text Colors */}
              <div>
                <div className="text-xs text-muted-foreground mb-2">Text</div>
                <div className="grid grid-cols-5 gap-1">
                  {[...COLOR_PRESETS.basic, ...COLOR_PRESETS.colors].map((color: string) => (
                    <button
                      key={`text-${color}`}
                      onClick={() => handleTextColorSelect(color)}
                      className={cn(
                        "w-6 h-6 rounded border-2 hover:scale-110 transition-transform",
                        currentTextColor === color
                          ? "border-primary ring-1 ring-primary/20"
                          : "border-transparent hover:border-border"
                      )}
                      style={{ backgroundColor: color }}
                      title={`Text: ${color}`}
                    />
                  ))}
                </div>
              </div>

              {/* Background Colors */}
              <div>
                <div className="text-xs text-muted-foreground mb-2">Background</div>
                <div className="grid grid-cols-5 gap-1">
                  {[...COLOR_PRESETS.basic, ...COLOR_PRESETS.colors].map((color: string) => (
                    <button
                      key={`bg-${color}`}
                      onClick={() => handleBackgroundColorSelect(color)}
                      className={cn(
                        "w-6 h-6 rounded border-2 hover:scale-110 transition-transform",
                        currentBackgroundColor === color
                          ? "border-primary ring-1 ring-primary/20"
                          : "border-transparent hover:border-border"
                      )}
                      style={{ backgroundColor: color }}
                      title={`Background: ${color}`}
                    />
                  ))}
                </div>
              </div>

              {/* Clear Colors */}
              <div className="flex gap-2 pt-2 border-t border-border">
                <button
                  onClick={() => {
                    editor.toggleStyles({ textColor: undefined })
                    editor.toggleStyles({ backgroundColor: undefined })
                  }}
                  className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
                >
                  Clear colors
                </button>
              </div>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}


interface NoteEditorProps {
  note: Note
  boardId: string
  onBack: () => void
}


interface TextContentItem {
  type: 'text'
  text: string
}


function isTextContentItem(item: unknown): item is TextContentItem {
  return (
    typeof item === 'object' &&
    item !== null &&
    'type' in item &&
    (item as { type: unknown }).type === 'text' &&
    'text' in item &&
    typeof (item as { text: unknown }).text === 'string'
  )
}


function extractTextFromContent(content: unknown): string {
  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .map(item => (isTextContentItem(item) ? item.text : ''))
      .join('')
  }

  return ''
}


function getTitleFromBlocks(blocks: PartialBlock[]): string {
  if (!blocks || blocks.length === 0) {
    return 'Untitled'
  }

  const firstBlock = blocks[0]

  // Verifica se é um heading
  if (firstBlock?.type === 'heading' && firstBlock.content) {
    const headingText = extractTextFromContent(firstBlock.content)
    if (headingText) {
      return headingText
    }
  }

  // Fallback para paragraph ou qualquer outro tipo
  if (firstBlock?.content) {
    const blockText = extractTextFromContent(firstBlock.content)
    if (blockText) {
      return blockText
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
  }, [editor, note.id, note.content]) // Recarrega quando muda a nota

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

  const horizontalPaddingStyle = useMemo(() => ({
    paddingLeft: '6rem',
    paddingRight: '6rem',
  }), [])

  const contentContainerStyle = useMemo(() => ({
    maxWidth: '720px',
    margin: '0 auto',
  }), [])

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between py-4" style={horizontalPaddingStyle}>
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
      <div className="flex-1 overflow-auto" style={horizontalPaddingStyle}>
        <div className="w-full" style={contentContainerStyle}>
          <textarea
            value={titleDraft}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            placeholder="Untitled note"
            className="w-full resize-none bg-transparent text-3xl font-semibold text-foreground outline-none py-2"
            rows={1}
            style={{
              lineHeight: '1.2',
              minHeight: '3rem',
            }}
          />
          <div className="pb-4">
            <BlockNoteView
              editor={editor}
              theme={resolvedEditorTheme}
              className="blocknote-view"
              formattingToolbar={false}
              linkToolbar={false}
            >
              <FormattingToolbarController
                formattingToolbar={() => (
                  <FormattingToolbar>
                    <CustomBlockTypeButton key="customBlockTypeButton" editor={editor} />
                    <ToolbarButtonWithTooltip tooltip="Bold (Ctrl+B)">
                      <BasicTextStyleButton basicTextStyle="bold" key="boldStyleButton" />
                    </ToolbarButtonWithTooltip>
                    <ToolbarButtonWithTooltip tooltip="Italic (Ctrl+I)">
                      <BasicTextStyleButton basicTextStyle="italic" key="italicStyleButton" />
                    </ToolbarButtonWithTooltip>
                    <ToolbarButtonWithTooltip tooltip="Underline (Ctrl+U)">
                      <BasicTextStyleButton basicTextStyle="underline" key="underlineStyleButton" />
                    </ToolbarButtonWithTooltip>
                    <ToolbarButtonWithTooltip tooltip="Strikethrough">
                      <BasicTextStyleButton basicTextStyle="strike" key="strikeStyleButton" />
                    </ToolbarButtonWithTooltip>
                    <CustomColorButton key="customColorButton" editor={editor} />
                    <CustomLinkButton key="customLinkButton" editor={editor} />
                    <ToolbarButtonWithTooltip tooltip="Align Left">
                      <TextAlignButton textAlignment="left" key="textAlignLeftButton" />
                    </ToolbarButtonWithTooltip>
                    <ToolbarButtonWithTooltip tooltip="Align Center">
                      <TextAlignButton textAlignment="center" key="textAlignCenterButton" />
                    </ToolbarButtonWithTooltip>
                    <ToolbarButtonWithTooltip tooltip="Align Right">
                      <TextAlignButton textAlignment="right" key="textAlignRightButton" />
                    </ToolbarButtonWithTooltip>
                  </FormattingToolbar>
                )}
              />
              <LinkToolbarController
                linkToolbar={() => <CustomLinkToolbar editor={editor} />}
              />
            </BlockNoteView>
          </div>
        </div>
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
