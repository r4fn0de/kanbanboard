import { useMemo, useState } from 'react'
import { AlertTriangle, HardDriveIcon, RefreshCw, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  useClearAttachments,
  useResetApplicationData,
  useStorageStats,
} from '@/services/storage'

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  )
  const value = bytes / Math.pow(1024, exponent)
  const decimals = value < 10 && exponent > 0 ? 1 : 0

  return `${value.toFixed(decimals)} ${units[exponent]}`
}

export function StoragePane() {
  const statsQuery = useStorageStats()
  const clearAttachmentsMutation = useClearAttachments()
  const resetDataMutation = useResetApplicationData()

  const [confirmClearOpen, setConfirmClearOpen] = useState(false)
  const [confirmResetOpen, setConfirmResetOpen] = useState(false)

  const stats = statsQuery.data

  const storageBreakdown = useMemo(() => {
    if (!stats) {
      return []
    }

    return [
      {
        id: 'database',
        label: 'Database',
        value: stats.databaseBytes,
        path: stats.databasePath,
        description: 'Core Kanban data including boards, cards, and metadata.',
      },
      {
        id: 'attachments',
        label: 'Attachments',
        value: stats.attachmentsBytes,
        path: stats.attachmentsPath,
        description: 'Uploaded files attached to cards across all workspaces.',
      },
      {
        id: 'workspaceIcons',
        label: 'Workspace Icons',
        value: stats.workspaceIconsBytes,
        path: stats.workspaceIconsPath,
        description: 'Custom icons stored for workspaces.',
      },
      {
        id: 'preferences',
        label: 'Preferences',
        value: stats.preferencesBytes,
        path: stats.preferencesPath,
        description: 'Local preferences file storing appearance and navigation settings.',
      },
    ]
  }, [stats])

  const totalBytes = stats?.totalBytes ?? 0
  const isLoading = statsQuery.isLoading
  const isRefetching = statsQuery.isFetching && !statsQuery.isLoading

  const handleClearAttachments = () => {
    clearAttachmentsMutation.mutate(undefined, {
      onSuccess: () => {
        setConfirmClearOpen(false)
      },
    })
  }

  const handleResetData = () => {
    resetDataMutation.mutate(undefined, {
      onSuccess: () => {
        setConfirmResetOpen(false)
        // Reload the renderer to ensure state sync with the freshly reset database
        setTimeout(() => {
          window.location.reload()
        }, 500)
      },
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="gap-1">
          <CardTitle className="flex items-center gap-2">
            <HardDriveIcon className="h-5 w-5" /> Storage usage
          </CardTitle>
          <CardDescription>
            Monitor how Modulo uses local disk storage. Clearing attachments
            only removes files that are safe to delete. Resetting data wipes the
            entire workspace, including the database.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : stats ? (
            <div className="space-y-6">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Total usage
                </Label>
                <div className="mt-1 text-2xl font-semibold">
                  {formatBytes(stats.totalBytes)}
                </div>
                {isRefetching ? (
                  <div className="text-xs text-muted-foreground">
                    Refreshing metrics…
                  </div>
                ) : null}
              </div>

              <div className="space-y-5">
                {storageBreakdown.map(item => {
                  const percent = totalBytes
                    ? Math.round((item.value / totalBytes) * 1000) / 10
                    : 0

                  return (
                    <div key={item.id} className="space-y-2">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            {item.label}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {formatBytes(item.value)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {item.path}
                          </div>
                        </div>
                      </div>
                      <Progress value={percent} aria-label={`${item.label} usage`} />
                      <div className="text-xs text-muted-foreground">
                        {percent}% of total storage
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
              Failed to load storage usage.{' '}
              <button
                className="font-medium underline underline-offset-4"
                onClick={() => statsQuery.refetch()}
              >
                Try again
              </button>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-wrap justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            Stats are updated locally and never leave your device.
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => statsQuery.refetch()}
            disabled={isLoading || isRefetching}
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" /> Clear attachments
          </CardTitle>
          <CardDescription>
            Delete all card attachments from disk. Card metadata is preserved,
            but file downloads will be removed.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-between gap-4">
          <div className="text-xs text-muted-foreground">
            Use this if disk usage is high and you no longer need stored files.
          </div>
          <Button
            variant="secondary"
            onClick={() => setConfirmClearOpen(true)}
            disabled={clearAttachmentsMutation.isPending || isLoading}
          >
            Clear attachments
          </Button>
        </CardFooter>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" /> Reset Modulo data
          </CardTitle>
          <CardDescription>
            Removes every workspace, board, card, attachment, and preference.
            This action is irreversible.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-between gap-4">
          <div className="text-xs text-muted-foreground">
            Modulo will restart after completion. Make sure everything is
            backed up.
          </div>
          <Button
            variant="destructive"
            onClick={() => setConfirmResetOpen(true)}
            disabled={resetDataMutation.isPending || isLoading}
          >
            Reset application
          </Button>
        </CardFooter>
      </Card>

      <AlertDialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove all attachments?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes every file stored in the attachments directory. Card
              references will remain but downloads will be unavailable until new
              files are uploaded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearAttachmentsMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={event => {
                event.preventDefault()
                handleClearAttachments()
              }}
              disabled={clearAttachmentsMutation.isPending}
            >
              {clearAttachmentsMutation.isPending ? 'Clearing…' : 'Delete attachments'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmResetOpen} onOpenChange={setConfirmResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset all local data?</AlertDialogTitle>
            <AlertDialogDescription>
              This wipes the database, attachments, preferences, and workspace
              icons. Modulo will reload with a fresh setup. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetDataMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={event => {
                event.preventDefault()
                handleResetData()
              }}
              disabled={resetDataMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {resetDataMutation.isPending ? 'Resetting…' : 'Reset everything'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default StoragePane
