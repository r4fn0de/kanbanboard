import { useCallback, useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { X, Upload, Image as ImageIcon } from 'lucide-react'

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
  const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map())
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  const loadImageUrl = useCallback(async (filePath: string) => {
    if (imageUrls.has(filePath)) {
      return imageUrls.get(filePath)
    }

    try {
      const url = await invoke('get_attachment_url', { filePath }) as string
      setImageUrls(prev => new Map(prev).set(filePath, url))
      return url
    } catch (error) {
      console.error('Failed to load image URL:', error)
      return null
    }
  }, [imageUrls])

  // Preload image URLs when attachments change
  useEffect(() => {
    attachments?.forEach(filePath => {
      loadImageUrl(filePath)
    })
  }, [attachments, loadImageUrl])

  const handleUpload = useCallback(async () => {
    try {
      console.log('Opening file dialog...')
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: 'Images',
            extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'],
          },
        ],
      })

      console.log('Selected file:', selected)
      if (!selected) return

      setIsUploading(true)
      console.log('Starting upload for file:', selected)
      
      const response = await invoke('upload_image', {
        cardId,
        boardId,
        filePath: selected,
      }) as { success: boolean; filePath: string; error?: string }

      console.log('Upload response:', response)

      if (response.success) {
        toast.success('Image uploaded successfully')
        onUploadComplete?.(response.filePath)
      } else {
        console.error('Upload failed:', response.error)
        toast.error(response.error || 'Failed to upload image')
      }
    } catch (error) {
      console.error('Upload error:', error)
      const message = error instanceof Error ? error.message : 'Failed to upload image'
      toast.error(message)
    } finally {
      setIsUploading(false)
    }
  }, [cardId, boardId, onUploadComplete])

  const handleRemove = useCallback(async (filePath: string) => {
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
      const message = error instanceof Error ? error.message : 'Failed to remove image'
      toast.error(message)
    } finally {
      setIsRemoving(null)
    }
  }, [cardId, boardId, onRemoveComplete])

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
          {isUploading ? 'Uploading...' : 'Add Image'}
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
          {isUploading ? 'Uploading...' : 'Add Image'}
        </Button>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {attachments.map((filePath) => {
          const imageUrl = imageUrls.get(filePath)
          const filename = filePath.split('/').pop() || filePath
          
          return (
            <div key={filePath} className="relative group border rounded-lg overflow-hidden">
              <div className="aspect-square bg-muted flex items-center justify-center">
                {imageUrl ? (
                  <button
                    type="button"
                    className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform border-0 bg-transparent p-0"
                    onClick={() => setSelectedImage(filePath)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setSelectedImage(filePath)
                      }
                    }}
                  >
                    <img
                      src={imageUrl}
                      alt={filename}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <ImageIcon className="h-8 w-8" />
                    <span className="text-xs">Loading...</span>
                  </div>
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
                <p className="text-xs truncate font-medium">{filename}</p>
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
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setSelectedImage(null)
            }
          }}
        >
          <div 
            className="relative max-w-4xl max-h-full bg-background rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
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
                src={imageUrls.get(selectedImage)}
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
