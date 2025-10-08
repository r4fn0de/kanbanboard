import {
	DndContext,
	PointerSensor,
	useSensor,
	useSensors,
	type DragEndEvent,
} from "@dnd-kit/core";
import {
	SortableContext,
	arrayMove,
	verticalListSortingStrategy,
	useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
	COLUMN_COLOR_OPTIONS,
	DEFAULT_COLUMN_ICON,
	FALLBACK_COLUMN_COLORS,
} from "@/constants/kanban-columns";
import {
	COLUMN_ICON_OPTIONS,
	getColumnIconComponent,
	getColumnIconLabel,
} from "@/components/kanban/column-icon-options";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { KanbanColumn } from "@/types/common";
import { useMoveColumn, useUpdateColumn } from "@/services/kanban";
import { Check, ChevronDown, GripVertical, Palette } from "lucide-react";

interface ColumnWithMeta extends KanbanColumn {
	cardCount: number;
}

interface ColumnManagerDialogProps {
	boardId: string;
	columns: ColumnWithMeta[];
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreateColumn?: () => void;
}

function hexToRgba(hex: string | null | undefined, alpha: number) {
	if (!hex || !/^#([0-9a-fA-F]{6})$/.test(hex)) {
		return null;
	}

	const value = hex.slice(1);
	const r = parseInt(value.slice(0, 2), 16);
	const g = parseInt(value.slice(2, 4), 16);
	const b = parseInt(value.slice(4, 6), 16);
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function ColumnManagerDialog({
	boardId,
	columns,
	open,
	onOpenChange,
	onCreateColumn,
}: ColumnManagerDialogProps) {
	const moveColumn = useMoveColumn(boardId);
	const updateColumn = useUpdateColumn(boardId);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 6 },
		}),
	);

	const [order, setOrder] = useState(() => columns.map((column) => column.id));

	useEffect(() => {
		setOrder(columns.map((column) => column.id));
	}, [columns]);

	const sortedColumns = useMemo(
		() =>
			order
				.map((id) => columns.find((column) => column.id === id))
				.filter((column): column is ColumnWithMeta => Boolean(column)),
		[columns, order],
	);

	const handleDragEnd = useCallback(
		async (event: DragEndEvent) => {
			const { active, over } = event;
			if (!over || active.id === over.id) {
				return;
			}

			const oldIndex = order.indexOf(active.id.toString());
			const newIndex = order.indexOf(over.id.toString());

			if (oldIndex === -1 || newIndex === -1) {
				return;
			}

			const nextOrder = arrayMove(order, oldIndex, newIndex);
			setOrder(nextOrder);

			moveColumn.mutate(
				{
					boardId,
					columnId: active.id.toString(),
					targetIndex: newIndex,
				},
				{
					onError: (error) => {
						toast.error("Failed to reorder column", {
							description:
								error instanceof Error ? error.message : "Unknown error",
						});
						setOrder(order);
					},
				},
			);
		},
		[boardId, moveColumn, order],
	);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-96 sm:max-w-lg lg:max-w-xl">
				<DialogHeader>
					<DialogTitle>Manage columns</DialogTitle>
					<DialogDescription>
						Customize the appearance and availability of your workflow columns.
					</DialogDescription>
				</DialogHeader>

				<div className="flex items-center justify-between gap-3">
					<div className="text-sm text-muted-foreground">
						Drag and drop to reorder. Updates save automatically.
					</div>
					<Button
						variant="outline"
						onClick={onCreateColumn}
						disabled={!onCreateColumn}
					>
						Add column
					</Button>
				</div>

				<ScrollArea className="max-h-[420px] pr-4">
					<DndContext sensors={sensors} onDragEnd={handleDragEnd}>
						<SortableContext
							items={sortedColumns.map((column) => column.id)}
							strategy={verticalListSortingStrategy}
						>
							<div className="space-y-3 py-2">
								{sortedColumns.map((column) => (
									<ColumnManagerRow
										key={column.id}
										column={column}
										isUpdating={updateColumn.isPending}
										onUpdate={async (changes) => {
											try {
												await updateColumn.mutateAsync({
													id: column.id,
													boardId: column.boardId,
													...changes,
												});
											} catch (error) {
												toast.error("Failed to update column", {
													description:
														error instanceof Error
															? error.message
															: "Unknown error",
												});
												throw error;
											}
										}}
									/>
								))}
							</div>
						</SortableContext>
					</DndContext>
				</ScrollArea>
			</DialogContent>
		</Dialog>
	);
}

interface ColumnManagerRowProps {
	column: ColumnWithMeta;
	isUpdating: boolean;
	onUpdate: (changes: Partial<ColumnManagerChanges>) => Promise<void>;
}

interface ColumnManagerChanges {
	title?: string;
	color?: string | null;
	icon?: string | null;
	isEnabled?: boolean;
}

