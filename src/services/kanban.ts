import { invoke } from '@tauri-apps/api/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { KanbanBoard, KanbanCard, KanbanColumn } from '@/types/common'

const KANBAN_DB_KEY = 'kanban'

export const kanbanQueryKeys = {
  all: [KANBAN_DB_KEY] as const,
  boards: () => [...kanbanQueryKeys.all, 'boards'] as const,
  columns: (boardId: string) =>
    [...kanbanQueryKeys.boards(), 'columns', boardId] as const,
  cards: (boardId: string) =>
    [...kanbanQueryKeys.boards(), 'cards', boardId] as const,
}

export async function fetchBoards(): Promise<KanbanBoard[]> {
  return invoke<KanbanBoard[]>('load_boards')
}

export interface CreateBoardInput {
  id: string
  title: string
  description?: string
  icon?: string
}

export async function createBoard(input: CreateBoardInput): Promise<void> {
  await invoke('create_board', {
    ...input,
    description: input.description ?? null,
    icon: input.icon ?? 'Folder',
  })
}

export interface RenameBoardInput {
  id: string
  title: string
  description?: string
}

export async function renameBoard(input: RenameBoardInput): Promise<void> {
  await invoke('rename_board', {
    id: input.id,
    title: input.title,
    description: input.description ?? null,
  })
}

export interface DeleteBoardInput {
  id: string
}

export async function deleteBoard(input: DeleteBoardInput): Promise<void> {
  await invoke('delete_board', {
    id: input.id,
  })
}

export interface UpdateBoardIconInput {
  id: string
  icon: string
}

export async function updateBoardIcon(
  input: UpdateBoardIconInput
): Promise<void> {
  await invoke('update_board_icon', {
    id: input.id,
    icon: input.icon,
  })
}

export function useMoveColumn(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: moveColumn,
    onMutate: async input => {
      const columnsKey = kanbanQueryKeys.columns(boardId)

      await queryClient.cancelQueries({ queryKey: columnsKey })

      const previousColumns =
        queryClient.getQueryData<KanbanColumn[]>(columnsKey)

      if (previousColumns) {
        const fromIndex = previousColumns.findIndex(
          c => c.id === input.columnId
        )
        if (fromIndex !== -1) {
          const updated = [...previousColumns]
          const [moved] = updated.splice(fromIndex, 1)
          if (!moved) {
            return { previousColumns }
          }
          const target = Math.max(
            0,
            Math.min(input.targetIndex, updated.length)
          )
          updated.splice(target, 0, moved)

          // Recalculate positions to reflect new order
          const withPositions = updated.map((c, idx) => ({
            ...c,
            position: idx,
          }))
          queryClient.setQueryData<KanbanColumn[]>(columnsKey, withPositions)
        }
      }

      return { previousColumns }
    },
    onError: (_error, _variables, context) => {
      if (context?.previousColumns) {
        queryClient.setQueryData(
          kanbanQueryKeys.columns(boardId),
          context.previousColumns
        )
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: kanbanQueryKeys.columns(boardId),
      })
      queryClient.invalidateQueries({ queryKey: kanbanQueryKeys.boards() })
    },
  })
}

export function useRenameBoard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: renameBoard,
    onMutate: async input => {
      await queryClient.cancelQueries({ queryKey: kanbanQueryKeys.boards() })

      const previousBoards = queryClient.getQueryData<KanbanBoard[]>(
        kanbanQueryKeys.boards()
      )

      if (previousBoards) {
        const now = new Date().toISOString()
        queryClient.setQueryData<KanbanBoard[]>(
          kanbanQueryKeys.boards(),
          boards =>
            boards
              ? boards.map(board =>
                  board.id === input.id
                    ? {
                        ...board,
                        title: input.title,
                        description: input.description ?? null,
                        updatedAt: now,
                      }
                    : board
                )
              : boards
        )
      }

      return { previousBoards }
    },
    onError: (_error, _variables, context) => {
      if (context?.previousBoards) {
        queryClient.setQueryData(
          kanbanQueryKeys.boards(),
          context.previousBoards
        )
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: kanbanQueryKeys.boards() })
    },
  })
}

