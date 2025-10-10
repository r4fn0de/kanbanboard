'use client';

import * as React from 'react';

import { SuggestionPlugin } from '@platejs/suggestion/react';
import { Menu } from '@base-ui-components/react/menu';
import { CheckIcon, EyeIcon, PencilLineIcon, PenIcon } from 'lucide-react';
import { useEditorRef, usePlateState, usePluginOption } from 'platejs/react';

import { ToolbarButton } from './toolbar';

interface ModeToolbarButtonProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  disabled?: boolean;
}

export function ModeToolbarButton(props: ModeToolbarButtonProps) {
  const editor = useEditorRef();
  const [readOnly, setReadOnly] = usePlateState('readOnly');
  const [open, setOpen] = React.useState(false);

  const isSuggesting = usePluginOption(SuggestionPlugin, 'isSuggesting');

  let value = 'editing';

  if (readOnly) value = 'viewing';

  if (isSuggesting) value = 'suggestion';

  const item: Record<string, { icon: React.ReactNode; label: string }> = {
    editing: {
      icon: <PenIcon />,
      label: 'Editing',
    },
    suggestion: {
      icon: <PencilLineIcon />,
      label: 'Suggestion',
    },
    viewing: {
      icon: <EyeIcon />,
      label: 'Viewing',
    },
  };

  return (
    <Menu.Root open={open} onOpenChange={setOpen} modal={false} {...props}>
      <Menu.Trigger>
        <ToolbarButton pressed={open} tooltip="Editing mode" isDropdown>
          {item[value]?.icon}
          <span className="hidden lg:inline">{item[value]?.label}</span>
        </ToolbarButton>
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner sideOffset={5} align="center" className="z-50">
          <Menu.Popup className="min-w-[180px] rounded-md border bg-popover p-1 shadow-md">
            <Menu.RadioGroup
              value={value}
              onValueChange={(newValue: string) => {
                if (newValue === 'viewing') {
                  setReadOnly(true);
                  setOpen(false);
                  return;
                } else {
                  setReadOnly(false);
                }

                if (newValue === 'suggestion') {
                  editor.setOption(SuggestionPlugin, 'isSuggesting', true);
                  setOpen(false);
                  return;
                } else {
                  editor.setOption(SuggestionPlugin, 'isSuggesting', false);
                }

                if (newValue === 'editing') {
                  editor.tf.focus();
                  setOpen(false);
                  return;
                }
              }}
            >
              <Menu.RadioItem
                className="relative flex cursor-pointer select-none items-center rounded-sm px-1.5 py-2 outline-none hover:bg-accent focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50 min-w-[160px] pl-2 *:[svg]:text-muted-foreground"
                value="editing"
              >
                <Indicator value={value} itemValue="editing" />
                <PenIcon className="mr-2 size-4 text-muted-foreground" />
                <span className="text-sm">{item.editing?.label}</span>
              </Menu.RadioItem>

              <Menu.RadioItem
                className="relative flex cursor-pointer select-none items-center rounded-sm px-1.5 py-2 outline-none hover:bg-accent focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50 min-w-[160px] pl-2 *:[svg]:text-muted-foreground"
                value="viewing"
              >
                <Indicator value={value} itemValue="viewing" />
                <EyeIcon className="mr-2 size-4 text-muted-foreground" />
                <span className="text-sm">{item.viewing?.label}</span>
              </Menu.RadioItem>

              <Menu.RadioItem
                className="relative flex cursor-pointer select-none items-center rounded-sm px-1.5 py-2 outline-none hover:bg-accent focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50 min-w-[160px] pl-2 *:[svg]:text-muted-foreground"
                value="suggestion"
              >
                <Indicator value={value} itemValue="suggestion" />
                <PencilLineIcon className="mr-2 size-4 text-muted-foreground" />
                <span className="text-sm">{item.suggestion?.label}</span>
              </Menu.RadioItem>
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

function Indicator({ value, itemValue }: { value: string; itemValue: string }) {
  return (
    <span className="pointer-events-none absolute right-2 flex size-3.5 items-center justify-center">
      {value === itemValue && <CheckIcon className="size-3" />}
    </span>
  );
}
