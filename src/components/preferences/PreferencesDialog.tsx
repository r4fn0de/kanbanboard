import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { SidebarProvider } from '@/components/ui/sidebar'
import { useUIStore } from '@/store/ui-store'
import { AppearancePane } from './panes/AppearancePane'
import { WorkspacesPane } from './panes/WorkspacesPane'
import { StoragePane } from './panes/StoragePane'
import { PreferencesSidebar, type PreferencePane } from './PreferencesSidebar'

const getPaneTitle = (pane: PreferencePane): string => {
  switch (pane) {
    case 'appearance':
      return 'Appearance'
    case 'workspaces':
      return 'Workspaces'
    case 'storage':
      return 'Storage'
    default:
      return 'Appearance'
  }
}

export function PreferencesDialog() {
  const {
    preferencesOpen,
    setPreferencesOpen,
    preferencesActivePane,
    setPreferencesActivePane,
    editingWorkspaceId,
    setEditingWorkspaceId,
  } = useUIStore()
  const activePane = preferencesActivePane

  // Clear editing workspace when dialog closes
  const handleOpenChange = (open: boolean) => {
    setPreferencesOpen(open)
    if (!open) {
      setEditingWorkspaceId(null)
    }
  }

  return (
    <Dialog open={preferencesOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="overflow-hidden p-0 md:max-h-[600px] md:max-w-[900px] lg:max-w-[1000px] font-sans rounded-xl">
        <DialogTitle className="sr-only">Preferences</DialogTitle>
        <DialogDescription className="sr-only">
          Customize your application preferences here.
        </DialogDescription>

        <SidebarProvider className="items-stretch h-full">
          <div className="flex h-full">
            <PreferencesSidebar
              activePane={activePane}
              onChange={setPreferencesActivePane}
            />
            <main className="flex flex-1 flex-col overflow-hidden">
              <header className="flex h-16 shrink-0 items-center gap-2">
                <div className="flex items-center gap-2 px-4">
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem className="hidden md:block">
                        <BreadcrumbLink href="#">Preferences</BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator className="hidden md:block" />
                      <BreadcrumbItem>
                        <BreadcrumbPage>
                          {getPaneTitle(activePane)}
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>
              </header>

              <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 pt-0 max-h-[calc(600px-4rem)]">
                {activePane === 'appearance' && <AppearancePane />}
                {activePane === 'workspaces' && (
                  <WorkspacesPane editingWorkspaceId={editingWorkspaceId} />
                )}
                {activePane === 'storage' && <StoragePane />}
              </div>
            </main>
          </div>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  )
}

export default PreferencesDialog
