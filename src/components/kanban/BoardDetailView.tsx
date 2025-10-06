import { useCallback, useId, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { toast } from 'sonner'

import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { KanbanBoard, KanbanCard, KanbanColumn } from '@/types/common'
import {
  useCards,
  useColumns,
  useCreateCard,
  useCreateColumn,
  useMoveCard,
  useMoveColumn,
} from '@/services/kanban'

interface BoardDetailViewProps {
  board: KanbanBoard
  onBack: () => void
}

export function BoardDetailView({ board, onBack }: BoardDetailViewProps) {
  const {
    data: columns = [],
    isLoading: isLoadingColumns,
    isError: isColumnsError,
    error: columnsError,
    refetch: refetchColumns,
  } = useColumns(board.id)

  const {
    data: cards = [],
    isLoading: isLoadingCards,
    isError: isCardsError,
    error: cardsError,
    refetch: refetchCards,
  } = useCards(board.id)

  const { mutateAsync: createColumn, isPending: isCreatingColumn } =
    useCreateColumn(board.id)
  const { mutateAsync: createCard, isPending: isCreatingCard } =
    useCreateCard(board.id)

  const [isColumnDialogOpen, setIsColumnDialogOpen] = useState(false)
  const [columnTitle, setColumnTitle] = useState('')
  const [columnWipLimit, setColumnWipLimit] = useState('')
  const [columnFormError, setColumnFormError] = useState<string | null>(null)
  const columnTitleId = useId()
  const columnWipId = useId()

  const [cardDialogColumn, setCardDialogColumn] = useState<KanbanColumn | null>(
    null
  )
  const [cardTitle, setCardTitle] = useState('')
  const [cardDescription, setCardDescription] = useState('')
  const [cardPriority, setCardPriority] = useState<KanbanCard['priority']>('low')
  const [cardDueDate, setCardDueDate] = useState('')
  const [cardFormError, setCardFormError] = useState<string | null>(null)
  const cardTitleId = useId()
  const cardDescriptionId = useId()
  const cardDueDateId = useId()

  const cardsByColumn = useMemo(() => {
    const map = new Map<string, KanbanCard[]>()
    for (const column of columns) {
      map.set(column.id, [])
    }

    for (const card of cards) {
      const list = map.get(card.columnId)
      if (list) {
        list.push(card)
      }
    }

    for (const list of map.values()) {
      list.sort((a, b) => a.position - b.position)
    }

    return map
  }, [columns, cards])

  const resetColumnForm = useCallback(() => {
    setColumnTitle('')
    setColumnWipLimit('')
    setColumnFormError(null)
  }, [])

  const resetCardForm = useCallback(() => {
    setCardTitle('')
    setCardDescription('')
    setCardPriority('low')
    setCardDueDate('')
    setCardFormError(null)
  }, [])

  const handleCreateColumn = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setColumnFormError(null)

      const trimmedTitle = columnTitle.trim()
      if (!trimmedTitle) {
        setColumnFormError('Informe um nome para a coluna.')
        return
      }

      const wipLimit = columnWipLimit.trim()
      const parsedWip = wipLimit ? Number.parseInt(wipLimit, 10) : undefined
      if (wipLimit && Number.isNaN(parsedWip)) {
        setColumnFormError('Limite WIP precisa ser um número inteiro.')
        return
      }

      try {
        await createColumn({
          id: crypto.randomUUID(),
          boardId: board.id,
          title: trimmedTitle,
          position: columns.length,
          wipLimit: parsedWip ?? null,
        })
        toast.success('Coluna criada com sucesso')
        resetColumnForm()
        setIsColumnDialogOpen(false)
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Não foi possível criar a coluna'
        setColumnFormError(message)
        toast.error(message)
      }
    },
    [board.id, columnTitle, columnWipLimit, columns.length, createColumn, resetColumnForm]
  )

  const handleCreateCard = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!cardDialogColumn) {
        setCardFormError('Selecione uma coluna válida.')
        return
      }

      const trimmedTitle = cardTitle.trim()
      if (!trimmedTitle) {
        setCardFormError('Informe um título para o cartão.')
        return
      }

      try {
        await createCard({
          id: crypto.randomUUID(),
          boardId: board.id,
          columnId: cardDialogColumn.id,
          title: trimmedTitle,
          description: cardDescription.trim() || undefined,
          position: (cardsByColumn.get(cardDialogColumn.id)?.length ?? 0) + 1,
          priority: cardPriority,
          dueDate: cardDueDate ? new Date(cardDueDate).toISOString() : null,
        })
        toast.success('Cartão criado com sucesso')
        resetCardForm()
        setCardDialogColumn(null)
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Não foi possível criar o cartão'
        setCardFormError(message)
        toast.error(message)
      }
    },
    [
      board.id,
      cardDescription,
      cardDialogColumn,
      cardDueDate,
      cardPriority,
      cardTitle,
      cardsByColumn,
      createCard,
      resetCardForm,
    ]
  )

  const handleRetry = useCallback(() => {
    refetchColumns()
    refetchCards()
  }, [refetchCards, refetchColumns])

  if (isLoadingColumns || isLoadingCards) {
    return (
      <div className="flex h-full flex-col gap-6 p-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {['a', 'b', 'c'].map(key => (
            <Skeleton key={key} className="h-64" />
          ))}
        </div>
      </div>
    )
  }

  if (isColumnsError || isCardsError) {
    const message =
      columnsError instanceof Error
        ? columnsError.message
        : cardsError instanceof Error
        ? cardsError.message
        : 'Não foi possível carregar os dados do quadro.'

    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-lg font-semibold text-foreground">{board.title}</p>
        <p className="max-w-md text-sm text-muted-foreground">{message}</p>
        <Button onClick={handleRetry}>Tentar novamente</Button>
        <Button variant="outline" onClick={onBack}>
          Voltar
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <Button variant="ghost" className="w-max px-0" onClick={onBack}>
          ← Voltar
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{board.title}</h1>
          {board.description ? (
            <p className="text-sm text-muted-foreground">{board.description}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Dialog open={isColumnDialogOpen} onOpenChange={setIsColumnDialogOpen}>
            <DialogTrigger>
              <Button size="sm" disabled={isCreatingColumn}>
                Nova coluna
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova coluna</DialogTitle>
                <DialogDescription>
                  Defina nome e opcionalmente um limite de WIP para a coluna.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateColumn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={columnTitleId}>Nome da coluna</Label>
                  <Input
                    id={columnTitleId}
                    value={columnTitle}
                    onChange={event => setColumnTitle(event.target.value)}
                    placeholder="Ex.: Em progresso"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={columnWipId}>Limite WIP (opcional)</Label>
                  <Input
                    id={columnWipId}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={columnWipLimit}
                    onChange={event => setColumnWipLimit(event.target.value)}
                    placeholder="Ex.: 5"
                  />
                </div>
                {columnFormError ? (
                  <p className="text-sm text-destructive">{columnFormError}</p>
                ) : null}
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline" disabled={isCreatingColumn}>
                      Cancelar
                    </Button>
                  </DialogClose>
                  <Button type="submit" disabled={isCreatingColumn}>
                    {isCreatingColumn ? 'Criando...' : 'Criar coluna'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {columns.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-lg font-semibold text-foreground">
            Nenhuma coluna criada
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Crie a primeira coluna para começar a organizar as tarefas deste quadro.
          </p>
          <Button onClick={() => setIsColumnDialogOpen(true)} disabled={isCreatingColumn}>
            Criar primeira coluna
          </Button>
        </div>
      ) : (
        <div className="grid flex-1 gap-4 md:grid-cols-3">
          {columns.map(column => {
            const columnCards = cardsByColumn.get(column.id) ?? []
            return (
              <div
                key={column.id}
                className="flex h-full flex-col rounded-lg border border-border/60 bg-muted/40"
              >
                <div className="flex items-center justify-between gap-2 border-b border-border/60 p-4">
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      {column.title}
                    </h2>
                    {typeof column.wipLimit === 'number' ? (
                      <p className="text-xs text-muted-foreground">
                        Limite WIP: {column.wipLimit}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setCardDialogColumn(column)
                      resetCardForm()
                    }}
                    disabled={isCreatingCard}
                  >
                    Novo cartão
                  </Button>
                </div>
                <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
                  {columnCards.length > 0 ? (
                    columnCards.map(card => (
                      <div
                        key={card.id}
                        className="rounded-md border border-border/50 bg-background p-3 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">
                            {card.title}
                          </span>
                          <span className="text-xs uppercase text-muted-foreground">
                            {card.priority}
                          </span>
                        </div>
                        {card.description ? (
                          <p className="mt-2 text-xs text-muted-foreground">
                            {card.description}
                          </p>
                        ) : null}
                        {card.dueDate ? (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Vencimento: {new Date(card.dueDate).toLocaleDateString()}
                          </p>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-xs text-muted-foreground">
                      Nenhum cartão nesta coluna.
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={Boolean(cardDialogColumn)} onOpenChange={open => {
        if (!open) {
          setCardDialogColumn(null)
        }
      }}>
        {cardDialogColumn ? (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo cartão em "{cardDialogColumn.title}"</DialogTitle>
              <DialogDescription>
                Detalhe o cartão para adicioná-lo à coluna selecionada.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateCard} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={cardTitleId}>Título</Label>
                <Input
                  id={cardTitleId}
                  value={cardTitle}
                  onChange={event => setCardTitle(event.target.value)}
                  placeholder="Ex.: Ajustar layout da página"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={cardDescriptionId}>Descrição (opcional)</Label>
                <Textarea
                  id={cardDescriptionId}
                  value={cardDescription}
                  onChange={event => setCardDescription(event.target.value)}
                  placeholder="Adicione detalhes relevantes"
                  rows={3}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Select value={cardPriority} onValueChange={value => setCardPriority(value as KanbanCard['priority'])}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a prioridade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={cardDueDateId}>Data de vencimento</Label>
                  <Input
                    id={cardDueDateId}
                    type="date"
                    value={cardDueDate}
                    onChange={event => setCardDueDate(event.target.value)}
                  />
                </div>
              </div>
              {cardFormError ? (
                <p className="text-sm text-destructive">{cardFormError}</p>
              ) : null}
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isCreatingCard}>
                    Cancelar
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={isCreatingCard}>
                  {isCreatingCard ? 'Criando...' : 'Criar cartão'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  )
}

export default BoardDetailView
