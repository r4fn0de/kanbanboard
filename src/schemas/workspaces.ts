import { z } from 'zod'

const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}){1,2}$/

export const workspaceIdSchema = z
  .string()
  .trim()
  .min(1, 'Workspace id is required')
  .max(200, 'Workspace id is too long')

export const workspaceNameSchema = z
  .string()
  .trim()
  .min(1, 'Workspace name is required')
  .max(200, 'Workspace name is too long')

export const workspaceColorSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine(value => value.length === 0 || HEX_COLOR_REGEX.test(value), {
    message: 'Color must be a valid hex value',
  })

export const createWorkspaceSchema = z.object({
  id: workspaceIdSchema,
  name: workspaceNameSchema,
  color: workspaceColorSchema.nullish(),
  iconPath: z
    .string()
    .trim()
    .max(500, 'Icon path is too long')
    .nullable()
    .optional(),
})

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>

export const updateWorkspaceSchema = z
  .object({
    id: workspaceIdSchema,
    name: workspaceNameSchema.optional(),
    color: workspaceColorSchema.nullish().optional(),
  })
  .refine(data => data.name !== undefined || data.color !== undefined, {
    message: 'At least one field (name or color) must be provided',
    path: ['name'],
  })

export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>
