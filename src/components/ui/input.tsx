import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'file:text-foreground placeholder:text-gray-500 selection:bg-gray-900 selection:text-white border-gray-300 dark:border-gray-600 flex h-11 w-full min-w-0 rounded-xl border bg-white dark:bg-gray-900/50 px-4 py-2.5 text-base shadow-sm transition-all duration-200 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'focus-visible:border-gray-400 focus-visible:ring-gray-400/20 focus-visible:ring-[3px] focus-visible:shadow-md',
        'aria-invalid:ring-red-500/20 dark:aria-invalid:ring-red-400/40 aria-invalid:border-red-500',
        className
      )}
      {...props}
    />
  )
}

export { Input }
