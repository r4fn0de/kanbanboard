'use client';

import * as React from 'react';

import { ListStyleType, someList, toggleList } from '@platejs/list';
import {
  useIndentTodoToolBarButton,
  useIndentTodoToolBarButtonState,
} from '@platejs/list/react';
import { List, ListOrdered, ListTodoIcon } from 'lucide-react';
import { useEditorRef, useEditorSelector } from 'platejs/react';

import { Menu } from '@base-ui-components/react/menu';

import {
  ToolbarButton,
  ToolbarSplitButton,
  ToolbarSplitButtonPrimary,
  ToolbarSplitButtonSecondary,
} from './toolbar';

export function BulletedListToolbarButton() {
  const editor = useEditorRef();
  const [open, setOpen] = React.useState(false);

  const pressed = useEditorSelector(
    (editor) =>
      someList(editor, [
        ListStyleType.Disc,
        ListStyleType.Circle,
        ListStyleType.Square,
      ]),
    []
  );

  return (
    <ToolbarSplitButton pressed={open}>
      <ToolbarSplitButtonPrimary
        className="data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
        onClick={() => {
          toggleList(editor, {
            listStyleType: ListStyleType.Disc,
          });
        }}
        data-state={pressed ? 'on' : 'off'}
      >
        <List className="size-4" />
      </ToolbarSplitButtonPrimary>

      <Menu.Root open={open} onOpenChange={setOpen} modal={false}>
        <Menu.Trigger>
          <ToolbarSplitButtonSecondary />
        </Menu.Trigger>

        <Menu.Portal>
          <Menu.Positioner sideOffset={5} align="center" className="z-50">
            <Menu.Popup className="rounded-md border bg-popover p-1 shadow-md">
              <Menu.Group>
                <Menu.Item
                  onClick={() =>
                    toggleList(editor, {
                      listStyleType: ListStyleType.Disc,
                    })
                  }
                  className="relative flex cursor-pointer select-none items-center rounded-sm px-1.5 py-1 outline-none hover:bg-accent focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50 min-w-[140px]"
                >
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full border border-current bg-current" />
                    <span className="text-sm">Default</span>
                  </div>
                </Menu.Item>
                <Menu.Item
                  onClick={() =>
                    toggleList(editor, {
                      listStyleType: ListStyleType.Circle,
                    })
                  }
                  className="relative flex cursor-pointer select-none items-center rounded-sm px-1.5 py-1 outline-none hover:bg-accent focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50 min-w-[140px]"
                >
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full border border-current" />
                    <span className="text-sm">Circle</span>
                  </div>
                </Menu.Item>
                <Menu.Item
                  onClick={() =>
                    toggleList(editor, {
                      listStyleType: ListStyleType.Square,
                    })
                  }
                  className="relative flex cursor-pointer select-none items-center rounded-sm px-1.5 py-1 outline-none hover:bg-accent focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50 min-w-[140px]"
                >
                  <div className="flex items-center gap-2">
                    <div className="size-2 border border-current bg-current" />
                    <span className="text-sm">Square</span>
                  </div>
                </Menu.Item>
              </Menu.Group>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </ToolbarSplitButton>
  );
}

export function NumberedListToolbarButton() {
  const editor = useEditorRef();
  const [open, setOpen] = React.useState(false);

  const pressed = useEditorSelector(
    (editor) =>
      someList(editor, [
        ListStyleType.Decimal,
        ListStyleType.LowerAlpha,
        ListStyleType.UpperAlpha,
        ListStyleType.LowerRoman,
        ListStyleType.UpperRoman,
      ]),
    []
  );

  return (
    <ToolbarSplitButton pressed={open}>
      <ToolbarSplitButtonPrimary
        className="data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
        onClick={() =>
          toggleList(editor, {
            listStyleType: ListStyleType.Decimal,
          })
        }
        data-state={pressed ? 'on' : 'off'}
      >
        <ListOrdered className="size-4" />
      </ToolbarSplitButtonPrimary>

      <Menu.Root open={open} onOpenChange={setOpen} modal={false}>
        <Menu.Trigger>
          <ToolbarSplitButtonSecondary />
        </Menu.Trigger>

        <Menu.Portal>
          <Menu.Positioner sideOffset={5} align="center" className="z-50">
            <Menu.Popup className="rounded-md border bg-popover p-1 shadow-md">
              <Menu.Group>
                <Menu.Item
                  onClick={() =>
                    toggleList(editor, {
                      listStyleType: ListStyleType.Decimal,
                    })
                  }
                  className="relative flex cursor-pointer select-none items-center rounded-sm px-1.5 py-1 outline-none hover:bg-accent focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50 min-w-[160px]"
                >
                  <span className="text-sm">Decimal (1, 2, 3)</span>
                </Menu.Item>
                <Menu.Item
                  onClick={() =>
                    toggleList(editor, {
                      listStyleType: ListStyleType.LowerAlpha,
                    })
                  }
                  className="relative flex cursor-pointer select-none items-center rounded-sm px-1.5 py-1 outline-none hover:bg-accent focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50 min-w-[160px]"
                >
                  <span className="text-sm">Lower Alpha (a, b, c)</span>
                </Menu.Item>
                <Menu.Item
                  onClick={() =>
                    toggleList(editor, {
                      listStyleType: ListStyleType.UpperAlpha,
                    })
                  }
                  className="relative flex cursor-pointer select-none items-center rounded-sm px-1.5 py-1 outline-none hover:bg-accent focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50 min-w-[160px]"
                >
                  <span className="text-sm">Upper Alpha (A, B, C)</span>
                </Menu.Item>
                <Menu.Item
                  onClick={() =>
                    toggleList(editor, {
                      listStyleType: ListStyleType.LowerRoman,
                    })
                  }
                  className="relative flex cursor-pointer select-none items-center rounded-sm px-1.5 py-1 outline-none hover:bg-accent focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50 min-w-[160px]"
                >
                  <span className="text-sm">Lower Roman (i, ii, iii)</span>
                </Menu.Item>
                <Menu.Item
                  onClick={() =>
                    toggleList(editor, {
                      listStyleType: ListStyleType.UpperRoman,
                    })
                  }
                  className="relative flex cursor-pointer select-none items-center rounded-sm px-1.5 py-1 outline-none hover:bg-accent focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50 min-w-[160px]"
                >
                  <span className="text-sm">Upper Roman (I, II, III)</span>
                </Menu.Item>
              </Menu.Group>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </ToolbarSplitButton>
  );
}

export function TodoListToolbarButton(
  props: React.ComponentProps<typeof ToolbarButton>
) {
  const state = useIndentTodoToolBarButtonState({ nodeType: 'todo' });
  const { props: buttonProps } = useIndentTodoToolBarButton(state);

  return (
    <ToolbarButton {...props} {...buttonProps} tooltip="Todo">
      <ListTodoIcon />
    </ToolbarButton>
  );
}
