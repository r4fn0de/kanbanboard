import { useState, useCallback, FormEvent, useId } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Sparkles, Upload, Palette, Image as ImageIcon } from 'lucide-react'
import { open as openDialog } from '@tauri-apps/plugin-dialog'
import { readFile } from '@tauri-apps/plugin-fs'
import { invoke } from '@tauri-apps/api/core'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogPortal,
  DialogBackdrop,
  DialogPopup,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/base-ui-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ImageCropper } from '@/components/ui/image-cropper'
import { useCreateWorkspace } from '@/services/workspaces'
import { toast } from 'sonner'

const DEFAULT_WORKSPACE_COLOR = '#6366F1'

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

interface CreateWorkspaceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (workspaceId: string) => void
}

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateWorkspaceDialogProps) {
  const [step, setStep] = useState<'name' | 'customize'>('name')
  const [workspaceName, setWorkspaceName] = useState('')
  const [workspaceColor, setWorkspaceColor] = useState(DEFAULT_WORKSPACE_COLOR)
  const [workspaceIconPath, setWorkspaceIconPath] = useState<string | null>(null)
  const [workspaceIconPreview, setWorkspaceIconPreview] = useState<string | null>(null)
  const [cropperOpen, setCropperOpen] = useState(false)
  const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null)
  const [croppedImageBlob, setCroppedImageBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const nameId = useId()
  const { mutateAsync: createWorkspace, isPending } = useCreateWorkspace()

  const resetForm = useCallback(() => {
    // Revoke object URLs to prevent memory leaks
    if (originalImageSrc) {
      URL.revokeObjectURL(originalImageSrc)
    }
    if (workspaceIconPreview) {
      URL.revokeObjectURL(workspaceIconPreview)
    }
    setStep('name')
    setWorkspaceName('')
    setWorkspaceColor(DEFAULT_WORKSPACE_COLOR)
    setWorkspaceIconPath(null)
    setWorkspaceIconPreview(null)
    setCropperOpen(false)
    setOriginalImageSrc(null)
    setCroppedImageBlob(null)
    setError(null)
  }, [originalImageSrc, workspaceIconPreview])

  const handleDialogChange = useCallback(
    (newOpen: boolean) => {
      onOpenChange(newOpen)
      if (!newOpen) {
        // Delay reset to avoid visual glitch during close animation
        setTimeout(resetForm, 300)
      }
    },
    [onOpenChange, resetForm]
  )

  const handleSelectIcon = useCallback(async () => {
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
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        'bmp': 'image/bmp'
      }
      const mimeType = mimeTypes[extension ?? ''] ?? 'image/png'
      
      const blob = new Blob([fileBytes], { type: mimeType })
      const dataUrl = URL.createObjectURL(blob)
      
      setOriginalImageSrc(dataUrl)
      setWorkspaceIconPath(filePath)
      setCropperOpen(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to select image'
      toast.error(message)
    }
  }, [])

  const handleClearIcon = useCallback(() => {
    if (workspaceIconPreview) {
      URL.revokeObjectURL(workspaceIconPreview)
    }
    setWorkspaceIconPath(null)
    setWorkspaceIconPreview(null)
    setCroppedImageBlob(null)
  }, [workspaceIconPreview])

  const handleCropComplete = useCallback((croppedBlob: Blob) => {
    setCroppedImageBlob(croppedBlob)
    setWorkspaceIconPreview(URL.createObjectURL(croppedBlob))
    setCropperOpen(false)
  }, [])

  const handleCropCancel = useCallback(() => {
    if (originalImageSrc) {
      URL.revokeObjectURL(originalImageSrc)
    }
    setOriginalImageSrc(null)
    setWorkspaceIconPath(null)
    setCroppedImageBlob(null)
    setCropperOpen(false)
  }, [originalImageSrc])

  const handleNameSubmit = (event: FormEvent) => {
    event.preventDefault()
    const trimmedName = workspaceName.trim()
    if (!trimmedName) {
      setError('Workspace name is required')
      return
    }
    setError(null)
    setStep('customize')
  }

  const handleFinalSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (isPending) return

    const trimmedName = workspaceName.trim()
    if (!trimmedName) {
      setError('Workspace name is required')
      return
    }

    setError(null)

    try {
      const workspaceId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`
      let finalIconPath: string | null = null

      // If we have a cropped image, save it first
      if (croppedImageBlob) {
        const arrayBuffer = await croppedImageBlob.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)
        
        finalIconPath = await invoke<string>('save_cropped_workspace_icon', {
          workspaceId,
          imageData: Array.from(uint8Array)
        })
      }

      // Create the workspace with the final icon path (null if no icon)
      const workspace = await createWorkspace({
        id: workspaceId,
        name: trimmedName,
        color: workspaceColor?.trim() ? workspaceColor : null,
        iconPath: finalIconPath,
      })

      toast.success('Workspace created successfully!')
      handleDialogChange(false)
      onSuccess?.(workspace.id)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create workspace'
      setError(message)
      toast.error(message)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogChange}>
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup
            className="sm:max-w-[480px] p-0 gap-0 overflow-hidden"
            showCloseButton={false}
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-2 flex flex-col space-y-1.5">
              <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
                <Sparkles className="h-5 w-5 text-primary" />
                Create Workspace
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {step === 'name' 
                  ? 'Give your workspace a memorable name' 
                  : 'Personalize your workspace'}
              </DialogDescription>
            </div>

            <div className="relative px-6 pb-6">
            {/* Progress Indicator */}
            <div className="flex items-center gap-2 mb-6 mt-2">
              <motion.div 
                className={cn(
                  "h-1.5 rounded-full flex-1 transition-colors",
                  step === 'name' ? 'bg-primary' : 'bg-primary'
                )}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.3 }}
              />
              <motion.div 
                className={cn(
                  "h-1.5 rounded-full flex-1 transition-colors",
                  step === 'customize' ? 'bg-primary' : 'bg-muted'
                )}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: step === 'customize' ? 1 : 0 }}
                transition={{ duration: 0.3 }}
              />
            </div>

            <AnimatePresence mode="wait">
              {step === 'name' ? (
                <motion.form
                  key="name-step"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleNameSubmit}
                  className="space-y-6"
                >
                  <div className="space-y-3">
                    <Label htmlFor={nameId} className="text-sm font-medium">
                      Workspace Name
                    </Label>
                    <Input
                      id={nameId}
                      value={workspaceName}
                      onChange={(e) => {
                        setWorkspaceName(e.target.value)
                        setError(null)
                      }}
                      placeholder="e.g., Product Team, Marketing, Design"
                      autoFocus
                      className="text-base h-11"
                      maxLength={50}
                    />
                    <p className="text-xs text-muted-foreground">
                      {workspaceName.length}/50 characters
                    </p>
                  </div>

                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-destructive flex items-center gap-2"
                    >
                      <span className="h-1 w-1 rounded-full bg-destructive" />
                      {error}
                    </motion.p>
                  )}

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleDialogChange(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1 gap-2"
                      disabled={!workspaceName.trim()}
                    >
                      Continue
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.form>
              ) : (
                <motion.form
                  key="customize-step"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleFinalSubmit}
                  className="space-y-6"
                >
                  {/* Workspace Preview */}
                  <div className="flex items-center justify-center py-4">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      className="relative"
                    >
                      {workspaceIconPreview ? (
                        <div className="relative">
                          <img
                            src={workspaceIconPreview}
                            alt="Workspace preview"
                            className="h-20 w-20 rounded-2xl object-cover ring-4 ring-background shadow-lg"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={handleClearIcon}
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background shadow-md hover:bg-destructive hover:text-destructive-foreground"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div
                          className="h-20 w-20 rounded-2xl ring-4 ring-background shadow-lg flex items-center justify-center font-semibold text-white text-2xl"
                          style={{ backgroundColor: workspaceColor }}
                        >
                          {workspaceName.charAt(0).toUpperCase() || '?'}
                        </div>
                      )}
                    </motion.div>
                  </div>

                  <div className="text-center">
                    <h3 className="font-semibold text-lg">{workspaceName}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Customize your workspace
                    </p>
                  </div>

                  {/* Icon Upload */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Workspace Icon
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSelectIcon}
                      disabled={isPending}
                      className="w-full h-auto py-4 border-dashed"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="h-5 w-5 text-muted-foreground" />
                        <div className="text-sm">
                          <span className="font-medium text-primary">Upload an image</span>
                          <span className="text-muted-foreground"> or drag and drop</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          PNG, JPG, SVG (recommended 64x64px)
                        </span>
                      </div>
                    </Button>
                  </div>

                  {/* Color Picker */}
                  {!workspaceIconPreview && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Palette className="h-4 w-4" />
                        Workspace Color
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {PRESET_COLORS.map((color) => (
                          <button
                            key={color.value}
                            type="button"
                            onClick={() => setWorkspaceColor(color.value)}
                            className={cn(
                              "h-10 w-10 rounded-lg transition-all hover:scale-110",
                              workspaceColor === color.value
                                ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110'
                                : 'hover:ring-2 hover:ring-muted'
                            )}
                            style={{ backgroundColor: color.value }}
                            title={color.name}
                          />
                        ))}
                        <input
                          type="color"
                          value={workspaceColor}
                          onChange={(e) => setWorkspaceColor(e.target.value)}
                          className="h-10 w-10 rounded-lg cursor-pointer border-2 border-border"
                          title="Custom color"
                        />
                      </div>
                    </div>
                  )}

                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-destructive flex items-center gap-2"
                    >
                      <span className="h-1 w-1 rounded-full bg-destructive" />
                      {error}
                    </motion.p>
                  )}

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep('name')}
                      disabled={isPending}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isPending}
                      className="flex-1 gap-2"
                    >
                      {isPending ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                            className="h-4 w-4 border-2 border-current border-t-transparent rounded-full"
                          />
                          Creating...
                        </>
                      ) : (
                        <>
                          Create Workspace
                          <Sparkles className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
          </DialogPopup>
        </DialogPortal>
      </Dialog>

      {/* Image Cropper Dialog */}
      {originalImageSrc && (
        <ImageCropper
          open={cropperOpen}
          onOpenChange={setCropperOpen}
          imageSrc={originalImageSrc}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          aspect={1}
          shape="round"
        />
      )}
    </>
  )
}
