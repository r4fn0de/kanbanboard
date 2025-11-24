import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { RotateCcw } from 'lucide-react'
import { useWidgetLayout } from '@/hooks/useWidgetLayout'
import { cn } from '@/lib/utils'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { widgets, toggleWidget, resetLayout } = useWidgetLayout()

  const handleToggle = (id: string) => {
    toggleWidget(id)
  }

  const handleReset = () => {
    resetLayout()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Customize Dashboard</DialogTitle>
          <DialogDescription>
            Choose which widgets to display and reorder them by dragging.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {widgets.map(widget => (
            <div
              key={widget.id}
              className={cn(
                'flex items-center justify-between p-3 rounded-lg border transition-all',
                'hover:bg-muted/50',
                !widget.visible && 'opacity-50'
              )}
            >
              <div className="flex items-center gap-3">
                <div className="text-sm font-medium">{widget.title}</div>
                {!widget.visible && (
                  <span className="text-xs text-muted-foreground">
                    (hidden)
                  </span>
                )}
              </div>
              <Switch
                checked={widget.visible}
                onCheckedChange={() => handleToggle(widget.id)}
              />
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset to Default
          </Button>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
