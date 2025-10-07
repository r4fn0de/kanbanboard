import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PriorityBadge } from "./views/board-shared";
import { kanbanQueryKeys, useUpdateCard } from "@/services/kanban";
import { ImageUpload } from "@/components/ui/image-upload";

import type { KanbanCard, KanbanColumn } from "@/types/common";

interface TaskDetailsPanelProps {
	card: KanbanCard | null;
	column: KanbanColumn | null;
	onClose: () => void;
}

// Using the shared formatCardDueDate from views

export function TaskDetailsPanel({
	card,
	column,
	onClose,
}: TaskDetailsPanelProps) {
	const queryClient = useQueryClient();
	const updateCard = useUpdateCard(card?.boardId || "");
	const [isEditingTitle, setIsEditingTitle] = useState(false);
	const [titleDraft, setTitleDraft] = useState(card?.title || "");
	const [titleError, setTitleError] = useState<string | null>(null);
	const [isEditingDescription, setIsEditingDescription] = useState(false);
	const [descriptionDraft, setDescriptionDraft] = useState(
		card?.description ?? "",
	);

	useEffect(() => {
		if (card) {
			setTitleDraft(card.title);
			setDescriptionDraft(card.description ?? "");
			setIsEditingTitle(false);
			setIsEditingDescription(false);
			setTitleError(null);
		}
	}, [card]);

	const handleTitleSubmit = useCallback(
		async (e?: React.FormEvent) => {
			e?.preventDefault();
			if (!card || !titleDraft.trim()) return;

			const trimmedTitle = titleDraft.trim();
			if (trimmedTitle === card.title) {
				setIsEditingTitle(false);
				return;
			}

			setIsEditingTitle(false);
			setTitleError(null);

			try {
				await updateCard.mutateAsync({
					id: card.id,
					boardId: card.boardId,
					title: trimmedTitle,
				});
				// Note: useUpdateCard handles optimistic updates, so we don't need onUpdate here
			} catch (err) {
				setTitleError(
					err instanceof Error ? err.message : "Failed to update title",
				);
				setIsEditingTitle(true);
			}
		},
		[card, titleDraft, updateCard],
	);

	const handleDescriptionSubmit = useCallback(
		async (e?: React.FormEvent) => {
			e?.preventDefault();
			if (!card) return;

			const trimmedDescription = descriptionDraft.trim();
			const finalDescription = trimmedDescription || null;

			if (finalDescription === card.description) {
				setIsEditingDescription(false);
				return;
			}

			setIsEditingDescription(false);

			try {
				await updateCard.mutateAsync({
					id: card.id,
					boardId: card.boardId,
					description: finalDescription,
				});
				// Note: useUpdateCard handles optimistic updates, so we don't need onUpdate here
			} catch (err) {
				setDescriptionDraft(card.description ?? "");
				setIsEditingDescription(true);
				toast.error(
					err instanceof Error ? err.message : "Failed to update description",
				);
			}
		},
		[card, descriptionDraft, updateCard],
	);

	const handleDueDateChange = useCallback(
		async (newDate: Date | undefined) => {
			console.log("handleDueDateChange called with:", newDate);
			if (!card) {
				console.log("No card available");
				return;
			}

			const newDateString = newDate
				? newDate.toISOString().split("T")[0]
				: null;
			
			console.log("Updating card with:", {
				id: card.id,
				boardId: card.boardId,
				dueDate: newDateString,
			});

			try {
				await updateCard.mutateAsync({
					id: card.id,
					boardId: card.boardId,
					dueDate: newDateString,
				});
				console.log("Update successful");
			} catch (err) {
				console.error("Update failed:", err);
				toast.error(
					err instanceof Error ? err.message : "Failed to update due date",
				);
			}
		},
		[card, updateCard],
	);

	if (!card || !column) {
		return null;
	}

	return (
		<div className="fixed inset-0 z-50 flex p-4">
			{/* Main content area - closes panel when clicked */}
			<button
				type="button"
				className="flex-1"
				onClick={onClose}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						onClose();
					}
				}}
			/>

			{/* Right panel */}
			<div className="w-96 h-full bg-muted flex flex-col rounded-[2rem] border border-border">
				{/* Header */}
				<div className="p-6 border-b border-border bg-card rounded-t-[2rem]">
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-lg font-semibold">Task Details</h2>
						<button
							type="button"
							onClick={onClose}
							className="h-8 w-8 p-0 flex items-center justify-center rounded-2xl hover:bg-muted transition-colors"
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									onClose();
								}
							}}
						>
							×
						</button>
					</div>

					<div className="flex items-center gap-3">
						<Badge variant="secondary" className="text-xs">
							{column.title}
						</Badge>
						<PriorityBadge priority={card.priority} />
					</div>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-y-auto p-6 space-y-5">
					{/* Title */}
					<div className="space-y-2">
						<Label className="text-sm font-medium">Title</Label>
						{isEditingTitle ? (
							<form onSubmit={handleTitleSubmit}>
								<Input
									value={titleDraft}
									onChange={(e) => setTitleDraft(e.target.value)}
									onBlur={() => handleTitleSubmit()}
									className={titleError ? "border-red-500" : ""}
									disabled={updateCard.isPending}
									autoFocus
								/>
								{titleError && (
									<p className="text-sm text-red-500 mt-1">{titleError}</p>
								)}
							</form>
						) : (
							<button
								type="button"
								className="w-full p-4 border rounded-2xl text-left hover:bg-muted/50 transition-colors bg-card"
								onClick={() => setIsEditingTitle(true)}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										setIsEditingTitle(true);
									}
								}}
							>
								<p className="font-medium">{card.title}</p>
							</button>
						)}
					</div>

					{/* Description */}
					<div className="space-y-2">
						<Label className="text-sm font-medium">Description</Label>
						{isEditingDescription ? (
							<form onSubmit={handleDescriptionSubmit}>
								<Textarea
									value={descriptionDraft}
									onChange={(e) => setDescriptionDraft(e.target.value)}
									onBlur={() => handleDescriptionSubmit()}
									placeholder="Add a description..."
									disabled={updateCard.isPending}
									rows={4}
									autoFocus
								/>
							</form>
						) : (
							<button
								type="button"
								className="w-full p-4 border rounded-2xl text-left hover:bg-muted/50 transition-colors min-h-[100px] bg-card"
								onClick={() => setIsEditingDescription(true)}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										setIsEditingDescription(true);
									}
								}}
							>
								{card.description ? (
									<p className="text-sm whitespace-pre-wrap">
										{card.description}
									</p>
								) : (
									<p className="text-sm text-muted-foreground">
										Add a description...
									</p>
								)}
							</button>
						)}
					</div>

					{/* Due Date */}
					<div className="space-y-2">
						<Label className="text-sm font-medium">Due Date</Label>
						<input
							type="date"
							value={card.dueDate ? new Date(card.dueDate).toISOString().split('T')[0] : ''}
							onChange={(e) => {
								const newDate = e.target.value ? new Date(e.target.value) : undefined;
								handleDueDateChange(newDate);
							}}
							className="w-full p-4 border rounded-2xl text-left font-normal bg-card hover:bg-muted/50 transition-colors cursor-pointer"
						/>
						{!card.dueDate && (
							<p className="text-sm text-muted-foreground">No due date</p>
						)}
					</div>

					{/* Attachments */}
					<div className="space-y-2">
						<Label className="text-sm font-medium">Attachments</Label>
						<ImageUpload
							cardId={card.id}
							boardId={card.boardId}
							attachments={card.attachments}
							onUploadComplete={() => {
								queryClient.invalidateQueries({
									queryKey: kanbanQueryKeys.cards(card.boardId),
								});
							}}
							onRemoveComplete={() => {
								queryClient.invalidateQueries({
									queryKey: kanbanQueryKeys.cards(card.boardId),
								});
							}}
						/>
					</div>
				</div>

				{/* Footer */}
				<div className="p-6 border-t border-border bg-card rounded-b-[2rem]">
					<p className="text-sm text-muted-foreground">
						Created:{" "}
						{card.createdAt
							? new Date(card.createdAt).toLocaleDateString()
							: "Unknown"}
					</p>
				</div>
			</div>
		</div>
	);
}
