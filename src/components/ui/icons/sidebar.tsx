import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SidebarIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string
}

export const SidebarIcon = React.forwardRef<SVGSVGElement, SidebarIconProps>(
  ({ className, ...props }, ref) => {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        ref={ref}
        className={cn('', className)}
        aria-hidden="true"
        {...props}
      >
        <desc>
          Sidebar Minimalistic Streamline Icon: https://streamlinehq.com
        </desc>
        <path
          d="M2 11c0 -3.77124 0 -5.65685 1.17157 -6.82843C4.34315 3 6.22876 3 10 3h4c3.7712 0 5.6569 0 6.8284 1.17157C22 5.34315 22 7.22876 22 11v2c0 3.7712 0 5.6569 -1.1716 6.8284C19.6569 21 17.7712 21 14 21h-4c-3.77124 0 -5.65685 0 -6.82843 -1.1716C2 18.6569 2 16.7712 2 13v-2Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="m15 21 0 -18"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.5"
        />
      </svg>
    )
  }
)
SidebarIcon.displayName = 'SidebarIcon'
