# Base UI Integration

Este projeto usa [Base UI](https://base-ui.com/) da equipe do Material-UI para componentes de UI headless (sem estilo). Base UI fornece a funcionalidade e acessibilidade, enquanto mantemos controle total sobre o estilo visual.

## Configuração

### 1. Instalação

```bash
npm install @base-ui-components/react
```

### 2. Configuração de Portals

Para que componentes com portals (Dialog, Popover, etc.) funcionem corretamente, já foi adicionado em `src/App.css`:

```css
/* Base UI - Create stacking context for portals */
#root {
  isolation: isolate;
}

body {
  position: relative;
}
```

Isso garante que:

- Popups sempre aparecem acima do conteúdo da página
- `z-index` no seu CSS não interfere com os portals
- iOS 26+ Safari funciona corretamente com backdrops

## Componentes Disponíveis

### Dialog

O componente Dialog foi adaptado para Base UI mantendo a mesma API do Radix UI anterior. Veja `src/components/ui/base-ui-dialog.tsx`.

#### Uso Básico - Partes Individuais

```tsx
import {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogBackdrop,
  DialogPopup,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogClose,
} from '@/components/ui/base-ui-dialog'
import { Button } from '@/components/ui/button'

function MyDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open Dialog</Button>
      </DialogTrigger>

      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup>
          <DialogHeader>
            <DialogTitle>Edit Workspace</DialogTitle>
            <DialogDescription>
              Make changes to your workspace here.
            </DialogDescription>
          </DialogHeader>

          {/* Conteúdo do dialog */}
          <div className="space-y-4">
            <input type="text" placeholder="Workspace name" />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  )
}
```

#### Uso Simplificado - CompleteDialog

Para casos simples, use o componente `CompleteDialog`:

```tsx
import { CompleteDialog } from '@/components/ui/base-ui-dialog'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

function MySimpleDialog() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>Open</Button>

      <CompleteDialog
        open={open}
        onOpenChange={setOpen}
        title="Create Workspace"
        description="Enter a name for your new workspace"
      >
        <form onSubmit={handleSubmit}>
          <input type="text" name="name" />
          <Button type="submit">Create</Button>
        </form>
      </CompleteDialog>
    </>
  )
}
```

#### Uso com Estado Controlado

```tsx
import {
  Dialog,
  DialogPortal,
  DialogBackdrop,
  DialogPopup,
} from '@/components/ui/base-ui-dialog'

function ControlledDialog() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* ... */}
    </Dialog>
  )
}
```

## API dos Componentes

### Dialog (Root)

Componente raiz que gerencia o estado do dialog.

**Props:**

- `open?: boolean` - Estado controlado
- `defaultOpen?: boolean` - Estado inicial não-controlado
- `onOpenChange?: (open: boolean) => void` - Callback quando o estado muda
- `modal?: boolean` - Se deve ser modal (padrão: true)

### DialogTrigger

Elemento que abre o dialog quando clicado.

**Props:**

- `asChild?: boolean` - Passa as props para o filho em vez de renderizar um botão

### DialogPortal

Renderiza o conteúdo em um portal no final do body.

### DialogBackdrop

Overlay escuro atrás do dialog (já estilizado).

### DialogPopup

O conteúdo principal do dialog (já estilizado com animações).

**Props:**

- `showCloseButton?: boolean` - Mostra botão X no canto (padrão: true)

### DialogTitle

Título do dialog (importante para acessibilidade).

### DialogDescription

Descrição opcional do dialog.

### DialogHeader

Container de conveniência para título + descrição.

### DialogFooter

Container de conveniência para botões de ação.

### DialogClose

Fecha o dialog quando clicado.

**Props:**

- `asChild?: boolean` - Passa as props para o filho

## Diferenças do Radix UI

Base UI é muito similar ao Radix UI, mas com algumas diferenças:

1. **Import paths**: `@base-ui-components/react/dialog` em vez de `@radix-ui/react-dialog`
2. **Naming**:
   - `Popup` em vez de `Content`
   - `Backdrop` em vez de `Overlay`
3. **Tree-shaking**: Base UI é tree-shakeable por padrão
4. **Filosofia**: Mais focado em ser headless puro, sem opiniões sobre estilo

## Migração de Radix UI para Base UI

Se você tiver código usando o Radix UI Dialog antigo:

**Antes (Radix UI):**

```tsx
import * as Dialog from '@radix-ui/react-dialog'

;<Dialog.Root>
  <Dialog.Portal>
    <Dialog.Overlay />
    <Dialog.Content>
      <Dialog.Title>...</Dialog.Title>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

**Depois (Base UI):**

```tsx
import { Dialog } from '@base-ui-components/react/dialog'

;<Dialog.Root>
  <Dialog.Portal>
    <Dialog.Backdrop />
    <Dialog.Popup>
      <Dialog.Title>...</Dialog.Title>
    </Dialog.Popup>
  </Dialog.Portal>
</Dialog.Root>
```

Ou use nosso wrapper estilizado:

```tsx
import {
  Dialog,
  DialogPortal,
  DialogBackdrop,
  DialogPopup,
} from '@/components/ui/base-ui-dialog'
```

## Estilização

### Classes de Estado (Data Attributes)

Base UI adiciona automaticamente atributos de dados que você pode usar para estilizar estados:

```css
/* Dialog aberto/fechado */
[data-state='open'] {
}
[data-state='closed'] {
}

/* Trigger pressionado */
[data-pressed='true'] {
}

/* Popup posicionado */
[data-side='top'] {
}
[data-side='bottom'] {
}
```

### Tailwind

```tsx
<DialogBackdrop className="bg-black/50 backdrop-blur-sm" />

<DialogPopup className="bg-white dark:bg-gray-900 rounded-lg shadow-xl">
  {/* ... */}
</DialogPopup>
```

### Animações

O wrapper já inclui animações usando Tailwind:

- Fade in/out para backdrop
- Zoom + fade para popup
- Timing: 300ms entrada, 200ms saída

Você pode customizar:

```tsx
<DialogPopup className="data-[state=open]:animate-slide-up">
  {/* ... */}
</DialogPopup>
```

## Acessibilidade

Base UI cuida automaticamente de:

- ✅ Focus trap no dialog
- ✅ Fecha com Esc
- ✅ Fecha clicando fora (backdrop)
- ✅ ARIA attributes corretos
- ✅ Gerenciamento de scroll do body
- ✅ Navegação por teclado
- ✅ Leitores de tela

**Importante:** Sempre inclua `DialogTitle` para acessibilidade!

## Exemplos Práticos

### Dialog de Confirmação

```tsx
function DeleteConfirmDialog({ item, onConfirm, open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir "{item.name}"? Esta ação não pode
              ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button variant="destructive" onClick={onConfirm}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  )
}
```

### Dialog com Form

```tsx
function CreateWorkspaceDialog({ open, onOpenChange }) {
  const { mutate, isPending } = useCreateWorkspace()

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    mutate(
      {
        name: formData.get('name') as string,
        color: formData.get('color') as string,
      },
      {
        onSuccess: () => onOpenChange(false),
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup>
          <DialogHeader>
            <DialogTitle>Criar Workspace</DialogTitle>
            <DialogDescription>Configure seu novo workspace</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label>Nome</label>
              <input type="text" name="name" required />
            </div>
            <div>
              <label>Cor</label>
              <input type="color" name="color" />
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={isPending}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Criando...' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  )
}
```

## Outros Componentes Base UI

Base UI oferece muitos outros componentes que você pode integrar:

- **Popover** - Para tooltips e menus contextuais
- **Select** - Dropdown nativo melhorado
- **Checkbox** - Checkbox acessível
- **Switch** - Toggle switch
- **Slider** - Range slider
- **Tabs** - Navegação por abas
- **Accordion** - Conteúdo expansível
- E mais...

## Referências

- [Base UI Documentation](https://base-ui.com/)
- [Dialog Component](https://base-ui.com/react/components/dialog)
- [Styling Guide](https://base-ui.com/react/guides/styling)
- [Accessibility](https://base-ui.com/react/guides/accessibility)

## Próximos Passos

1. ✅ Dialog implementado
2. ⬜ Migrar outros componentes de Radix para Base UI (opcional)
3. ⬜ Implementar Popover do Base UI
4. ⬜ Implementar Select do Base UI (se necessário)
