import React, { useState, useCallback } from 'react'
import { Upload, X, Edit2, Trash2 } from 'lucide-react'
import { open as openDialog } from '@tauri-apps/plugin-dialog'
import { readFile } from '@tauri-apps/plugin-fs'
import { invoke } from '@tauri-apps/api/core'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { ImageCropper } from '@/components/ui/image-cropper'
import { WorkspaceIcon } from '@/components/ui/workspace-icon'
import {
  useWorkspaces,
  useUpdateWorkspace,
  useDeleteWorkspace,
  useUpdateWorkspaceIconMutation,
  useRemoveWorkspaceIconMutation,
} from '@/services/workspaces'
import { useWorkspaceStore } from '@/store/workspace-store'
import { useBoards } from '@/services/kanban'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { ANIMATION } from '@/lib/animation-constants'
import type { Workspace } from '@/types/common'

const PRESET_COLORS = [
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Rose', value: '#F43F5E' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Amber', value: '#F59E0B' },
  { name: 'Emerald', value: '#10B981' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Blue', value: '#3B82F6' },
]

interface DeleteWorkspaceState {
  workspace: Workspace | null
  action: 'delete-all' | 'move-to-other' | null
  targetWorkspaceId: string | null
}

interface WorkspacesPaneProps {
  editingWorkspaceId?: string | null
}

export function WorkspacesPane({
  editingWorkspaceId: propEditingWorkspaceId,
}: WorkspacesPaneProps) {
  const [editingWorkspace, setEditingWorkspace] = useState<string | null>(null)
  const shouldReduceMotion = useReducedMotion()
  const [workspaceName, setWorkspaceName] = useState('')
  const [workspaceColor, setWorkspaceColor] = useState<string | null>(null)
  const [deleteState, setDeleteState] = useState<DeleteWorkspaceState>({
    workspace: null,
    action: null,
    targetWorkspaceId: null,
  })
  const [cropperOpen, setCropperOpen] = useState(false)
  const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null)
  const [currentEditingWorkspaceId, setCurrentEditingWorkspaceId] = useState<
    string | null
  >(null)

  // Queries and mutations
  const { data: workspaces = [] } = useWorkspaces()
  const { data: boards = [] } = useBoards()
  const { mutateAsync: updateWorkspace } = useUpdateWorkspace()
  const { mutateAsync: deleteWorkspace } = useDeleteWorkspace()
  const { mutateAsync: updateWorkspaceIcon } = useUpdateWorkspaceIconMutation()
  const { mutateAsync: removeWorkspaceIcon } = useRemoveWorkspaceIconMutation()
  const { selectedWorkspaceId, setSelectedWorkspaceId } = useWorkspaceStore()

  // Auto-open editing mode if editingWorkspaceId is provided
  React.useEffect(() => {
    if (propEditingWorkspaceId && !editingWorkspace) {
      const workspace = workspaces.find(w => w.id === propEditingWorkspaceId)
      if (workspace) {
        handleEditWorkspace(workspace)
      }
    }
  }, [propEditingWorkspaceId, workspaces, editingWorkspace])

  const handleEditWorkspace = (workspace: Workspace) => {
    setEditingWorkspace(workspace.id)
    setWorkspaceName(workspace.name)
    setWorkspaceColor(workspace.color ?? null)
  }

  const handleSaveWorkspace = async (workspaceId: string) => {
    try {
      await updateWorkspace({
        id: workspaceId,
        name: workspaceName.trim() || undefined,
        color: workspaceColor,
      })
      toast.success('Workspace updated successfully')
      setEditingWorkspace(null)
    } catch (error) {
      toast.error('Failed to update workspace')
      console.error(error)
    }
  }

  const handleCancelEdit = () => {
    setEditingWorkspace(null)
    setWorkspaceName('')
    setWorkspaceColor(null)
  }

  const handleDeleteWorkspace = (workspace: Workspace) => {
    const workspaceBoards = boards.filter(b => b.workspaceId === workspace.id)

    if (workspaceBoards.length === 0) {
      // No projects, can delete immediately
      setDeleteState({
        workspace,
        action: 'delete-all',
        targetWorkspaceId: null,
      })
    } else {
      // Has projects, show options
      setDeleteState({
        workspace,
        action: null,
        targetWorkspaceId: null,
      })
    }
  }

  const confirmDeleteWorkspace = async () => {
    if (!deleteState.workspace) return

    try {
      if (
        deleteState.action === 'move-to-other' &&
        deleteState.targetWorkspaceId
      ) {
        // Move all boards to target workspace
        const workspaceBoards = boards.filter(
          b => b.workspaceId === deleteState.workspace!.id
        )

        for (const board of workspaceBoards) {
          await invoke('update_board_workspace', {
            boardId: board.id,
            workspaceId: deleteState.targetWorkspaceId,
          })
        }
      }

      // Delete the workspace
      await deleteWorkspace(deleteState.workspace.id)

      // Update selected workspace if needed
      if (selectedWorkspaceId === deleteState.workspace.id) {
        const remainingWorkspaces = workspaces.filter(
          w => w.id !== deleteState.workspace!.id
        )
        setSelectedWorkspaceId(remainingWorkspaces[0]?.id ?? null)
      }

      toast.success('Workspace deleted successfully')
      setDeleteState({ workspace: null, action: null, targetWorkspaceId: null })
    } catch (error) {
      toast.error('Failed to delete workspace')
      console.error(error)
    }
  }

  const handleSelectIcon = async (workspaceId: string) => {
    try {
      const selected = await openDialog({
        multiple: false,
        filters: [
          {
            name: 'Images',
            extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'],
          },
        ],
      })

      if (!selected) return

      const filePath = Array.isArray(selected) ? selected[0] : selected
      if (!filePath) return

      const fileBytes = await readFile(filePath)
      const extension = filePath.split('.').pop()?.toLowerCase()
      const mimeTypes: Record<string, string> = {
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        gif: 'image/gif',
        webp: 'image/webp',
        svg: 'image/svg+xml',
        bmp: 'image/bmp',
      }
      const mimeType = mimeTypes[extension ?? ''] ?? 'image/png'

      const blob = new Blob([fileBytes], { type: mimeType })
      const dataUrl = URL.createObjectURL(blob)

      setOriginalImageSrc(dataUrl)
      setCurrentEditingWorkspaceId(workspaceId)
      setCropperOpen(true)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to select image'
      toast.error(message)
    }
  }

  const handleCropComplete = useCallback(
    async (croppedBlob: Blob) => {
      if (!currentEditingWorkspaceId) return

      try {
        const arrayBuffer = await croppedBlob.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)

        const iconPath = await invoke<string>('save_cropped_workspace_icon', {
          workspaceId: currentEditingWorkspaceId,
          imageData: Array.from(uint8Array),
        })

        await updateWorkspaceIcon({
          workspaceId: currentEditingWorkspaceId,
          filePath: iconPath,
        })

        toast.success('Workspace icon updated')
        setCropperOpen(false)
        if (originalImageSrc) {
          URL.revokeObjectURL(originalImageSrc)
        }
        setOriginalImageSrc(null)
        setCurrentEditingWorkspaceId(null)
      } catch (error) {
        toast.error('Failed to update workspace icon')
        console.error(error)
      }
    },
    [currentEditingWorkspaceId, originalImageSrc, updateWorkspaceIcon]
  )

  const handleRemoveIcon = async (workspaceId: string) => {
    try {
      await removeWorkspaceIcon(workspaceId)
      toast.success('Workspace icon removed')
    } catch (error) {
      toast.error('Failed to remove workspace icon')
      console.error(error)
    }
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">Workspaces</h3>
          <p className="text-sm text-muted-foreground">
            Manage your workspaces, customize colors, and organize projects.
          </p>
        </div>

        <div className="space-y-3">
          {workspaces.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No workspaces found. Create one to get started.
            </p>
          ) : (
            workspaces.map(workspace => {
              const workspaceBoards = boards.filter(
                b => b.workspaceId === workspace.id
              )
              const isEditing = editingWorkspace === workspace.id

              return (
                <motion.div
                  key={workspace.id}
                  className="border rounded-lg p-4"
                  layout={!shouldReduceMotion}
                  initial={shouldReduceMotion ? false : { opacity: 0, filter: 'blur(4px)', y: 10 }}
                  animate={shouldReduceMotion ? false : { opacity: 1, filter: 'blur(0px)', y: 0 }}
                  transition={shouldReduceMotion ? { duration: 0 } : {
                    ...ANIMATION.SPRING.SMOOTH,
                    opacity: { duration: ANIMATION.DURATION.FAST },
                    filter: { duration: ANIMATION.DURATION.NORMAL },
                  }}
                >
                  <AnimatePresence mode="wait">
                  {isEditing ? (
                    <motion.div
                      key="edit-mode"
                      className="space-y-4"
                      {...(shouldReduceMotion ? {} : ANIMATION.EDIT_MODE)}
                    >
                      <div className="space-y-2">
                        <Label htmlFor={`name-${workspace.id}`}>
                          Workspace Name
                        </Label>
                        <Input
                          id={`name-${workspace.id}`}
                          value={workspaceName}
                          onChange={e => setWorkspaceName(e.target.value)}
                          placeholder="Workspace name"
                        />
                      </div>

                      {/* Only show color selection if workspace doesn't have a custom icon */}
                      <AnimatePresence>
                      {workspace.iconPath ? (
                        <motion.div
                          className="space-y-3"
                          {...(shouldReduceMotion ? {} : {
                            initial: { opacity: 0, y: -10 },
                            animate: { opacity: 1, y: 0 },
                            exit: { opacity: 0, y: -10 },
                            transition: ANIMATION.SPRING.SMOOTH
                          })}
                        >
                          <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                            💡 Color selection is disabled when using a custom icon. Remove the icon to use colors instead.
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          className="space-y-3"
                          {...(shouldReduceMotion ? {} : {
                            initial: { opacity: 0, height: 0, y: -10 },
                            animate: { opacity: 1, height: 'auto', y: 0 },
                            exit: { opacity: 0, height: 0, y: -10 },
                            transition: {
                              ...ANIMATION.SPRING.SMOOTH,
                              delay: 0.05
                            }
                          })}
                        >
                          <Label>Color</Label>
                          <div className="flex gap-2 flex-wrap items-center">
                            {PRESET_COLORS.map((color, index) => (
                              <motion.button
                                key={color.value}
                                type="button"
                                className={cn(
                                  'size-10 rounded-full border-2 transition-colors duration-200',
                                  workspaceColor === color.value
                                    ? 'border-foreground'
                                    : 'border-transparent'
                                )}
                                style={{ backgroundColor: color.value }}
                                onClick={() => setWorkspaceColor(color.value)}
                                title={color.name}
                                {...(shouldReduceMotion ? {} : {
                                  initial: { opacity: 0, scale: 0.8 },
                                  animate: { opacity: 1, scale: 1 },
                                  transition: {
                                    ...ANIMATION.SPRING.SMOOTH,
                                    delay: index * ANIMATION.STAGGER.FAST
                                  },
                                  whileHover: ANIMATION.COLOR_BUTTON.whileHover,
                                  whileTap: ANIMATION.COLOR_BUTTON.whileTap
                                })}
                              />
                            ))}
                          </div>
                        </motion.div>
                      )}
                      </AnimatePresence>

                      <motion.div
                        className="flex gap-2 pt-2"
                        {...(shouldReduceMotion ? {} : {
                          initial: { opacity: 0, y: 10 },
                          animate: { opacity: 1, y: 0 },
                          transition: {
                            ...ANIMATION.SPRING.SMOOTH,
                            delay: 0.1
                          }
                        })}
                      >
                        <motion.div {...(shouldReduceMotion ? {} : ANIMATION.BUTTON)}>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleSaveWorkspace(workspace.id)}
                          >
                            Save
                          </Button>
                        </motion.div>
                        <motion.div {...(shouldReduceMotion ? {} : ANIMATION.BUTTON)}>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                          >
                            Cancel
                          </Button>
                        </motion.div>
                      </motion.div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="view-mode"
                      {...(shouldReduceMotion ? {} : ANIMATION.VIEW_MODE)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <WorkspaceIcon workspace={workspace} />
                          <div>
                            <h5 className="font-medium">{workspace.name}</h5>
                            <p className="text-xs text-muted-foreground">
                              {workspaceBoards.length} project
                              {workspaceBoards.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-1">
                          <motion.div {...(shouldReduceMotion ? {} : ANIMATION.BUTTON)}>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => handleSelectIcon(workspace.id)}
                              title="Change icon"
                            >
                              <Upload className="size-4" />
                            </Button>
                          </motion.div>
                          <AnimatePresence>
                          {workspace.iconPath && (
                            <motion.div
                              {...(shouldReduceMotion ? {} : {
                                ...ANIMATION.BUTTON,
                                initial: { opacity: 0, scale: 0.8 },
                                animate: { opacity: 1, scale: 1 },
                                exit: { opacity: 0, scale: 0.8 }
                              })}
                            >
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => handleRemoveIcon(workspace.id)}
                                title="Remove icon"
                              >
                                <X className="size-4" />
                              </Button>
                            </motion.div>
                          )}
                          </AnimatePresence>
                          <motion.div {...(shouldReduceMotion ? {} : ANIMATION.BUTTON)}>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEditWorkspace(workspace)}
                              title="Edit"
                            >
                              <Edit2 className="size-4" />
                            </Button>
                          </motion.div>
                          <motion.div {...(shouldReduceMotion ? {} : ANIMATION.BUTTON)}>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteWorkspace(workspace)}
                              className="text-destructive hover:text-destructive"
                              title="Delete"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </motion.div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  </AnimatePresence>
                </motion.div>
              )
            })
          )}
        </div>
      </div>

      {/* Delete Workspace Confirmation Dialog */}
      <AlertDialog
        open={deleteState.workspace !== null}
        onOpenChange={open => {
          if (!open) {
            setDeleteState({
              workspace: null,
              action: null,
              targetWorkspaceId: null,
            })
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workspace</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteState.workspace && (
                <>
                  {boards.filter(
                    b => b.workspaceId === deleteState.workspace!.id
                  ).length === 0 ? (
                    <>
                      Are you sure you want to delete the workspace{' '}
                      <strong>{deleteState.workspace.name}</strong>? This action
                      cannot be undone.
                    </>
                  ) : (
                    <>
                      The workspace{' '}
                      <strong>{deleteState.workspace.name}</strong> contains{' '}
                      {
                        boards.filter(
                          b => b.workspaceId === deleteState.workspace!.id
                        ).length
                      }{' '}
                      project(s). What would you like to do?
                    </>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleteState.workspace &&
            boards.filter(b => b.workspaceId === deleteState.workspace!.id)
              .length > 0 && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <button
                    type="button"
                    className={cn(
                      'w-full p-3 border rounded-lg text-left transition-colors',
                      deleteState.action === 'delete-all'
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-muted-foreground/50'
                    )}
                    onClick={() =>
                      setDeleteState(prev => ({
                        ...prev,
                        action: 'delete-all',
                        targetWorkspaceId: null,
                      }))
                    }
                  >
                    <div className="font-medium text-destructive">
                      Delete workspace and all projects
                    </div>
                    <div className="text-sm text-muted-foreground">
                      This will permanently delete all projects in this
                      workspace
                    </div>
                  </button>

                  <button
                    type="button"
                    className={cn(
                      'w-full p-3 border rounded-lg text-left transition-colors',
                      deleteState.action === 'move-to-other'
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-muted-foreground/50'
                    )}
                    onClick={() =>
                      setDeleteState(prev => ({
                        ...prev,
                        action: 'move-to-other',
                      }))
                    }
                  >
                    <div className="font-medium">
                      Move projects to another workspace
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Keep the projects by moving them first
                    </div>
                  </button>
                </div>

                {deleteState.action === 'move-to-other' && (
                  <div className="space-y-2">
                    <Label>Select target workspace</Label>
                    <select
                      className="w-full p-2 border rounded-lg bg-background"
                      value={deleteState.targetWorkspaceId ?? ''}
                      onChange={e =>
                        setDeleteState(prev => ({
                          ...prev,
                          targetWorkspaceId: e.target.value,
                        }))
                      }
                    >
                      <option value="">Select a workspace...</option>
                      {workspaces
                        .filter(w => w.id !== deleteState.workspace?.id)
                        .map(w => (
                          <option key={w.id} value={w.id}>
                            {w.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>
            )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteWorkspace}
              disabled={
                deleteState.action === null ||
                (deleteState.action === 'move-to-other' &&
                  !deleteState.targetWorkspaceId)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Workspace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image Cropper Dialog */}
      {cropperOpen && originalImageSrc && (
        <ImageCropper
          open={cropperOpen}
          onOpenChange={setCropperOpen}
          imageSrc={originalImageSrc}
          onCropComplete={handleCropComplete}
          onCancel={() => {
            if (originalImageSrc) {
              URL.revokeObjectURL(originalImageSrc)
            }
            setOriginalImageSrc(null)
            setCurrentEditingWorkspaceId(null)
            setCropperOpen(false)
          }}
        />
      )}
    </>
  )
}
