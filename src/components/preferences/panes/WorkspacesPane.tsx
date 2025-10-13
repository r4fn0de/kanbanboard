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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  useRemoveWorkspaceIconMutation,
  useSetWorkspaceIconPathMutation,
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
  const [croppedImageBlob, setCroppedImageBlob] = useState<Blob | null>(null)
  const [croppedImagePreview, setCroppedImagePreview] = useState<string | null>(null)
  const [currentEditingWorkspaceId, setCurrentEditingWorkspaceId] = useState<
    string | null
  >(null)

  // Queries and mutations
  const { data: workspaces = [] } = useWorkspaces()
  const { data: boards = [] } = useBoards()
  const { mutateAsync: updateWorkspace } = useUpdateWorkspace()
  const { mutateAsync: deleteWorkspace } = useDeleteWorkspace()
  const { mutateAsync: removeWorkspaceIcon } = useRemoveWorkspaceIconMutation()
  const { mutateAsync: setWorkspaceIconPath } = useSetWorkspaceIconPathMutation()
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
      console.log('=== handleSaveWorkspace called ===')
      console.log('Workspace ID:', workspaceId)
      console.log('Has croppedImageBlob:', !!croppedImageBlob)
      console.log('croppedImageBlob size:', croppedImageBlob?.size)
      console.log('croppedImagePreview:', croppedImagePreview)
      
      // Save cropped image if we have one
      let finalIconPath: string | null = null
      if (croppedImageBlob) {
        console.log('Converting blob to array buffer...')
        const arrayBuffer = await croppedImageBlob.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)
        console.log('Array buffer size:', uint8Array.length)
        console.log('Calling save_cropped_workspace_icon with workspaceId:', workspaceId)

        try {
          finalIconPath = await invoke<string>('save_cropped_workspace_icon', {
            workspaceId,
            imageData: Array.from(uint8Array),
          })
          console.log('Icon saved successfully at path:', finalIconPath)
        } catch (saveError) {
          console.error('ERROR in save_cropped_workspace_icon:', saveError)
          throw new Error(`Failed to save cropped icon: ${saveError instanceof Error ? saveError.message : String(saveError)}`)
        }

        // The icon is already saved by save_cropped_workspace_icon
        // We just need to update the database to point to it
        console.log('Updating workspace icon_path in database...')
        await setWorkspaceIconPath({
          workspaceId,
          iconPath: finalIconPath,
        })
        
        // Update other workspace fields
        await updateWorkspace({
          id: workspaceId,
          name: workspaceName.trim() || undefined,
          color: null, // Clear color when using custom icon
        })
      } else {
        // Update workspace without icon changes
        await updateWorkspace({
          id: workspaceId,
          name: workspaceName.trim() || undefined,
          color: workspaceColor,
        })
      }

      toast.success('Workspace updated successfully')
      
      // Clean up
      setEditingWorkspace(null)
      if (originalImageSrc) {
        URL.revokeObjectURL(originalImageSrc)
      }
      if (croppedImagePreview) {
        URL.revokeObjectURL(croppedImagePreview)
      }
      setOriginalImageSrc(null)
      setCroppedImageBlob(null)
      setCroppedImagePreview(null)
      setCurrentEditingWorkspaceId(null)
    } catch (error) {
      console.error('Failed to update workspace:', error)
      const errorMessage = error instanceof Error 
        ? error.message.includes('não existe') || error.message.includes('not found')
          ? 'Failed to save. Please check file permissions and try again.'
          : `Failed to update workspace: ${error.message}`
        : 'Failed to update workspace. Please try again.'
      toast.error(errorMessage)
    }
  }

  const handleCancelEdit = () => {
    setEditingWorkspace(null)
    setWorkspaceName('')
    setWorkspaceColor(null)
    
    // Clean up image cropper states
    if (originalImageSrc) {
      URL.revokeObjectURL(originalImageSrc)
    }
    if (croppedImagePreview) {
      URL.revokeObjectURL(croppedImagePreview)
    }
    setOriginalImageSrc(null)
    setCroppedImageBlob(null)
    setCroppedImagePreview(null)
    setCurrentEditingWorkspaceId(null)
    setCropperOpen(false)
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

      // Validate file path
      if (typeof filePath !== 'string' || filePath.trim() === '') {
        toast.error('Invalid file path selected')
        return
      }

      // Try to read the file with better error handling
      let fileBytes: Uint8Array
      try {
        fileBytes = await readFile(filePath)
      } catch (readError) {
        console.error('Failed to read file:', readError)
        toast.error('File not found or cannot be accessed. Please make sure the file exists and you have permission to read it.')
        return
      }

      // Validate file content
      if (!fileBytes || fileBytes.length === 0) {
        toast.error('Selected file is empty or corrupted')
        return
      }

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
      console.error('Error selecting icon:', error)
      const message = error instanceof Error 
        ? error.message.includes('not found') || error.message.includes('não existe')
          ? 'File not found. Please select a valid image file.'
          : `Failed to select image: ${error.message}`
        : 'Failed to select image. Please try again.'
      toast.error(message)
    }
  }

  const handleCropComplete = useCallback((croppedBlob: Blob) => {
    console.log('handleCropComplete called with blob:', croppedBlob)
    console.log('Blob size:', croppedBlob.size)
    console.log('Current editing workspace:', currentEditingWorkspaceId)
    
    setCroppedImageBlob(croppedBlob)
    const previewUrl = URL.createObjectURL(croppedBlob)
    console.log('Preview URL created:', previewUrl)
    setCroppedImagePreview(previewUrl)
    setCropperOpen(false)
    
    // If we have a workspace ID but it's not in edit mode, enter edit mode
    if (currentEditingWorkspaceId && !editingWorkspace) {
      const workspace = workspaces.find(w => w.id === currentEditingWorkspaceId)
      if (workspace) {
        console.log('Entering edit mode for workspace:', workspace.id)
        setEditingWorkspace(workspace.id)
        setWorkspaceName(workspace.name)
        setWorkspaceColor(workspace.color ?? null)
      }
    }
    
    console.log('States updated, cropper closed')
  }, [currentEditingWorkspaceId, editingWorkspace, workspaces])

  const handleCropCancel = useCallback(() => {
    if (originalImageSrc) {
      URL.revokeObjectURL(originalImageSrc)
    }
    if (croppedImagePreview) {
      URL.revokeObjectURL(croppedImagePreview)
    }
    setOriginalImageSrc(null)
    setCroppedImageBlob(null)
    setCroppedImagePreview(null)
    setCurrentEditingWorkspaceId(null)
    setCropperOpen(false)
  }, [originalImageSrc, croppedImagePreview])

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

                      {/* Icon Preview Section */}
                      {croppedImagePreview && (() => {
                        console.log('Rendering preview section with URL:', croppedImagePreview)
                        return true
                      })() && (
                        <motion.div
                          className="space-y-3"
                          {...(shouldReduceMotion ? {} : {
                            initial: { opacity: 0, y: -10 },
                            animate: { opacity: 1, y: 0 },
                            exit: { opacity: 0, y: -10 },
                            transition: ANIMATION.SPRING.SMOOTH
                          })}
                        >
                          <Label>Icon Preview</Label>
                          <div className="flex items-start gap-4">
                            <div className="relative flex-shrink-0">
                              <img
                                src={croppedImagePreview}
                                alt="New workspace icon"
                                className="h-16 w-16 rounded-xl object-cover border-2 border-border"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (croppedImagePreview) {
                                    URL.revokeObjectURL(croppedImagePreview)
                                  }
                                  setCroppedImagePreview(null)
                                  setCroppedImageBlob(null)
                                }}
                                className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-background shadow-sm hover:bg-destructive hover:text-destructive-foreground"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="rounded-md bg-green-50 dark:bg-green-950/20 p-3 text-sm text-green-800 dark:text-green-200">
                                ✓ New icon ready. Click "Save" to apply the changes.
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Only show color selection if workspace doesn't have a custom icon and no preview */}
                      <AnimatePresence>
                      {(workspace.iconPath || croppedImagePreview) ? (
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
                            💡 Color selection is disabled when using {croppedImagePreview ? 'a new icon preview' : 'a custom icon'}. {croppedImagePreview ? 'Remove the preview or save changes' : 'Remove the icon'} to use colors instead.
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

          <AnimatePresence>
          {deleteState.workspace &&
            boards.filter(b => b.workspaceId === deleteState.workspace!.id)
              .length > 0 && (
              <motion.div
                className="space-y-3"
                {...(shouldReduceMotion ? {} : {
                  initial: { opacity: 0, y: 10 },
                  animate: { opacity: 1, y: 0 },
                  exit: { opacity: 0, y: -10 },
                  transition: ANIMATION.SPRING.SMOOTH
                })}
              >
                <div className="space-y-2">
                  <motion.button
                    type="button"
                    className={cn(
                      'w-full p-3 border rounded-lg text-left transition-colors',
                      deleteState.action === 'delete-all'
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-muted-foreground/50'
                    )}
                    {...(shouldReduceMotion ? {} : {
                      initial: { opacity: 0, x: -20 },
                      animate: { opacity: 1, x: 0 },
                      transition: {
                        ...ANIMATION.SPRING.SMOOTH,
                        delay: 0.05
                      }
                    })}
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
                  </motion.button>

                  <motion.button
                    type="button"
                    className={cn(
                      'w-full p-3 border rounded-lg text-left transition-colors',
                      deleteState.action === 'move-to-other'
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-muted-foreground/50'
                    )}
                    {...(shouldReduceMotion ? {} : {
                      initial: { opacity: 0, x: -20 },
                      animate: { opacity: 1, x: 0 },
                      transition: {
                        ...ANIMATION.SPRING.SMOOTH,
                        delay: 0.1
                      }
                    })}
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
                  </motion.button>
                </div>

                {deleteState.action === 'move-to-other' && (
                  <motion.div
                    className="space-y-2"
                    {...(shouldReduceMotion ? {} : {
                      initial: { opacity: 0, height: 0, y: -10 },
                      animate: { opacity: 1, height: 'auto', y: 0 },
                      exit: { opacity: 0, height: 0, y: -10 },
                      transition: {
                        ...ANIMATION.SPRING.SMOOTH,
                        delay: 0.1
                      }
                    })}
                  >
                    <Label>Select target workspace</Label>
                    <Select
                      value={deleteState.targetWorkspaceId ?? ''}
                      onValueChange={value =>
                        setDeleteState(prev => ({
                          ...prev,
                          targetWorkspaceId: value,
                        }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a workspace...">
                          {deleteState.targetWorkspaceId && (
                            workspaces.find(w => w.id === deleteState.targetWorkspaceId)?.name
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {workspaces
                          .filter(w => w.id !== deleteState.workspace?.id)
                          .map(w => (
                            <SelectItem key={w.id} value={w.id}>
                              <div className="flex items-center gap-2">
                                <WorkspaceIcon workspace={w} />
                                <span>{w.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

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
          onCancel={handleCropCancel}
          aspectRatio={1}
          recommendedSize="64x64px"
        />
      )}
    </>
  )
}
