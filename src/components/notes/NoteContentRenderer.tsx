import { useEffect, useMemo, useState } from 'react'
import { BlockNoteView } from '@blocknote/shadcn'
import { ChevronDown, ChevronUp } from 'lucide-react'
import '@blocknote/shadcn/style.css'
import type { BlockNoteEditor } from '@blocknote/core'
import { useCreateBlockNote } from '@blocknote/react'
import { useTheme } from '@/hooks/use-theme'
import { cn } from '@/lib/utils'

interface SerializedContentItem {
  text?: string
}

interface SerializedBlock {
  content?: SerializedContentItem | SerializedContentItem[]
}

interface NoteContentRendererProps {
  content: string
  className?: string
  maxHeight?: string
  expanded?: boolean
  onToggleExpanded?: (expanded: boolean) => void
  id?: string
}

export function NoteContentRenderer({
  content,
  className,
  maxHeight = '200px',
  expanded: controlledExpanded,
  onToggleExpanded,
  id,
}: NoteContentRendererProps) {
  const { theme: currentTheme } = useTheme()
  const [editor, setEditor] = useState<BlockNoteEditor | null>(null)
  const [internalExpanded, setInternalExpanded] = useState(false)
  const [needsTruncation, setNeedsTruncation] = useState(false)

  // Use controlled state if provided, otherwise use internal state
  const expanded =
    controlledExpanded !== undefined ? controlledExpanded : internalExpanded
  const setExpanded = (value: boolean) => {
    if (controlledExpanded !== undefined) {
      onToggleExpanded?.(value)
    } else {
      setInternalExpanded(value)
    }
  }

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

  // Create editor only once
  const createdEditor = useCreateBlockNote()

  useEffect(() => {
    if (createdEditor) {
      setEditor(createdEditor)

      // Load content
      if (content) {
        try {
          const parsed = JSON.parse(content)
          if (Array.isArray(parsed) && parsed.length > 0) {
            createdEditor.replaceBlocks(createdEditor.document, parsed)
          }
        } catch (error) {
          console.error('Failed to load note content for rendering:', error)
        }
      }
    }
  }, [createdEditor, content])

  // Check if content needs truncation based on character count
  useEffect(() => {
    try {
      if (content) {
        const parsed = JSON.parse(content)
        if (Array.isArray(parsed)) {
          // Count total characters in all blocks
          const blocks = parsed as SerializedBlock[]
          const totalChars = blocks.reduce(
            (total: number, block: SerializedBlock) => {
              const blockContent = block.content

              if (Array.isArray(blockContent)) {
                return (
                  total +
                  blockContent.reduce(
                    (blockTotal: number, item: SerializedContentItem) =>
                      blockTotal + (item.text?.length ?? 0),
                    0
                  )
                )
              }

              if (blockContent) {
                return total + (blockContent.text?.length ?? 0)
              }

              return total
            },
            0
          )

          // Truncate if content is longer than ~300 characters
          setNeedsTruncation(totalChars > 300)
        }
      }
    } catch {
      // If parsing fails, use string length as fallback
      setNeedsTruncation(content.length > 300)
    }
  }, [content])

  if (!content || content.trim() === '') {
    return (
      <div className={cn('text-sm text-muted-foreground italic', className)}>
        No content
      </div>
    )
  }

  if (!editor) {
    return (
      <div className={cn('text-sm text-muted-foreground', className)}>
        Loading content...
      </div>
    )
  }

  const toggleId = id ? `expand-toggle-${id}` : undefined

  return (
    <div className={cn('note-content-renderer', className)}>
      <div
        className={cn(
          'note-content-wrapper relative overflow-hidden transition-all duration-300 ease-in-out',
          expanded ? '' : 'max-h-[120px]'
        )}
        style={!expanded ? { maxHeight } : undefined}
      >
        <BlockNoteView
          editor={editor}
          theme={resolvedEditorTheme}
          className="blocknote-view-readonly"
          sideMenu={false}
          formattingToolbar={false}
          linkToolbar={false}
        />

        {/* Gradient overlay when collapsed */}
        {!expanded && needsTruncation && (
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        )}
      </div>

      {/* Show toggle button only if content needs truncation */}
      {needsTruncation && (
        <div className="mt-2 flex justify-center">
          <button
            id={toggleId}
            type="button"
            onClick={() => setExpanded(!expanded)}
            className={cn(
              'inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground',
              'transition-colors duration-200 hover:bg-accent/50 rounded-md px-2 py-1',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
            aria-expanded={expanded}
            aria-controls={id ? `content-${id}` : undefined}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3 w-3" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" />
                Show more
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
