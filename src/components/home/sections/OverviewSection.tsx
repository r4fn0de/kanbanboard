import { FolderKanban, CheckSquare, CheckCheck, AlertCircle } from 'lucide-react'
import { useTaskStats } from '@/hooks/useTaskStats'
import { StatsCard } from '../cards/StatsCard'

export function OverviewSection() {
  const { data: stats, isLoading, error } = useTaskStats()

  if (error) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-red-500">
          Failed to load statistics. Please try again.
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <StatsCard
          icon={FolderKanban}
          label="Active Projects"
          value={stats?.active_projects ?? 0}
          total={stats?.total_projects}
          variant="primary"
          loading={isLoading}
          delay={0}
        />
        <StatsCard
          icon={CheckSquare}
          label="Tasks Today"
          value={stats?.tasks_today ?? 0}
          variant="default"
          loading={isLoading}
          delay={0.1}
        />
        <StatsCard
          icon={CheckCheck}
          label="Completed This Week"
          value={stats?.completed_this_week ?? 0}
          variant="success"
          loading={isLoading}
          delay={0.2}
        />
        <StatsCard
          icon={AlertCircle}
          label="Overdue"
          value={stats?.overdue_tasks ?? 0}
          variant="danger"
          loading={isLoading}
          delay={0.3}
        />
    </div>
  )
}
