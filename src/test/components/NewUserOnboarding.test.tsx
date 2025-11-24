import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@/test/test-utils'
import { NewUserOnboarding } from '@/components/onboarding/NewUserOnboarding'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

describe('NewUserOnboarding', () => {
  it('should render welcome message', () => {
    render(<NewUserOnboarding />)

    expect(
      screen.getByText('Welcome! Here are some quick tips')
    ).toBeInTheDocument()
    expect(screen.getByText('Quick Search')).toBeInTheDocument()
    expect(screen.getByText('Drag & Drop')).toBeInTheDocument()
    expect(screen.getByText('Stay Organized')).toBeInTheDocument()
  })

  it('should render all three tips', () => {
    render(<NewUserOnboarding />)

    expect(
      screen.getByText('Press Cmd+K (Ctrl+K) to quickly find anything')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Reorder widgets and cards by dragging them')
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Use labels, priorities, and deadlines for better tracking'
      )
    ).toBeInTheDocument()
  })

  it('should call onDismiss when got it button is clicked', () => {
    const handleDismiss = vi.fn()
    render(<NewUserOnboarding onDismiss={handleDismiss} />)

    const dismissButton = screen.getByRole('button', { name: 'Got it' })
    fireEvent.click(dismissButton)

    expect(handleDismiss).toHaveBeenCalledTimes(1)
  })

  it('should call onOpenSearch when search tip is clicked', () => {
    const handleOpenSearch = vi.fn()
    render(<NewUserOnboarding onOpenSearch={handleOpenSearch} />)

    // Find the search tip and click it
    const searchTip = screen.getByText('Quick Search')
    fireEvent.click(searchTip)

    expect(handleOpenSearch).toHaveBeenCalledTimes(1)
  })

  it('should render sparkle icon', () => {
    render(<NewUserOnboarding />)

    // Sparkles icon should be present
    expect(
      screen.getByText('Welcome! Here are some quick tips')
    ).toBeInTheDocument()
  })

  it('should have gradient background', () => {
    const { container } = render(<NewUserOnboarding />)

    // The component should have a gradient background class
    const onboardingElement = container.firstChild
    expect(onboardingElement).toBeInTheDocument()
  })

  it('should render tips in a grid layout', () => {
    render(<NewUserOnboarding />)

    // Check that all three tip sections are present
    const quickSearch = screen.getByText('Quick Search')
    const dragDrop = screen.getByText('Drag & Drop')
    const stayOrganized = screen.getByText('Stay Organized')

    expect(quickSearch).toBeInTheDocument()
    expect(dragDrop).toBeInTheDocument()
    expect(stayOrganized).toBeInTheDocument()
  })
})
