import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { NotesList } from './NotesList'
import { NoteEditor } from './NoteEditor'
import { BoardNavbar } from '@/components/kanban/BoardNavbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search } from 'lucide-react'
import { useBoards } from '@/services/kanban'
import { useWorkspaces } from '@/services/workspaces'
import { useCreateNote } from '@/services/notes'
import type { Note } from '@/services/notes'
import { useWorkspaceStore } from '@/store/workspace-store'

export function NotesView() {
  const { boardId } = useParams<{ boardId: string }>()
  const navigate = useNavigate()
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const { data: boards = [] } = useBoards()
  const { data: workspaces = [] } = useWorkspaces()
  const createNote = useCreateNote(boardId || '')
  const setSelectedWorkspaceId = useWorkspaceStore(
    state => state.setSelectedWorkspaceId
  )

  const board = useMemo(
    () => boards.find(item => item.id === boardId),
    [boards, boardId]
  )

  useEffect(() => {
    if (board?.workspaceId) {
      setSelectedWorkspaceId(board.workspaceId)
    }
  }, [board, setSelectedWorkspaceId])

  const handleTabChange = (tab: string) => {
    if (!boardId) {
      return
    }

    if (tab === 'tasks') {
      navigate(`/projects/${boardId}`)
      return
    }

    if (tab === 'whiteboard') {
      navigate(`/projects/${boardId}/whiteboard`)
      return
    }

    if (tab === 'notes') {
      return
    }

    navigate(`/projects/${boardId}`)
  }

  const handleCreateNote = () => {
    if (!boardId) return

    const id = globalThis.crypto?.randomUUID?.() ?? `note-${Date.now()}`
    createNote.mutate(
      {
        id,
        boardId,
        title: 'Untitled Note',
        content: JSON.stringify([{ type: 'p', children: [{ text: '' }] }]),
      },
      {
        onSuccess: newNote => {
          setSelectedNote(newNote)
        },
      }
    )
  }

  if (!boardId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Board not found</p>
      </div>
    )
  }

  // Notes controls for navbar
  const notesControls = !selectedNote ? (
    <>
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search notes..."
          className="h-9 pl-9 border-0 bg-muted/70 text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:border-0"
        />
      </div>
      <Button onClick={handleCreateNote} size="sm" className="gap-2">
        <Plus className="h-4 w-4" />
        New Note
      </Button>
    </>
  ) : null

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden">
      {/* Navbar */}
      <BoardNavbar
        boardTitle={board?.title || 'Notes'}
        boardIcon={board?.icon ?? undefined}
        boardEmoji={board?.emoji ?? undefined}
        boardColor={board?.color ?? undefined}
        workspaceName={
          workspaces.find(ws => ws.id === board?.workspaceId)?.name
        }
        activeTab="notes"
        onTabChange={handleTabChange}
        taskControls={notesControls}
      />

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {selectedNote ? (
          <NoteEditor
            note={selectedNote}
            boardId={boardId}
            onBack={() => setSelectedNote(null)}
          />
        ) : (
          <NotesList
            boardId={boardId}
            onSelectNote={setSelectedNote}
            searchQuery={searchQuery}
          />
        )}
      </div>
    </div>
  )
}
