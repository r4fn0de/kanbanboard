'use client'

import * as React from 'react'

import { Menu } from '@base-ui-components/react/menu'
import {
  KeyboardIcon,
  MoreHorizontalIcon,
  SubscriptIcon,
  SuperscriptIcon,
} from 'lucide-react'
import { KEYS } from 'platejs'
import { useEditorRef } from 'platejs/react'

import { ToolbarButton } from './toolbar'

interface MoreToolbarButtonProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  defaultOpen?: boolean
  disabled?: boolean
}

export function MoreToolbarButton(props: MoreToolbarButtonProps) {
  const editor = useEditorRef()
  const [open, setOpen] = React.useState(false)

  return (
    <Menu.Root open={open} onOpenChange={setOpen} modal={false} {...props}>
      <Menu.Trigger>
        <ToolbarButton pressed={open} tooltip="Insert">
          <MoreHorizontalIcon />
        </ToolbarButton>
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner sideOffset={5} align="center" className="z-50">
          <Menu.Popup className="flex max-h-[500px] min-w-[180px] flex-col overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
            <Menu.Group>
              <Menu.Item
                onClick={() => {
                  editor.tf.toggleMark(KEYS.kbd)
                  editor.tf.collapse({ edge: 'end' })
                  editor.tf.focus()
                  setOpen(false)
                }}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-1.5 py-1 outline-none hover:bg-accent focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50 min-w-[160px]"
              >
                <KeyboardIcon className="size-4" />
                <span className="text-sm ml-2">Keyboard input</span>
              </Menu.Item>

              <Menu.Item
                onClick={() => {
                  editor.tf.toggleMark(KEYS.sup, {
                    remove: KEYS.sub,
                  })
                  editor.tf.focus()
                  setOpen(false)
                }}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-1.5 py-1 outline-none hover:bg-accent focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50 min-w-[160px]"
              >
                <SuperscriptIcon className="size-4" />
                <span className="text-sm ml-2">Superscript</span>
              </Menu.Item>
              <Menu.Item
                onClick={() => {
                  editor.tf.toggleMark(KEYS.sub, {
                    remove: KEYS.sup,
                  })
                  editor.tf.focus()
                  setOpen(false)
                }}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-1.5 py-1 outline-none hover:bg-accent focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50 min-w-[160px]"
              >
                <SubscriptIcon className="size-4" />
                <span className="text-sm ml-2">Subscript</span>
              </Menu.Item>
            </Menu.Group>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
