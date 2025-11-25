'use client'

import {
  BoldIcon,
  Code2Icon,
  ItalicIcon,
  StrikethroughIcon,
  UnderlineIcon,
  WandSparklesIcon,
} from 'lucide-react'
import { KEYS } from 'platejs'
import { useEditorReadOnly } from 'platejs/react'

import { formatChordForDisplay } from '@/hooks/useShortcutLabel'
import { AIToolbarButton } from './ai-toolbar-button'
import { CommentToolbarButton } from './comment-toolbar-button'
import { InlineEquationToolbarButton } from './equation-toolbar-button'
import { LinkToolbarButton } from './link-toolbar-button'
import { MarkToolbarButton } from './mark-toolbar-button'
import { MoreToolbarButton } from './more-toolbar-button'
import { SuggestionToolbarButton } from './suggestion-toolbar-button'
import { ToolbarGroup } from './toolbar'

export function FloatingToolbarButtons() {
  const readOnly = useEditorReadOnly()

  return (
    <>
      {!readOnly && (
        <>
          <ToolbarGroup>
            <AIToolbarButton tooltip="AI commands">
              <WandSparklesIcon />
              Ask AI
            </AIToolbarButton>
          </ToolbarGroup>

          <ToolbarGroup>
            <MarkToolbarButton
              nodeType={KEYS.bold}
              tooltip={`Bold (${formatChordForDisplay('mod+b')})`}
            >
              <BoldIcon />
            </MarkToolbarButton>

            <MarkToolbarButton
              nodeType={KEYS.italic}
              tooltip={`Italic (${formatChordForDisplay('mod+i')})`}
            >
              <ItalicIcon />
            </MarkToolbarButton>

            <MarkToolbarButton
              nodeType={KEYS.underline}
              tooltip={`Underline (${formatChordForDisplay('mod+u')})`}
            >
              <UnderlineIcon />
            </MarkToolbarButton>

            <MarkToolbarButton
              nodeType={KEYS.strikethrough}
              tooltip={`Strikethrough (${formatChordForDisplay('mod+shift+m')})`}
            >
              <StrikethroughIcon />
            </MarkToolbarButton>

            <MarkToolbarButton
              nodeType={KEYS.code}
              tooltip={`Code (${formatChordForDisplay('mod+e')})`}
            >
              <Code2Icon />
            </MarkToolbarButton>

            <InlineEquationToolbarButton />

            <LinkToolbarButton />
          </ToolbarGroup>
        </>
      )}

      <ToolbarGroup>
        <CommentToolbarButton />
        <SuggestionToolbarButton />

        {!readOnly && <MoreToolbarButton />}
      </ToolbarGroup>
    </>
  )
}
