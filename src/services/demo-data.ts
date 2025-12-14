import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { useWorkspaceStore } from '@/store/workspace-store'
import { createNote } from './notes'
import {
  createBoard,
  createCard,
  createColumn,
  createSubtask,
  createTag,
  kanbanQueryKeys,
} from './kanban'
import { createWorkspace, workspaceQueryKeys } from './workspaces'

export const WHITEBOARD_SEED_PREFIX = 'demo-whiteboard-seed:'

export const getWhiteboardSeedKey = (boardId: string) =>
  `${WHITEBOARD_SEED_PREFIX}${boardId}`

export interface WhiteboardSeedShape {
  type: string
  x?: number
  y?: number
  props?: Record<string, unknown>
}

export interface WhiteboardSeedPayload {
  shapes: WhiteboardSeedShape[]
}

interface DemoDataResult {
  workspaceId: string
  boardId: string
}

const generateId = (prefix: string) =>
  `${prefix}-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(16).slice(2)}`

const daysFromNow = (days: number) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()

const persistWhiteboardSeed = (boardId: string) => {
  if (typeof window === 'undefined') return

  const payload: WhiteboardSeedPayload = {
    shapes: [
      {
        type: 'geo',
        x: -320,
        y: -140,
        props: {
          w: 360,
          h: 200,
          geo: 'rectangle',
          color: 'violet',
          text: 'Launch plan',
        },
      },
      {
        type: 'geo',
        x: 120,
        y: 40,
        props: {
          w: 300,
          h: 160,
          geo: 'ellipse',
          color: 'green',
          text: 'Design explorations',
        },
      },
      {
        type: 'geo',
        x: -120,
        y: 140,
        props: {
          w: 260,
          h: 140,
          geo: 'diamond',
          color: 'orange',
          text: 'Risks & mitigations',
        },
      },
    ],
  }

  try {
    window.localStorage.setItem(
      getWhiteboardSeedKey(boardId),
      JSON.stringify(payload)
    )
  } catch (error) {
    console.warn('Unable to persist whiteboard demo seed', error)
  }
}

