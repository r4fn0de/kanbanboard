import type { HTMLAttributes, ReactNode } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@/test/test-utils'
import { EmptyOnboarding } from '@/components/onboarding/EmptyOnboarding'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      ...props
    }: HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) => (
      <div {...props}>{children}</div>
    ),
  },
}))

describe('EmptyOnboarding', () => {
  it('should render welcome message', () => {
    render(<EmptyOnboarding />)

    expect(screen.getByText('Welcome to Modulo')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Your productivity journey starts here. Create your first project to start organizing tasks and managing your workflow effectively.'
      )
    ).toBeInTheDocument()
  })

  it('should render all feature cards', () => {
    render(<EmptyOnboarding />)

    expect(screen.getByText('Organize Projects')).toBeInTheDocument()
    expect(screen.getByText('Boost Productivity')).toBeInTheDocument()
    expect(screen.getByText('Stay Focused')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Create boards to track your work and keep everything organized in one place.'
      )
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Use drag-and-drop to manage tasks, set priorities, and meet deadlines efficiently.'
      )
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Quick actions, smart widgets, and a clean interface help you stay on track.'
      )
    ).toBeInTheDocument()
  })

  it('should call onCreateBoard when button is clicked', () => {
    const handleCreateBoard = vi.fn()
    render(<EmptyOnboarding onCreateBoard={handleCreateBoard} />)

    const button = screen.getByRole('button', {
      name: /create your first project/i,
    })
    fireEvent.click(button)

    expect(handleCreateBoard).toHaveBeenCalledTimes(1)
  })

  it('should render call-to-action button', () => {
    render(<EmptyOnboarding />)

    const button = screen.getByRole('button', {
      name: /create your first project/i,
    })
    expect(button).toBeInTheDocument()
    expect(button.tagName).toBe('BUTTON')
  })

  it('should have proper structure', () => {
    const { container } = render(<EmptyOnboarding />)

    // Check for main container
    const mainContainer = container.firstChild
    expect(mainContainer).toBeInTheDocument()

    // Check for feature grid - checking for generic structure
    // Note: Lucide icons might not be buttons, but Card structure is there
    expect(container.querySelector('.grid')).toBeInTheDocument()
  })

  it('should display welcome text', () => {
    render(<EmptyOnboarding />)
    expect(screen.getByText('Welcome to Modulo')).toBeInTheDocument()
  })
})
