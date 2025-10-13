import { invoke } from '@tauri-apps/api/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { DEFAULT_COLUMN_ICON } from '@/constants/kanban-columns'
import type {
  KanbanBoard,
  KanbanCard,
  KanbanColumn,
  KanbanTag,
} from '@/types/common'

const KANBAN_DB_KEY = 'kanban'

export const kanbanQueryKeys = {
  all: [KANBAN_DB_KEY] as const,
  boards: () => [...kanbanQueryKeys.all, 'boards'] as const,
  columns: (boardId: string) =>
    [...kanbanQueryKeys.boards(), 'columns', boardId] as const,
  cards: (boardId: string) =>
    [...kanbanQueryKeys.boards(), 'cards', boardId] as const,
  tags: (boardId: string) =>
    [...kanbanQueryKeys.boards(), 'tags', boardId] as const,
}

export async function fetchBoards(): Promise<KanbanBoard[]> {
  return invoke<KanbanBoard[]>('load_boards')
}

export async function fetchTags(boardId: string): Promise<KanbanTag[]> {
  return invoke<KanbanTag[]>('load_tags', { boardId })
}

export interface CreateBoardInput {
  id: string
  workspaceId: string
  title: string
  description?: string
  icon?: string
}

export async function createBoard(input: CreateBoardInput): Promise<void> {
  // Tauri v2 uses camelCase for command parameters by default
  await invoke('create_board', {
    id: input.id,
    workspaceId: input.workspaceId,
    title: input.title,
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

export interface CreateTagInput {
  id: string
  boardId: string
  label: string
  color?: string | null
}

export async function createTag(input: CreateTagInput): Promise<KanbanTag> {
  return invoke<KanbanTag>('create_tag', {
    args: {
      id: input.id,
      boardId: input.boardId,
      label: input.label,
      color: input.color ?? null,
    },
  })
}

export interface UpdateTagInput {
  id: string
  boardId: string
  label?: string
  color?: string | null
}

export async function updateTag(input: UpdateTagInput): Promise<KanbanTag> {
  const payload: Record<string, unknown> = {
    id: input.id,
    boardId: input.boardId,
  }

  if (Object.hasOwn(input, 'label')) {
    payload.label = input.label
  }

  if (Object.hasOwn(input, 'color')) {
    payload.color = input.color ?? null
  }

  return invoke<KanbanTag>('update_tag', { args: payload })
}

export interface DeleteTagInput {
  id: string
  boardId: string
}

export async function deleteTag(input: DeleteTagInput): Promise<void> {
  await invoke('delete_tag', {
    args: {
      id: input.id,
      boardId: input.boardId,
    },
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
  color?: string | null
  icon?: string | null
  isEnabled?: boolean
}

export async function createColumn(input: CreateColumnInput): Promise<void> {
  const isEnabled = input.isEnabled ?? true
  await invoke('create_column', {
    ...input,
    wipLimit: input.wipLimit ?? null,
    color: input.color ?? null,
    icon: input.icon ?? null,
    isEnabled,
  })
}

export interface UpdateColumnInput {
  id: string
  boardId: string
  title?: string
  color?: string | null
  icon?: string | null
  isEnabled?: boolean
}

export async function updateColumn(input: UpdateColumnInput): Promise<void> {
  const payload: Record<string, unknown> = {
    id: input.id,
    boardId: input.boardId,
  }

  if (Object.hasOwn(input, 'title')) {
    payload.title = input.title
  }

  if (Object.hasOwn(input, 'color')) {
    payload.color = input.color ?? null
  }

  if (Object.hasOwn(input, 'icon')) {
    payload.icon = input.icon ?? null
  }

  if (Object.hasOwn(input, 'isEnabled')) {
    payload.isEnabled = input.isEnabled
  }

  if (Object.keys(payload).length <= 2) {
    return
  }

  await invoke('update_column', { args: payload })
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
  tagIds?: string[]
}

export async function createCard(input: CreateCardInput): Promise<void> {
  await invoke('create_card', {
    ...input,
    description: input.description ?? null,
    dueDate: input.dueDate ?? null,
    tagIds: input.tagIds ?? [],
  })
}

export interface UpdateCardInput {
  id: string
  boardId: string
  title?: string
  description?: string | null
  priority?: KanbanCard['priority']
  dueDate?: string | null
}

export async function updateCard(input: UpdateCardInput): Promise<void> {
  const payload: Record<string, unknown> = {
    id: input.id,
    board_id: input.boardId,
  }

  if (Object.hasOwn(input, 'title')) {
    payload.title = input.title
  }
  if (Object.hasOwn(input, 'description')) {
    payload.description = input.description
  }
  if (Object.hasOwn(input, 'priority')) {
    payload.priority = input.priority
  }
  if (Object.hasOwn(input, 'dueDate')) {
    payload.due_date = input.dueDate
  }

  console.log('Sending update_card request:', { args: payload })
  await invoke('update_card', { args: payload })
}

export interface DeleteCardInput {
  id: string
  boardId: string
  columnId: string
}

export async function deleteCard(input: DeleteCardInput): Promise<void> {
  await invoke('delete_card', {
    id: input.id,
    boardId: input.boardId,
  })
}

export interface UpdateCardTagsInput {
  cardId: string
  boardId: string
  tagIds: string[]
}

export async function updateCardTags(
  input: UpdateCardTagsInput
): Promise<KanbanTag[]> {
  return invoke<KanbanTag[]>('set_card_tags', {
    args: {
      cardId: input.cardId,
      boardId: input.boardId,
      tagIds: input.tagIds,
    },
  })
}

export function useUpdateCard(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateCard,
    onMutate: async input => {
      const cardsKey = kanbanQueryKeys.cards(boardId)

      await queryClient.cancelQueries({ queryKey: cardsKey })

      const previousCards = queryClient.getQueryData<KanbanCard[]>(cardsKey)

      if (previousCards) {
        const hasTitle = Object.hasOwn(input, 'title')
        const hasDescription = Object.hasOwn(input, 'description')
        const hasPriority = Object.hasOwn(input, 'priority')
        const hasDueDate = Object.hasOwn(input, 'dueDate')

        if (hasTitle || hasDescription || hasPriority || hasDueDate) {
          const now = new Date().toISOString()
          const updated = previousCards.map(card => {
            if (card.id !== input.id) {
              return card
            }

            const nextCard: KanbanCard = {
              ...card,
              updatedAt: now,
            }

            if (hasTitle) {
              nextCard.title = input.title ?? card.title
            }
            if (hasDescription) {
              nextCard.description =
                input.description !== undefined
                  ? (input.description ?? null)
                  : (card.description ?? null)
            }
            if (hasPriority) {
              nextCard.priority = input.priority ?? card.priority
            }
            if (hasDueDate) {
              nextCard.dueDate =
                input.dueDate !== undefined
                  ? (input.dueDate ?? null)
                  : (card.dueDate ?? null)
            }

            return nextCard
          })

          queryClient.setQueryData<KanbanCard[]>(cardsKey, updated)
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
    },
  })
}

export function useDeleteCard(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteCard,
    onMutate: async input => {
      const cardsKey = kanbanQueryKeys.cards(boardId)

      await queryClient.cancelQueries({ queryKey: cardsKey })

      const previousCards = queryClient.getQueryData<KanbanCard[]>(cardsKey)

      if (previousCards) {
        queryClient.setQueryData<KanbanCard[]>(cardsKey, cards =>
          cards ? cards.filter(card => card.id !== input.id) : cards
        )
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
        workspaceId: input.workspaceId,
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
        color: input.color ?? null,
        icon: input.icon ?? DEFAULT_COLUMN_ICON,
        isEnabled: input.isEnabled ?? true,
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

export function useUpdateColumn(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateColumn,
    onMutate: async input => {
      const columnsKey = kanbanQueryKeys.columns(boardId)

      await queryClient.cancelQueries({ queryKey: columnsKey })

      const previousColumns =
        queryClient.getQueryData<KanbanColumn[]>(columnsKey)

      if (previousColumns) {
        const now = new Date().toISOString()

        const updatedColumns = previousColumns.map(column => {
          if (column.id !== input.id) {
            return column
          }

          const nextColumn: KanbanColumn = {
            ...column,
            updatedAt: now,
          }

          if (Object.hasOwn(input, 'title')) {
            nextColumn.title = input.title ?? column.title
          }

          if (Object.hasOwn(input, 'color')) {
            nextColumn.color = input.color ?? null
          }

          if (Object.hasOwn(input, 'icon')) {
            nextColumn.icon = input.icon ?? DEFAULT_COLUMN_ICON
          }

          if (Object.hasOwn(input, 'isEnabled')) {
            nextColumn.isEnabled = input.isEnabled ?? true
          }

          return nextColumn
        })

        queryClient.setQueryData<KanbanColumn[]>(columnsKey, updatedColumns)
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
      const availableTags =
        queryClient.getQueryData<KanbanTag[]>(kanbanQueryKeys.tags(boardId)) ??
        []
      const selectedTags = (input.tagIds ?? [])
        .map(tagId => availableTags.find(tag => tag.id === tagId))
        .filter((tag): tag is KanbanTag => Boolean(tag))

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
        tags: selectedTags,
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

export function useTags(boardId: string) {
  return useQuery({
    queryKey: kanbanQueryKeys.tags(boardId),
    queryFn: () => fetchTags(boardId),
    enabled: Boolean(boardId),
  })
}

export function useCreateTag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createTag,
    onSuccess: createdTag => {
      queryClient.setQueryData<KanbanTag[]>(
        kanbanQueryKeys.tags(createdTag.boardId),
        tags => (tags ? [...tags, createdTag] : [createdTag])
      )
    },
    onSettled: (_result, _error, variables) => {
      if (variables?.boardId) {
        queryClient.invalidateQueries({
          queryKey: kanbanQueryKeys.tags(variables.boardId),
        })
      }
    },
  })
}

export function useUpdateTag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateTag,
    onSuccess: (updatedTag, variables) => {
      const boardId = updatedTag.boardId
      const tagsKey = kanbanQueryKeys.tags(boardId)
      const cardsKey = kanbanQueryKeys.cards(boardId)

      queryClient.setQueryData<KanbanTag[]>(tagsKey, tags =>
        tags
          ? tags.map(tag => (tag.id === updatedTag.id ? updatedTag : tag))
          : tags
      )

      queryClient.setQueryData<KanbanCard[]>(cardsKey, cards =>
        cards
          ? cards.map(card =>
              card.tags.some(tag => tag.id === updatedTag.id)
                ? {
                    ...card,
                    tags: card.tags.map(tag =>
                      tag.id === updatedTag.id ? updatedTag : tag
                    ),
                  }
                : card
            )
          : cards
      )

      if (variables?.boardId) {
        queryClient.invalidateQueries({ queryKey: tagsKey })
        queryClient.invalidateQueries({ queryKey: cardsKey })
      }
    },
  })
}

export function useDeleteTag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteTag,
    onSuccess: (_result, variables) => {
      const boardId = variables.boardId
      const tagsKey = kanbanQueryKeys.tags(boardId)
      const cardsKey = kanbanQueryKeys.cards(boardId)

      queryClient.setQueryData<KanbanTag[]>(tagsKey, tags =>
        tags ? tags.filter(tag => tag.id !== variables.id) : tags
      )

      queryClient.setQueryData<KanbanCard[]>(cardsKey, cards =>
        cards
          ? cards.map(card =>
              card.tags.some(tag => tag.id === variables.id)
                ? {
                    ...card,
                    tags: card.tags.filter(tag => tag.id !== variables.id),
                  }
                : card
            )
          : cards
      )

      queryClient.invalidateQueries({ queryKey: tagsKey })
      queryClient.invalidateQueries({ queryKey: cardsKey })
    },
  })
}

export function useUpdateCardTags(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateCardTags,
    onMutate: async input => {
      const cardsKey = kanbanQueryKeys.cards(boardId)
      const tagsKey = kanbanQueryKeys.tags(boardId)

      await queryClient.cancelQueries({ queryKey: cardsKey })

      const previousCards = queryClient.getQueryData<KanbanCard[]>(cardsKey)
      const availableTags = queryClient.getQueryData<KanbanTag[]>(tagsKey) ?? []

      if (previousCards) {
        const tagMap = new Map(availableTags.map(tag => [tag.id, tag]))
        const selectedTags = input.tagIds
          .map(tagId => tagMap.get(tagId))
          .filter((tag): tag is KanbanTag => Boolean(tag))
        const now = new Date().toISOString()

        queryClient.setQueryData<KanbanCard[]>(cardsKey, cards =>
          cards
            ? cards.map(card =>
                card.id === input.cardId
                  ? { ...card, tags: selectedTags, updatedAt: now }
                  : card
              )
            : cards
        )
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
    onSuccess: (updatedTags, variables) => {
      const cardsKey = kanbanQueryKeys.cards(boardId)
      queryClient.setQueryData<KanbanCard[]>(cardsKey, cards =>
        cards
          ? cards.map(card =>
              card.id === variables.cardId
                ? { ...card, tags: updatedTags }
                : card
            )
          : cards
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: kanbanQueryKeys.cards(boardId),
      })
    },
  })
}
