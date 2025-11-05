import { Link } from 'react-router-dom'
import { useFavoriteBoards } from '@/hooks/useFavoriteBoards'
import { ProjectCard } from '../cards/ProjectCard'
import { Button } from '@/components/ui/button'

export function FavoritesSection() {
  const { data: favorites, isLoading, error } = useFavoriteBoards()

  if (error) {
    return (
      <div className="text-sm text-red-500">
        Failed to load favorite projects. Please try again.
      </div>
    )
  }

  if (!isLoading && (!favorites || favorites.length === 0)) {
    return (
      <div className="text-sm text-muted-foreground">
        No favorite projects yet. Star your favorite boards to see them here!
      </div>
    )
  }

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {favorites?.map((board) => (
        <ProjectCard
          key={board.id}
          board={board}
          onClick={() => {
            // TODO: Navigate to board
            console.log('Navigate to board:', board.id)
          }}
        />
      )) || (
        // Skeleton loaders
        Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4 space-y-3 animate-pulse">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 bg-muted rounded-lg" />
              <div className="space-y-2">
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-3 w-24 bg-muted rounded" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="h-3 w-full bg-muted rounded" />
              <div className="h-3 w-3/4 bg-muted rounded" />
            </div>
          </div>
        ))
      )}
    </div>
  )
}