export function useDeleteBoard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteBoard,
    onMutate: async input => {
      await queryClient.cancelQueries({ queryKey: kanbanQueryKeys.boards() })

      const previousBoards = queryClient.getQueryData<KanbanBoard[]>(
        kanbanQueryKeys.boards()
      )

      if (previousBoards) {
        queryClient.setQueryData<KanbanBoard[]>(
          kanbanQueryKeys.boards(),
          boards =>
            boards ? boards.filter(board => board.id !== input.id) : boards
        )
      }

      return { previousBoards }
    },
    onError: (_error, _variables, context) => {
      if (context?.previousBoards) {
        queryClient.setQueryData(
          kanbanQueryKeys.boards(),
          context.previousBoards
        )
      }
    },
    onSettled: (_result, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: kanbanQueryKeys.boards() })
      if (variables?.id) {
        queryClient.removeQueries({
          queryKey: kanbanQueryKeys.columns(variables.id),
        })
        queryClient.removeQueries({
          queryKey: kanbanQueryKeys.cards(variables.id),
        })
      }
    },
  })
}

export function useMoveCard(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: moveCard,
    onMutate: async input => {
      const cardsKey = kanbanQueryKeys.cards(boardId)

      await queryClient.cancelQueries({ queryKey: cardsKey })

      const previousCards = queryClient.getQueryData<KanbanCard[]>(cardsKey)

      if (previousCards) {
        const updated = [...previousCards]
        const movingIndex = updated.findIndex(c => c.id === input.cardId)
        if (movingIndex !== -1) {
          const [moving] = updated.splice(movingIndex, 1)
          if (!moving) {
            return { previousCards }
          }

          const sameColumn = input.fromColumnId === input.toColumnId

          // Update columnId to destination
          moving.columnId = input.toColumnId

          const fromList = updated
            .filter(c => c.columnId === input.fromColumnId)
            .sort((a, b) => a.position - b.position)
          const toList = sameColumn
            ? [...fromList]
            : updated
                .filter(c => c.columnId === input.toColumnId)
                .sort((a, b) => a.position - b.position)

          const target = Math.max(0, Math.min(input.targetIndex, toList.length))
          toList.splice(target, 0, moving)

          const normalizePositions = (list: KanbanCard[]) =>
            list.map((c, idx) => ({ ...c, position: idx + 1 }))

          let next: KanbanCard[]

          if (sameColumn) {
            const normalized = normalizePositions(toList)
            const remaining = updated.filter(
              c => c.columnId !== input.fromColumnId
            )
            next = remaining.concat(normalized)
          } else {
            const normalizedFrom = normalizePositions(fromList)
            const normalizedTo = normalizePositions(toList)
            const remaining = updated.filter(
              c =>
                c.columnId !== input.fromColumnId &&
                c.columnId !== input.toColumnId
            )
            next = remaining.concat(normalizedFrom, normalizedTo)
          }

          queryClient.setQueryData<KanbanCard[]>(cardsKey, next)
        }
      }

      return { previousCards }
    },
    onError: (_error, _variables, context) => {
      if (context?.previousCards) {
        queryClient.setQueryData(
          kanbanQueryKeys.cards(boardId),
          context.previousCards
        )
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: kanbanQueryKeys.cards(boardId),
      })
      queryClient.invalidateQueries({
        queryKey: kanbanQueryKeys.columns(boardId),
      })
    },
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

export interface MoveColumnInput {
  boardId: string
  columnId: string
  targetIndex: number
}

