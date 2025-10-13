'use client'

import * as React from 'react'

import { Menu } from '@base-ui-components/react/menu'
import { LineHeightPlugin } from '@platejs/basic-styles/react'
import { CheckIcon, WrapText } from 'lucide-react'
import { useEditorRef, useSelectionFragmentProp } from 'platejs/react'

import { ToolbarButton } from './toolbar'

interface LineHeightToolbarButtonProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  defaultOpen?: boolean
  disabled?: boolean
}

export function LineHeightToolbarButton(props: LineHeightToolbarButtonProps) {
  const editor = useEditorRef()
  const { defaultNodeValue, validNodeValues: values = [] } =
    editor.getInjectProps(LineHeightPlugin)

  const value = useSelectionFragmentProp({
    defaultValue: defaultNodeValue,
    getProp: node => node.lineHeight,
  })

  const [open, setOpen] = React.useState(false)

  return (
    <Menu.Root open={open} onOpenChange={setOpen} modal={false} {...props}>
      <Menu.Trigger>
        <ToolbarButton pressed={open} tooltip="Line height" isDropdown>
          <WrapText />
        </ToolbarButton>
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner sideOffset={5} align="center" className="z-50">
          <Menu.Popup className="min-w-0 rounded-md border bg-popover p-1 shadow-md">
            <Menu.RadioGroup
              value={value}
              onValueChange={(newValue: string) => {
                editor
                  .getTransforms(LineHeightPlugin)
                  .lineHeight.setNodes(Number(newValue))
                editor.tf.focus()
                setOpen(false)
              }}
            >
              {values.map(itemValue => (
                <Menu.RadioItem
                  key={itemValue}
                  className="relative flex cursor-pointer select-none items-center rounded-sm px-1.5 py-2 outline-none hover:bg-accent focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50 min-w-[160px] pl-2"
                  value={itemValue}
                >
                  <span className="pointer-events-none absolute right-2 flex size-3.5 items-center justify-center">
                    {value === itemValue && <CheckIcon className="size-3" />}
                  </span>
                  <span className="text-sm">{itemValue}</span>
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
