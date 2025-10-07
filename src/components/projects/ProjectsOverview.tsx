export function ProjectsOverview() {
  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-6">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">Projects</h1>
        <p className="text-sm text-muted-foreground">
          Browse all active projects managed within the workspace.
        </p>
      </header>
      <div className="rounded-lg border border-border/60 bg-background p-6 text-sm text-muted-foreground">
        <p>
          This is a placeholder view. Integrate your project list or dashboard
          here.
        </p>
      </div>
    </div>
  )
}

export default ProjectsOverview
