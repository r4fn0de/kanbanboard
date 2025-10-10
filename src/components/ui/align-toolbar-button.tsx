'use client';

import * as React from 'react';

import type { Alignment } from '@platejs/basic-styles';

import { TextAlignPlugin } from '@platejs/basic-styles/react';
import {
  AlignCenterIcon,
  AlignJustifyIcon,
  AlignLeftIcon,
  AlignRightIcon,
} from 'lucide-react';
import { useEditorPlugin, useSelectionFragmentProp } from 'platejs/react';

import { Menu } from '@base-ui-components/react/menu';

import { ToolbarButton } from './toolbar';

const items = [
  {
    icon: AlignLeftIcon,
    value: 'left',
  },
  {
    icon: AlignCenterIcon,
    value: 'center',
  },
  {
    icon: AlignRightIcon,
    value: 'right',
  },
  {
    icon: AlignJustifyIcon,
    value: 'justify',
  },
];

interface AlignToolbarButtonProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  disabled?: boolean;
}

export function AlignToolbarButton(props: AlignToolbarButtonProps) {
  const { editor, tf } = useEditorPlugin(TextAlignPlugin);
  const value =
    useSelectionFragmentProp({
      defaultValue: 'start',
      getProp: (node) => node.align,
    }) ?? 'left';

  const [open, setOpen] = React.useState(false);
  const IconValue =
    items.find((item) => item.value === value)?.icon ?? AlignLeftIcon;

  return (
    <Menu.Root open={open} onOpenChange={setOpen} modal={false} {...props}>
      <Menu.Trigger asChild>
        <ToolbarButton pressed={open} tooltip="Align" isDropdown>
          <IconValue />
        </ToolbarButton>
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner sideOffset={5} align="start" className="z-50">
          <Menu.Popup className="min-w-0 rounded-md border bg-popover p-1 shadow-md">
            <Menu.RadioGroup
              value={value}
              onValueChange={(newValue) => {
                tf.textAlign.setNodes(newValue as Alignment);
                editor.tf.focus();
                setOpen(false);
              }}
            >
              {items.map(({ icon: Icon, value: itemValue }) => (
                <Menu.RadioItem
                  key={itemValue}
                  value={itemValue}
                  className="relative flex cursor-pointer select-none items-center rounded-sm px-1.5 py-1 outline-none hover:bg-accent focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                >
                  <Menu.RadioItemIndicator className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center opacity-0 data-[checked]:opacity-100">
                    <span className="h-2 w-2 rounded-full bg-current" />
                  </Menu.RadioItemIndicator>
                  <Icon className="ml-6 size-4" />
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}