import {
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";

import {
	DndContext,
	DragOverlay,
	PointerSensor,
	closestCorners,
	useDroppable,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import type {
	DragCancelEvent,
	DragEndEvent,
	DragStartEvent,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	horizontalListSortingStrategy,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { KanbanBoard, KanbanCard, KanbanColumn } from "@/types/common";
import {
	useCards,
	useColumns,
	useCreateCard,
	useCreateColumn,
	kanbanQueryKeys,
	useMoveCard,
	useMoveColumn,
} from "@/services/kanban";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Plus, UserRound, ArrowDown, Minus, ArrowUp, Circle, Play, CheckCircle } from "lucide-react";

function CardAvatar({ name }: { name: string }) {
	const initials = name
		.split(" ")
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? "")
		.join("");
	return (
		<div className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-gray-100 text-xs font-semibold text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
			{initials || <UserRound className="h-4 w-4" />}
		</div>
	);
}

function PriorityBadge({ priority }: { priority: KanbanCard["priority"] }) {
	const variants: Record<
		KanbanCard["priority"],
		{ label: string; className: string; icon: React.ComponentType<{ className?: string }> }
	> = {
		low: {
			label: "Low",
			className:
				"bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
			icon: ArrowDown,
		},
		medium: {
			label: "Medium",
			className:
				"bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
			icon: Minus,
		},
		high: {
			label: "High",
			className:
				"bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300",
			icon: ArrowUp,
		},
	};

	const variant = variants[priority];
	const Icon = variant.icon;

	return (
		<Badge
			className={cn(
				"rounded-full px-3 py-1 text-xs font-semibold leading-none flex items-center gap-1",
				variant.className,
			)}
		>
			<Icon className="h-3 w-3" />
			{variant.label}
		</Badge>
	);
}

function formatCardDueDate(value: KanbanCard["dueDate"]) {
	if (!value) return null;
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return null;
	return new Intl.DateTimeFormat(undefined, {
		day: "2-digit",
		month: "2-digit",
	}).format(date);
}

function CardContent({ card }: { card: KanbanCard }) {
	const ownerName = "Unassigned";
	const firstTag = card.tags?.[0];
	const dueDateLabel = formatCardDueDate(card.dueDate);

	return (
		<div className="flex flex-col gap-5">
			<div className="flex items-start justify-between gap-3">
				{firstTag ? (
					<span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-300">
						{firstTag}
					</span>
				) : (
					<span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
						Task
					</span>
				)}
				<PriorityBadge priority={card.priority} />
			</div>
			<div className="flex flex-col gap-2">
				<span className="text-base font-semibold leading-snug text-foreground">
					{card.title}
				</span>
				{card.description ? (
					<p className="text-sm leading-relaxed text-muted-foreground">
						{card.description}
					</p>
				) : null}
			</div>
			<div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
				<div className="flex items-center gap-2">
					<CardAvatar name={ownerName} />
					<span className="font-medium text-foreground/80">{ownerName}</span>
				</div>
				{dueDateLabel ? (
					<span className="rounded-full bg-gray-300 px-3 py-1 text-xs font-semibold text-gray-800 dark:bg-gray-600 dark:text-gray-200">
						{dueDateLabel}
					</span>
				) : null}
			</div>
		</div>
	);
}

function CardOverlay({ card }: { card: KanbanCard }) {
	return (
		<div className="pointer-events-none flex w-[300px] max-w-full flex-col rounded-[28px] border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
			<CardContent card={card} />
		</div>
	);
}

const DEFAULT_COLUMN_TITLES = ["To-Do", "In Progress", "Done"] as const;

function DraggableCard({ card }: { card: KanbanCard; accentIndex: number }) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: `card-${card.id}` });
	const style: React.CSSProperties = {
		transform: transform ? CSS.Transform.toString(transform) : undefined,
		transition: isDragging
			? "none"
			: (transition ?? "transform 220ms cubic-bezier(0.2, 0, 0, 1)"),
		opacity: isDragging ? 0.85 : undefined,
		cursor: isDragging ? "grabbing" : "grab",
		willChange: "transform",
		zIndex: isDragging ? 30 : undefined,
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			{...attributes}
			{...listeners}
			className={cn(
				"flex flex-col rounded-[28px] border border-gray-200 bg-white p-5 transition-all duration-200 active:cursor-grabbing dark:border-gray-700 dark:bg-gray-900",
			)}
		>
			<CardContent card={card} />
		</div>
	);
}

