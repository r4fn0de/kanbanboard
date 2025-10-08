import { describe, expect, it } from 'vitest'

import type { KanbanTag } from '@/types/common'
import { getAccessibleTextColor, getTagBadgeStyle } from './utils'

describe('tag utils', () => {
  it('returns dark text for light backgrounds', () => {
    expect(getAccessibleTextColor('#ffffff')).toBe('#1f2937')
  })

  it('returns light text for dark backgrounds', () => {
    expect(getAccessibleTextColor('#111827')).toBe('#ffffff')
  })

  it('returns undefined for invalid colors', () => {
    expect(getAccessibleTextColor('not-a-color')).toBeUndefined()
    expect(getAccessibleTextColor(null)).toBeUndefined()
  })

  it('creates badge style for colored tags', () => {
    const tag: KanbanTag = {
      id: 'tag-1',
      boardId: 'board-1',
      label: 'Important',
      color: '#0ea5e9',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const style = getTagBadgeStyle(tag)
    expect(style).toMatchObject({
      backgroundColor: '#0ea5e9',
      borderColor: '#0ea5e9',
    })
    expect(style?.color).toBeDefined()
  })

  it('returns undefined style when tag has no color', () => {
    const tag: KanbanTag = {
      id: 'tag-2',
      boardId: 'board-1',
      label: 'General',
      color: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    expect(getTagBadgeStyle(tag)).toBeUndefined()
  })
})