function ColumnManagerRow({
	column,
	isUpdating,
	onUpdate,
}: ColumnManagerRowProps) {
	const [title, setTitle] = useState(column.title);
	const [color, setColor] = useState<string | null>(column.color ?? null);
	const [icon, setIcon] = useState<string>(column.icon ?? DEFAULT_COLUMN_ICON);
	const [isEnabled, setIsEnabled] = useState<boolean>(column.isEnabled);

	useEffect(() => {
		setTitle(column.title);
	}, [column.title]);

	useEffect(() => {
		setColor(column.color ?? null);
	}, [column.color]);

	useEffect(() => {
		setIcon(column.icon ?? DEFAULT_COLUMN_ICON);
	}, [column.icon]);

	useEffect(() => {
		setIsEnabled(column.isEnabled);
	}, [column.isEnabled]);

	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: column.id });

	const style: React.CSSProperties = {
		transform: transform ? CSS.Transform.toString(transform) : undefined,
		transition: isDragging ? "none" : transition,
	};

	const IconComponent = getColumnIconComponent(icon);
	const iconLabel = useMemo(() => {
		return (
			COLUMN_ICON_OPTIONS.find((option) => option.value === icon)?.label ??
			getColumnIconLabel(DEFAULT_COLUMN_ICON)
		);
	}, [icon]);
	const accentColor = color ?? FALLBACK_COLUMN_COLORS[0];

	const handleTitleBlur = async () => {
		const trimmed = title.trim();
		if (!trimmed || trimmed === column.title) {
			setTitle(column.title);
			return;
		}

		setTitle(trimmed);
		try {
			await onUpdate({ title: trimmed });
		} catch {
			setTitle(column.title);
		}
	};

	const handleToggle = async (next: boolean) => {
		const previous = isEnabled;
		setIsEnabled(next);
		try {
			await onUpdate({ isEnabled: next });
		} catch {
			setIsEnabled(previous);
		}
	};

	const handleColorSelect = async (nextColor: string | null) => {
		const previous = color;
		setColor(nextColor);
		try {
			await onUpdate({ color: nextColor });
		} catch {
			setColor(previous);
		}
	};

	const handleIconSelect = async (nextIcon: string) => {
		const option = COLUMN_ICON_OPTIONS.find((item) => item.value === nextIcon);
		if (!option) {
			return;
		}

		const previous = icon;
		setIcon(option.value);
		try {
			await onUpdate({ icon: option.value });
		} catch {
			setIcon(previous);
		}
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={cn(
				"flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-4 shadow-sm transition-opacity",
				isDragging && "opacity-70",
			)}
		>
			<button
				type="button"
				className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-muted-foreground/40 text-muted-foreground"
				{...attributes}
				{...listeners}
			>
				<GripVertical className="h-4 w-4" />
			</button>

			<div className="flex flex-1 items-center gap-3">
				<Popover>
					<PopoverTrigger asChild>
						<Button
							type="button"
							variant="outline"
							className="flex items-center gap-2"
							disabled={isUpdating}
						>
							<span
								className="h-6 w-6 rounded-full border"
								style={{ backgroundColor: color ?? "transparent" }}
							/>
							<Palette className="h-4 w-4" />
							<ChevronDown className="h-4 w-4 opacity-70" />
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-64" align="start">
						<div className="flex flex-wrap gap-2">
							{COLUMN_COLOR_OPTIONS.map((option) => (
								<button
									key={option}
									type="button"
									className={cn(
										"h-9 w-9 rounded-full border-2 transition",
										color === option
											? "border-primary scale-105"
											: "border-transparent hover:border-muted",
									)}
									style={{ backgroundColor: option }}
									onClick={() => handleColorSelect(option)}
									disabled={isUpdating}
								/>
							))}
							<button
								type="button"
								className="h-9 w-20 rounded-full border border-dashed text-xs font-medium text-muted-foreground"
								onClick={() => handleColorSelect(null)}
								disabled={isUpdating}
							>
								Clear
							</button>
						</div>
					</PopoverContent>
				</Popover>

				<Popover>
					<PopoverTrigger asChild>
						<Button
							type="button"
							variant="outline"
							className="flex items-center gap-2"
							disabled={isUpdating}
						>
							<IconComponent className="h-4 w-4" />
							<span className="text-sm font-medium">{iconLabel}</span>
							<ChevronDown className="h-4 w-4 opacity-70" />
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-72 p-0" align="start">
						<Command>
							<CommandInput placeholder="Search icon" />
							<CommandList>
								<CommandEmpty>No icons found</CommandEmpty>
								<CommandGroup>
									{COLUMN_ICON_OPTIONS.map((option) => (
										<CommandItem
											key={option.value}
											value={option.value}
											onSelect={handleIconSelect}
										>
											<option.icon className="mr-2 h-4 w-4" />
											<span className="flex-1 text-sm font-medium">
												{option.label}
											</span>
											{icon === option.value ? (
												<Check className="h-4 w-4 text-primary" />
											) : null}
										</CommandItem>
									))}
								</CommandGroup>
							</CommandList>
						</Command>
					</PopoverContent>
				</Popover>

				<div className="flex-1">
					<Input
						value={title}
						onChange={(event) => setTitle(event.target.value)}
						onBlur={handleTitleBlur}
						placeholder="Column name"
						disabled={isUpdating}
					/>
				</div>
			</div>

			<div className="flex items-center gap-4">
				<div className="flex flex-col items-end">
					<Badge
						variant={column.cardCount > 0 ? "default" : "secondary"}
						style={{
							backgroundColor:
								column.cardCount > 0
									? (hexToRgba(accentColor, 0.16) ?? undefined)
									: undefined,
							color: column.cardCount > 0 ? accentColor : undefined,
							borderColor:
								column.cardCount > 0
									? (hexToRgba(accentColor, 0.32) ?? undefined)
									: undefined,
						}}
					>
						{column.cardCount} tasks
					</Badge>
					{!isEnabled ? (
						<span className="text-xs text-muted-foreground">Hidden</span>
					) : null}
				</div>
				<Switch
					checked={isEnabled}
					onCheckedChange={handleToggle}
					disabled={isUpdating}
				/>
			</div>
		</div>
	);
}
