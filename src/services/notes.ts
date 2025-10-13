import { invoke } from '@tauri-apps/api/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export interface Note {
  id: string
  boardId: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
  archivedAt?: string | null
  pinned: boolean
  tags: string[]
}

export interface CreateNoteInput {
  id: string
  boardId: string
  title: string
  content?: string
}

export interface UpdateNoteInput {
  id: string
  boardId: string
  title?: string
  content?: string
  pinned?: boolean
}

// ============================================================================
// API Functions
// ============================================================================

export async function loadNotes(boardId: string): Promise<Note[]> {
  return await invoke('load_notes', { boardId })
}

export async function createNote(input: CreateNoteInput): Promise<Note> {
  return await invoke('create_note', {
    args: {
      id: input.id,
      board_id: input.boardId,
      title: input.title,
      content: input.content,
    },
  })
}

export async function updateNote(input: UpdateNoteInput): Promise<void> {
  await invoke('update_note', {
    args: {
      id: input.id,
      board_id: input.boardId,
      title: input.title,
      content: input.content,
      pinned: input.pinned,
    },
  })
}

export async function deleteNote(id: string, boardId: string): Promise<void> {
  await invoke('delete_note', { id, boardId })
}

export async function archiveNote(id: string, boardId: string): Promise<void> {
  await invoke('archive_note', { id, boardId })
}

// ============================================================================
// React Query Hooks
// ============================================================================

export function useNotes(boardId: string) {
  return useQuery({
    queryKey: ['notes', boardId],
    queryFn: () => loadNotes(boardId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useCreateNote(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createNote,
    onMutate: async newNote => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['notes', boardId] })

      // Snapshot previous value
      const previousNotes = queryClient.getQueryData<Note[]>(['notes', boardId])

      // Optimistically update
      queryClient.setQueryData<Note[]>(['notes', boardId], (old = []) => [
        {
          id: newNote.id,
          boardId: newNote.boardId,
          title: newNote.title,
          content: newNote.content || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          pinned: false,
          tags: [],
        },
        ...old,
      ])

      return { previousNotes }
    },
    onError: (error, _newNote, context) => {
      // Rollback on error
      if (context?.previousNotes) {
        queryClient.setQueryData(['notes', boardId], context.previousNotes)
      }
      toast.error('Failed to create note', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', boardId] })
    },
  })
}

export function useUpdateNote(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateNote,
    onMutate: async updatedNote => {
      await queryClient.cancelQueries({ queryKey: ['notes', boardId] })

      const previousNotes = queryClient.getQueryData<Note[]>(['notes', boardId])

      queryClient.setQueryData<Note[]>(['notes', boardId], (old = []) =>
        old.map(note =>
          note.id === updatedNote.id
            ? {
                ...note,
                ...(updatedNote.title !== undefined && {
                  title: updatedNote.title,
                }),
                ...(updatedNote.content !== undefined && {
                  content: updatedNote.content,
                }),
                ...(updatedNote.pinned !== undefined && {
                  pinned: updatedNote.pinned,
                }),
                updatedAt: new Date().toISOString(),
              }
            : note
        )
      )

      return { previousNotes }
    },
    onError: (error, _updatedNote, context) => {
      if (context?.previousNotes) {
        queryClient.setQueryData(['notes', boardId], context.previousNotes)
      }
      toast.error('Failed to update note', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', boardId] })
      // Removed toast to avoid noise during auto-save
    },
  })
}

export function useDeleteNote(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id }: { id: string }) => deleteNote(id, boardId),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ['notes', boardId] })

      const previousNotes = queryClient.getQueryData<Note[]>(['notes', boardId])

      queryClient.setQueryData<Note[]>(['notes', boardId], (old = []) =>
        old.filter(note => note.id !== id)
      )

      return { previousNotes }
    },
    onError: (error, _variables, context) => {
      if (context?.previousNotes) {
        queryClient.setQueryData(['notes', boardId], context.previousNotes)
      }
      toast.error('Failed to delete note', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', boardId] })
      toast.success('Note deleted')
    },
  })
}

export function useArchiveNote(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id }: { id: string }) => archiveNote(id, boardId),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ['notes', boardId] })

      const previousNotes = queryClient.getQueryData<Note[]>(['notes', boardId])

      queryClient.setQueryData<Note[]>(['notes', boardId], (old = []) =>
        old.filter(note => note.id !== id)
      )

      return { previousNotes }
    },
    onError: (error, _variables, context) => {
      if (context?.previousNotes) {
        queryClient.setQueryData(['notes', boardId], context.previousNotes)
      }
      toast.error('Failed to archive note', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', boardId] })
      toast.success('Note archived')
    },
  })
}
