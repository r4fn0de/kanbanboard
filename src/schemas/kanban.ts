import { z } from 'zod'

const entityIdSchema = z.string().trim().min(1, 'Id is required')
const nonEmptyTitleSchema = z.string().trim().min(1, 'Title is required')
const optionalStringSchema = z.string().trim().optional()
const optionalNullableStringSchema = z
  .union([z.string().trim(), z.null()])
  .optional()
const nonNegativeIntSchema = z.number().int().min(0)
const prioritySchema = z.enum(['low', 'medium', 'high'])

export const createBoardSchema = z.object({
  id: entityIdSchema,
  workspaceId: entityIdSchema,
  title: nonEmptyTitleSchema,
  description: optionalStringSchema,
  icon: optionalStringSchema,
  emoji: optionalStringSchema,
  color: optionalStringSchema,
})

export type CreateBoardInput = z.infer<typeof createBoardSchema>

export const renameBoardSchema = z.object({
  id: entityIdSchema,
  title: nonEmptyTitleSchema,
  description: optionalStringSchema,
})

export type RenameBoardInput = z.infer<typeof renameBoardSchema>

export const deleteBoardSchema = z.object({
  id: entityIdSchema,
})

export type DeleteBoardInput = z.infer<typeof deleteBoardSchema>

export const updateBoardIconSchema = z.object({
  id: entityIdSchema,
  icon: nonEmptyTitleSchema,
})

export type UpdateBoardIconInput = z.infer<typeof updateBoardIconSchema>

export const createTagSchema = z.object({
  id: entityIdSchema,
  boardId: entityIdSchema,
  label: nonEmptyTitleSchema,
  color: optionalNullableStringSchema,
})

export type CreateTagInput = z.infer<typeof createTagSchema>

export const updateTagSchema = z
  .object({
    id: entityIdSchema,
    boardId: entityIdSchema,
    label: optionalStringSchema,
    color: optionalNullableStringSchema,
  })
  .refine(
    payload => 'label' in payload || 'color' in payload,
    {
      message: 'At least one field (label or color) must be provided',
      path: ['label'],
    }
  )

export type UpdateTagInput = z.infer<typeof updateTagSchema>

export const deleteTagSchema = z.object({
  id: entityIdSchema,
  boardId: entityIdSchema,
})

export type DeleteTagInput = z.infer<typeof deleteTagSchema>

export const createColumnSchema = z.object({
  id: entityIdSchema,
  boardId: entityIdSchema,
  title: nonEmptyTitleSchema,
  position: nonNegativeIntSchema,
  wipLimit: nonNegativeIntSchema.optional().nullable(),
  color: optionalNullableStringSchema,
  icon: optionalNullableStringSchema,
  isEnabled: z.boolean().optional(),
})

export type CreateColumnInput = z.infer<typeof createColumnSchema>

export const updateColumnSchema = z
  .object({
    id: entityIdSchema,
    boardId: entityIdSchema,
    title: optionalStringSchema,
    color: optionalNullableStringSchema,
    icon: optionalNullableStringSchema,
    isEnabled: z.boolean().optional(),
  })
  .refine(
    payload =>
      'title' in payload ||
      'color' in payload ||
      'icon' in payload ||
      'isEnabled' in payload,
    {
      message: 'At least one field must be provided',
      path: ['title'],
    }
  )

export type UpdateColumnInput = z.infer<typeof updateColumnSchema>

export const moveColumnSchema = z.object({
  boardId: entityIdSchema,
  columnId: entityIdSchema,
  targetIndex: nonNegativeIntSchema,
})

export type MoveColumnInput = z.infer<typeof moveColumnSchema>

export const deleteColumnSchema = z.object({
  id: entityIdSchema,
  boardId: entityIdSchema,
})

export type DeleteColumnInput = z.infer<typeof deleteColumnSchema>

export const createCardSchema = z.object({
  id: entityIdSchema,
  boardId: entityIdSchema,
  columnId: entityIdSchema,
  title: nonEmptyTitleSchema,
  description: optionalNullableStringSchema,
  position: nonNegativeIntSchema,
  priority: prioritySchema,
  dueDate: optionalNullableStringSchema,
  tagIds: z.array(entityIdSchema).optional(),
})

export type CreateCardInput = z.infer<typeof createCardSchema>

export const updateCardSchema = z
  .object({
    id: entityIdSchema,
    boardId: entityIdSchema,
    title: optionalStringSchema,
    description: optionalNullableStringSchema,
    priority: prioritySchema.optional(),
    dueDate: optionalNullableStringSchema,
  })
  .refine(
    payload =>
      'title' in payload ||
      'description' in payload ||
      'priority' in payload ||
      'dueDate' in payload,
    {
      message: 'At least one field must be provided',
      path: ['title'],
    }
  )

export type UpdateCardInput = z.infer<typeof updateCardSchema>

export const deleteCardSchema = z.object({
  id: entityIdSchema,
  boardId: entityIdSchema,
  columnId: entityIdSchema,
})

export type DeleteCardInput = z.infer<typeof deleteCardSchema>

export const updateCardTagsSchema = z.object({
  cardId: entityIdSchema,
  boardId: entityIdSchema,
  tagIds: z.array(entityIdSchema),
})

export type UpdateCardTagsInput = z.infer<typeof updateCardTagsSchema>

export const moveCardSchema = z.object({
  boardId: entityIdSchema,
  cardId: entityIdSchema,
  fromColumnId: entityIdSchema,
  toColumnId: entityIdSchema,
  targetIndex: nonNegativeIntSchema,
})

export type MoveCardInput = z.infer<typeof moveCardSchema>

export const createSubtaskSchema = z.object({
  id: entityIdSchema,
  boardId: entityIdSchema,
  cardId: entityIdSchema,
  title: nonEmptyTitleSchema,
  position: nonNegativeIntSchema.optional(),
})

export type CreateSubtaskInput = z.infer<typeof createSubtaskSchema>

export const updateSubtaskSchema = z
  .object({
    id: entityIdSchema,
    boardId: entityIdSchema,
    cardId: entityIdSchema,
    title: optionalStringSchema,
    isCompleted: z.boolean().optional(),
    targetPosition: nonNegativeIntSchema.optional(),
  })
  .refine(
    payload =>
      'title' in payload ||
      'isCompleted' in payload ||
      'targetPosition' in payload,
    {
      message: 'At least one field must be provided',
      path: ['title'],
    }
  )

export type UpdateSubtaskInput = z.infer<typeof updateSubtaskSchema>

export const deleteSubtaskSchema = z.object({
  id: entityIdSchema,
  boardId: entityIdSchema,
  cardId: entityIdSchema,
})

export type DeleteSubtaskInput = z.infer<typeof deleteSubtaskSchema>
