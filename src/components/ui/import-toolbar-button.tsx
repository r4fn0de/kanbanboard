'use client'

import * as React from 'react'

import { Menu } from '@base-ui-components/react/menu'
import { MarkdownPlugin } from '@platejs/markdown'
import { ArrowUpToLineIcon } from 'lucide-react'
import { getEditorDOMFromHtmlString } from 'platejs'
import { useEditorRef } from 'platejs/react'
import { useFilePicker } from 'use-file-picker'

import { ToolbarButton } from './toolbar'

type ImportType = 'html' | 'markdown'

interface ImportToolbarButtonProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  defaultOpen?: boolean
  disabled?: boolean
}

export function ImportToolbarButton(props: ImportToolbarButtonProps) {
  const editor = useEditorRef()
  const [open, setOpen] = React.useState(false)

  const getFileNodes = (text: string, type: ImportType) => {
    if (type === 'html') {
      const editorNode = getEditorDOMFromHtmlString(text)
      const nodes = editor.api.html.deserialize({
        element: editorNode,
      })

      return nodes
    }

    if (type === 'markdown') {
      return editor.getApi(MarkdownPlugin).markdown.deserialize(text)
    }

    return []
  }

  const { openFilePicker: openMdFilePicker } = useFilePicker({
    accept: ['.md', '.mdx'],
    multiple: false,
    onFilesSelected: async ({ plainFiles }) => {
      const text = await plainFiles[0].text()

      const nodes = getFileNodes(text, 'markdown')

      editor.tf.insertNodes(nodes)
    },
  })

  const { openFilePicker: openHtmlFilePicker } = useFilePicker({
    accept: ['text/html'],
    multiple: false,
    onFilesSelected: async ({ plainFiles }) => {
      const text = await plainFiles[0].text()

      const nodes = getFileNodes(text, 'html')

      editor.tf.insertNodes(nodes)
    },
  })

  return (
    <Menu.Root open={open} onOpenChange={setOpen} modal={false} {...props}>
      <Menu.Trigger>
        <ToolbarButton pressed={open} tooltip="Import" isDropdown>
          <ArrowUpToLineIcon className="size-4" />
        </ToolbarButton>
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner sideOffset={5} align="center" className="z-50">
          <Menu.Popup className="rounded-md border bg-popover p-1 shadow-md">
            <Menu.Group>
              <Menu.Item
                onClick={() => {
                  openHtmlFilePicker()
                  setOpen(false)
                }}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-1.5 py-1 outline-none hover:bg-accent focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50 min-w-[160px]"
              >
                <span className="text-sm">Import from HTML</span>
              </Menu.Item>

              <Menu.Item
                onClick={() => {
                  openMdFilePicker()
                  setOpen(false)
                }}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-1.5 py-1 outline-none hover:bg-accent focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50 min-w-[160px]"
              >
                <span className="text-sm">Import from Markdown</span>
              </Menu.Item>
            </Menu.Group>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
