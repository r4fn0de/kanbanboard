import { cn } from '@/lib/utils'

interface AttachmentIcon2Props {
  className?: string
}

export function AttachmentIcon2({ className }: AttachmentIcon2Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 16 16"
      className={cn('h-4 w-4', className)}
    >
      <title>Attachment 2</title>
      <g fill="none" fillRule="nonzero">
        <path
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.993333333333333 6.821333333333333a2 2 0 0 1 2.828 -2.828l5.186 5.1853333333333325a2 2 0 1 1 -2.828666666666667 2.828l-2.239333333333333 -2.2386666666666666a0.5 0.5 0 0 1 0.7066666666666667 -0.7073333333333333l2.0039999999999996 2.003333333333333a1 1 0 1 0 1.414 -1.414l-2.003333333333333 -2.003333333333333a2.5 2.5 0 1 0 -3.535333333333333 3.535333333333333l2.2386666666666666 2.239333333333333a4 4 0 0 0 5.657333333333334 -5.657333333333334l-5.1853333333333325 -5.1853333333333325a4 4 0 0 0 -5.889333333333333 5.404L2.3433333333333333 8l0.2353333333333333 0.236a1 1 0 0 0 1.4146666666666665 -1.4146666666666665Z"
        />
      </g>
    </svg>
  )
}