const createDemoData = async (): Promise<DemoDataResult> => {
  const workspaceId = generateId('demo-ws')
  const boardId = generateId('demo-board')

  await createWorkspace({
    id: workspaceId,
    name: 'Demo workspace',
    color: '#22C55E',
    iconPath: null,
  })

  await createBoard({
    id: boardId,
    workspaceId,
    title: 'Launch plan (demo)',
    description:
      'Sample workspace with projects, tasks, notes, and a whiteboard sketch.',
    icon: 'Rocket',
    emoji: '🚀',
    color: '#7C3AED',
  })

  const columns = [
    {
      id: generateId('col'),
      title: 'Backlog',
      position: 0,
      color: '#A855F7',
    },
    {
      id: generateId('col'),
      title: 'In Progress',
      position: 1,
      color: '#2563EB',
    },
    {
      id: generateId('col'),
      title: 'Review',
      position: 2,
      color: '#F59E0B',
    },
    {
      id: generateId('col'),
      title: 'Done',
      position: 3,
      color: '#22C55E',
    },
  ]

  for (const column of columns) {
    await createColumn({
      id: column.id,
      boardId,
      title: column.title,
      position: column.position,
      color: column.color,
      icon: null,
      isEnabled: true,
      wipLimit: null,
    })
  }

  const tags = [
    { id: generateId('tag'), label: 'Product', color: '#A855F7' },
    { id: generateId('tag'), label: 'Design', color: '#F97316' },
    { id: generateId('tag'), label: 'Engineering', color: '#0EA5E9' },
    { id: generateId('tag'), label: 'Blocked', color: '#EF4444' },
  ]

  await Promise.all(
    tags.map(tag =>
      createTag({
        id: tag.id,
        boardId,
        label: tag.label,
        color: tag.color,
      })
    )
  )

  const tagByLabel = new Map(tags.map(tag => [tag.label, tag.id]))
  const columnByTitle = new Map(columns.map(col => [col.title, col.id]))

  const cards = [
    {
      title: 'Collect early customer feedback',
      description:
        'Schedule 5 quick chats with current power users to validate the new navigation.',
      priority: 'medium' as const,
      column: 'Backlog',
      dueDate: daysFromNow(10),
      tags: ['Product'],
      subtasks: [
        'Draft interview outline',
        'Invite customers',
        'Synthesize findings',
      ],
    },
    {
      title: 'Define success metrics',
      description:
        'Agree on activation, retention, and latency targets for launch.',
      priority: 'low' as const,
      column: 'Backlog',
      dueDate: null,
      tags: ['Product'],
      subtasks: ['Draft metrics', 'Share for review'],
    },
    {
      title: 'Build onboarding checklist',
      description:
        'Add inline tips, shortcuts, and empty-state helpers for new users.',
      priority: 'high' as const,
      column: 'In Progress',
      dueDate: daysFromNow(5),
      tags: ['Engineering', 'Design'],
      subtasks: [
        'Instrument analytics events',
        'Add contextual tooltips',
        'QA happy path',
      ],
    },
    {
      title: 'Design whiteboard starter templates',
      description: 'Create 3 quick-start canvases for planning and retros.',
      priority: 'medium' as const,
      column: 'In Progress',
      dueDate: daysFromNow(7),
      tags: ['Design'],
      subtasks: ['Sketch layout', 'Peer review'],
    },
    {
      title: 'Pricing page copy review',
      description:
        'Align messaging with updated feature set and collect localized strings.',
      priority: 'medium' as const,
      column: 'Review',
      dueDate: daysFromNow(4),
      tags: ['Product', 'Design'],
      subtasks: ['Draft hero copy', 'Review with marketing'],
    },
    {
      title: 'Ship hotfix for notification badge',
      description: 'Fix badge counter mismatch across devices.',
      priority: 'medium' as const,
      column: 'Done',
      dueDate: null,
      tags: ['Engineering'],
      subtasks: ['Identify root cause', 'Patch & verify'],
    },
  ]

  const positions = new Map<string, number>()

  for (const card of cards) {
    const columnId = columnByTitle.get(card.column)
    if (!columnId) continue

    const position = positions.get(columnId) ?? 0

    const cardId = generateId('card')
    await createCard({
      id: cardId,
      boardId,
      columnId,
      title: card.title,
      description: card.description,
      position,
      priority: card.priority,
      dueDate: card.dueDate,
      remindAt: null,
      tagIds: (card.tags ?? [])
        .map(label => tagByLabel.get(label))
        .filter((id): id is string => Boolean(id)),
    })

    for (const [index, title] of (card.subtasks ?? []).entries()) {
      await createSubtask({
        id: generateId('subtask'),
        boardId,
        cardId,
        title,
        position: index,
      })
    }

    positions.set(columnId, position + 1)
  }

  await createNote({
    id: generateId('note'),
    boardId,
    title: 'Demo note: kickoff agenda',
    content:
      '- Align on launch scope\n- Review risks & owners\n- Confirm success metrics\n- Plan comms for beta users',
  })

  await createNote({
    id: generateId('note'),
    boardId,
    title: 'Demo note: follow-ups',
    content:
      '- Draft release blog post\n- Prepare support macros\n- Update in-app changelog',
  })

  persistWhiteboardSeed(boardId)

  return { workspaceId, boardId }
}

export function useAddDemoData() {
  const queryClient = useQueryClient()
  const setSelectedWorkspaceId = useWorkspaceStore(
    state => state.setSelectedWorkspaceId
  )

  return useMutation({
    mutationFn: createDemoData,
    onSuccess: ({ workspaceId, boardId }) => {
      setSelectedWorkspaceId(workspaceId)

      toast.success('Demo data added', {
        description:
          'Workspace, tasks, notes, and a whiteboard sketch were created.',
      })

      queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.all })
      queryClient.invalidateQueries({ queryKey: ['workspace', 'status'] })
      queryClient.invalidateQueries({ queryKey: kanbanQueryKeys.boards() })
      queryClient.invalidateQueries({
        queryKey: kanbanQueryKeys.columns(boardId),
      })
      queryClient.invalidateQueries({
        queryKey: kanbanQueryKeys.cards(boardId),
      })
      queryClient.invalidateQueries({ queryKey: kanbanQueryKeys.tags(boardId) })
      queryClient.invalidateQueries({ queryKey: ['notes', boardId] })
    },
    onError: error => {
      const description =
        error instanceof Error ? error.message : 'Unknown error occurred'
      toast.error('Failed to add demo data', { description })
    },
  })
}
