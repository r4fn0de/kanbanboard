import { useState, useEffect } from 'react'
import { useUIStore } from '@/store/ui-store'

export type WidgetType = 'overview' | 'quick-actions' | 'favorites' | 'activity' | 'deadlines'

export interface WidgetConfig {
  id: string
  type: WidgetType
  title: string
  visible: boolean
  order: number
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: '1', type: 'overview', title: 'Overview', visible: true, order: 0 },
  { id: '2', type: 'quick-actions', title: 'Quick Actions', visible: true, order: 1 },
  { id: '3', type: 'favorites', title: 'Favorite Projects', visible: true, order: 2 },
  { id: '4', type: 'activity', title: 'Recent Activity', visible: true, order: 3 },
  { id: '5', type: 'deadlines', title: 'Upcoming Deadlines', visible: true, order: 4 },
]

export function useWidgetLayout() {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(DEFAULT_WIDGETS)
  const { setWidgetLayout } = useUIStore()

  // Load widgets from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('widget-layout')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setWidgets(parsed)
      } catch (error) {
        console.error('Failed to load widget layout:', error)
      }
    }
  }, [])

  // Save widgets to localStorage when they change
  useEffect(() => {
    localStorage.setItem('widget-layout', JSON.stringify(widgets))
    if (setWidgetLayout) {
      setWidgetLayout(widgets)
    }
  }, [widgets, setWidgetLayout])

  const toggleWidget = (id: string) => {
    setWidgets(prev =>
      prev.map(widget =>
        widget.id === id ? { ...widget, visible: !widget.visible } : widget
      )
    )
  }

  const reorderWidgets = (activeId: string, overId: string) => {
    setWidgets(prev => {
      const oldIndex = prev.findIndex(widget => widget.id === activeId)
      const newIndex = prev.findIndex(widget => widget.id === overId)

      if (oldIndex === -1 || newIndex === -1) return prev

      const newWidgets = [...prev]
      const [movedWidget] = newWidgets.splice(oldIndex, 1)
      newWidgets.splice(newIndex, 0, movedWidget)

      // Update order numbers
      return newWidgets.map((widget, index) => ({
        ...widget,
        order: index,
      }))
    })
  }

  const resetLayout = () => {
    setWidgets(DEFAULT_WIDGETS)
  }

  return {
    widgets: widgets.sort((a, b) => a.order - b.order),
    toggleWidget,
    reorderWidgets,
    resetLayout,
  }
}
