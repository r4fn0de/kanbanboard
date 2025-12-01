import { useCallback, useState, useEffect, useMemo } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { open as openDialog } from '@tauri-apps/plugin-dialog'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  X,
  Image as ImageIcon,
  FileText,
  FileArchive,
  File as FileIcon,
  MoreHorizontal,
} from 'lucide-react'
import type { KanbanAttachment } from '@/types/common'
import { useDeleteAttachment } from '@/services/kanban'
import { MenuItem, CompleteMenu } from '@/components/ui/base-ui-menu'
import {
  ShipUploadIcon,
  TrashIcon,
  EyeIcon,
  AttachmentIcon,
} from '@/components/ui/icons'

interface ImageUploadProps {
  cardId: string
  boardId: string
  attachments?: KanbanAttachment[] | null
  onUploadComplete?: (attachment: KanbanAttachment) => void
  onRemoveComplete?: (attachmentId: string) => void
}

export function ImageUpload({
  cardId,
  boardId,
  attachments = [],
  onUploadComplete,
  onRemoveComplete,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrls, setPreviewUrls] = useState<Map<string, string>>(new Map())
  const [selectedAttachment, setSelectedAttachment] =
    useState<KanbanAttachment | null>(null)
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState<string | null>(
    null
  )

  const deleteMutation = useDeleteAttachment(boardId, cardId)

  const imageExtensions = useMemo(
    () =>
      new Set([
        'jpg',
        'jpeg',
        'png',
        'gif',
        'webp',
        'svg',
        'bmp',
        'ico',
        'tiff',
        'tif',
      ]),
    []
  )

  const documentExtensions = useMemo(
    () =>
      new Set([
        'pdf',
        'doc',
        'docx',
        'xls',
        'xlsx',
        'ppt',
        'pptx',
        'txt',
        'csv',
        'md',
        'rtf',
        'zip',
        'rar',
        '7z',
        'tar',
        'json',
      ]),
    []
  )

  const supportedExtensions = useMemo(() => {
    return Array.from(new Set([...imageExtensions, ...documentExtensions]))
  }, [documentExtensions, imageExtensions])

  const formatBytes = useCallback((bytes?: number | null) => {
    if (!bytes || bytes <= 0) {
      return null
    }

    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    const exponent = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      units.length - 1
    )
    const value = bytes / Math.pow(1024, exponent)
    return `${value.toFixed(value >= 100 || exponent === 0 ? 0 : 1)} ${units[exponent]}`
  }, [])

  const formatTimestamp = useCallback((iso?: string) => {
    if (!iso) return null
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return null
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    })
  }, [])

  const isImageAttachment = useCallback(
    (attachment: KanbanAttachment) => {
      const extension =
        attachment.storagePath.split('.').pop()?.toLowerCase() ?? ''
      return imageExtensions.has(extension)
    },
    [imageExtensions]
  )

  const getAttachmentIcon = (attachment: KanbanAttachment) => {
    const extension =
      attachment.storagePath.split('.').pop()?.toLowerCase() ?? ''

    if (imageExtensions.has(extension)) {
      return ImageIcon
    }
    if (['zip', 'rar', '7z', 'tar'].includes(extension)) {
      return FileArchive
    }
    if (documentExtensions.has(extension)) {
      return FileText
    }
    return FileIcon
  }

  const loadImageUrl = useCallback(
    async (attachment: KanbanAttachment) => {
      if (previewUrls.has(attachment.id)) {
        return previewUrls.get(attachment.id) ?? null
      }

      try {
        const url = (await invoke('get_attachment_url', {
          filePath: attachment.storagePath,
        })) as string
        setPreviewUrls(prev => new Map(prev).set(attachment.id, url))
        return url
      } catch (error) {
        console.error('Failed to load image URL:', error)
        return null
      }
    },
    [previewUrls]
  )

  useEffect(() => {
    attachments?.forEach(attachment => {
      if (isImageAttachment(attachment)) {
        void loadImageUrl(attachment)
      }
    })
  }, [attachments, isImageAttachment, loadImageUrl])

  const handlePreview = useCallback(
    async (attachment: KanbanAttachment) => {
      const existing = previewUrls.get(attachment.id)
      let url = existing ?? null

      if (!url) {
        url = await loadImageUrl(attachment)
      }

      if (!url) {
        toast.error('Failed to load image preview')
        return
      }

      setSelectedAttachment(attachment)
      setSelectedPreviewUrl(url)
    },
    [loadImageUrl, previewUrls]
  )

  const handleUpload = useCallback(async () => {
    try {
      const selected = await openDialog({
        multiple: false,
        filters: [
          {
            name: 'Attachments',
            extensions: supportedExtensions,
          },
        ],
      })

      if (!selected) return

      setIsUploading(true)

      const response = (await invoke('upload_image', {
        cardId,
        boardId,
        filePath: selected,
      })) as {
        success: boolean
        filePath: string
        attachment?: KanbanAttachment
        error?: string
      }

      if (response.success) {
        toast.success('Attachment uploaded successfully')
        if (response.attachment) {
          onUploadComplete?.(response.attachment)
        }
      } else {
        toast.error(response.error || 'Failed to upload attachment')
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to upload attachment'
      toast.error(message)
    } finally {
      setIsUploading(false)
    }
  }, [boardId, cardId, onUploadComplete, supportedExtensions])

  const handleOpenAttachment = useCallback(
    async (attachment: KanbanAttachment) => {
      try {
        await invoke('open_attachment', { filePath: attachment.storagePath })
      } catch (error) {
        console.error('Failed to open attachment:', error)
        toast.error('Failed to open attachment')
      }
    },
    []
  )

  const handleDelete = useCallback(
    async (attachment: KanbanAttachment) => {
      try {
        await deleteMutation.mutateAsync({
          attachmentId: attachment.id,
          version: attachment.version,
        })
        toast.success('Attachment deleted')
        onRemoveComplete?.(attachment.id)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to delete attachment'
        toast.error(message)
      }
    },
    [deleteMutation, onRemoveComplete]
  )

  const closePreview = useCallback(() => {
    setSelectedAttachment(null)
    setSelectedPreviewUrl(null)
  }, [])

  useEffect(() => {
    if (!selectedAttachment) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closePreview()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [closePreview, selectedAttachment])

  if (!attachments || attachments.length === 0) {
    return (
      <div
        onClick={handleUpload}
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleUpload()
          }
        }}
        className={`group flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border/50 bg-muted/20 px-4 py-8 text-center transition-colors hover:bg-muted/40 hover:border-border ${
          isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background shadow-sm ring-1 ring-border transition-all group-hover:scale-110">
          <ShipUploadIcon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            {isUploading ? 'Uploading...' : 'Click to upload'}
          </p>
          <p className="text-xs text-muted-foreground">
            Images, documents, archives
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="space-y-0.5">
        {attachments.map(attachment => {
          const Icon = getAttachmentIcon(attachment)
          const isImage = isImageAttachment(attachment)
          const previewUrl = previewUrls.get(attachment.id)
          const formattedSize = formatBytes(attachment.sizeBytes)
          const deleteVariables = deleteMutation.variables
          const isDeleting =
            deleteMutation.isPending &&
            deleteVariables?.attachmentId === attachment.id &&
            (deleteVariables.version ?? attachment.version) ===
              attachment.version

          return (
            <div
              key={`${attachment.id}-${attachment.version}`}
              className="group relative flex items-center justify-between gap-2 rounded-md p-2 transition-all hover:bg-muted/40"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div
                  role={isImage && previewUrl ? 'button' : undefined}
                  tabIndex={isImage && previewUrl ? 0 : undefined}
                  onKeyDown={e => {
                    if (
                      (e.key === 'Enter' || e.key === ' ') &&
                      isImage &&
                      previewUrl
                    ) {
                      e.preventDefault()
                      void handlePreview(attachment)
                    }
                  }}
                  className={`relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-sm border bg-background shadow-sm transition-transform ${
                    isImage && previewUrl
                      ? 'hover:scale-105 cursor-pointer'
                      : ''
                  }`}
                  onClick={() =>
                    isImage && previewUrl ? handlePreview(attachment) : null
                  }
                >
                  {isImage && previewUrl ? (
                    <img
                      src={previewUrl}
                      alt={attachment.filename || attachment.originalName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-sm font-medium leading-none text-foreground/90">
                    {attachment.filename || attachment.originalName}
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    {formattedSize && <span>{formattedSize}</span>}
                    {attachment.version > 1 && (
                      <span>• v{attachment.version}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <CompleteMenu
                  trigger={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Attachment actions"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  }
                  side="bottom"
                  align="end"
                  sideOffset={6}
                  className="w-40"
                >
                  {isImage && previewUrl ? (
                    <MenuItem
                      onClick={() => {
                        void handlePreview(attachment)
                      }}
                      disabled={isDeleting}
                      className="flex items-center gap-2"
                    >
                      <EyeIcon className="h-3.5 w-3.5" />
                      <span>Preview</span>
                    </MenuItem>
                  ) : null}
                  <MenuItem
                    onClick={() => {
                      void handleDelete(attachment)
                    }}
                    disabled={isDeleting}
                    destructive
                    className="flex items-center gap-2"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                    <span>{isDeleting ? 'Deleting…' : 'Delete'}</span>
                  </MenuItem>
                </CompleteMenu>
              </div>
            </div>
          )
        })}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleUpload}
        disabled={isUploading}
        className="w-full justify-start border border-dashed border-border/50 text-muted-foreground hover:bg-muted/20 hover:text-foreground h-9"
      >
        <ShipUploadIcon className="mr-2 h-3.5 w-3.5" />
        {isUploading ? 'Uploading...' : 'Add another attachment'}
      </Button>

      {selectedAttachment && selectedPreviewUrl ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
        >
          <div
            className="absolute inset-0 cursor-default"
            onClick={closePreview}
            aria-label="Close overlay"
          />
          <div className="relative z-10 flex max-h-[90vh] max-w-[90vw] flex-col overflow-hidden rounded-lg border bg-background shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex flex-col gap-0.5">
                <h3 className="text-sm font-medium">
                  {selectedAttachment.filename ||
                    selectedAttachment.originalName}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {formatTimestamp(selectedAttachment.updatedAt)}
                </p>
              </div>
              <div className="flex items-center gap-1 ml-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleOpenAttachment(selectedAttachment)}
                  title="Open externally"
                >
                  <AttachmentIcon className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={closePreview}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-muted/10 p-4 flex items-center justify-center">
              <img
                src={selectedPreviewUrl}
                alt={
                  selectedAttachment.filename || selectedAttachment.originalName
                }
                className="max-h-[75vh] object-contain rounded-sm shadow-sm"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
