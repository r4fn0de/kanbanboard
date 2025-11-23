'use client'

import * as React from 'react'

import { Menu } from '@base-ui-components/react/menu'
import {
  AudioLinesIcon,
  FileUpIcon,
  FilmIcon,
  ImageIcon,
  LinkIcon,
} from 'lucide-react'
import { isUrl, KEYS } from 'platejs'
import { useEditorRef } from 'platejs/react'
import { toast } from 'sonner'
import { useFilePicker } from 'use-file-picker'
import { PlaceholderPlugin } from '@platejs/media/react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'

import {
  ToolbarSplitButton,
  ToolbarSplitButtonPrimary,
  ToolbarSplitButtonSecondary,
} from './toolbar'

const MEDIA_CONFIG = {
  [KEYS.audio]: {
    accept: ['audio/*'],
    icon: <AudioLinesIcon className="size-4" />,
    title: 'Insert Audio',
    tooltip: 'Audio',
  },
  [KEYS.file]: {
    accept: ['*'],
    icon: <FileUpIcon className="size-4" />,
    title: 'Insert File',
    tooltip: 'File',
  },
  [KEYS.img]: {
    accept: ['image/*'],
    icon: <ImageIcon className="size-4" />,
    title: 'Insert Image',
    tooltip: 'Image',
  },
  [KEYS.video]: {
    accept: ['video/*'],
    icon: <FilmIcon className="size-4" />,
    title: 'Insert Video',
    tooltip: 'Video',
  },
} satisfies Record<
  string,
  {
    accept: string[]
    icon: React.ReactNode
    title: string
    tooltip: string
  }
>

function filesToFileList(files: File[]): FileList {
	const dataTransfer = new DataTransfer()
	files.forEach(file => dataTransfer.items.add(file))
	return dataTransfer.files
}

interface MediaToolbarButtonProps {
  nodeType: keyof typeof MEDIA_CONFIG
  open?: boolean
  onOpenChange?: (open: boolean) => void
  defaultOpen?: boolean
  disabled?: boolean
}

export function MediaToolbarButton({
  nodeType,
  ...props
}: MediaToolbarButtonProps) {
  const currentConfig = MEDIA_CONFIG[nodeType]

  const editor = useEditorRef()
  const [open, setOpen] = React.useState(false)
  const [dialogOpen, setDialogOpen] = React.useState(false)

  const { openFilePicker } = useFilePicker({
    accept: currentConfig.accept,
    multiple: true,
    onFilesSelected: (data: { plainFiles?: File[] }) => {
      const updatedFiles = data.plainFiles ?? []
      if (!updatedFiles.length) return

		  editor
				.getTransforms(PlaceholderPlugin)
				.insert.media(filesToFileList(updatedFiles))
    },
  })

  return (
    <>
      <ToolbarSplitButton
        onClick={() => {
          openFilePicker()
        }}
        onKeyDown={e => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
          }
        }}
        pressed={open}
      >
        <ToolbarSplitButtonPrimary>
          {currentConfig.icon}
        </ToolbarSplitButtonPrimary>

        <Menu.Root open={open} onOpenChange={setOpen} modal={false} {...props}>
          <Menu.Trigger>
            <ToolbarSplitButtonSecondary />
          </Menu.Trigger>

          <Menu.Portal>
            <Menu.Positioner sideOffset={5} align="center" className="z-50">
              <Menu.Popup
                className="rounded-md border bg-popover p-1 shadow-md"
                onClick={e => e.stopPropagation()}
              >
                <Menu.Group>
                  <Menu.Item
                    onClick={() => {
                      openFilePicker()
                      setOpen(false)
                    }}
                    className="relative flex cursor-pointer select-none items-center rounded-sm px-1.5 py-1 outline-none hover:bg-accent focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50 min-w-[160px]"
                  >
                    {currentConfig.icon}
                    <span className="text-sm ml-2">Upload from computer</span>
                  </Menu.Item>
                  <Menu.Item
                    onClick={() => {
                      setDialogOpen(true)
                      setOpen(false)
                    }}
                    className="relative flex cursor-pointer select-none items-center rounded-sm px-1.5 py-1 outline-none hover:bg-accent focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50 min-w-[160px]"
                  >
                    <LinkIcon className="size-4" />
                    <span className="text-sm ml-2">Insert via URL</span>
                  </Menu.Item>
                </Menu.Group>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </ToolbarSplitButton>

      <AlertDialog
        open={dialogOpen}
        onOpenChange={value => {
          setDialogOpen(value)
        }}
      >
        <AlertDialogContent className="gap-6">
          <MediaUrlDialogContent
            currentConfig={currentConfig}
            nodeType={nodeType}
            setOpen={setDialogOpen}
          />
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function MediaUrlDialogContent({
  currentConfig,
  nodeType,
  setOpen,
}: {
  currentConfig: (typeof MEDIA_CONFIG)[keyof typeof MEDIA_CONFIG]
  nodeType: string
  setOpen: (value: boolean) => void
}) {
  const editor = useEditorRef()
  const [url, setUrl] = React.useState('')

  const embedMedia = React.useCallback(() => {
    if (!isUrl(url)) return toast.error('Invalid URL')

    setOpen(false)
    editor.tf.insertNodes({
      children: [{ text: '' }],
      name: nodeType === KEYS.file ? url.split('/').pop() : undefined,
      type: nodeType,
      url,
    })
  }, [url, editor, nodeType, setOpen])

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>{currentConfig.title}</AlertDialogTitle>
      </AlertDialogHeader>

      <AlertDialogDescription className="group relative w-full">
        <label
          className="absolute top-1/2 block -translate-y-1/2 cursor-text px-1 text-sm text-muted-foreground/70 transition-all group-focus-within:pointer-events-none group-focus-within:top-0 group-focus-within:cursor-default group-focus-within:text-xs group-focus-within:font-medium group-focus-within:text-foreground has-[+input:not(:placeholder-shown)]:pointer-events-none has-[+input:not(:placeholder-shown)]:top-0 has-[+input:not(:placeholder-shown)]:cursor-default has-[+input:not(:placeholder-shown)]:text-xs has-[+input:not(:placeholder-shown)]:font-medium has-[+input:not(:placeholder-shown)]:text-foreground"
          htmlFor="url"
        >
          <span className="inline-flex bg-background px-2">URL</span>
        </label>
        <Input
          id="url"
          className="w-full"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') embedMedia()
          }}
          placeholder=""
          type="url"
          autoFocus
        />
      </AlertDialogDescription>

      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          onClick={e => {
            e.preventDefault()
            embedMedia()
          }}
        >
          Accept
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  )
}
