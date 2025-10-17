import { useCallback, useState, useEffect, useMemo } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { open as openDialog } from '@tauri-apps/plugin-dialog'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  X,
  Upload,
  Image as ImageIcon,
  FileText,
  FileArchive,
  File as FileIcon,
} from 'lucide-react'

interface ImageUploadProps {
  cardId: string
  boardId: string
  attachments?: string[] | null
  onUploadComplete?: (filePath: string) => void
  onRemoveComplete?: (filePath: string) => void
}

export function ImageUpload({
  cardId,
  boardId,
  attachments = [],
  onUploadComplete,
  onRemoveComplete,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isRemoving, setIsRemoving] = useState<string | null>(null)
  const [previewUrls, setPreviewUrls] = useState<Map<string, string>>(new Map())
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

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

  const isImageAttachment = useCallback(
    (filePath: string) => {
      const extension = filePath.split('.').pop()?.toLowerCase() ?? ''
      return imageExtensions.has(extension)
    },
    [imageExtensions]
  )

  const getAttachmentIcon = (filePath: string) => {
    const extension = filePath.split('.').pop()?.toLowerCase() ?? ''

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
    async (filePath: string) => {
      if (previewUrls.has(filePath)) {
        return previewUrls.get(filePath)
      }

      try {
        const url = (await invoke('get_attachment_url', { filePath })) as string
        setPreviewUrls(prev => new Map(prev).set(filePath, url))
        return url
      } catch (error) {
        console.error('Failed to load image URL:', error)
        return null
      }
    },
    [previewUrls]
  )

  // Preload image URLs when attachments change
  useEffect(() => {
    attachments?.forEach(filePath => {
      if (isImageAttachment(filePath)) {
        loadImageUrl(filePath)
      }
    })
  }, [attachments, isImageAttachment, loadImageUrl])

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
      })) as { success: boolean; filePath: string; error?: string }

      if (response.success) {
        toast.success('Attachment uploaded successfully')
        onUploadComplete?.(response.filePath)
      } else {
        console.error('Upload failed:', response.error)
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

  const handleRemove = useCallback(
    async (filePath: string) => {
      try {
        setIsRemoving(filePath)
        await invoke('remove_image', {
          cardId,
          boardId,
          filePath,
        })
        toast.success('Image removed successfully')
        onRemoveComplete?.(filePath)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to remove attachment'
        toast.error(message)
      } finally {
        setIsRemoving(null)
      }
    },
    [cardId, boardId, onRemoveComplete]
  )

  const handleOpenAttachment = useCallback(async (filePath: string) => {
    try {
      await invoke('open_attachment', { filePath })
    } catch (error) {
      console.error('Failed to open attachment:', error)
      toast.error('Failed to open attachment')
    }
  }, [])

  if (!attachments || attachments.length === 0) {
    return (
      <div className="flex items-center justify-center w-full">
        <Button
          type="button"
          variant="outline"
          onClick={handleUpload}
          disabled={isUploading}
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          {isUploading ? 'Uploading...' : 'Add Attachment'}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUpload}
          disabled={isUploading}
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          {isUploading ? 'Uploading...' : 'Add Attachment'}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {attachments.map(filePath => {
          const isImage = isImageAttachment(filePath)
          const previewUrl = isImage ? previewUrls.get(filePath) : null
          const filename = filePath.split('/').pop() || filePath
          const AttachmentIcon = getAttachmentIcon(filePath)

          return (
            <div
              key={filePath}
              className="relative group border rounded-lg overflow-hidden"
            >
              <div className="aspect-square bg-muted flex items-center justify-center">
                {isImage ? (
                  previewUrl ? (
                    <button
                      type="button"
                      className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform border-0 bg-transparent p-0"
                      onClick={() => setSelectedImage(filePath)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          setSelectedImage(filePath)
                        }
                      }}
                    >
                      <img
                        src={previewUrl}
                        alt={filename}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <ImageIcon className="h-8 w-8" />
                      <span className="text-xs">Loading...</span>
                    </div>
                  )
                ) : (
                  <button
                    type="button"
                    className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => handleOpenAttachment(filePath)}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        handleOpenAttachment(filePath)
                      }
                    }}
                  >
                    <AttachmentIcon className="h-8 w-8" />
                    <span className="text-xs uppercase tracking-wide">{filename.split('.').pop()?.toUpperCase()}</span>
                  </button>
                )}
              </div>

              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRemove(filePath)}
                  disabled={isRemoving === filePath}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>

              <div className="p-2 bg-background">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <p className="truncate font-medium" title={filename}>
                    {filename}
                  </p>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      isImage
                        ? setSelectedImage(filePath)
                        : handleOpenAttachment(filePath)
                    }
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        if (isImage) {
                          setSelectedImage(filePath)
                        } else {
                          handleOpenAttachment(filePath)
                        }
                      }
                    }}
                  >
                    Abrir
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {selectedImage && (
        <Button
          type="button"
          variant="ghost"
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 hover:bg-black/80"
          onClick={() => setSelectedImage(null)}
          onKeyDown={e => {
            if (e.key === 'Escape') {
              setSelectedImage(null)
            }
          }}
        >
          <div
            className="relative max-w-4xl max-h-full bg-background rounded-lg overflow-hidden"
            onPointerDown={e => e.stopPropagation()}
          >
            <div className="absolute top-2 right-2 z-10">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setSelectedImage(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="max-h-[80vh] max-w-[80vw] overflow-auto">
              <img
                src={previewUrls.get(selectedImage)}
                alt={selectedImage.split('/').pop()}
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </Button>
      )}
    </div>
  )
}
