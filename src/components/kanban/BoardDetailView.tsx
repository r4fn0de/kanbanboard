import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	SelectGroup,
	SelectGroupLabel,
	SelectSeparator,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
	BOARD_VIEW_OPTIONS,
	DEFAULT_BOARD_VIEW_MODE,
	isBoardViewMode,
	type BoardViewMode,
} from "@/components/kanban/board-view-modes";
import { BoardKanbanView } from "./views/BoardKanbanView";
import { BoardListView } from "./views/BoardListView";
import { BoardTimelineView } from "./views/BoardTimelineView";
import { getCardDueMetadata, type CardDueStatus } from "./views/card-date";
import { TaskDetailsPanel } from "@/components/kanban/TaskDetailsPanel";
import { ColumnManagerDialog } from "@/components/kanban/ColumnManagerDialog";
import { BoardNavbar } from "@/components/kanban/BoardNavbar";
import type {
	KanbanBoard,
	KanbanCard,
	KanbanColumn,
	KanbanPriority,
} from "@/types/common";
import { useWorkspaces } from "@/services/workspaces";
import {
	useCards,
	useColumns,
	useCreateCard,
	useMoveCard,
	useDeleteCard,
	useDuplicateCard,
} from "@/services/kanban";
import { Plus, Filter, LayoutDashboard } from "lucide-react";
import { HorizontalSliderIcon, PriorityIcon, PriorityLowIcon, PriorityMediumIcon, PriorityHighIcon } from "@/components/ui/icons";
import type { LucideIcon } from "lucide-react";
import type {
	DragEndEvent,
	DragStartEvent,
	DragCancelEvent,
} from "@dnd-kit/core";
import { createCardSchema } from "@/schemas/kanban";

interface BoardDetailViewProps {
	board: KanbanBoard;
	viewMode?: BoardViewMode;
	onViewModeChange?: (mode: BoardViewMode) => void;
}

type PriorityFilterOptionValue = "all" | KanbanPriority;
type DueFilterOptionValue = "all" | CardDueStatus | "no_due";

type DisplayColumnsOption = "status";
type DisplayRowsOption = "none";
type DisplayOrderingOption =
	| "position"
	| "priority"
	| "due_date"
	| "last_updated"
	| "title";

interface PriorityFilterOption {
	value: PriorityFilterOptionValue;
	label: string;
	icon: LucideIcon;
}

const PRIORITY_FILTER_OPTIONS: PriorityFilterOption[] = [
	{ value: "all", label: "All priorities", icon: PriorityIcon },
	{ value: "high", label: "High", icon: PriorityHighIcon },
	{ value: "medium", label: "Medium", icon: PriorityMediumIcon },
	{ value: "low", label: "Low", icon: PriorityLowIcon },
];

