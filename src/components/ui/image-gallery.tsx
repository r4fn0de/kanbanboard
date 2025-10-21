import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { X, ZoomIn, Download, ExternalLink } from 'lucide-react'
import type { KanbanAttachment } from '@/types/common'

interface ImageGalleryProps {
  attachments?: KanbanAttachment[] | null
  onRemove?: (attachment: KanbanAttachment) => void
  showRemoveButton?: boolean
}

interface ImageItem {
  attachment: KanbanAttachment
  url: string
  filename: string
}

export function ImageGallery({
  attachments = [],
  onRemove,
  showRemoveButton = false,
}: ImageGalleryProps) {
  const [images, setImages] = useState<ImageItem[]>([])
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set())
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null)

  const loadImageUrl = async (attachment: KanbanAttachment): Promise<string | null> => {
    if (loadingImages.has(attachment.storagePath)) return null

    setLoadingImages(prev => new Set(prev).add(attachment.storagePath))

    try {
      const url = (await invoke('get_attachment_url', { filePath: attachment.storagePath })) as string
      return `file://${url}`
    } catch (error) {
      console.error('Failed to get image URL:', error)
      return null
    } finally {
      setLoadingImages(prev => {
        const next = new Set(prev)
        next.delete(attachment.storagePath)
        return next
      })
    }
  }

  const handleImageClick = async (attachment: KanbanAttachment) => {
    let image = images.find(img => img.attachment.id === attachment.id)

    if (!image) {
      const url = await loadImageUrl(attachment)
      if (!url) return

      const filename = attachment.filename || attachment.originalName
      const newImage = { attachment, url, filename }
      setImages(prev => [...prev, newImage])
      image = newImage
    }

    setSelectedImage(image)
  }

  const handleDownload = async (image: ImageItem) => {
    try {
      const a = document.createElement('a')
      a.href = image.url
      a.download = image.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (error) {
      console.error('Failed to download image:', error)
    }
  }

  const handleOpenExternal = (image: ImageItem) => {
    window.open(image.url, '_blank')
  }

  if (!attachments || attachments.length === 0) {
    return null
  }

  return (
    <>
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Images</h4>
        <div className="grid grid-cols-2 gap-3">
          {attachments.map(attachment => {
            const image = images.find(img => img.attachment.id === attachment.id && img.attachment.version === attachment.version)
            const filename = attachment.filename || attachment.originalName

            return (
              <button
                key={`${attachment.id}-${attachment.version}`}
                type="button"
                className="relative group border rounded-lg overflow-hidden text-left hover:border-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onClick={() => handleImageClick(attachment)}
              >
                <div className="aspect-square bg-muted flex items-center justify-center">
                  {image ? (
                    <img
                      src={image.url}
                      alt={filename}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <div className="w-8 h-8 rounded-full bg-current/10 flex items-center justify-center">
                        <ZoomIn className="w-4 h-4" />
                      </div>
                      <span className="text-xs">Click to load</span>
                    </div>
                  )}
                </div>

                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={e => {
                      e.stopPropagation()
                      handleImageClick(attachment)
                    }}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>

                  {showRemoveButton && onRemove && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={e => {
                        e.stopPropagation()
                        onRemove(attachment)
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="p-2 bg-background">
                  <p className="text-xs truncate font-medium">{filename}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {selectedImage && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-full bg-background rounded-lg overflow-hidden">
            <div className="absolute top-2 right-2 z-10 flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleDownload(selectedImage)}
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleOpenExternal(selectedImage)}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
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
                src={selectedImage.url}
                alt={selectedImage.filename}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="p-4 border-t">
              <p className="text-sm font-medium" id="image-modal-title">{selectedImage.filename}</p>
              <p className="text-xs text-muted-foreground">
                {selectedImage.attachment.storagePath}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
