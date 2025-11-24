import { useState, useCallback, useEffect } from 'react'
import Cropper from 'react-easy-crop'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { ZoomIn, ZoomOut, RotateCw, Check, X } from 'lucide-react'

interface CroppedAreaPixels {
  x: number
  y: number
  width: number
  height: number
}

interface ImageCropperProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageSrc: string
  onCropComplete: (croppedImageBlob: Blob) => void
  onCancel?: () => void
  aspectRatio?: number
  recommendedSize?: string
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', error => reject(error))
    // Don't set crossOrigin for blob URLs
    if (!url.startsWith('blob:')) {
      image.setAttribute('crossOrigin', 'anonymous')
    }
    image.src = url
  })

const getCroppedImg = async (
  imageSrc: string,
  pixelCrop: CroppedAreaPixels
): Promise<Blob> => {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }

  // Set canvas size to the cropped area
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  // Draw the cropped image
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (!blob) {
          reject(new Error('Failed to create blob'))
          return
        }
        resolve(blob)
      },
      'image/png',
      1
    )
  })
}

export function ImageCropper({
  open,
  onOpenChange,
  imageSrc,
  onCropComplete,
  onCancel,
  aspectRatio = 1,
  recommendedSize = '64x64px',
}: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [rotation, setRotation] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] =
    useState<CroppedAreaPixels | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)

  const onCropAreaChange = useCallback(
    (croppedAreaPixels: CroppedAreaPixels) => {
      setCroppedAreaPixels(croppedAreaPixels)
    },
    []
  )

  const onMediaLoaded = useCallback(() => {
    setImageLoaded(true)
    setImageError(null)
  }, [])

  const handleCropConfirm = useCallback(async () => {
    if (!croppedAreaPixels) return

    try {
      setIsProcessing(true)
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels)
      onCropComplete(croppedImageBlob)
    } catch (error) {
      console.error('Error cropping image:', error)
    } finally {
      setIsProcessing(false)
    }
  }, [imageSrc, croppedAreaPixels, onCropComplete])

  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel()
    }
    onOpenChange(false)
  }, [onCancel, onOpenChange])

  const handleDialogOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen && !isProcessing) {
        handleCancel()
      }
    },
    [handleCancel, isProcessing]
  )

  // Reset states when dialog opens/closes
  const resetStates = useCallback(() => {
    setImageLoaded(false)
    setImageError(null)
    setCrop({ x: 0, y: 0 })
    setRotation(0)
    setZoom(1)
    setCroppedAreaPixels(null)
    setIsProcessing(false)
  }, [])

  // Reset rotation helper
  const handleResetRotation = useCallback(() => {
    setRotation(0)
  }, [])

  // Zoom helpers
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.1, 3))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.1, 1))
  }, [])

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      resetStates()
    }
  }, [open, resetStates])

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Crop & Adjust Image</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Recommended: {recommendedSize}
            </span>
            {imageLoaded && (
              <span className="text-xs text-green-500 flex items-center gap-1">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Image loaded
              </span>
            )}
          </div>

          <div className="relative h-96 w-full overflow-hidden rounded-xl border-2 border-border bg-muted/30">
            {imageError ? (
              <div className="absolute inset-0 flex items-center justify-center z-50 bg-background/95">
                <div className="text-center space-y-2">
                  <div className="text-4xl">⚠️</div>
                  <div className="text-sm font-medium">
                    Failed to load image
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {imageError}
                  </div>
                </div>
              </div>
            ) : null}

            {!imageLoaded && !imageError && (
              <div className="absolute inset-0 flex items-center justify-center z-40 bg-background/95">
                <div className="text-center space-y-2">
                  <div className="animate-spin text-4xl">⏳</div>
                  <div className="text-sm text-muted-foreground">
                    Loading image...
                  </div>
                </div>
              </div>
            )}

            <Cropper
              image={imageSrc}
              crop={crop}
              rotation={rotation}
              zoom={zoom}
              aspect={aspectRatio}
              onCropChange={setCrop}
              onRotationChange={setRotation}
              onCropComplete={onCropAreaChange}
              onZoomChange={setZoom}
              onMediaLoaded={onMediaLoaded}
              cropShape="round"
              showGrid={false}
              objectFit="contain"
              restrictPosition={true}
              style={{
                containerStyle: {
                  width: '100%',
                  height: '100%',
                  position: 'relative',
                  backgroundColor: 'hsl(var(--muted))',
                },
                mediaStyle: {
                  objectFit: 'contain',
                },
                cropAreaStyle: {
                  border: '3px solid hsl(var(--primary))',
                  boxShadow: '0 0 0 9999em rgba(0, 0, 0, 0.5)',
                  color: 'rgba(255, 255, 255, 0.5)',
                },
              }}
            />
          </div>

          <div className="space-y-4 bg-muted/50 p-4 rounded-lg">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <ZoomIn className="h-4 w-4" />
                  Zoom
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleZoomOut}
                    disabled={zoom <= 1}
                    className="h-7 w-7 p-0"
                  >
                    <ZoomOut className="h-3 w-3" />
                  </Button>
                  <span className="text-xs text-muted-foreground font-mono min-w-12 text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleZoomIn}
                    disabled={zoom >= 3}
                    className="h-7 w-7 p-0"
                  >
                    <ZoomIn className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <Slider
                value={[zoom]}
                onValueChange={value => setZoom(value[0] ?? 1)}
                min={1}
                max={3}
                step={0.01}
                className="w-full"
                disabled={!imageLoaded}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <RotateCw className="h-4 w-4" />
                  Rotation
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleResetRotation}
                    disabled={rotation === 0}
                    className="h-7 px-2 text-xs"
                  >
                    Reset
                  </Button>
                  <span className="text-xs text-muted-foreground font-mono min-w-12 text-center">
                    {rotation}°
                  </span>
                </div>
              </div>
              <Slider
                value={[rotation]}
                onValueChange={value => setRotation(value[0] ?? 0)}
                min={-180}
                max={180}
                step={1}
                className="w-full"
                disabled={!imageLoaded}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleCancel}
            disabled={isProcessing}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleCropConfirm}
            disabled={isProcessing || !croppedAreaPixels || !imageLoaded}
            className="gap-2"
          >
            {isProcessing ? (
              <>
                <span className="animate-spin">⏳</span>
                Processing...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Apply Crop
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
