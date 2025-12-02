import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { HardDriveIcon, TrashIcon, WarningIcon } from '@/components/ui/icons'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
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
  useExportApplicationData,
  useImportApplicationData,
} from '@/services/storage'
import { save, open } from '@tauri-apps/plugin-dialog'
import { relaunch } from '@tauri-apps/plugin-process'

const SettingsSection: React.FC<{
  title: string
  children: ReactNode
}> = ({ title, children }) => (
  <div className="space-y-4">
    <div>
      <h3 className="text-lg font-medium text-foreground">{title}</h3>
      <Separator className="mt-2" />
    </div>
    <div className="space-y-4">{children}</div>
  </div>
)

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
  const navigate = useNavigate()
  const statsQuery = useStorageStats()
  const clearAttachmentsMutation = useClearAttachments()
  const resetDataMutation = useResetApplicationData()
  const exportDataMutation = useExportApplicationData()
  const importDataMutation = useImportApplicationData()

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
        description:
          'Local preferences file storing appearance and navigation settings.',
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

  const handleImportData = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: 'ZIP archive',
            extensions: ['zip'],
          },
        ],
      })

      if (!selected) return

      const backupPath = Array.isArray(selected) ? selected[0] : selected
      if (!backupPath) return

      importDataMutation.mutate(backupPath, {
        onSuccess: () => {
          // Relaunch the entire application so the backend picks up the restored database
          void relaunch()
        },
      })
    } catch {
      // errors are surfaced via mutation onError/toasts
    }
  }

  const handleExportData = async () => {
    try {
      const now = new Date()
      const pad = (n: number) => n.toString().padStart(2, '0')
      const yyyy = now.getFullYear()
      const mm = pad(now.getMonth() + 1)
      const dd = pad(now.getDate())
      const hh = pad(now.getHours())
      const mi = pad(now.getMinutes())

      const defaultFileName = `modulo-backup-${yyyy}${mm}${dd}-${hh}${mi}.zip`

      const selectedPath = await save({
        defaultPath: defaultFileName,
        filters: [
          {
            name: 'ZIP archive',
            extensions: ['zip'],
          },
        ],
      })

      if (!selectedPath) return

      exportDataMutation.mutate(selectedPath)
    } catch {
      // errors are surfaced via mutation onError/toasts
    }
  }

  const handleResetData = () => {
    resetDataMutation.mutate(undefined, {
      onSuccess: () => {
        setConfirmResetOpen(false)
        // Navigate to a safe route before reloading to avoid opening a deleted project
        navigate('/', { replace: true })
        // Reload the renderer to ensure state sync with the freshly reset database
        setTimeout(() => {
          window.location.reload()
        }, 500)
      },
    })
  }

  return (
    <div className="space-y-6">
      <SettingsSection title="Storage usage">
        <div className="flex items-center gap-2">
          <HardDriveIcon className="h-5 w-5" />
          <p className="text-sm text-muted-foreground">
            Monitor how Modulo uses local disk storage. Clearing attachments
            only removes files that are safe to delete. Resetting data wipes the
            entire workspace, including the database.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : stats ? (
          <div className="space-y-4 rounded-lg border border-border/60 bg-muted/30 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Total usage
                </Label>
                <div className="mt-1 text-2xl font-semibold">
                  {formatBytes(stats.totalBytes)}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {isRefetching ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-background/60 px-2 py-0.5">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    <span>Refreshing metrics…</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-background/60 px-2 py-0.5">
                    <span>{formatBytes(stats.totalBytes)}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {storageBreakdown.map(item => {
                const percent = totalBytes
                  ? Math.round((item.value / totalBytes) * 1000) / 10
                  : 0

                return (
                  <div
                    key={item.id}
                    className="space-y-2 rounded-md bg-background/70 p-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {item.label}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {formatBytes(item.value)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                          {percent}% of total
                        </span>
                        <span className="max-w-[220px] truncate text-[11px] font-mono text-muted-foreground/80">
                          {item.path}
                        </span>
                      </div>
                    </div>
                    <Progress
                      value={percent}
                      aria-label={`${item.label} usage`}
                    />
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

        <div className="flex flex-wrap justify-between gap-2">
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
        </div>
      </SettingsSection>

      <SettingsSection title="Backups">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Create a ZIP backup of your local Modulo data, including boards,
              cards, notes, attachments, preferences, and shortcuts. Use this
              file to restore your workspace on another machine.
            </p>
            <p className="text-xs text-muted-foreground">
              The backup stays on your device and is not uploaded anywhere.
            </p>
            <p className="text-xs text-muted-foreground">
              Restoring from a backup will overwrite your current local data and
              reload Modulo.
            </p>
          </div>
          <div className="space-y-3">
            <Button
              className="w-full justify-between"
              variant="secondary"
              onClick={() => void handleExportData()}
              disabled={exportDataMutation.isPending || isLoading}
            >
              <span>Export data for backup</span>
            </Button>
            <Button
              className="w-full justify-between"
              variant="secondary"
              onClick={() => void handleImportData()}
              disabled={importDataMutation.isPending || isLoading}
            >
              <span>Import data from backup</span>
            </Button>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Maintenance tools">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-4">
            <p className="text-sm font-medium text-foreground">
              Clear attachments
            </p>
            <p className="text-sm text-muted-foreground">
              Delete all card attachments from disk. Card metadata is preserved,
              but file downloads will be removed.
            </p>
            <p className="text-xs text-muted-foreground">
              Use this if disk usage is high and you no longer need stored
              files.
            </p>
            <Button
              variant="secondary"
              onClick={() => setConfirmClearOpen(true)}
              disabled={clearAttachmentsMutation.isPending || isLoading}
            >
              <TrashIcon className="mr-2 h-4 w-4" />
              Clear attachments
            </Button>
          </div>

          <div className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
            <p className="text-sm font-medium text-destructive">
              Reset Modulo data
            </p>
            <p className="text-sm text-destructive/90">
              Removes every workspace, board, card, attachment, and preference.
              This action is irreversible.
            </p>
            <p className="text-xs text-destructive/80">
              Modulo will restart after completion. Make sure everything is
              backed up.
            </p>
            <Button
              variant="destructive"
              onClick={() => setConfirmResetOpen(true)}
              disabled={resetDataMutation.isPending || isLoading}
            >
              <WarningIcon className="mr-2 h-4 w-4" />
              Reset application
            </Button>
          </div>
        </div>
      </SettingsSection>

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
              {clearAttachmentsMutation.isPending
                ? 'Clearing…'
                : 'Delete attachments'}
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
              icons. Modulo will reload with a fresh setup. This cannot be
              undone.
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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 border-0"
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
