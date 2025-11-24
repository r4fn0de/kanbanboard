import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ImageCropper } from '../image-cropper'

// Polyfill ResizeObserver for JSDOM-based tests
interface TestResizeObserver {
  observe: (...args: unknown[]) => void
  unobserve: (...args: unknown[]) => void
  disconnect: () => void
}

const globalWithResizeObserver = globalThis as unknown as {
  ResizeObserver?: TestResizeObserver
}

if (typeof globalWithResizeObserver.ResizeObserver === 'undefined') {
  const mockInstance: TestResizeObserver = {
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }

  globalWithResizeObserver.ResizeObserver = vi.fn(
    () => mockInstance
  ) as unknown as TestResizeObserver
}

// Mock react-easy-crop since it might have canvas dependencies
vi.mock('react-easy-crop', () => {
  return {
    default: function MockCropper() {
      return <div data-testid="cropper">Mock Cropper</div>
    },
  }
})

describe('ImageCropper', () => {
  const mockProps = {
    open: true,
    onOpenChange: vi.fn(),
    imageSrc: 'data:image/png;base64,test',
    onCropComplete: vi.fn(),
    onCancel: vi.fn(),
    aspectRatio: 1,
    recommendedSize: '64x64px',
  }

  it('renders when open', () => {
    render(<ImageCropper {...mockProps} />)

    expect(screen.getByText('Crop & Adjust Image')).toBeInTheDocument()
    expect(screen.getByText(/Recommended:\s*64x64px/)).toBeInTheDocument()
    expect(screen.getByText('Apply Crop')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<ImageCropper {...mockProps} open={false} />)

    expect(screen.queryByText('Crop Image')).not.toBeInTheDocument()
  })
})
