import { invoke } from '@tauri-apps/api/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { DEFAULT_COLUMN_ICON } from '@/constants/kanban-columns'
import {
  createBoardSchema,
  createCardSchema,
  createColumnSchema,
  createSubtaskSchema,
  createTagSchema,
  deleteBoardSchema,
  deleteCardSchema,
  deleteColumnSchema,
  deleteSubtaskSchema,
  deleteTagSchema,
  moveCardSchema,
  moveColumnSchema,
  renameBoardSchema,
  updateBoardIconSchema,
  updateCardSchema,
  updateCardTagsSchema,
  updateColumnSchema,
  updateSubtaskSchema,
  updateTagSchema,
  type CreateBoardInput,
  type CreateCardInput,
  type CreateColumnInput,
  type CreateSubtaskInput,
  type CreateTagInput,
  type DeleteBoardInput,
  type DeleteCardInput,
  type DeleteColumnInput,
  type DeleteSubtaskInput,
  type DeleteTagInput,
  type MoveCardInput,
  type MoveColumnInput,
  type RenameBoardInput,
  type UpdateBoardIconInput,
  type UpdateCardInput,
  type UpdateCardTagsInput,
  type UpdateColumnInput,
  type UpdateSubtaskInput,
  type UpdateTagInput,
} from '@/schemas/kanban'
import type {
  KanbanAttachment,
  KanbanBoard,
  KanbanCard,
  KanbanColumn,
  KanbanSubtask,
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
  subtasks: (cardId: string) =>
    [...kanbanQueryKeys.boards(), 'subtasks', cardId] as const,
  attachments: (cardId: string) =>
    [...kanbanQueryKeys.boards(), 'attachments', cardId] as const,
}

export async function fetchBoards(): Promise<KanbanBoard[]> {
  return invoke<KanbanBoard[]>('load_boards')
}

export async function fetchTags(boardId: string): Promise<KanbanTag[]> {
  return invoke<KanbanTag[]>('load_tags', { boardId })
}

export async function createBoard(input: CreateBoardInput): Promise<void> {
  const payload = createBoardSchema.parse(input)

  // Tauri v2 uses camelCase for command parameters by default
  await invoke('create_board', {
    args: {
      id: payload.id,
      workspaceId: payload.workspaceId,
      title: payload.title,
      description: payload.description ?? null,
      icon: payload.icon ?? 'Folder',
      emoji: payload.emoji ?? null,
      color: payload.color ?? null,
    },
  })
}

export async function renameBoard(input: RenameBoardInput): Promise<void> {
  const payload = renameBoardSchema.parse(input)

  await invoke('rename_board', {
    id: payload.id,
    title: payload.title,
    description: payload.description ?? null,
  })
}

export async function deleteBoard(input: DeleteBoardInput): Promise<void> {
  const payload = deleteBoardSchema.parse(input)

  await invoke('delete_board', {
    id: payload.id,
  })
}

export async function updateBoardIcon(
  input: UpdateBoardIconInput
): Promise<void> {
  const payload = updateBoardIconSchema.parse(input)

  await invoke('update_board_icon', {
    id: payload.id,
    icon: payload.icon,
  })
}

export async function createTag(input: CreateTagInput): Promise<KanbanTag> {
  const payload = createTagSchema.parse(input)

  return invoke<KanbanTag>('create_tag', {
    args: {
      id: payload.id,
      boardId: payload.boardId,
      label: payload.label,
      color: payload.color ?? null,
    },
  })
}

export async function updateTag(input: UpdateTagInput): Promise<KanbanTag> {
  const payload = updateTagSchema.parse(input)

  const args = {
    id: payload.id,
    boardId: payload.boardId,
    ...(payload.label !== undefined ? { label: payload.label } : {}),
    ...(payload.color !== undefined ? { color: payload.color ?? null } : {}),
  }

  return invoke<KanbanTag>('update_tag', { args })
}