export async function moveColumn(input: MoveColumnInput): Promise<void> {
  await invoke('move_column', {
    boardId: input.boardId,
    columnId: input.columnId,
    targetIndex: input.targetIndex,
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

export interface MoveCardInput {
  boardId: string
  cardId: string
  fromColumnId: string
  toColumnId: string
  targetIndex: number
}

export async function moveCard(input: MoveCardInput): Promise<void> {
  await invoke('move_card', {
    boardId: input.boardId,
    cardId: input.cardId,
    fromColumnId: input.fromColumnId,
    toColumnId: input.toColumnId,
    targetIndex: input.targetIndex,
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
    onMutate: async input => {
      await queryClient.cancelQueries({ queryKey: kanbanQueryKeys.boards() })

      const previousBoards = queryClient.getQueryData<KanbanBoard[]>(
        kanbanQueryKeys.boards()
      )

      const now = new Date().toISOString()
      const optimisticBoard: KanbanBoard = {
        id: input.id,
        title: input.title,
        description: input.description ?? null,
        icon: input.icon ?? 'Folder',
        createdAt: now,
        updatedAt: now,
        archivedAt: null,
      }

      queryClient.setQueryData<KanbanBoard[]>(
        kanbanQueryKeys.boards(),
        oldBoards =>
          oldBoards ? [...oldBoards, optimisticBoard] : [optimisticBoard]
      )

      return { previousBoards }
    },
    onError: (_error, _variables, context) => {
      if (context?.previousBoards) {
        queryClient.setQueryData(
          kanbanQueryKeys.boards(),
          context.previousBoards
        )
      }
    },
    onSettled: () => {
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
    onMutate: async input => {
      const columnsKey = kanbanQueryKeys.columns(boardId)

      await queryClient.cancelQueries({ queryKey: columnsKey })

      const previousColumns =
        queryClient.getQueryData<KanbanColumn[]>(columnsKey)

      const now = new Date().toISOString()
      const optimisticColumn: KanbanColumn = {
        id: input.id,
        boardId: input.boardId,
        title: input.title,
        position: input.position,
        wipLimit: input.wipLimit ?? null,
        createdAt: now,
        updatedAt: now,
        archivedAt: null,
      }

      queryClient.setQueryData<KanbanColumn[]>(columnsKey, old =>
        old ? [...old, optimisticColumn] : [optimisticColumn]
      )

      return { previousColumns }
    },
    onError: (_error, _variables, context) => {
      if (context?.previousColumns) {
        queryClient.setQueryData(
          kanbanQueryKeys.columns(boardId),
          context.previousColumns
        )
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: kanbanQueryKeys.columns(boardId),
      })
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
    onMutate: async input => {
      const cardsKey = kanbanQueryKeys.cards(boardId)

      await queryClient.cancelQueries({ queryKey: cardsKey })

      const previousCards = queryClient.getQueryData<KanbanCard[]>(cardsKey)

      const now = new Date().toISOString()
      const optimisticCard: KanbanCard = {
        id: input.id,
        boardId: input.boardId,
        columnId: input.columnId,
        title: input.title,
        description: input.description ?? null,
        position: input.position,
        priority: input.priority,
        dueDate: input.dueDate ?? null,
        tags: [],
        createdAt: now,
        updatedAt: now,
        archivedAt: null,
      }

      queryClient.setQueryData<KanbanCard[]>(cardsKey, old =>
        old ? [...old, optimisticCard] : [optimisticCard]
      )

      return { previousCards }
    },
    onError: (_error, _variables, context) => {
      if (context?.previousCards) {
        queryClient.setQueryData(
          kanbanQueryKeys.cards(boardId),
          context.previousCards
        )
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: kanbanQueryKeys.cards(boardId),
      })
      queryClient.invalidateQueries({
        queryKey: kanbanQueryKeys.columns(boardId),
      })
    },
  })
}

export function useUpdateBoardIcon() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateBoardIcon,
    onMutate: async input => {
      await queryClient.cancelQueries({ queryKey: kanbanQueryKeys.boards() })

      const previousBoards = queryClient.getQueryData<KanbanBoard[]>(
        kanbanQueryKeys.boards()
      )

      if (previousBoards) {
        const now = new Date().toISOString()
        queryClient.setQueryData<KanbanBoard[]>(
          kanbanQueryKeys.boards(),
          boards =>
            boards
              ? boards.map(board =>
                  board.id === input.id
                    ? {
                        ...board,
                        icon: input.icon,
                        updatedAt: now,
                      }
                    : board
                )
              : boards
        )
      }

      return { previousBoards }
    },
    onError: (_error, _variables, context) => {
      if (context?.previousBoards) {
        queryClient.setQueryData(
          kanbanQueryKeys.boards(),
          context.previousBoards
        )
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: kanbanQueryKeys.boards() })
    },
  })
}
