import { Plus, FileText, Search } from 'lucide-react'
import { QuickActionCard } from '../cards/QuickActionCard'

export function QuickActionsSection() {
  const actions = [
    {
      icon: Plus,
      label: 'New Project',
      shortcut: 'Cmd+N',
      description: 'Create a new project board',
      delay: 0,
      onClick: () => {
        // TODO: Open create board dialog
        console.log('Create board')
      },
    },
    {
      icon: FileText,
      label: 'New Task',
      shortcut: 'Cmd+T',
      description: 'Add a task to any board',
      delay: 0.05,
      onClick: () => {
        // TODO: Open quick add task
        console.log('Create task')
      },
    },
    {
      icon: Search,
      label: 'Search',
      shortcut: 'Cmd+K',
      description: 'Find anything quickly',
      delay: 0.1,
      onClick: () => {
        // TODO: Open command palette
        console.log('Open search')
      },
    },
  ]

  return (
    <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
        {actions.map((action) => (
          <QuickActionCard
            key={action.label}
            icon={action.icon}
            label={action.label}
            description={action.description}
            shortcut={action.shortcut}
            onClick={action.onClick}
            delay={action.delay}
          />
        ))}
    </div>
  )
}