export async function deleteTag(input: DeleteTagInput): Promise<void> {
  const payload = deleteTagSchema.parse(input)

  await invoke('delete_tag', {
    args: {
      id: payload.id,
      boardId: payload.boardId,
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
          // Update timestamp to ensure fresh data
          moving.updatedAt = new Date().toISOString()

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
    onSuccess: async () => {
      // Refetch em background para obter o estado real do servidor
      await queryClient.refetchQueries({
        queryKey: kanbanQueryKeys.cards(boardId),
      })
    },
    onError: (_error, _variables, context) => {
      if (context?.previousCards) {
        queryClient.setQueryData(
          kanbanQueryKeys.cards(boardId),
          context.previousCards
        )
      }
      // Invalida em caso de erro para recarregar
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

export async function listCardAttachments(input: {
  boardId: string
  cardId: string
}): Promise<KanbanAttachment[]> {
  return invoke<KanbanAttachment[]>('list_card_attachments', {
    boardId: input.boardId,
    cardId: input.cardId,
  })
}

export async function restoreAttachmentVersion(input: {
  boardId: string
  cardId: string
  attachmentId: string
  version?: number
}): Promise<KanbanAttachment> {
  return invoke<KanbanAttachment>('restore_attachment_version', {
    boardId: input.boardId,
    cardId: input.cardId,
    attachmentId: input.attachmentId,
    targetVersion: input.version ?? null,
  })
}

export async function deleteAttachmentVersion(input: {
  boardId: string
  cardId: string
  attachmentId: string
  version?: number
}): Promise<void> {
  await invoke('delete_attachment_version', {
    boardId: input.boardId,
    cardId: input.cardId,
    attachmentId: input.attachmentId,
    targetVersion: input.version ?? null,
  })
}

interface AttachmentMutationContext {
  previousCards?: KanbanCard[]
  previousAttachments?: KanbanAttachment[] | undefined
}

interface AttachmentMutationVariables {
  attachmentId: string
  version?: number
}

export function useRestoreAttachment(boardId: string, cardId: string) {
  const queryClient = useQueryClient()
  const cardsKey = kanbanQueryKeys.cards(boardId)
  const attachmentsKey = kanbanQueryKeys.attachments(cardId)

  return useMutation<
    KanbanAttachment,
    unknown,
    AttachmentMutationVariables,
    AttachmentMutationContext
  >({
    mutationFn: variables =>
      restoreAttachmentVersion({
        boardId,
        cardId,
        attachmentId: variables.attachmentId,
        version: variables.version,
      }),
    onMutate: async variables => {
      await queryClient.cancelQueries({ queryKey: cardsKey })
      await queryClient.cancelQueries({ queryKey: attachmentsKey })

      const previousCards = queryClient.getQueryData<KanbanCard[]>(cardsKey)
      const previousAttachments =
        queryClient.getQueryData<KanbanAttachment[]>(attachmentsKey)

      if (previousCards) {
        const updatedCards = previousCards.map(card => {
          if (card.id !== cardId) {
            return card
          }

          const attachments: KanbanAttachment[] = card.attachments
            ? [...card.attachments]
            : []
          const index = attachments.findIndex(att => {
            const versionMatches =
              variables.version === undefined ||
              att.version === variables.version
            return att.id === variables.attachmentId && versionMatches
          })

          if (index !== -1) {
            const restored = attachments.splice(index, 1)[0]
            if (restored) {
              attachments.unshift(restored)
            }
          }

          return {
            ...card,
            attachments,
          }
        })

        queryClient.setQueryData(cardsKey, updatedCards)
      }

      if (previousAttachments) {
        const reordered = [...previousAttachments]
        const index = reordered.findIndex(att => {
          const versionMatches =
            variables.version === undefined || att.version === variables.version
          return att.id === variables.attachmentId && versionMatches
        })
        if (index !== -1) {
          const restored = reordered.splice(index, 1)[0]
          if (restored) {
            reordered.unshift(restored)
            queryClient.setQueryData(attachmentsKey, reordered)
          }
        }
      }

      return { previousCards, previousAttachments }
    },
    onError: (_error, _variables, context) => {
      if (context?.previousCards) {
        queryClient.setQueryData(cardsKey, context.previousCards)
      }
      if (context?.previousAttachments) {
        queryClient.setQueryData(attachmentsKey, context.previousAttachments)
      }
    },
    onSuccess: data => {
      queryClient.setQueryData<KanbanCard[]>(cardsKey, current => {
        if (!current) {
          return current
        }

        return current.map(card => {
          if (card.id !== cardId) {
            return card
          }

          const attachments: KanbanAttachment[] = card.attachments
            ? [...card.attachments]
            : []
          const existingIndex = attachments.findIndex(
            att => att.id === data.id && att.version === data.version
          )

          if (existingIndex !== -1) {
            attachments[existingIndex] = data
            const restored = attachments.splice(existingIndex, 1)[0]
            if (restored) {
              attachments.unshift(restored)
            }
          } else {
            attachments.unshift(data)
          }

          return {
            ...card,
            attachments,
          }
        })
      })

      queryClient.setQueryData<KanbanAttachment[]>(attachmentsKey, current => {
        if (!current) {
          return [data]
        }

        const next = [...current]
        const existingIndex = next.findIndex(
          att => att.id === data.id && att.version === data.version
        )
        if (existingIndex !== -1) {
          next[existingIndex] = data
          const restored = next.splice(existingIndex, 1)[0]
          if (restored) {
            next.unshift(restored)
          }
          return next
        }

        next.unshift(data)
        return next
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: cardsKey })
      queryClient.invalidateQueries({ queryKey: attachmentsKey })
    },
  })
}

export function useDeleteAttachment(boardId: string, cardId: string) {
  const queryClient = useQueryClient()
  const cardsKey = kanbanQueryKeys.cards(boardId)
  const attachmentsKey = kanbanQueryKeys.attachments(cardId)

  return useMutation<
    unknown,
    unknown,
    AttachmentMutationVariables,
    AttachmentMutationContext
  >({
    mutationFn: async variables => {
      await deleteAttachmentVersion({
        boardId,
        cardId,
        attachmentId: variables.attachmentId,
        version: variables.version,
      })
    },
    onMutate: async variables => {
      await queryClient.cancelQueries({ queryKey: cardsKey })
      await queryClient.cancelQueries({ queryKey: attachmentsKey })

      const previousCards = queryClient.getQueryData<KanbanCard[]>(cardsKey)
      const previousAttachments =
        queryClient.getQueryData<KanbanAttachment[]>(attachmentsKey)

      if (previousCards) {
        const updatedCards = previousCards.map(card => {
          if (card.id !== cardId) {
            return card
          }

          const filtered = (card.attachments ?? []).filter(att => {
            const sameAttachment = att.id === variables.attachmentId
            if (!sameAttachment) {
              return true
            }

            if (variables.version === undefined) {
              return false
            }

            return att.version !== variables.version
          })

          return {
            ...card,
            attachments: filtered,
          }
        })

        queryClient.setQueryData(cardsKey, updatedCards)
      }

      if (previousAttachments) {
        const filtered = previousAttachments.filter(att => {
          const sameAttachment = att.id === variables.attachmentId
          if (!sameAttachment) {
            return true
          }

          if (variables.version === undefined) {
            return false
          }

          return att.version !== variables.version
        })

        queryClient.setQueryData(attachmentsKey, filtered)
      }

      return { previousCards, previousAttachments }
    },
    onError: (_error, _variables, context) => {
      if (context?.previousCards) {
        queryClient.setQueryData(cardsKey, context.previousCards)
      }
      if (context?.previousAttachments) {
        queryClient.setQueryData(attachmentsKey, context.previousAttachments)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: cardsKey })
      queryClient.invalidateQueries({ queryKey: attachmentsKey })
    },
  })
}

export async function createColumn(input: CreateColumnInput): Promise<void> {
  const payload = createColumnSchema.parse(input)
  const isEnabled = payload.isEnabled ?? true

  const args = {
    id: payload.id,
    boardId: payload.boardId,
    title: payload.title,
    position: payload.position,
    wipLimit: payload.wipLimit ?? null,
    color: payload.color ?? null,
    icon: payload.icon ?? null,
    isEnabled,
  }

  await invoke('create_column', args)
}

export async function updateColumn(input: UpdateColumnInput): Promise<void> {
  const payload = updateColumnSchema.parse(input)

  const args = {
    id: payload.id,
    boardId: payload.boardId,
    ...(payload.title !== undefined ? { title: payload.title } : {}),
    ...(payload.color !== undefined ? { color: payload.color ?? null } : {}),
    ...(payload.icon !== undefined ? { icon: payload.icon ?? null } : {}),
    ...(payload.isEnabled !== undefined
      ? { isEnabled: payload.isEnabled }
      : {}),
  }

  await invoke('update_column', { args })
}

export async function moveColumn(input: MoveColumnInput): Promise<void> {
  const payload = moveColumnSchema.parse(input)

  await invoke('move_column', {
    boardId: payload.boardId,
    columnId: payload.columnId,
    targetIndex: payload.targetIndex,
  })
}

export async function deleteColumn(input: DeleteColumnInput): Promise<void> {
  const payload = deleteColumnSchema.parse(input)

  await invoke('delete_column', {
    id: payload.id,
    boardId: payload.boardId,
  })
}

export async function fetchCards(boardId: string): Promise<KanbanCard[]> {
  return invoke<KanbanCard[]>('load_cards', { boardId })
}

export async function createCard(input: CreateCardInput): Promise<void> {
  const payload = createCardSchema.parse(input)

  await invoke('create_card', {
    ...payload,
    description: payload.description ?? null,
    dueDate: payload.dueDate ?? null,
    remindAt: payload.remindAt ?? null,
    tagIds: payload.tagIds ?? [],
  })
}

export async function createSubtask(
  input: CreateSubtaskInput
): Promise<KanbanSubtask> {
  const payload = createSubtaskSchema.parse(input)

  return invoke<KanbanSubtask>('create_subtask', {
    args: {
      id: payload.id,
      boardId: payload.boardId,
      cardId: payload.cardId,
      title: payload.title,
      position: payload.position ?? null,
    },
  })
}

export async function updateSubtask(
  input: UpdateSubtaskInput
): Promise<KanbanSubtask> {
  const payload = updateSubtaskSchema.parse(input)

  const args = {
    id: payload.id,
    boardId: payload.boardId,
    cardId: payload.cardId,
    ...(payload.title !== undefined ? { title: payload.title } : {}),
    ...(payload.isCompleted !== undefined
      ? { isCompleted: payload.isCompleted }
      : {}),
    ...(payload.targetPosition !== undefined
      ? { targetPosition: payload.targetPosition ?? null }
      : {}),
  }

  return invoke<KanbanSubtask>('update_subtask', { args })
}

export async function deleteSubtask(input: DeleteSubtaskInput): Promise<void> {
  const payload = deleteSubtaskSchema.parse(input)

  await invoke('delete_subtask', {
    args: {
      id: payload.id,
      boardId: payload.boardId,
      cardId: payload.cardId,
    },
  })
}

export function useCreateSubtask(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createSubtask,
    onMutate: async input => {
      const cardsKey = kanbanQueryKeys.cards(boardId)

      await queryClient.cancelQueries({ queryKey: cardsKey })

      const previousCards = queryClient.getQueryData<KanbanCard[]>(cardsKey)
      const now = new Date().toISOString()

      if (previousCards) {
        const optimisticSubtask: KanbanSubtask = {
          id: input.id,
          boardId: input.boardId,
          cardId: input.cardId,
          title: input.title,
          isCompleted: false,
          position:
            input.position ??
            previousCards.find(card => card.id === input.cardId)?.subtasks
              .length ??
            0,
          createdAt: now,
          updatedAt: now,
        }

        const next = previousCards.map(card => {
          if (card.id !== input.cardId) {
            return card
          }

          const subtasks = [...card.subtasks]
          const insertAt = Math.max(
            0,
            Math.min(optimisticSubtask.position, subtasks.length)
          )
          subtasks.splice(insertAt, 0, optimisticSubtask)
          const normalized = subtasks.map((subtask, index) => ({
            ...subtask,
            position: index,
          }))

          return {
            ...card,
            subtasks: normalized,
            updatedAt: now,
          }
        })

        queryClient.setQueryData<KanbanCard[]>(cardsKey, next)
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
    onSuccess: (createdSubtask, variables) => {
      const cardsKey = kanbanQueryKeys.cards(boardId)
      queryClient.setQueryData<KanbanCard[]>(cardsKey, cards =>
        cards
          ? cards.map(card =>
              card.id === variables.cardId
                ? {
                    ...card,
                    subtasks: card.subtasks.map(subtask =>
                      subtask.id === createdSubtask.id
                        ? createdSubtask
                        : subtask
                    ),
                  }
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

export function useUpdateSubtask(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateSubtask,
    onMutate: async input => {
      const cardsKey = kanbanQueryKeys.cards(boardId)

      await queryClient.cancelQueries({ queryKey: cardsKey })

      const previousCards = queryClient.getQueryData<KanbanCard[]>(cardsKey)
      const now = new Date().toISOString()

      if (previousCards) {
        const next = previousCards.map(card => {
          if (card.id !== input.cardId) {
            return card
          }

          const subtasks = [...card.subtasks]
          const index = subtasks.findIndex(subtask => subtask.id === input.id)
          if (index === -1) {
            return card
          }

          const original = subtasks[index]
          if (!original) {
            return card
          }

          const updatedSubtask: KanbanSubtask = {
            id: original.id,
            boardId: original.boardId,
            cardId: original.cardId,
            position: original.position,
            createdAt: original.createdAt,
            title: input.title ?? original.title,
            isCompleted:
              input.isCompleted !== undefined
                ? input.isCompleted
                : original.isCompleted,
            updatedAt: now,
          }

          const working = [...subtasks]
          working[index] = updatedSubtask

          let reordered = working

          if (typeof input.targetPosition === 'number') {
            const desiredIndex = Math.max(
              0,
              Math.min(input.targetPosition, working.length - 1)
            )
            reordered = [...working]
            reordered.splice(index, 1)
            reordered.splice(desiredIndex, 0, updatedSubtask)
          }

          const normalized = reordered.map((subtask, position) => ({
            ...subtask,
            position,
          }))

          return {
            ...card,
            subtasks: normalized,
            updatedAt: now,
          }
        })

        queryClient.setQueryData<KanbanCard[]>(cardsKey, next)
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
    onSuccess: (updatedSubtask, variables) => {
      const cardsKey = kanbanQueryKeys.cards(boardId)
      queryClient.setQueryData<KanbanCard[]>(cardsKey, cards =>
        cards
          ? cards.map(card =>
              card.id === variables.cardId
                ? {
                    ...card,
                    subtasks: card.subtasks.map(subtask =>
                      subtask.id === updatedSubtask.id
                        ? updatedSubtask
                        : subtask
                    ),
                  }
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

export function useDeleteSubtask(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteSubtask,
    onMutate: async input => {
      const cardsKey = kanbanQueryKeys.cards(boardId)

      await queryClient.cancelQueries({ queryKey: cardsKey })

      const previousCards = queryClient.getQueryData<KanbanCard[]>(cardsKey)

      if (previousCards) {
        const now = new Date().toISOString()
        const next = previousCards.map(card => {
          if (card.id !== input.cardId) {
            return card
          }

          const remaining = card.subtasks
            .filter(subtask => subtask.id !== input.id)
            .map((subtask, index) => ({
              ...subtask,
              position: index,
            }))

          return {
            ...card,
            subtasks: remaining,
            updatedAt: now,
          }
        })

        queryClient.setQueryData<KanbanCard[]>(cardsKey, next)
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

export async function updateCard(input: UpdateCardInput): Promise<void> {
  const payload = updateCardSchema.parse(input)

  const args = {
    id: payload.id,
    boardId: payload.boardId,
    ...(payload.title !== undefined ? { title: payload.title } : {}),
    ...(payload.description !== undefined
      ? { description: payload.description }
      : {}),
    ...(payload.priority !== undefined ? { priority: payload.priority } : {}),
    ...(payload.dueDate !== undefined ? { dueDate: payload.dueDate } : {}),
    ...(payload.clearDueDate !== undefined
      ? { clearDueDate: payload.clearDueDate }
      : {}),
    ...(payload.remindAt !== undefined ? { remindAt: payload.remindAt } : {}),
    ...(payload.clearRemindAt !== undefined
      ? { clearRemindAt: payload.clearRemindAt }
      : {}),
  }

  console.log('Sending update_card request:', { args })
  await invoke('update_card', { args })
}

export async function deleteCard(input: DeleteCardInput): Promise<void> {
  const payload = deleteCardSchema.parse(input)

  await invoke('delete_card', {
    id: payload.id,
    boardId: payload.boardId,
  })
}

// Use createCard directly - duplicating card is just creating a new card with existing data
// The UI will handle showing it as a "duplicate" operation
export const duplicateCard = createCard

export async function updateCardTags(
  input: UpdateCardTagsInput
): Promise<KanbanTag[]> {
  const payload = updateCardTagsSchema.parse(input)

  return invoke<KanbanTag[]>('set_card_tags', {
    args: {
      cardId: payload.cardId,
      boardId: payload.boardId,
      tagIds: payload.tagIds,
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
        const hasClearDueDate = Object.hasOwn(input, 'clearDueDate')
        const hasRemindAt = Object.hasOwn(input, 'remindAt')
        const hasClearRemindAt = Object.hasOwn(input, 'clearRemindAt')

        if (
          hasTitle ||
          hasDescription ||
          hasPriority ||
          hasDueDate ||
          hasClearDueDate ||
          hasRemindAt ||
          hasClearRemindAt
        ) {
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
            if (hasClearDueDate && input.clearDueDate) {
              nextCard.dueDate = null
            } else if (hasDueDate) {
              nextCard.dueDate =
                input.dueDate !== undefined
                  ? (input.dueDate ?? null)
                  : (card.dueDate ?? null)
            }
            if (hasClearRemindAt && input.clearRemindAt) {
              nextCard.remindAt = null
            } else if (hasRemindAt) {
              nextCard.remindAt =
                input.remindAt !== undefined
                  ? (input.remindAt ?? null)
                  : (card.remindAt ?? null)
            }

            nextCard.subtasks = card.subtasks

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

export function useDuplicateCard(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: duplicateCard,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: kanbanQueryKeys.cards(boardId),
      })
    },
  })
}

export async function moveCard(input: MoveCardInput): Promise<void> {
  const payload = moveCardSchema.parse(input)

  await invoke('move_card', {
    boardId: payload.boardId,
    cardId: payload.cardId,
    fromColumnId: payload.fromColumnId,
    toColumnId: payload.toColumnId,
    targetIndex: payload.targetIndex,
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
        emoji: input.emoji ?? null,
        color: input.color ?? null,
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

export function useDeleteColumn(boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteColumn,
    onMutate: async input => {
      const columnsKey = kanbanQueryKeys.columns(boardId)
      const cardsKey = kanbanQueryKeys.cards(boardId)

      await queryClient.cancelQueries({ queryKey: columnsKey })
      await queryClient.cancelQueries({ queryKey: cardsKey })

      const previousColumns =
        queryClient.getQueryData<KanbanColumn[]>(columnsKey)
      const previousCards = queryClient.getQueryData<KanbanCard[]>(cardsKey)

      if (previousColumns) {
        const updatedColumns = previousColumns.filter(
          column => column.id !== input.id
        )
        queryClient.setQueryData<KanbanColumn[]>(columnsKey, updatedColumns)
      }

      return { previousColumns, previousCards }
    },
    onError: (_error, _variables, context) => {
      if (context?.previousColumns) {
        queryClient.setQueryData(
          kanbanQueryKeys.columns(boardId),
          context.previousColumns
        )
      }
      if (context?.previousCards) {
        queryClient.setQueryData(
          kanbanQueryKeys.cards(boardId),
          context.previousCards
        )
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: kanbanQueryKeys.columns(boardId),
      })
      queryClient.invalidateQueries({
        queryKey: kanbanQueryKeys.cards(boardId),
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
        subtasks: [],
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
