export function ProjectsFavorites() {
  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-6">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">
          Favorite Projects
        </h1>
        <p className="text-sm text-muted-foreground">
          Quickly jump back into the projects you starred most recently.
        </p>
      </header>
      <div className="rounded-lg border border-border/60 bg-background p-6 text-sm text-muted-foreground">
        <p>
          This placeholder keeps the layout consistent until favorites data is
          wired in.
        </p>
      </div>
    </div>
  )
}

export default ProjectsFavorites
