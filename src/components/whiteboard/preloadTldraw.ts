let hasPreloaded = false

export function preloadTldraw() {
  if (hasPreloaded) return
  hasPreloaded = true

  // Fire-and-forget dynamic import to warm up the Tldraw bundle
  void import('@tldraw/tldraw')
}
