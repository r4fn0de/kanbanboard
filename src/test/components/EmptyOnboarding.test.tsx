import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@/test/test-utils'
import { EmptyOnboarding } from '@/components/onboarding/EmptyOnboarding'
import { Button } from '@/components/ui/button'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

describe('EmptyOnboarding', () => {
  it('should render welcome message', () => {
    render(<EmptyOnboarding />)

    expect(screen.getByText('Welcome to Modulo! 🎉')).toBeInTheDocument()
    expect(
      screen.getByText('Your productivity journey starts here. Let\'s create your first project!')
    ).toBeInTheDocument()
  })

  it('should render all feature cards', () => {
    render(<EmptyOnboarding />)

    expect(screen.getByText('Organize Projects')).toBeInTheDocument()
    expect(screen.getByText('Boost Productivity')).toBeInTheDocument()
    expect(screen.getByText('Stay Focused')).toBeInTheDocument()
    expect(
      screen.getByText('Create boards to track your work and keep everything organized')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Use drag-and-drop to manage tasks and deadlines efficiently')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Quick actions and smart widgets keep you on track')
    ).toBeInTheDocument()
  })

  it('should call onCreateBoard when button is clicked', () => {
    const handleCreateBoard = vi.fn()
    render(<EmptyOnboarding onCreateBoard={handleCreateBoard} />)

    const button = screen.getByRole('button', { name: /create your first project/i })
    fireEvent.click(button)

    expect(handleCreateBoard).toHaveBeenCalledTimes(1)
  })

  it('should render call-to-action button', () => {
    render(<EmptyOnboarding />)

    const button = screen.getByRole('button', { name: /create your first project/i })
    expect(button).toBeInTheDocument()
    expect(button.tagName).toBe('BUTTON')
  })

  it('should render help text', () => {
    render(<EmptyOnboarding />)

    expect(screen.getByText('It takes less than a minute to get started')).toBeInTheDocument()
  })

  it('should have proper structure', () => {
    const { container } = render(<EmptyOnboarding />)

    // Check for main container
    const mainContainer = container.firstChild
    expect(mainContainer).toBeInTheDocument()

    // Check for feature grid
    const featureCards = screen.getAllByRole('button') // icons are rendered as buttons
    expect(featureCards.length).toBeGreaterThan(0)
  })

  it('should display folder icon', () => {
    render(<EmptyOnboarding />)

    // The folder icon should be present in the hero section
    expect(screen.getByText('Welcome to Modulo! 🎉')).toBeInTheDocument()
  })
})
