import { useEffect, useRef, useState } from 'react'
import { FileText, Folder, StickyNote, Command } from 'lucide-react'
import { SearchIcon } from '@/components/ui/icons'
import { motion, AnimatePresence } from 'framer-motion'
import { useGlobalSearch } from '@/hooks/useGlobalSearch'
import { cn } from '@/lib/utils'

interface GlobalSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const {
    query,
    results,
    isLoading,
    handleSearch,
    handleClose,
    handleSelect,
  } = useGlobalSearch()
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const selectedIndexRef = useRef(0)

  // Sync ref with state
  useEffect(() => {
    selectedIndexRef.current = selectedIndex
  }, [selectedIndex])

  // Reset selected index when results change
  useEffect(() => {
    if (results.length > 0) {
      setSelectedIndex(0)
      selectedIndexRef.current = 0
    }
  }, [results])

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    function onKeyDown(e: KeyboardEvent) {
      // Cmd+K to toggle
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (!open) {
          onOpenChange(true)
        } else {
          handleClose()
          onOpenChange(false)
        }
        return
      }

      // Arrow navigation
      if (results.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          const newIndex = (selectedIndexRef.current + 1) % results.length
          setSelectedIndex(newIndex)
          selectedIndexRef.current = newIndex
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          const newIndex = (selectedIndexRef.current - 1 + results.length) % results.length
          setSelectedIndex(newIndex)
          selectedIndexRef.current = newIndex
        } else if (e.key === 'Enter') {
          e.preventDefault()
          const currentIndex = selectedIndexRef.current
          if (results[currentIndex]) {
            handleSelect(results[currentIndex])
            onOpenChange(false)
          }
        }
      }

      // Escape to close
      if (e.key === 'Escape') {
        e.preventDefault()
        handleClose()
        onOpenChange(false)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, results, handleSelect, handleClose, onOpenChange])

  const getIcon = (type: string) => {
    switch (type) {
      case 'board':
        return <Folder className="h-4 w-4" />
      case 'card':
        return <FileText className="h-4 w-4" />
      case 'note':
        return <StickyNote className="h-4 w-4" />
      default:
        return <SearchIcon className="h-4 w-4" />
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'board':
        return 'Board'
      case 'card':
        return 'Task'
      case 'note':
        return 'Note'
      default:
        return ''
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'board':
        return 'text-blue-500 bg-blue-50 dark:bg-blue-950'
      case 'card':
        return 'text-green-500 bg-green-50 dark:bg-green-950'
      case 'note':
        return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950'
      default:
        return 'text-gray-500 bg-gray-50 dark:bg-gray-950'
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => {
          handleClose()
          onOpenChange(false)
        }}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-2xl z-50"
          >
            <div className="bg-background border rounded-lg shadow-2xl overflow-hidden">
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b">
                <SearchIcon className="h-5 w-5 text-muted-foreground" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search boards, tasks, notes..."
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-sm"
                />
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Command className="h-3 w-3" />
                  <span>K</span>
                </div>
              </div>

              {/* Results */}
              <div className="max-h-96 overflow-y-auto py-2">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  </div>
                ) : query.trim().length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    <SearchIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Start typing to search...</p>
                    <p className="mt-1 text-xs">
                      Search across boards, tasks, and notes
                    </p>
                  </div>
                ) : results.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    <p>No results found for {query}</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {results.map((result, index) => (
                      <motion.button
                        key={`${result.item_type}-${result.id}`}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => handleSelect(result)}
                        className={cn(
                          'w-full px-4 py-3 text-left transition-colors',
                          'flex items-center gap-3',
                          index === selectedIndex
                            ? 'bg-muted font-medium'
                            : 'hover:bg-muted/50'
                        )}
                      >
                        <div
                          className={cn(
                            'p-1.5 rounded',
                            getTypeColor(result.item_type)
                          )}
                        >
                          {getIcon(result.item_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm truncate">
                              {result.title}
                            </p>
                            <span
                              className={cn(
                                'text-xs px-2 py-0.5 rounded flex-shrink-0',
                                getTypeColor(result.item_type)
                              )}
                            >
                              {getTypeLabel(result.item_type)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {result.board_name}
                          </p>
                          {result.description && (
                            <p className="text-xs text-muted-foreground truncate mt-1">
                              {result.description}
                            </p>
                          )}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30 text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-background border text-xs">
                      ↑
                    </kbd>
                    <kbd className="px-1.5 py-0.5 rounded bg-background border text-xs">
                      ↓                    </kbd>
                    to navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-background border text-xs">
                      ↵                    </kbd>
                    to select
                  </span>
                </div>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-background border text-xs">
                    esc                    </kbd>
                  to close
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
