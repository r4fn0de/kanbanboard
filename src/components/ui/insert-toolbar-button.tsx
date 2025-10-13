'use client'

import * as React from 'react'

import { Menu } from '@base-ui-components/react/menu'
import { ScrollArea } from '@base-ui-components/react/scroll-area'
import {
  CalendarIcon,
  ChevronRightIcon,
  Columns3Icon,
  FileCodeIcon,
  FilmIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  ImageIcon,
  Link2Icon,
  ListIcon,
  ListOrderedIcon,
  MinusIcon,
  PenToolIcon,
  PilcrowIcon,
  PlusIcon,
  QuoteIcon,
  RadicalIcon,
  SquareIcon,
  TableIcon,
  TableOfContentsIcon,
} from 'lucide-react'
import { KEYS } from 'platejs'
import { type PlateEditor, useEditorRef } from 'platejs/react'

import {
  insertBlock,
  insertInlineElement,
} from '@/components/editor/transforms'

import { ToolbarButton } from './toolbar'

interface Group {
  group: string
  items: Item[]
}

interface Item {
  icon: React.ReactNode
  value: string
  onSelect: (editor: PlateEditor, value: string) => void
  focusEditor?: boolean
  label?: string
}

const groups: Group[] = [
  {
    group: 'Basic blocks',
    items: [
      {
        icon: <PilcrowIcon />,
        label: 'Paragraph',
        value: KEYS.p,
      },
      {
        icon: <Heading1Icon />,
        label: 'Heading 1',
        value: 'h1',
      },
      {
        icon: <Heading2Icon />,
        label: 'Heading 2',
        value: 'h2',
      },
      {
        icon: <Heading3Icon />,
        label: 'Heading 3',
        value: 'h3',
      },
      {
        icon: <TableIcon />,
        label: 'Table',
        value: KEYS.table,
      },
      {
        icon: <FileCodeIcon />,
        label: 'Code',
        value: KEYS.codeBlock,
      },
      {
        icon: <QuoteIcon />,
        label: 'Quote',
        value: KEYS.blockquote,
      },
      {
        icon: <MinusIcon />,
        label: 'Divider',
        value: KEYS.hr,
      },
    ].map(item => ({
      ...item,
      onSelect: (editor, value) => {
        insertBlock(editor, value)
      },
    })),
  },
  {
    group: 'Lists',
    items: [
      {
        icon: <ListIcon />,
        label: 'Bulleted list',
        value: KEYS.ul,
      },
      {
        icon: <ListOrderedIcon />,
        label: 'Numbered list',
        value: KEYS.ol,
      },
      {
        icon: <SquareIcon />,
        label: 'To-do list',
        value: KEYS.listTodo,
      },
      {
        icon: <ChevronRightIcon />,
        label: 'Toggle list',
        value: KEYS.toggle,
      },
    ].map(item => ({
      ...item,
      onSelect: (editor, value) => {
        insertBlock(editor, value)
      },
    })),
  },
  {
    group: 'Media',
    items: [
      {
        icon: <ImageIcon />,
        label: 'Image',
        value: KEYS.img,
      },
      {
        icon: <FilmIcon />,
        label: 'Embed',
        value: KEYS.mediaEmbed,
      },
    ].map(item => ({
      ...item,
      onSelect: (editor, value) => {
        insertBlock(editor, value)
      },
    })),
  },
  {
    group: 'Advanced blocks',
    items: [
      {
        icon: <TableOfContentsIcon />,
        label: 'Table of contents',
        value: KEYS.toc,
      },
      {
        icon: <Columns3Icon />,
        label: '3 columns',
        value: 'action_three_columns',
      },
      {
        focusEditor: false,
        icon: <RadicalIcon />,
        label: 'Equation',
        value: KEYS.equation,
      },
      {
        icon: <PenToolIcon />,
        label: 'Excalidraw',
        value: KEYS.excalidraw,
      },
    ].map(item => ({
      ...item,
      onSelect: (editor, value) => {
        insertBlock(editor, value)
      },
    })),
  },
  {
    group: 'Inline',
    items: [
      {
        icon: <Link2Icon />,
        label: 'Link',
        value: KEYS.link,
      },
      {
        focusEditor: true,
        icon: <CalendarIcon />,
        label: 'Date',
        value: KEYS.date,
      },
      {
        focusEditor: false,
        icon: <RadicalIcon />,
        label: 'Inline Equation',
        value: KEYS.inlineEquation,
      },
    ].map(item => ({
      ...item,
      onSelect: (editor, value) => {
        insertInlineElement(editor, value)
      },
    })),
  },
]

interface InsertToolbarButtonProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  defaultOpen?: boolean
  disabled?: boolean
}

export function InsertToolbarButton(props: InsertToolbarButtonProps) {
  const editor = useEditorRef()
  const [open, setOpen] = React.useState(false)

  return (
    <Menu.Root open={open} onOpenChange={setOpen} modal={false} {...props}>
      <Menu.Trigger>
        <ToolbarButton pressed={open} tooltip="Insert" isDropdown>
          <PlusIcon />
        </ToolbarButton>
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner sideOffset={5} align="start" className="z-50">
          <Menu.Popup className="w-[200px] rounded-md border bg-popover shadow-md overflow-hidden">
            <ScrollArea.Root className="h-[500px]">
              <ScrollArea.Viewport className="h-full w-full">
                <div className="p-1">
                  {groups.map(({ group, items: nestedItems }, groupIndex) => (
                    <div key={group}>
                      {groupIndex > 0 && (
                        <div className="my-1 h-px bg-border" />
                      )}
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground select-none">
                        {group}
                      </div>
                      {nestedItems.map(({ icon, label, value, onSelect }) => (
                        <button
                          key={value}
                          type="button"
                          className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent focus:bg-accent transition-colors disabled:pointer-events-none disabled:opacity-50"
                          onClick={() => {
                            onSelect(editor, value)
                            editor.tf.focus()
                            setOpen(false)
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="size-4 flex items-center justify-center [&>svg]:size-4">
                              {icon}
                            </div>
                            <span>{label}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </ScrollArea.Viewport>
              <ScrollArea.Scrollbar
                orientation="vertical"
                className="flex w-2.5 touch-none select-none border-l border-l-transparent p-px transition-colors bg-transparent hover:bg-muted/30"
              >
                <ScrollArea.Thumb className="relative flex-1 rounded-full bg-border hover:bg-muted-foreground/50 transition-colors" />
              </ScrollArea.Scrollbar>
            </ScrollArea.Root>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