export function BoardDetailView({
	board,
	viewMode = DEFAULT_BOARD_VIEW_MODE,
	onViewModeChange,
}: BoardDetailViewProps) {
	const navigate = useNavigate();
	const { data: workspaces = [] } = useWorkspaces();
	const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
	const [isCardDialogOpen, setIsCardDialogOpen] = useState(false);

	const [cardTitle, setCardTitle] = useState("");
	const [cardDescription, setCardDescription] = useState("");
	const [cardPriority, setCardPriority] = useState<KanbanPriority>("medium");
	const [cardDueDate, setCardDueDate] = useState("");
	const [cardDialogColumn, setCardDialogColumn] = useState<KanbanColumn | null>(
		null,
	);
	const [cardFormError, setCardFormError] = useState<string | null>(null);
	const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
	const [activeDragCard, setActiveDragCard] = useState<KanbanCard | null>(null);
	const [activeNavTab, setActiveNavTab] = useState("tasks");
	const [selectedPriorities, setSelectedPriorities] = useState<KanbanPriority[]>(
		[],
	);
	const [selectedDueStatuses, setSelectedDueStatuses] = useState<
		Array<CardDueStatus | "no_due">
	>([]);
	const [displayColumns, setDisplayColumns] =
		useState<DisplayColumnsOption>("status");
	const [displayRows, setDisplayRows] = useState<DisplayRowsOption>("none");
	const [displayOrdering, setDisplayOrdering] =
		useState<DisplayOrderingOption>("position");
	const [orderDoneByRecency, setOrderDoneByRecency] = useState(false);
	const [showSubtasksSummary, setShowSubtasksSummary] = useState(true);

	const prioritySelectValue = useMemo<PriorityFilterOptionValue[]>(
		() => (selectedPriorities.length === 0 ? ["all"] : selectedPriorities),
		[selectedPriorities],
	);

	const dueSelectValue = useMemo<DueFilterOptionValue[]>(
		() => (selectedDueStatuses.length === 0 ? ["all"] : selectedDueStatuses),
		[selectedDueStatuses],
	);

	const handleTabChange = useCallback(
		(tab: string) => {
			if (tab === "notes") {
				navigate(`/projects/${board.id}/notes`);
				return;
			}

			if (tab === "whiteboard") {
				navigate(`/projects/${board.id}/whiteboard`);
				return;
			}

			setActiveNavTab(tab);
		},
		[board.id, navigate],
	);

	const cardTitleId = useId();
	const cardDescriptionId = useId();
	const cardDueDateId = useId();

	const {
		data: columns = [],
		isLoading: isLoadingColumns,
		error: columnsError,
		refetch: refetchColumns,
	} = useColumns(board.id);

	const {
		data: allCards = [],
		isLoading: isLoadingCards,
		error: cardsError,
		refetch: refetchCards,
	} = useCards(board.id);

	const createCardMutation = useCreateCard(board.id);
	const moveCardMutation = useMoveCard(board.id);
	const deleteCardMutation = useDeleteCard(board.id);

	const parseCardId = useCallback((id: string | number) => {
		const raw = id.toString();
		return raw.startsWith("card-") ? raw.slice(5) : raw;
	}, []);

	const parseColumnId = useCallback((id?: string | number | null) => {
		if (!id) return null;
		let raw = id.toString();

		// Remove 'column-' prefix if present
		if (raw.startsWith("column-")) {
			raw = raw.slice(7);
		}

		// Remove '-cards' suffix if present
		if (raw.endsWith("-cards")) {
			raw = raw.slice(0, -6);
		}

		// Remove '-end' suffix if present (for end drop zones)
		if (raw.endsWith("-end")) {
			raw = raw.slice(0, -4);
		}

		// Also handle case where the ID is just the column ID without any prefix/suffix
		return raw || null;
	}, []);

	const columnsById = useMemo(
		() => new Map(columns.map((column) => [column.id, column])),
		[columns],
	);

	const columnsWithCounts = useMemo(
		() =>
			columns
				.map((column) => ({
					...column,
					cardCount: allCards.filter((card) => card.columnId === column.id)
						.length,
				}))
				.sort((a, b) => a.position - b.position),
		[columns, allCards],
	);

	const visibleColumns = useMemo(
		() => columnsWithCounts.filter((column) => column.isEnabled !== false),
		[columnsWithCounts],
	);

	// const hiddenColumnCount = columnsWithCounts.length - visibleColumns.length

	const visibleColumnIds = useMemo(
		() => new Set(visibleColumns.map((column) => column.id)),
		[visibleColumns],
	);

	const visibleCards = useMemo(
		() =>
			allCards
				.filter((card) => visibleColumnIds.has(card.columnId))
				.filter((card) => {
					// Priority filter: OR between selected priorities, no filter if none selected
					if (selectedPriorities.length > 0) {
						if (!card.priority || !selectedPriorities.includes(card.priority)) {
							return false;
						}
					}

					// Deadline filter: OR between selected due statuses, no filter if none selected
					if (selectedDueStatuses.length === 0) {
						return true;
					}

					const status: CardDueStatus | "no_due" | null = card.dueDate
						? getCardDueMetadata(card.dueDate)?.status ?? null
						: "no_due";

					if (!status) return false;
					return selectedDueStatuses.includes(status);
				}),
		[allCards, visibleColumnIds, selectedPriorities, selectedDueStatuses],
	);

	const visibleColumnsById = useMemo(
		() => new Map(visibleColumns.map((column) => [column.id, column])),
		[visibleColumns],
	);

	const cardsByColumn = useMemo(() => {
		const grouped = new Map<string, KanbanCard[]>();

		visibleColumns.forEach((column) => {
			grouped.set(column.id, []);
		});

		visibleCards.forEach((card) => {
			const list = grouped.get(card.columnId);
			if (!list) {
				return;
			}
			list.push(card);
		});

		const priorityWeight = (priority: KanbanPriority): number => {
			switch (priority) {
				case "high":
					return 0;
				case "medium":
					return 1;
				case "low":
					return 2;
				default:
					return 3;
			}
		};

		const isDoneColumn = (columnId: string): boolean => {
			const column = columnsById.get(columnId);
			if (!column) return false;
			const title = column.title.trim().toLowerCase();
			return title === "done" || title === "concluído" || title === "concluido";
		};

		grouped.forEach((list, columnId) => {
			list.sort((a, b) => {
				const timeOrZero = (value?: string | null): number =>
					value ? Date.parse(value) || 0 : 0;

				if (orderDoneByRecency && isDoneColumn(columnId)) {
					const updatedA = timeOrZero(a.updatedAt);
					const updatedB = timeOrZero(b.updatedAt);
					if (updatedA !== updatedB) {
						return updatedB - updatedA;
					}

					const createdA = timeOrZero(a.createdAt);
					const createdB = timeOrZero(b.createdAt);
					if (createdA !== createdB) {
						return createdB - createdA;
					}

					return a.title.localeCompare(b.title);
				}

				if (displayOrdering === "priority") {
					const weightA = priorityWeight(a.priority);
					const weightB = priorityWeight(b.priority);
					if (weightA !== weightB) {
						return weightA - weightB;
					}
				}
				else if (displayOrdering === "due_date") {
					const dueA = a.dueDate ? Date.parse(a.dueDate) || Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
					const dueB = b.dueDate ? Date.parse(b.dueDate) || Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
					if (dueA !== dueB) {
						return dueA - dueB;
					}
				}
				else if (displayOrdering === "last_updated") {
					const updatedA = timeOrZero(a.updatedAt);
					const updatedB = timeOrZero(b.updatedAt);
					if (updatedA !== updatedB) {
						return updatedB - updatedA;
					}
				}
				else if (displayOrdering === "title") {
					const byTitle = a.title.localeCompare(b.title);
					if (byTitle !== 0) {
						return byTitle;
					}
				}

				const positionA = a.position ?? Number.MAX_SAFE_INTEGER;
				const positionB = b.position ?? Number.MAX_SAFE_INTEGER;
				if (positionA !== positionB) {
					return positionA - positionB;
				}

				const updatedA = timeOrZero(a.updatedAt);
				const updatedB = timeOrZero(b.updatedAt);
				if (updatedA !== updatedB) {
					return updatedA - updatedB;
				}

				const createdA = timeOrZero(a.createdAt);
				const createdB = timeOrZero(b.createdAt);
				if (createdA !== createdB) {
					return createdA - createdB;
				}

				return a.title.localeCompare(b.title);
			});
		});

		return grouped;
	}, [visibleColumns, visibleCards, displayOrdering, orderDoneByRecency, columnsById]);

	const dueSummary = useMemo(() => {
		const summary = { overdue: 0, today: 0, soon: 0 };
		visibleCards.forEach((card) => {
			const metadata = getCardDueMetadata(card.dueDate);
			if (!metadata) return;
			if (metadata.status === "overdue") {
				summary.overdue += 1;
			} else if (metadata.status === "today") {
				summary.today += 1;
			} else if (metadata.status === "soon") {
				summary.soon += 1;
			}
		});
		return summary;
	}, [visibleCards]);

	// Counts for filters (based on all cards on the board)
	const priorityCounts = useMemo(() => {
		const counts: Record<KanbanPriority, number> = {
			high: 0,
			medium: 0,
			low: 0,
		};

		allCards.forEach((card) => {
			if (card.priority && counts[card.priority as KanbanPriority] != null) {
				counts[card.priority as KanbanPriority] += 1;
			}
		});

		const total = counts.high + counts.medium + counts.low;
		return { counts, total };
	}, [allCards]);

	const dueCounts = useMemo(
		() => {
			const counts = {
				all: 0,
				overdue: 0,
				today: 0,
				soon: 0,
				upcoming: 0,
				no_due: 0,
			};

			allCards.forEach((card) => {
				counts.all += 1;

				if (!card.dueDate) {
					counts.no_due += 1;
					return;
				}

				const metadata = getCardDueMetadata(card.dueDate);
				if (!metadata) return;

				switch (metadata.status) {
					case "overdue":
						counts.overdue += 1;
						break;
					case "today":
						counts.today += 1;
						break;
					case "soon":
						counts.soon += 1;
						break;
					case "upcoming":
						counts.upcoming += 1;
						break;
					default:
						break;
				}
			});

			return counts;
		},
		[allCards],
	);

	const formatCountLabel = (count: number) =>
		`${count} ${count === 1 ? "task" : "tasks"}`;

	const selectedCard = useMemo(
		() => visibleCards.find((card) => card.id === selectedCardId) ?? null,
		[visibleCards, selectedCardId],
	);

	useEffect(() => {
		if (!selectedCardId) return;
		if (!visibleCards.some((card) => card.id === selectedCardId)) {
			setSelectedCardId(null);
		}
	}, [visibleCards, selectedCardId]);

	const resetCardForm = useCallback(() => {
		setCardTitle("");
		setCardDescription("");
		setCardPriority("medium");
		setCardDueDate("");
		setCardFormError(null);
	}, []);

	const handleCreateCard = useCallback(
		async (event: React.FormEvent) => {
			event.preventDefault();
			if (!cardDialogColumn) {
				setCardFormError("Select a column before creating a task.");
				return;
			}

			try {
				const parsed = createCardSchema.safeParse({
					id: `temp-${Date.now()}`,
					boardId: board.id,
					columnId: cardDialogColumn.id,
					title: cardTitle.trim(),
					description: cardDescription.trim() || undefined,
					priority: cardPriority,
					dueDate: cardDueDate || undefined,
					position: 0,
					tagIds: [],
				});

				if (!parsed.success) {
					const message =
						parsed.error.issues[0]?.message ?? "Invalid task data provided";
					setCardFormError(message);
					toast.error(message);
					return;
				}

				setCardFormError(null);

				const columnCards = cardsByColumn.get(cardDialogColumn.id) || [];

				// Always insert at the end of the column
				// The frontend displays cards sorted by priority and name,
				// but the backend position is just sequential (0, 1, 2...)
				const targetPosition = columnCards.length + 1;

				await createCardMutation.mutateAsync({
					...parsed.data,
					position: targetPosition,
					tagIds: parsed.data.tagIds ?? [],
				});
				resetCardForm();
				setIsCardDialogOpen(false);
				setCardDialogColumn(null);
			} catch (error) {
				console.error("Failed to create card", error);
				toast.error("Failed to create card");
			}
		},
		[
			board.id,
			cardDialogColumn,
			createCardMutation,
			resetCardForm,
			cardsByColumn,
			cardTitle,
			cardDescription,
			cardPriority,
			cardDueDate,
		],
	);

	const handleCardSelect = useCallback(
		(card: KanbanCard) => {
			setSelectedCardId(card.id === selectedCardId ? null : card.id);
		},
		[selectedCardId],
	);

	const handleCloseDetails = useCallback(() => {
		setSelectedCardId(null);
	}, []);

	const handleDeleteCard = useCallback(
		async (card: KanbanCard) => {
			try {
				await deleteCardMutation.mutateAsync({
					id: card.id,
					boardId: board.id,
					columnId: card.columnId,
				});
				setSelectedCardId((prev) => (prev === card.id ? null : prev));
				toast.success("Task deleted");
			} catch (error) {
				console.error("Failed to delete task", error);
				toast.error("Failed to delete task");
			}
		},
		[board.id, deleteCardMutation],
	);

	const duplicateCardMutation = useDuplicateCard(board.id);

	const handleDuplicateCard = useCallback(
		async (card: KanbanCard) => {
			try {
				// Get current cards in the same column to find the next available position
				const columnCards = cardsByColumn.get(card.columnId) || [];
				const maxPosition = Math.max(...columnCards.map((c) => c.position), -1);
				const nextPosition = maxPosition + 1;

				await duplicateCardMutation.mutateAsync({
					id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
					boardId: board.id,
					columnId: card.columnId,
					title: card.title + " (copy)",
					description: card.description,
					priority: card.priority,
					dueDate: card.dueDate,
					position: nextPosition, // Use calculated next position
				});
				toast.success("Task duplicated");
			} catch (error) {
				console.error("Failed to duplicate task", error);
				toast.error("Failed to duplicate task");
			}
		},
		[duplicateCardMutation, board.id, cardsByColumn],
	);

	const handleDragStart = useCallback(
		(event: DragStartEvent) => {
			const rawId = event.active.id.toString();
			if (!rawId.startsWith("card-")) return;

			const cardId = parseCardId(rawId);
			const card = visibleCards.find((c) => c.id === cardId) ?? null;
			setActiveDragCard(card);
		},
		[visibleCards, parseCardId],
	);

	const handleDragCancel = useCallback((_: DragCancelEvent) => {
		setActiveDragCard(null);
	}, []);

	const handleDragEnd = useCallback(
		async (event: DragEndEvent) => {
			setActiveDragCard(null);

			const { active, over } = event;
			if (!over) return;

			const rawActiveId = active.id.toString();
			if (!rawActiveId.startsWith("card-")) return;

			const activeCardId = parseCardId(rawActiveId);
			const activeCard = visibleCards.find((card) => card.id === activeCardId);
			if (!activeCard) return;

			// Enhanced parsing logic to handle different drop scenarios
			const overData = over.data?.current as
				| { sortable?: { containerId?: string | number; index: number } }
				| undefined;
			let destinationColumnId: string | null = null;
			let targetIndex: number | null = null;

			const rawOverId = over.id.toString();
			if (rawOverId === rawActiveId) {
				return;
			}

			// Try to get column ID from sortable container first (when dropping between cards)
			if (overData?.sortable?.containerId) {
				destinationColumnId = parseColumnId(overData.sortable.containerId);
				targetIndex = overData.sortable.index ?? 0;
			}
			// If no container, check if we're dropping on a card directly
			else if (rawOverId.startsWith("card-")) {
				const overCardId = parseCardId(rawOverId);
				const overCard = visibleCards.find((card) => card.id === overCardId);
				if (overCard) {
					destinationColumnId = overCard.columnId;
					// Find the position of the card we're dropping on
					const columnCards = cardsByColumn.get(overCard.columnId) ?? [];
					targetIndex = columnCards.findIndex((card) => card.id === overCardId);
					if (targetIndex === -1) targetIndex = columnCards.length;
				}
			}
			// Finally, try to parse the over.id directly (when dropping on empty column or end zone)
			else {
				destinationColumnId = parseColumnId(rawOverId);
				const columnCards = cardsByColumn.get(destinationColumnId ?? "") ?? [];

				// If dropping on end zone, always add to the end
				if (rawOverId.endsWith("-end")) {
					targetIndex = columnCards.length;
				} else {
					targetIndex = columnCards.length; // Add to end if dropping on empty area
				}
			}

			if (!destinationColumnId) {
				console.warn("Could not determine destination column ID");
				return;
			}

			// Validate that the destination column exists
			if (!columns.some((col) => col.id === destinationColumnId)) {
				console.warn("Destination column does not exist:", destinationColumnId);
				return;
			}

			const columnCards = cardsByColumn.get(destinationColumnId) ?? [];
			const activeIndexInColumn = columnCards.findIndex(
				(card) => card.id === activeCardId,
			);

			if (targetIndex == null) {
				if (rawOverId.startsWith("card-")) {
					const overCardId = parseCardId(rawOverId);
					targetIndex = columnCards.findIndex((card) => card.id === overCardId);
					if (targetIndex === -1) {
						targetIndex = columnCards.length;
					}
				} else {
					targetIndex = columnCards.length;
				}
			}

			const isSameColumn = destinationColumnId === activeCard.columnId;

			if (isSameColumn) {
				if (activeIndexInColumn === -1) {
					return;
				}

				if (columnCards.length <= 1) {
					return;
				}

				if (targetIndex >= columnCards.length) {
					targetIndex = columnCards.length - 1;
				}

				if (targetIndex === activeIndexInColumn) {
					return;
				}
			}

			// Target index should respect destination bounds
			const maxIndex = isSameColumn
				? Math.max(0, columnCards.length - 1)
				: columnCards.length;
			targetIndex = Math.max(0, Math.min(targetIndex, maxIndex));

			// Final validation before API call
			if (!activeCardId || !destinationColumnId) {
				console.error("Missing required data for move operation");
				return;
			}

			// Only proceed with the API call if there's an actual position change
			try {
				await moveCardMutation.mutateAsync({
					boardId: board.id,
					cardId: activeCardId,
					fromColumnId: activeCard.columnId,
					toColumnId: destinationColumnId,
					targetIndex,
				});
			} catch (error) {
				console.error("Failed to move card:", {
					error,
					cardId: activeCardId,
					fromColumnId: activeCard.columnId,
					toColumnId: destinationColumnId,
					targetIndex,
				});
				toast.error(
					`Failed to move card: ${error instanceof Error ? error.message : "Unknown error"}`,
				);
			}
		},
		[
			board.id,
			visibleCards,
			columns,
			cardsByColumn,
			moveCardMutation,
			parseCardId,
			parseColumnId,
		],
	);

	const isKanbanView = viewMode === "kanban";
	const resolvedViewMode = isBoardViewMode(viewMode)
		? viewMode
		: DEFAULT_BOARD_VIEW_MODE;

	const isCreatingCard = createCardMutation.isPending;

	if (isLoadingColumns || isLoadingCards) {
		return (
			<div className="flex flex-col gap-4 p-6">
				<div className="flex items-center gap-4">
					<Skeleton className="h-10 w-10" />
					<Skeleton className="h-6 w-48" />
				</div>
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					{["first", "second", "third"].map((key) => (
						<div key={`column-skeleton-${key}`} className="space-y-4">
							<Skeleton className="h-6 w-24" />
							<div className="space-y-2">
								{["a", "b", "c"].map((cardKey) => (
									<Skeleton
										key={`card-skeleton-${key}-${cardKey}`}
										className="h-20 w-full"
									/>
								))}
							</div>
						</div>
					))}
				</div>
			</div>
		);
	}

	if (columnsError || cardsError) {
		return (
			<div className="flex flex-col items-center justify-center gap-4 p-6">
				<div className="text-center">
					<h2 className="text-lg font-semibold">Failed to load board</h2>
					<p className="text-muted-foreground">
						{columnsError?.message ||
							cardsError?.message ||
							"An error occurred"}
					</p>
				</div>
				<Button onClick={() => Promise.all([refetchColumns(), refetchCards()])}>
					Try Again
				</Button>
			</div>
		);
	}

	const taskControls = (
		<div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
			{/* Filtros de Prioridade e Deadline */}
			<Popover>
				<PopoverTrigger>
					<Button
						variant="outline"
						size="sm"
						className="h-9 gap-2 rounded-lg border-border/60 bg-background/80 px-3 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground hover:shadow-sm"
						type="button"
					>
						<Filter className="h-3.5 w-3.5" />
						<span>Filters</span>
					</Button>
				</PopoverTrigger>
				<PopoverContent
					align="end"
					sideOffset={8}
					className="w-72 rounded-lg border border-border/40 bg-popover/95 p-3 shadow-lg"
				>
					<div className="space-y-3">
						<div className="space-y-1.5">
							<span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
								Priority
							</span>
							<Select
								type="multiple"
								value={prioritySelectValue}
								onValueChange={(value) => {
									const values = (Array.isArray(value)
										? value
										: [value]) as PriorityFilterOptionValue[];
									const next = values.filter((v) => v !== "all") as KanbanPriority[];
									setSelectedPriorities(next);
								}}
							>
								<SelectTrigger
									size="sm"
									className="h-7 w-full rounded-md border border-border/30 bg-background/70 px-2 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground hover:bg-accent/30"
								>
									<SelectValue placeholder="All">
										{(() => {
											const count = selectedPriorities.length;
											if (count === 0) {
												const option = PRIORITY_FILTER_OPTIONS[0]; // "all"
												const Icon = option.icon;
												return (
													<span className="flex items-center gap-1.5">
														<Icon className="h-3 w-3 text-muted-foreground/70" />
														<span className="truncate text-muted-foreground/90">
															{option.label}
														</span>
													</span>
												);
											}

											if (count === 1) {
												const value = selectedPriorities[0];
												const option = PRIORITY_FILTER_OPTIONS.find(
													(item) => item.value === value,
												);
												const Icon = option?.icon ?? PriorityIcon;
												return (
													<span className="flex items-center gap-1.5">
														<Icon className="h-3 w-3 text-foreground" />
														<span className="truncate text-foreground font-medium">
															{option?.label ?? "All"}
														</span>
													</span>
												);
											}

											// Multiple selected
											return (
												<span className="flex items-center gap-1.5">
													<PriorityIcon className="h-3 w-3 text-foreground" />
													<span className="truncate text-foreground font-medium">
														{selectedPriorities.length} selected
													</span>
												</span>
											);
										})()}
									</SelectValue>
								</SelectTrigger>
								<SelectContent
									sideOffset={4}
									className="rounded-md border border-border/40 bg-popover/95 shadow-md"
								>
									<SelectGroup>
										<SelectGroupLabel className="px-2 pt-1 pb-1 text-[11px] font-medium text-muted-foreground/80">
											Filter...
										</SelectGroupLabel>
										<SelectSeparator className="mx-2 my-1" />
										{PRIORITY_FILTER_OPTIONS.map((option) => {
											const Icon = option.icon;
											const count =
												option.value === "all"
													? priorityCounts.total
													: priorityCounts.counts[option.value as KanbanPriority] ?? 0;
											return (
												<SelectItem
													key={option.value}
													value={option.value}
													className="text-xs transition-colors duration-150 hover:bg-muted cursor-pointer data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground"
												>
													<div className="flex items-center justify-between gap-2">
														<div className="flex items-center gap-2">
															<Icon className="h-3 w-3" />
															<span>{option.label}</span>
														</div>
														<span className="text-[11px] text-muted-foreground">
															{formatCountLabel(count)}
														</span>
													</div>
												</SelectItem>
											);
										})}
									</SelectGroup>
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-1.5">
							<span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
								Deadline
							</span>
							<Select
								type="multiple"
								value={dueSelectValue}
								onValueChange={(value) => {
									const values = (Array.isArray(value)
										? value
										: [value]) as DueFilterOptionValue[];
									const next = values.filter((v) => v !== "all") as Array<
										CardDueStatus | "no_due"
									>;
									setSelectedDueStatuses(next);
								}}
							>
								<SelectTrigger
									size="sm"
									className="h-7 w-full rounded-md border border-border/30 bg-background/70 px-2 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground hover:bg-accent/30"
								>
									<SelectValue placeholder="All">
										{(() => {
											const count = selectedDueStatuses.length;
											if (count === 0) {
												return (
													<span className="truncate text-muted-foreground/90">
														All
													</span>
												);
											}

											if (count === 1) {
												const value = selectedDueStatuses[0];
												const label =
													value === "overdue"
														? "Overdue"
														: value === "today"
															? "Today"
															: value === "soon"
																? "Soon"
																: value === "upcoming"
																	? "Upcoming"
																	: value === "no_due"
																		? "No date"
																		: "All";
												return (
													<span className="truncate text-foreground font-medium">
														{label}
													</span>
												);
											}

											// Multiple selected
											return (
												<span className="truncate text-foreground font-medium">
													{selectedDueStatuses.length} selected
												</span>
											);
										})()}
									</SelectValue>
								</SelectTrigger>
								<SelectContent
									sideOffset={4}
									className="rounded-md border border-border/40 bg-popover/95 shadow-md"
								>
									<SelectItem
										value="all"
										className="text-xs transition-colors duration-150 hover:bg-muted cursor-pointer data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground"
									>
										<div className="flex items-center justify-between gap-2">
											<div className="flex items-center gap-2">
												<span>All deadlines</span>
											</div>
											<span className="text-[11px] text-muted-foreground">
												{formatCountLabel(dueCounts.all)}
											</span>
										</div>
									</SelectItem>
									<SelectItem
										value="overdue"
										className="text-xs transition-colors duration-150 hover:bg-muted cursor-pointer data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground"
									>
										<div className="flex items-center justify-between gap-2">
											<div className="flex items-center gap-2">
												<div className="h-2 w-2 rounded-full bg-destructive" />
												<span>Overdue</span>
											</div>
											<span className="text-[11px] text-muted-foreground">
												{formatCountLabel(dueCounts.overdue)}
											</span>
										</div>
									</SelectItem>
									<SelectItem
										value="today"
										className="text-xs transition-colors duration-150 hover:bg-muted cursor-pointer data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground"
									>
										<div className="flex items-center justify-between gap-2">
											<div className="flex items-center gap-2">
												<div className="h-2 w-2 rounded-full bg-orange-500" />
												<span>Due today</span>
											</div>
											<span className="text-[11px] text-muted-foreground">
												{formatCountLabel(dueCounts.today)}
											</span>
										</div>
									</SelectItem>
									<SelectItem
										value="soon"
										className="text-xs transition-colors duration-150 hover:bg-muted cursor-pointer data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground"
									>
										<div className="flex items-center justify-between gap-2">
											<div className="flex items-center gap-2">
												<div className="h-2 w-2 rounded-full bg-yellow-500" />
												<span>Due soon</span>
											</div>
											<span className="text-[11px] text-muted-foreground">
												{formatCountLabel(dueCounts.soon)}
											</span>
										</div>
									</SelectItem>
									<SelectItem
										value="upcoming"
										className="text-xs transition-colors duration-150 hover:bg-muted cursor-pointer data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground"
									>
										<div className="flex items-center justify-between gap-2">
											<div className="flex items-center gap-2">
												<div className="h-2 w-2 rounded-full bg-blue-500" />
												<span>Upcoming</span>
											</div>
											<span className="text-[11px] text-muted-foreground">
												{formatCountLabel(dueCounts.upcoming)}
											</span>
										</div>
									</SelectItem>
									<SelectItem
										value="no_due"
										className="text-xs transition-colors duration-150 hover:bg-muted cursor-pointer data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground"
									>
										<div className="flex items-center justify-between gap-2">
											<div className="flex items-center gap-2">
												<span>No due date</span>
											</div>
											<span className="text-[11px] text-muted-foreground">
												{formatCountLabel(dueCounts.no_due)}
											</span>
										</div>
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</PopoverContent>
		</Popover>

			{/* Display / View selector */}
			<Popover>
				<PopoverTrigger>
					<Button
						variant="outline"
						size="sm"
						className="h-9 gap-2 rounded-lg border-border/60 bg-background/80 px-3 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground hover:shadow-sm"
						type="button"
					>
						<LayoutDashboard className="h-3.5 w-3.5" />
						<span>Display</span>
					</Button>
				</PopoverTrigger>
				<PopoverContent
					align="end"
					sideOffset={8}
					className="w-80 rounded-lg border border-border/40 bg-popover/95 p-2 shadow-lg"
				>
					<div className="space-y-3">
						{/* Botões de view (Kanban / List / Timeline) */}
						<div className="flex w-full items-stretch rounded-md bg-muted/80 p-0.5">
							{BOARD_VIEW_OPTIONS.map((option) => {
								const Icon = option.icon;
								const isActive = resolvedViewMode === option.value;
								return (
									<button
										key={option.value}
										type="button"
										onClick={() => {
											if (onViewModeChange && isBoardViewMode(option.value)) {
												onViewModeChange(option.value);
											}
										}}
										className={`flex-1 flex flex-col items-center justify-center gap-1 rounded-md px-2.5 py-1 text-[11px] transition-colors ${
											isActive
												? "bg-accent text-accent-foreground shadow-sm"
												: "text-muted-foreground hover:bg-accent/40 hover:text-accent-foreground"
										}`}
									>
										<Icon className="h-4 w-4" />
										<span>{option.label}</span>
									</button>
								);
							})}
						</div>
								</div>
						{/* Controls extras */}
						<div className="mt-1 space-y-3 border-t border-border/60 pt-3">
							{/* Columns */}
							<div className="flex items-center justify-between gap-3">
								<div className="flex flex-col">
									<span className="text-xs font-medium text-muted-foreground">
										Columns
									</span>
									<span className="text-[11px] text-muted-foreground/70">
										Group tasks by status
									</span>
								</div>
								<Select
									value={displayColumns}
									onValueChange={(value) =>
										setDisplayColumns(value as DisplayColumnsOption)
									}
								>
									<SelectTrigger
										size="sm"
										className="h-7 w-[140px] rounded-md border border-border/30 bg-background/70 px-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/30"
									>
										<SelectValue className="text-xs">
											{displayColumns === "status" ? "Status" : "Status"}
										</SelectValue>
									</SelectTrigger>
									<SelectContent sideOffset={4}>
										<SelectItem value="status" className="text-xs">
											Status
										</SelectItem>
									</SelectContent>
								</Select>
							</div>

							{/* Rows */}
							<div className="flex items-center justify-between gap-3">
								<div className="flex flex-col">
									<span className="text-xs font-medium text-muted-foreground">
										Rows
									</span>
									<span className="text-[11px] text-muted-foreground/70">
										Additional grouping (coming soon)
									</span>
								</div>
								<Select
									value={displayRows}
									onValueChange={(value) =>
										setDisplayRows(value as DisplayRowsOption)
									}
								>
									<SelectTrigger
										size="sm"
										className="h-7 w-[140px] rounded-md border border-border/30 bg-background/70 px-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/30"
									>
										<SelectValue className="text-xs">
											{displayRows === "none" ? "No grouping" : "No grouping"}
										</SelectValue>
									</SelectTrigger>
									<SelectContent sideOffset={4}>
										<SelectItem value="none" className="text-xs">
											No grouping
										</SelectItem>
									</SelectContent>
								</Select>
							</div>

							{/* Ordering */}
							<div className="flex items-center justify-between gap-3">
								<div className="flex flex-col">
									<span className="text-xs font-medium text-muted-foreground">
										Ordering
									</span>
									<span className="text-[11px] text-muted-foreground/70">
										Change how tasks are sorted
									</span>
								</div>
								<Select
									value={displayOrdering}
									onValueChange={(value) =>
										setDisplayOrdering(value as DisplayOrderingOption)
									}
								>
									<SelectTrigger
										size="sm"
										className="h-7 w-[140px] rounded-md border border-border/30 bg-background/70 px-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/30"
									>
										<SelectValue className="text-xs">
											{displayOrdering === "position"
												? "Position"
												: displayOrdering === "priority"
													? "Priority"
													: displayOrdering === "due_date"
														? "Due date"
														: displayOrdering === "last_updated"
															? "Last updated"
															: "Title"}
										</SelectValue>
									</SelectTrigger>
									<SelectContent sideOffset={4}>
										<SelectItem value="position" className="text-xs">
											Position
										</SelectItem>
										<SelectItem value="priority" className="text-xs">
											Priority
										</SelectItem>
										<SelectItem value="due_date" className="text-xs">
											Due date
										</SelectItem>
										<SelectItem value="last_updated" className="text-xs">
											Last updated
										</SelectItem>
										<SelectItem value="title" className="text-xs">
											Title
										</SelectItem>
									</SelectContent>
								</Select>
							</div>

							{/* Toggles */}
							<div className="flex flex-col gap-2 pt-1">
								<div className="flex items-center justify-between gap-3">
									<div className="flex flex-col">
										<span className="text-xs font-medium text-muted-foreground">
											Order completed by recency
										</span>
										<span className="text-[11px] text-muted-foreground/70">
											In Done columns, show most recently updated first
										</span>
									</div>
									<Switch
										checked={orderDoneByRecency}
										onCheckedChange={setOrderDoneByRecency}
									/>
								</div>

								<div className="flex items-center justify-between gap-3">
									<div className="flex flex-col">
										<span className="text-xs font-medium text-muted-foreground">
											Show sub-tasks
										</span>
										<span className="text-[11px] text-muted-foreground/70">
											Display a summary of subtasks on each card
										</span>
									</div>
									<Switch
										checked={showSubtasksSummary}
										onCheckedChange={setShowSubtasksSummary}
									/>
								</div>
							</div>
						</div>
					</PopoverContent>
				</Popover>

			{/* Botão de Gerenciar Colunas */}
			<Button
				variant="ghost"
				className="h-9 rounded-lg bg-background/80 backdrop-blur-sm px-3.5 text-xs font-medium transition-all duration-200 hover:bg-accent hover:text-accent-foreground hover:shadow-sm"
				onClick={() => setIsColumnManagerOpen(true)}
			>
				<HorizontalSliderIcon className="mr-1.5 h-3.5 w-3.5" />
				Manage
			</Button>
		</div>
	);

	return (
		<div className="flex flex-col h-screen max-h-screen overflow-hidden">
			{/* Navbar */}
			<BoardNavbar
				boardTitle={board.title}
				boardIcon={board.icon ?? undefined}
				boardEmoji={board.emoji ?? undefined}
				boardColor={board.color ?? undefined}
				workspaceName={
					workspaces.find((ws) => ws.id === board.workspaceId)?.name
				}
				activeTab={activeNavTab}
				onTabChange={handleTabChange}
				dueSummary={dueSummary}
				taskControls={taskControls}
			/>

			{/* Main Content */}
			<div className="flex-1 overflow-hidden">
				{activeNavTab === "tasks" ? (
					<>
						{columnsWithCounts.length === 0 ? (
							<div className="flex flex-col items-center justify-center h-full gap-6">
								<div className="text-center space-y-2">
									<h2 className="text-lg font-semibold">No columns yet</h2>
									<p className="text-muted-foreground">
										Create your first column to start organizing tasks
									</p>
								</div>
								<Button onClick={() => setIsColumnManagerOpen(true)}>
									<Plus className="h-4 w-4 mr-2" />
									Create Column
								</Button>
							</div>
						) : visibleColumns.length === 0 ? (
							<div className="flex flex-col items-center justify-center h-full">
								<div className="text-center max-w-md">
									<h2 className="text-lg font-semibold">
										All columns are hidden
									</h2>
									<p className="text-muted-foreground">
										Enable at least one column in the manager to view tasks on
										this board.
									</p>
								</div>
								<Button
									variant="ghost"
									onClick={() => setIsColumnManagerOpen(true)}
								>
									<HorizontalSliderIcon className="mr-2 h-4 w-4" />
									Manage columns
								</Button>
							</div>
						) : (
							<div className="h-full overflow-hidden">
								{isKanbanView ? (
									<BoardKanbanView
										columns={visibleColumns}
										columnOrder={visibleColumns.map((col) => col.id)}
										cardsByColumn={cardsByColumn}
										isCreatingCard={isCreatingCard}
										onDragStart={handleDragStart}
										onDragCancel={handleDragCancel}
										onDragEnd={handleDragEnd}
										activeCard={activeDragCard}
										onCardSelect={handleCardSelect}
										selectedCardId={selectedCardId}
										boardId={board.id}
										onDeleteTask={handleDeleteCard}
										onDuplicateTask={handleDuplicateCard}
										showSubtasksSummary={showSubtasksSummary}
										onCreateTask={async (task) => {
											// Always insert at the end of the column
											// The frontend displays cards sorted by priority and name,
											// but the backend position is just sequential (0, 1, 2...)
											const columnCards =
												cardsByColumn.get(task.columnId) || [];
											const targetPosition = columnCards.length + 1;

											await createCardMutation.mutateAsync({
												id: task.id,
												boardId: task.boardId,
												columnId: task.columnId,
												title: task.title,
												description: task.description || undefined,
												priority: task.priority,
												dueDate: task.dueDate ?? undefined,
												position: targetPosition,
												tagIds: task.tagIds ?? [],
											});
										}}
									/>
								) : resolvedViewMode === "list" ? (
									<BoardListView
										columns={visibleColumns}
										cardsByColumn={cardsByColumn}
										isCreatingCard={isCreatingCard}
										onCardSelect={handleCardSelect}
										selectedCardId={selectedCardId}
										boardId={board.id}
										onDeleteTask={handleDeleteCard}
										onCreateTask={async (task) => {
											await createCardMutation.mutateAsync({
												id: task.id,
												boardId: task.boardId,
												columnId: task.columnId,
												title: task.title,
												description: task.description || undefined,
												priority: task.priority,
												dueDate: task.dueDate ?? undefined,
												position: task.position,
												tagIds: task.tagIds ?? [],
											});
										}}
									/>
								) : (
									<BoardTimelineView
										cards={visibleCards}
										columnsById={visibleColumnsById}
										onDeleteTask={handleDeleteCard}
									/>
								)}
							</div>
						)}
					</>
				) : (
					<div className="flex flex-col items-center justify-center h-full">
						<div className="text-center">
							<h2 className="text-lg font-semibold capitalize">
								{activeNavTab}
							</h2>
							<p className="text-muted-foreground">
								This section is coming soon
							</p>
						</div>
					</div>
				)}

				<ColumnManagerDialog
					boardId={board.id}
					columns={columnsWithCounts}
					open={isColumnManagerOpen}
					onOpenChange={setIsColumnManagerOpen}
				/>

				{/* Task Details Panel */}
				{selectedCard ? (
					<TaskDetailsPanel
						card={selectedCard}
						column={columnsById.get(selectedCard.columnId) ?? null}
						onClose={handleCloseDetails}
					/>
				) : null}

				{/* Create Card Dialog */}
				{isCardDialogOpen && cardDialogColumn && (
					<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
						<div className="bg-background rounded-lg w-full max-w-md">
							<div className="p-6">
								<h2 className="text-lg font-semibold mb-4">
									Create Task in {cardDialogColumn.title}
								</h2>
								<form onSubmit={handleCreateCard}>
									<div className="space-y-4">
										<div>
											<Label htmlFor={cardTitleId}>Title</Label>
											<Input
												id={cardTitleId}
												value={cardTitle}
												onChange={(e) => setCardTitle(e.target.value)}
												placeholder="Enter task title"
												disabled={isCreatingCard}
												autoFocus
											/>
										</div>
										<div>
											<Label htmlFor={cardDescriptionId}>Description</Label>
											<Textarea
												id={cardDescriptionId}
												value={cardDescription}
												onChange={(e) => setCardDescription(e.target.value)}
												placeholder="Enter task description (optional)"
												disabled={isCreatingCard}
												rows={3}
											/>
										</div>
										<div>
											<Label htmlFor="card-priority">Priority</Label>
											<Select
												value={cardPriority}
												onValueChange={(value: KanbanPriority) =>
													setCardPriority(value)
												}
												disabled={isCreatingCard}
											>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="low">Low</SelectItem>
													<SelectItem value="medium">Medium</SelectItem>
													<SelectItem value="high">High</SelectItem>
												</SelectContent>
											</Select>
										</div>
										<div>
											<Label htmlFor={cardDueDateId}>Due Date</Label>
											<Input
												id={cardDueDateId}
												type="date"
												value={cardDueDate}
												onChange={(e) => setCardDueDate(e.target.value)}
												disabled={isCreatingCard}
											/>
										</div>
									</div>
									{cardFormError && (
										<p className="text-sm text-destructive" role="alert">
											{cardFormError}
										</p>
									)}
									<div className="flex justify-end gap-2 mt-6">
										<Button
											type="button"
											variant="ghost"
											onClick={() => {
												setIsCardDialogOpen(false);
												setCardDialogColumn(null);
												resetCardForm();
											}}
											disabled={isCreatingCard}
										>
											Cancel
										</Button>
										<Button
											type="submit"
											disabled={isCreatingCard || !cardTitle.trim()}
										>
											{isCreatingCard ? "Creating..." : "Create Task"}
										</Button>
									</div>
								</form>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