function DraggableColumn({
	column,
	columnCards,
	onAddCard,
	isCreatingCard,
	accentIndex,
}: {
	column: KanbanColumn;
	columnCards: KanbanCard[];
	onAddCard: () => void;
	isCreatingCard: boolean;
	accentIndex: number;
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({
		id: `column-${column.id}`,
	});
	const { setNodeRef: setDroppableRef } = useDroppable({
		id: `column-${column.id}-cards`,
	});
	const style: React.CSSProperties = {
		transform: transform ? CSS.Transform.toString(transform) : undefined,
		transition: isDragging
			? "none"
			: (transition ?? "transform 240ms cubic-bezier(0.22, 1, 0.36, 1)"),
		cursor: isDragging ? "grabbing" : "grab",
		willChange: "transform",
	};

	const cardsCount = columnCards.length;

	const accentThemes = [
		{
			dot: "bg-gray-400",
			count: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
			accentBorder: "border-gray-200 dark:border-gray-700",
			icon: Circle,
		},
		{
			dot: "bg-gray-500",
			count: "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
			accentBorder: "border-gray-200 dark:border-gray-700",
			icon: Play,
		},
		{
			dot: "bg-gray-600",
			count: "bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-gray-300",
			accentBorder: "border-gray-200 dark:border-gray-700",
			icon: CheckCircle,
		},
	] as const;

	const theme = accentThemes[accentIndex % accentThemes.length] ?? accentThemes[0];

	return (
		<div
			ref={setNodeRef}
			style={style}
			className="group flex h-full w-[320px] flex-shrink-0 flex-col gap-5 rounded-[32px] border border-gray-200 bg-gray-50 p-5 transition-all duration-200 active:cursor-grabbing dark:border-gray-700 dark:bg-gray-800"
		>
			<div
				className={cn(
					"flex items-center justify-between gap-3 rounded-3xl border bg-white px-5 py-4 dark:bg-gray-900",
					theme.accentBorder,
				)}
			>
				<div className="flex items-center gap-3" {...attributes} {...listeners}>
					<div className="flex items-center gap-2">
						<theme.icon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
					</div>
					<h2 className="text-lg font-semibold text-foreground">
						{column.title}
					</h2>
				</div>
				<span
					className={cn(
						"rounded-full px-3 py-1 text-xs font-semibold",
						theme.count,
					)}
				>
					{cardsCount}
				</span>
			</div>
			<div
				ref={setDroppableRef}
				className="flex flex-1 flex-col gap-4 overflow-y-auto overflow-x-visible p-1"
			>
				<SortableContext
					items={columnCards.map((c) => `card-${c.id}`)}
					strategy={verticalListSortingStrategy}
				>
					{columnCards.length > 0 ? (
						columnCards.map((card) => (
							<DraggableCard key={card.id} card={card} accentIndex={accentIndex} />
						))
					) : (
						<div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-muted-foreground/20 bg-white/70 p-6 text-center text-sm text-muted-foreground dark:bg-zinc-800/70">
							No cards yet. Add the first one to get started.
						</div>
					)}
				</SortableContext>
			</div>
			<Button
				variant="ghost"
				onClick={onAddCard}
				disabled={isCreatingCard}
				className="flex items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-medium text-foreground transition disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-900"
			>
				<Plus className="h-4 w-4" />
				Add card
			</Button>
		</div>
	);
}

interface BoardDetailViewProps {
	board: KanbanBoard;
	onBack: () => void;
}

export function BoardDetailView({ board, onBack }: BoardDetailViewProps) {
	const queryClient = useQueryClient();
	const {
		data: columns = [],
		isLoading: isLoadingColumns,
		isError: isColumnsError,
		error: columnsError,
		refetch: refetchColumns,
	} = useColumns(board.id);

	const {
		data: cards = [],
		isLoading: isLoadingCards,
		isError: isCardsError,
		error: cardsError,
		refetch: refetchCards,
	} = useCards(board.id);

	const { mutateAsync: createColumn, isPending: isCreatingColumn } =
		useCreateColumn(board.id);
	const { mutateAsync: createCard, isPending: isCreatingCard } = useCreateCard(
		board.id,
	);
	const { mutate: moveColumnMutate } = useMoveColumn(board.id);
	const { mutate: moveCardMutate } = useMoveCard(board.id);

	const [isColumnDialogOpen, setIsColumnDialogOpen] = useState(false);
	const [columnTitle, setColumnTitle] = useState("");
	const [columnWipLimit, setColumnWipLimit] = useState("");
	const [columnFormError, setColumnFormError] = useState<string | null>(null);
	const columnTitleId = useId();
	const columnWipId = useId();

	const [cardDialogColumn, setCardDialogColumn] = useState<KanbanColumn | null>(
		null,
	);
	const [cardTitle, setCardTitle] = useState("");
	const [cardDescription, setCardDescription] = useState("");
	const [cardPriority, setCardPriority] =
		useState<KanbanCard["priority"]>("low");
	const [cardDueDate, setCardDueDate] = useState("");
	const [cardFormError, setCardFormError] = useState<string | null>(null);
	const cardTitleId = useId();
	const cardDescriptionId = useId();
	const cardDueDateId = useId();
	const [activeCardId, setActiveCardId] = useState<string | null>(null);
	const hasSeededDefaultColumns = useRef(false);

	const [columnOrder, setColumnOrder] = useState<string[]>([]);

	useEffect(() => {
		const orderedIds = [...columns]
			.sort((a, b) => a.position - b.position)
			.map((column) => column.id);

		setColumnOrder((prev) => {
			if (
				prev.length === orderedIds.length &&
				prev.every((id, index) => orderedIds[index] === id)
			) {
				return prev;
			}
			return orderedIds;
		});
	}, [columns]);

	const cardsByColumn = useMemo(() => {
		const map = new Map<string, KanbanCard[]>();
		for (const column of columns) {
			map.set(column.id, []);
		}

		for (const card of cards) {
			const list = map.get(card.columnId);
			if (list) {
				list.push(card);
			}
		}

		for (const list of map.values()) {
			list.sort((a, b) => a.position - b.position);
		}

		return map;
	}, [columns, cards]);

	const activeCard = useMemo(
		() => cards.find((card) => card.id === activeCardId) ?? null,
		[activeCardId, cards],
	);

	const resetColumnForm = useCallback(() => {
		setColumnTitle("");
		setColumnWipLimit("");
		setColumnFormError(null);
	}, []);

	useEffect(() => {
		if (
			isLoadingColumns ||
			columns.length > 0 ||
			hasSeededDefaultColumns.current
		) {
			return;
		}

		hasSeededDefaultColumns.current = true;

		(async () => {
			try {
				for (const [index, title] of DEFAULT_COLUMN_TITLES.entries()) {
					// Execute sequentially to avoid SQLite write lock errors
					await createColumn({
						id: crypto.randomUUID(),
						boardId: board.id,
						title,
						position: index,
						wipLimit: null,
					});
				}
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: typeof error === "string"
							? error
							: "Could not create default columns";
				toast.error(message);
			}
		})();
	}, [board.id, columns.length, createColumn, isLoadingColumns]);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 5 },
		}),
	);

	const handleDragEnd = useCallback(
		(event: DragEndEvent) => {
			const { active, over } = event;
			setActiveCardId(null);
			if (!over) return;

			const activeId = String(active.id);
			const overId = String(over.id);

			const getColumnIdFromSortableId = (id: string) =>
				id.replace(/^column-/, "").replace(/-cards$/, "");

			// Columns reordering
			if (activeId.startsWith("column-") && overId.startsWith("column-")) {
				const columnId = getColumnIdFromSortableId(activeId);
				const overColumnId = getColumnIdFromSortableId(overId);
				const fromIndex = columnOrder.indexOf(columnId);
				const toIndex = columnOrder.indexOf(overColumnId);
				if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
					setColumnOrder((current) => arrayMove(current, fromIndex, toIndex));
					queryClient.setQueryData<KanbanColumn[]>(
						kanbanQueryKeys.columns(board.id),
						(current) => {
							if (!current) return current;
							const reordered = arrayMove(current, fromIndex, toIndex).map(
								(col, idx) => ({
									...col,
									position: idx,
								}),
							);
							return reordered;
						},
					);
					moveColumnMutate({
						boardId: board.id,
						columnId,
						targetIndex: toIndex,
					});
				}
				return;
			}

			// Cards move (within or across columns)
			if (activeId.startsWith("card-")) {
				const cardId = activeId.replace("card-", "");
				const card = cards.find((c) => c.id === cardId);
				if (!card) return;

				let toColumnId: string | null = null;
				let targetIndex = 0;

				if (overId.startsWith("card-")) {
					const overCardId = overId.replace("card-", "");
					const overCard = cards.find((c) => c.id === overCardId);
					if (!overCard) return;
					toColumnId = overCard.columnId;
					const list = cardsByColumn.get(toColumnId) ?? [];
					targetIndex = list.findIndex((c) => c.id === overCardId);
				} else if (overId.startsWith("column-") && overId.endsWith("-cards")) {
					toColumnId = overId.slice("column-".length, -"-cards".length);
					const list = cardsByColumn.get(toColumnId) ?? [];
					targetIndex = list.length;
				} else {
					return;
				}

				if (toColumnId) {
					moveCardMutate({
						boardId: board.id,
						cardId,
						fromColumnId: card.columnId,
						toColumnId,
						targetIndex,
					});
				}
			}
		},
		[
			board.id,
			cards,
			cardsByColumn,
			moveCardMutate,
			moveColumnMutate,
			columnOrder,
			queryClient,
		],
	);

	const handleDragStart = useCallback((event: DragStartEvent) => {
		const { active } = event;
		const activeId = String(active.id);
		if (activeId.startsWith("card-")) {
			setActiveCardId(activeId.replace("card-", ""));
		}
	}, []);

	const handleDragCancel = useCallback((_: DragCancelEvent) => {
		setActiveCardId(null);
	}, []);

	const resetCardForm = useCallback(() => {
		setCardTitle("");
		setCardDescription("");
		setCardPriority("low");
		setCardDueDate("");
		setCardFormError(null);
	}, []);

	const handleCreateColumn = useCallback(
		async (event: FormEvent<HTMLFormElement>) => {
			event.preventDefault();
			setColumnFormError(null);

			const trimmedTitle = columnTitle.trim();
			if (!trimmedTitle) {
				setColumnFormError("Inform a name for the column.");
				return;
			}

			const wipLimit = columnWipLimit.trim();
			const parsedWip = wipLimit ? Number.parseInt(wipLimit, 10) : undefined;
			if (wipLimit && Number.isNaN(parsedWip)) {
				setColumnFormError("WIP limit must be an integer.");
				return;
			}

			try {
				await createColumn({
					id: crypto.randomUUID(),
					boardId: board.id,
					title: trimmedTitle,
					position: columns.length,
					wipLimit: parsedWip ?? null,
				});
				toast.success("Column created successfully");
				resetColumnForm();
				setIsColumnDialogOpen(false);
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: "Could not create the column";
				setColumnFormError(message);
				toast.error(message);
			}
		},
		[
			board.id,
			columnTitle,
			columnWipLimit,
			columns.length,
			createColumn,
			resetColumnForm,
		],
	);

	const handleCreateCard = useCallback(
		async (event: FormEvent<HTMLFormElement>) => {
			event.preventDefault();
			if (!cardDialogColumn) {
				setCardFormError("Select a valid column.");
				return;
			}

			const trimmedTitle = cardTitle.trim();
			if (!trimmedTitle) {
				setCardFormError("Inform a title for the card.");
				return;
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
				});
				toast.success("Card created successfully");
				resetCardForm();
				setCardDialogColumn(null);
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Could not create the card";
				setCardFormError(message);
				toast.error(message);
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
		],
	);

	const handleRetry = useCallback(() => {
		refetchColumns();
		refetchCards();
	}, [refetchCards, refetchColumns]);

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
					{["a", "b", "c"].map((key) => (
						<Skeleton key={key} className="h-64" />
					))}
				</div>
			</div>
		);
	}

	if (isColumnsError || isCardsError) {
		const message =
			columnsError instanceof Error
				? columnsError.message
				: cardsError instanceof Error
					? cardsError.message
					: "Could not load the board data.";

		return (
			<div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
				<p className="text-lg font-semibold text-foreground">{board.title}</p>
				<p className="max-w-md text-sm text-muted-foreground">{message}</p>
				<Button onClick={handleRetry}>Try again</Button>
				<Button variant="outline" onClick={onBack}>
					Back
				</Button>
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col gap-6 p-6">
			<div className="flex flex-col gap-2">
				<Button variant="ghost" className="w-max px-0" onClick={onBack}>
					← Back
				</Button>
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">
						{board.title}
					</h1>
					{board.description ? (
						<p className="text-sm text-muted-foreground">{board.description}</p>
					) : null}
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Dialog
						open={isColumnDialogOpen}
						onOpenChange={setIsColumnDialogOpen}
					>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>New column</DialogTitle>
								<DialogDescription>
									Define a name and optionally a WIP limit for the column.
								</DialogDescription>
							</DialogHeader>
							<form onSubmit={handleCreateColumn} className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor={columnTitleId}>Column name</Label>
									<Input
										id={columnTitleId}
										value={columnTitle}
										onChange={(event) => setColumnTitle(event.target.value)}
										placeholder="Ex.: In progress"
										autoFocus
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor={columnWipId}>WIP limit (optional)</Label>
									<Input
										id={columnWipId}
										inputMode="numeric"
										pattern="[0-9]*"
										value={columnWipLimit}
										onChange={(event) => setColumnWipLimit(event.target.value)}
										placeholder="Ex.: 5 (optional)"
									/>
								</div>
								{columnFormError ? (
									<p className="text-sm text-destructive">{columnFormError}</p>
								) : null}
								<DialogFooter>
									<DialogClose asChild>
										<Button
											type="button"
											variant="outline"
											disabled={isCreatingColumn}
										>
											Cancel
										</Button>
									</DialogClose>
									<Button type="submit" disabled={isCreatingColumn}>
										{isCreatingColumn ? "Creating..." : "Create column"}
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
						No columns created
					</p>
					<p className="max-w-sm text-sm text-muted-foreground">
						Create the first column to start organizing the tasks in this board.
					</p>
					<Button
						onClick={() => setIsColumnDialogOpen(true)}
						disabled={isCreatingColumn}
					>
						Create first column
					</Button>
				</div>
			) : (
				<DndContext
					sensors={sensors}
					collisionDetection={closestCorners}
					onDragStart={handleDragStart}
					onDragCancel={handleDragCancel}
					onDragEnd={handleDragEnd}
				>
					<SortableContext
						items={columnOrder.map((id) => `column-${id}`)}
						strategy={horizontalListSortingStrategy}
					>
						<div className="flex flex-1 items-stretch gap-4 overflow-x-auto pb-4">
							{columnOrder.map((columnId, index) => {
								const column = columns.find((col) => col.id === columnId);
								if (!column) {
									return null;
								}
								const columnCards = cardsByColumn.get(column.id) ?? [];
								return (
									<DraggableColumn
										key={column.id}
										column={column}
										columnCards={columnCards}
										isCreatingCard={isCreatingCard}
										accentIndex={index}
										onAddCard={() => {
											setCardDialogColumn(column);
											resetCardForm();
										}}
									/>
								);
							})}
						</div>
					</SortableContext>
					<DragOverlay dropAnimation={null}>
						{activeCard ? <CardOverlay card={activeCard} /> : null}
					</DragOverlay>
				</DndContext>
			)}

			<Dialog
				open={Boolean(cardDialogColumn)}
				onOpenChange={(open) => {
					if (!open) {
						setCardDialogColumn(null);
					}
				}}
			>
				{cardDialogColumn ? (
					<DialogContent>
						<DialogHeader>
							<DialogTitle>
								New card in &quot;{cardDialogColumn.title}&quot;
							</DialogTitle>
							<DialogDescription>
								Detail the card to add it to the selected column.
							</DialogDescription>
						</DialogHeader>
						<form onSubmit={handleCreateCard} className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor={cardTitleId}>Title</Label>
								<Input
									id={cardTitleId}
									value={cardTitle}
									onChange={(event) => setCardTitle(event.target.value)}
									placeholder="Ex.: Adjust page layout"
									autoFocus
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor={cardDescriptionId}>
									Description (optional)
								</Label>
								<Textarea
									id={cardDescriptionId}
									value={cardDescription}
									onChange={(event) => setCardDescription(event.target.value)}
									placeholder="Add relevant details"
									rows={3}
								/>
							</div>
							<div className="grid gap-4 sm:grid-cols-2">
								<div className="space-y-2">
									<Label>Priority</Label>
									<Select
										value={cardPriority}
										onValueChange={(value) =>
											setCardPriority(value as KanbanCard["priority"])
										}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select the priority" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="low">Low</SelectItem>
											<SelectItem value="medium">Medium</SelectItem>
											<SelectItem value="high">High</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Label htmlFor={cardDueDateId}>Due date</Label>
									<Input
										id={cardDueDateId}
										type="date"
										value={cardDueDate}
										onChange={(event) => setCardDueDate(event.target.value)}
									/>
								</div>
							</div>
							{cardFormError ? (
								<p className="text-sm text-destructive">{cardFormError}</p>
							) : null}
							<DialogFooter>
								<DialogClose asChild>
									<Button
										type="button"
										variant="outline"
										disabled={isCreatingCard}
									>
										Cancel
									</Button>
								</DialogClose>
								<Button type="submit" disabled={isCreatingCard}>
									{isCreatingCard ? "Creating..." : "Create card"}
								</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				) : null}
			</Dialog>
		</div>
	);
}

export default BoardDetailView;
