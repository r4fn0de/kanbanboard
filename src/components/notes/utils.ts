export function extractNotePreview(content: string): string {
  if (!content) return 'No content'
  
  try {
    const parsed = typeof content === 'string' ? JSON.parse(content) : content

    const extractText = (node: unknown): string => {
      if (!node) return ''
      
      // Handle arrays by processing each element
      if (Array.isArray(node)) {
        return node.map(extractText).filter(Boolean).join(' ')
      }
      
      // Handle string content directly
      if (typeof node === 'string') return node
      
      // Handle objects with content or children
      if (typeof node === 'object' && node !== null) {
        const n = node as Record<string, unknown>
        
        // Skip title blocks
        if (n.id === 'title-block') return ''
        
        // Check common text properties
        if (n.text && typeof n.text === 'string') return n.text as string
        
        // Check for content/children arrays
        const content = (n.content || n.children) as unknown[] | undefined
        if (Array.isArray(content)) {
          return extractText(content)
        }
        
        // Handle block content
        if (n.type === 'paragraph' || n.type === 'heading') {
          return extractText(content || [])
        }
      }
      
      return ''
    }

    const text = extractText(parsed).trim().replace(/\s+/g, ' ')
    return text || 'No content'
  } catch (error) {
    console.error('Error extracting note preview:', error)
    return 'No content'
  }
}
