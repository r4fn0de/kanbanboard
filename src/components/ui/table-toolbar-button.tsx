'use client'

import * as React from 'react'

import { Menu } from '@base-ui-components/react/menu'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Combine,
  Grid3x3Icon,
  Table,
  Trash2Icon,
  Ungroup,
  X,
} from 'lucide-react'
import { KEYS } from 'platejs'
import { TablePlugin, useTableMergeState } from '@platejs/table/react'
import { useEditorPlugin, useEditorSelector } from 'platejs/react'

import { cn } from '@/lib/utils'

import { ToolbarButton } from './toolbar'

interface TableToolbarButtonProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  defaultOpen?: boolean
  disabled?: boolean
}

export function TableToolbarButton(props: TableToolbarButtonProps) {
  const tableSelected = useEditorSelector(
    editor => editor.api.some({ match: { type: KEYS.table } }),
    []
  )

  const { editor, tf } = useEditorPlugin(TablePlugin)
  const [open, setOpen] = React.useState(false)
  const mergeState = useTableMergeState()

  return (
    <Menu.Root open={open} onOpenChange={setOpen} modal={false} {...props}>
      <Menu.Trigger>
        <ToolbarButton pressed={open} tooltip="Table" isDropdown>
          <Table />
        </ToolbarButton>
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner sideOffset={5} align="start" className="z-50">
          <Menu.Popup className="flex w-[180px] min-w-0 flex-col rounded-md border bg-popover p-1 shadow-md">
            <Menu.Group>
              <Menu.SubmenuRoot>
                <Menu.SubmenuTrigger className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-1.5 py-1 outline-none hover:bg-accent focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50">
                  <Grid3x3Icon className="size-4" />
                  <span className="text-sm">Table</span>
                </Menu.SubmenuTrigger>
                <Menu.Portal>
                  <Menu.Positioner
                    sideOffset={5}
                    align="start"
                    className="z-50"
                  >
                    <Menu.Popup className="m-0 rounded-md border bg-popover p-0 shadow-md">
                      <TablePicker />
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </Menu.SubmenuRoot>

              <Menu.SubmenuRoot>
                <Menu.SubmenuTrigger
                  className={cn(
                    'relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-1.5 py-1 outline-none hover:bg-accent focus:bg-accent',
                    !tableSelected && 'cursor-not-allowed opacity-50'
                  )}
                >
                  <div className="size-4" />
                  <span className="text-sm">Cell</span>
                </Menu.SubmenuTrigger>
                <Menu.Portal>
                  <Menu.Positioner
                    sideOffset={5}
                    align="start"
                    className="z-50"
                  >
                    <Menu.Popup className="rounded-md border bg-popover p-1 shadow-md">
                      <Menu.Item
                        onClick={() => {
                          tf.table.merge()
                          editor.tf.focus()
                          setOpen(false)
                        }}
                        className="relative flex cursor-pointer select-none items-center rounded-sm px-1.5 py-1 outline-none hover:bg-accent focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50 min-w-[160px]"
                        disabled={!mergeState.canMerge}
                      >
                        <Combine className="size-4" />
                        <span className="text-sm ml-2">Merge cells</span>
                      </Menu.Item>
                      <Menu.Item
                        onClick={() => {
                          tf.table.split()
                          editor.tf.focus()
                          setOpen(false)
                        }}
                        className="relative flex cursor-pointer select-none items-center rounded-sm px-1.5 py-1 outline-none hover:bg-accent focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50 min-w-[160px]"
                        disabled={!mergeState.canSplit}
                      >
                        <Ungroup className="size-4" />
                        <span className="text-sm ml-2">Split cell</span>
                      </Menu.Item>
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </Menu.SubmenuRoot>

              <Menu.SubmenuRoot>
                <Menu.SubmenuTrigger
                  className={cn(
                    'relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-1.5 py-1 outline-none hover:bg-accent focus:bg-accent',
                    !tableSelected && 'cursor-not-allowed opacity-50'
                  )}
                >
                  <div className="size-4" />
                  <span className="text-sm">Row</span>
                </Menu.SubmenuTrigger>
                <Menu.Portal>
                  <Menu.Positioner
                    sideOffset={5}
                    align="start"
                    className="z-50"
                  >
                    <Menu.Popup className="rounded-md border bg-popover p-1 shadow-md">
                      <Menu.Item
                        onClick={() => {
                          tf.insert.tableRow({ before: true })
                          editor.tf.focus()
                          setOpen(false)
                        }}
                        className="relative flex cursor-pointer select-none items-center rounded-sm px-1.5 py-1 outline-none hover:bg-accent focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50 min-w-[160px]"
                        disabled={!tableSelected}
                      >
                        <ArrowUp className="size-4" />
                        <span className="text-sm ml-2">Insert row before</span>
                      </Menu.Item>
                      <Menu.Item
                        onClick={() => {
                          tf.insert.tableRow()
                          editor.tf.focus()
                          setOpen(false)
                        }}
                        className="relative flex cursor-pointer select-none items-center rounded-sm px-1.5 py-1 outline-none hover:bg-accent focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50 min-w-[160px]"
                        disabled={!tableSelected}
                      >
                        <ArrowDown className="size-4" />
                        <span className="text-sm ml-2">Insert row after</span>
                      </Menu.Item>
                      <Menu.Item
                        onClick={() => {
                          tf.remove.tableRow()
                          editor.tf.focus()
                          setOpen(false)
                        }}
                        className="relative flex cursor-pointer select-none items-center rounded-sm px-1.5 py-1 outline-none hover:bg-accent focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50 min-w-[160px]"
                        disabled={!tableSelected}
                      >
                        <X className="size-4" />
                        <span className="text-sm ml-2">Delete row</span>
                      </Menu.Item>
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </Menu.SubmenuRoot>

              <Menu.SubmenuRoot>
                <Menu.SubmenuTrigger
                  className={cn(
                    'relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-1.5 py-1 outline-none hover:bg-accent focus:bg-accent',
                    !tableSelected && 'cursor-not-allowed opacity-50'
                  )}
                >
                  <div className="size-4" />
                  <span className="text-sm">Column</span>
                </Menu.SubmenuTrigger>
                <Menu.Portal>
                  <Menu.Positioner
                    sideOffset={5}
                    align="start"
                    className="z-50"
                  >
                    <Menu.Popup className="rounded-md border bg-popover p-1 shadow-md">
                      <Menu.Item
                        onClick={() => {
                          tf.insert.tableColumn({ before: true })
                          editor.tf.focus()
                          setOpen(false)
                        }}
                        className="relative flex cursor-pointer select-none items-center rounded-sm px-1.5 py-1 outline-none hover:bg-accent focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50 min-w-[160px]"
                        disabled={!tableSelected}
                      >
                        <ArrowLeft className="size-4" />
                        <span className="text-sm ml-2">
                          Insert column before
                        </span>
                      </Menu.Item>
                      <Menu.Item
                        onClick={() => {
                          tf.insert.tableColumn()
                          editor.tf.focus()
                          setOpen(false)
                        }}
                        className="relative flex cursor-pointer select-none items-center rounded-sm px-1.5 py-1 outline-none hover:bg-accent focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50 min-w-[160px]"
                        disabled={!tableSelected}
                      >
                        <ArrowRight className="size-4" />
                        <span className="text-sm ml-2">
                          Insert column after
                        </span>
                      </Menu.Item>
                      <Menu.Item
                        onClick={() => {
                          tf.remove.tableColumn()
                          editor.tf.focus()
                          setOpen(false)
                        }}
                        className="relative flex cursor-pointer select-none items-center rounded-sm px-1.5 py-1 outline-none hover:bg-accent focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50 min-w-[160px]"
                        disabled={!tableSelected}
                      >
                        <X className="size-4" />
                        <span className="text-sm ml-2">Delete column</span>
                      </Menu.Item>
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </Menu.SubmenuRoot>

              <Menu.Item
                onClick={() => {
                  tf.remove.table()
                  editor.tf.focus()
                  setOpen(false)
                }}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-1.5 py-1 outline-none hover:bg-accent focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50 min-w-[160px]"
                disabled={!tableSelected}
              >
                <Trash2Icon className="size-4" />
                <span className="text-sm ml-2">Delete table</span>
              </Menu.Item>
            </Menu.Group>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}

function TablePicker() {
  const { editor, tf } = useEditorPlugin(TablePlugin)

  const [tablePicker, setTablePicker] = React.useState({
    grid: Array.from({ length: 8 }, () => Array.from({ length: 8 }).fill(0)),
    size: { colCount: 0, rowCount: 0 },
  })

  const onCellMove = (rowIndex: number, colIndex: number) => {
    const newGrid = [...tablePicker.grid]

    for (let i = 0; i < newGrid.length; i++) {
      for (let j = 0; j < newGrid[i].length; j++) {
        newGrid[i][j] =
          i >= 0 && i <= rowIndex && j >= 0 && j <= colIndex ? 1 : 0
      }
    }

    setTablePicker({
      grid: newGrid,
      size: { colCount: colIndex + 1, rowCount: rowIndex + 1 },
    })
  }

  return (
    <div
      className="m-0 flex! flex-col p-0"
      onClick={() => {
        tf.insert.table(tablePicker.size, { select: true })
        editor.tf.focus()
      }}
    >
      <div className="grid size-[130px] grid-cols-8 gap-0.5 p-1">
        {tablePicker.grid.map((rows, rowIndex) =>
          rows.map((value, columIndex) => {
            return (
              <div
                key={`(${rowIndex},${columIndex})`}
                className={cn(
                  'col-span-1 size-3 border border-solid bg-secondary',
                  !!value && 'border-current'
                )}
                onMouseMove={() => {
                  onCellMove(rowIndex, columIndex)
                }}
              />
            )
          })
        )}
      </div>

      <div className="text-center text-xs text-current">
        {tablePicker.size.rowCount} x {tablePicker.size.colCount}
      </div>
    </div>
  )
}
