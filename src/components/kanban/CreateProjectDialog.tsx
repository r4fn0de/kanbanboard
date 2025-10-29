import { useState, useEffect, type FormEvent, useId } from 'react'
import { Folder, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateBoard } from '@/services/kanban'
import { toast } from 'sonner'
import {
  PROJECT_ICON_SECTIONS,
  PROJECT_ICON_OPTIONS,
  PROJECT_ICON_MAP,
  DEFAULT_PROJECT_ICON,
} from '@/components/layout/left-sidebar/constants'

interface CreateProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string | null
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  workspaceId,
}: CreateProjectDialogProps) {
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [projectIcon, setProjectIcon] = useState(DEFAULT_PROJECT_ICON)
  const [projectEmoji, setProjectEmoji] = useState('')
  const [projectColor, setProjectColor] = useState('#6366F1')
  const [useEmoji, setUseEmoji] = useState(false)
  const createBoard = useCreateBoard()
  const projectNameId = useId()
  const projectDescriptionId = useId()
  const projectEmojiId = useId()
  const projectColorId = useId()

  useEffect(() => {
    if (!open) {
      // Reset form on close
      setProjectName('')
      setProjectDescription('')
      setProjectIcon(DEFAULT_PROJECT_ICON)
      setProjectEmoji('')
      setProjectColor('#6366F1')
      setUseEmoji(false)
    }
  }, [open])

  const handleClose = (newOpen: boolean) => {
    onOpenChange(newOpen)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (createBoard.isPending) return

    const trimmedName = projectName.trim()
    if (!trimmedName) {
      toast.error('Project name is required')
      return
    }

    if (!workspaceId) {
      toast.error('Select a workspace before creating a project')
      return
    }

    const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`

    createBoard.mutate(
      {
        id,
        workspaceId,
        title: trimmedName,
        description: projectDescription.trim() || undefined,
        icon: useEmoji ? undefined : projectIcon,
        emoji:
          useEmoji && projectEmoji.trim() ? projectEmoji.trim() : undefined,
        color: projectColor,
      },
      {
        onSuccess: () => {
          toast.success('Project created')
          handleClose(false)
        },
        onError: error => {
          const message =
            error instanceof Error ? error.message : 'Unknown error'
          toast.error('Failed to create project', {
            description: message,
          })
        },
      }
    )
  }

  const IconComponent = PROJECT_ICON_MAP[projectIcon] ?? Folder

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create project</DialogTitle>
          <DialogDescription>
            Choose an icon or emoji and customize the color for your project.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Visual Preview */}
          <div className="flex items-center justify-center gap-4 py-6">
            <div
              className="relative flex h-20 w-20 items-center justify-center rounded-2xl transition-all duration-200"
              style={{
                backgroundColor: useEmoji ? projectColor : 'transparent',
                transform: 'scale(1)',
              }}
            >
              {useEmoji && projectEmoji ? (
                <span className="text-4xl">{projectEmoji}</span>
              ) : (
                <IconComponent className="h-14 w-14" style={{ color: projectColor }} />
              )}
            </div>
          </div>

          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor={projectNameId} className="text-sm font-medium">
              Project name
            </Label>
            <Input
              id={projectNameId}
              value={projectName}
              onChange={event => setProjectName(event.target.value)}
              placeholder="e.g. Marketing Launch"
              autoFocus
              required
              className="h-10"
            />
          </div>

          {/* Customization Grid */}
          <div className="grid gap-4">
            {/* Icon or Emoji Toggle */}
            <div className="flex items-center gap-4 rounded-lg p-3">
              <button
                type="button"
                onClick={() => setUseEmoji(false)}
                className={cn(
                  'flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors',
                  !useEmoji
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                )}
              >
                Icon
              </button>
              <button
                type="button"
                onClick={() => setUseEmoji(true)}
                className={cn(
                  'flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors',
                  useEmoji
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                )}
              >
                Emoji
              </button>
            </div>

            {/* Icon Selector (only when not using emoji) */}
            {!useEmoji && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Icon</Label>
                <Select value={projectIcon} onValueChange={setProjectIcon}>
                  <SelectTrigger className="h-10">
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-4 w-4" />
                        <span>
                          {PROJECT_ICON_OPTIONS.find(
                            opt => opt.value === projectIcon
                          )?.label ?? 'Select icon'}
                        </span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_ICON_SECTIONS.map((section, sectionIndex) => (
                      <div key={section.label}>
                        {sectionIndex > 0 && <SelectSeparator />}
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                          {section.label}
                        </div>
                        {section.options.map(option => {
                          const OptionIconComponent = option.icon
                          return (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                <OptionIconComponent className="h-4 w-4" />
                                <span>{option.label}</span>
                              </div>
                            </SelectItem>
                          )
                        })}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Emoji Input (only when using emoji) */}
            {useEmoji && (
              <div className="space-y-2">
                <Label htmlFor={projectEmojiId} className="text-sm font-medium">
                  Emoji
                </Label>
                <Input
                  id={projectEmojiId}
                  value={projectEmoji}
                  onChange={event => {
                    // Only allow single emoji or clear
                    const value = event.target.value
                    if (value.length <= 2) {
                      setProjectEmoji(value)
                    }
                  }}
                  placeholder="😊"
                  className="h-12 text-center text-3xl"
                  maxLength={2}
                />
              </div>
            )}

            {/* Color Picker */}
            <div className="space-y-2">
              <Label htmlFor={projectColorId} className="text-sm font-medium">
                Color
              </Label>
              <div className="flex gap-2">
                <input
                  id={projectColorId}
                  type="color"
                  value={projectColor}
                  onChange={event => setProjectColor(event.target.value)}
                  className="h-10 w-14 cursor-pointer rounded-md"
                />
                <Input
                  value={projectColor}
                  onChange={event => setProjectColor(event.target.value)}
                  placeholder="#6366F1"
                  className="h-10 flex-1 font-mono text-sm"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label
              htmlFor={projectDescriptionId}
              className="text-sm font-medium"
            >
              Description{' '}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id={projectDescriptionId}
              value={projectDescription}
              onChange={event => setProjectDescription(event.target.value)}
              placeholder="What's this project about?"
              rows={3}
              className="resize-none"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={createBoard.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createBoard.isPending}>
              {createBoard.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                'Create project'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

