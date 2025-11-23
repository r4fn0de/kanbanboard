import { useEffect, useRef } from 'react'

export function usePerformanceMonitor(componentName: string) {
  const renderCount = useRef(0)
  const lastRenderTime = useRef<number>(Date.now())

  useEffect(() => {
    renderCount.current++
    const now = Date.now()
    const timeSinceLastRender = now - lastRenderTime.current
    lastRenderTime.current = now

    // Log performance metrics in development
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[Performance] ${componentName} - Render #${renderCount.current}, Time since last: ${timeSinceLastRender}ms`
      )

      // Warn if component is re-rendering too frequently
      if (timeSinceLastRender < 16) {
        console.warn(
          `[Performance Warning] ${componentName} is rendering too frequently (${timeSinceLastRender}ms since last render)`
        )
      }
    }
  })

  return {
    renderCount: renderCount.current,
  }
}

export function useRenderTracker(componentName: string) {
  const renderCount = useRef(0)
  const lastRender = useRef(performance.now())

  useEffect(() => {
    renderCount.current++
    const now = performance.now()
    lastRender.current = now

    if (process.env.NODE_ENV === 'development') {
      performance.mark(`${componentName}-render-start-${renderCount.current}`)

      requestAnimationFrame(() => {
        performance.mark(`${componentName}-render-end-${renderCount.current}`)
        performance.measure(
          `${componentName}-render-${renderCount.current}`,
          `${componentName}-render-start-${renderCount.current}`,
          `${componentName}-render-end-${renderCount.current}`
        )

        const measure = performance.getEntriesByName(
          `${componentName}-render-${renderCount.current}`
        )[0]

        if (measure && measure.duration > 16) {
          console.warn(
            `[Performance] ${componentName} render took ${measure.duration.toFixed(2)}ms (Render #${renderCount.current})`
          )
        }
      })
    }
  })
}
