import * as React from 'react'

import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'placeholder:text-gray-500 focus-visible:border-gray-400 focus-visible:ring-gray-400/20 aria-invalid:ring-red-500/20 dark:aria-invalid:ring-red-400/40 aria-invalid:border-red-500 border-gray-300 dark:border-gray-600 flex field-sizing-content min-h-20 w-full rounded-xl border bg-white dark:bg-gray-900/50 px-4 py-3 text-base shadow-sm transition-all duration-200 outline-none focus-visible:ring-[3px] focus-visible:shadow-md disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
