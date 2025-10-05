import { invoke } from '@tauri-apps/api/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type {
  KanbanBoard,
  KanbanCard,
  KanbanColumn,
} from '@/types/common'

const KANBAN_DB_KEY = 'kanban'

export const kanbanQueryKeys = {
  all: [KANBAN_DB_KEY] as const,
  boards: () => [...kanbanQueryKeys.all, 'boards'] as const,
  columns: (boardId: string) => [...kanbanQueryKeys.boards(), 'columns', boardId] as const,
  cards: (boardId: string) => [...kanbanQueryKeys.boards(), 'cards', boardId] as const,
}

export async function fetchBoards(): Promise<KanbanBoard[]> {
  return invoke<KanbanBoard[]>('load_boards')
}

export interface CreateBoardInput {
  id: string
  title: string
  description?: string
}

export async function createBoard(input: CreateBoardInput): Promise<void> {
  await invoke('create_board', {
    ...input,
    description: input.description ?? null,
  })
}

export async function fetchColumns(boardId: string): Promise<KanbanColumn[]> {
  return invoke<KanbanColumn[]>('load_columns', { boardId })
}

export interface CreateColumnInput {
  id: string
  boardId: string
  title: string
  position: number
  wipLimit?: number | null
}

export async function createColumn(input: CreateColumnInput): Promise<void> {
  await invoke('create_column', {
    ...input,
    wipLimit: input.wipLimit ?? null,
  })
}

export async function fetchCards(boardId: string): Promise<KanbanCard[]> {
  return invoke<KanbanCard[]>('load_cards', { boardId })
}

export interface CreateCardInput {
  id: string
  boardId: string
  columnId: string
  title: string
  description?: string
  position: number
  priority: KanbanCard['priority']
  dueDate?: string | null
}

export async function createCard(input: CreateCardInput): Promise<void> {
  await invoke('create_card', {
    ...input,
    description: input.description ?? null,
    dueDate: input.dueDate ?? null,
  })
}

export function useBoards() {
  return useQuery({
    queryKey: kanbanQueryKeys.boards(),
    queryFn: fetchBoards,
  })
}

export function useCreateBoard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createBoard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kanbanQueryKeys.boards() })
    },
  })
}

export function useColumns(boardId: string) {
  return useQuery({
    queryKey: kanbanQueryKeys.columns(boardId),
    queryFn: () => fetchColumns(boardId),
    enabled: Boolean(boardId),
  })
}

export function useCreateColumn(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createColumn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kanbanQueryKeys.columns(boardId) })
      queryClient.invalidateQueries({ queryKey: kanbanQueryKeys.boards() })
    },
  })
}

export function useCards(boardId: string) {
  return useQuery({
    queryKey: kanbanQueryKeys.cards(boardId),
    queryFn: () => fetchCards(boardId),
    enabled: Boolean(boardId),
  })
}

export function useCreateCard(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kanbanQueryKeys.cards(boardId) })
      queryClient.invalidateQueries({ queryKey: kanbanQueryKeys.columns(boardId) })
    },
  })
}
