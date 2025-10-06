import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export function HomeWelcome() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 p-6 text-center">
      <div className="max-w-xl space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Welcome to Kanbanboard
        </h1>
        <p className="text-base text-muted-foreground">
          Organize your work, keep projects on track, and stay focused. Use the sidebar to jump into your boards or explore projects curated for your team.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg">
          <Link to="/boards" className="flex items-center gap-2">
            <span>Go to Boards</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link to="/projects/all">Browse Projects</Link>
        </Button>
      </div>
      <div className="grid gap-4 text-left sm:grid-cols-2">
        <div className="rounded-lg border border-border/60 bg-background p-4 shadow-sm">
          <h2 className="text-sm font-medium text-foreground">Capture work fast</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Create boards for products, teams, or personal goals. Each card keeps the context you need right where you need it.
          </p>
        </div>
        <div className="rounded-lg border border-border/60 bg-background p-4 shadow-sm">
          <h2 className="text-sm font-medium text-foreground">Focus on priorities</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            View favorite projects, track deadlines, and spot blockers early so the team stays aligned.
          </p>
        </div>
      </div>
    </div>
  )
}

export default HomeWelcome
