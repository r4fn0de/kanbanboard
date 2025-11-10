import { useCallback, useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	X,
	Upload,
	Image as ImageIcon,
	FileText,
	FileArchive,
	File as FileIcon,
	RotateCcw,
	Trash2,
	MoreHorizontal,
} from "lucide-react";
import type { KanbanAttachment } from "@/types/common";
import { useDeleteAttachment, useRestoreAttachment } from "@/services/kanban";
import {
	Menu,
	MenuTrigger,
	MenuPortal,
	MenuPositioner,
	MenuPopup,
	MenuItem,
	MenuSeparator,
} from "@/components/ui/base-ui-menu";

interface ImageUploadProps {
	cardId: string;
	boardId: string;
	attachments?: KanbanAttachment[] | null;
	onUploadComplete?: (attachment: KanbanAttachment) => void;
	onRemoveComplete?: (attachmentId: string) => void;
}

export function ImageUpload({
	cardId,
	boardId,
	attachments = [],
	onUploadComplete,
	onRemoveComplete,
}: ImageUploadProps) {
	const [isUploading, setIsUploading] = useState(false);
	const [previewUrls, setPreviewUrls] = useState<Map<string, string>>(
		new Map(),
	);
	const [selectedAttachment, setSelectedAttachment] =
		useState<KanbanAttachment | null>(null);
	const [selectedPreviewUrl, setSelectedPreviewUrl] = useState<string | null>(
		null,
	);

	const restoreMutation = useRestoreAttachment(boardId, cardId);
	const deleteMutation = useDeleteAttachment(boardId, cardId);

	const imageExtensions = useMemo(
		() =>
			new Set([
				"jpg",
				"jpeg",
				"png",
				"gif",
				"webp",
				"svg",
				"bmp",
				"ico",
				"tiff",
				"tif",
			]),
		[],
	);

	const documentExtensions = useMemo(
		() =>
			new Set([
				"pdf",
				"doc",
				"docx",
				"xls",
				"xlsx",
				"ppt",
				"pptx",
				"txt",
				"csv",
				"md",
				"rtf",
				"zip",
				"rar",
				"7z",
				"tar",
				"json",
			]),
		[],
	);

	const supportedExtensions = useMemo(() => {
		return Array.from(new Set([...imageExtensions, ...documentExtensions]));
	}, [documentExtensions, imageExtensions]);

	const formatBytes = useCallback((bytes?: number | null) => {
		if (!bytes || bytes <= 0) {
			return null;
		}

		const units = ["B", "KB", "MB", "GB", "TB"];
		const exponent = Math.min(
			Math.floor(Math.log(bytes) / Math.log(1024)),
			units.length - 1,
		);
		const value = bytes / Math.pow(1024, exponent);
		return `${value.toFixed(value >= 100 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
	}, []);

	const formatTimestamp = useCallback((iso?: string) => {
		if (!iso) return null;
		const date = new Date(iso);
		if (Number.isNaN(date.getTime())) return null;
		return date.toLocaleString();
	}, []);

	const isImageAttachment = useCallback(
		(attachment: KanbanAttachment) => {
			const extension =
				attachment.storagePath.split(".").pop()?.toLowerCase() ?? "";
			return imageExtensions.has(extension);
		},
		[imageExtensions],
	);

	const getAttachmentIcon = (attachment: KanbanAttachment) => {
		const extension =
			attachment.storagePath.split(".").pop()?.toLowerCase() ?? "";

		if (imageExtensions.has(extension)) {
			return ImageIcon;
		}
		if (["zip", "rar", "7z", "tar"].includes(extension)) {
			return FileArchive;
		}
		if (documentExtensions.has(extension)) {
			return FileText;
		}
		return FileIcon;
	};

	const loadImageUrl = useCallback(
		async (attachment: KanbanAttachment) => {
			if (previewUrls.has(attachment.id)) {
				return previewUrls.get(attachment.id) ?? null;
			}

			try {
				const url = (await invoke("get_attachment_url", {
					filePath: attachment.storagePath,
				})) as string;
				setPreviewUrls((prev) => new Map(prev).set(attachment.id, url));
				return url;
			} catch (error) {
				console.error("Failed to load image URL:", error);
				return null;
			}
		},
		[previewUrls],
	);

	useEffect(() => {
		attachments?.forEach((attachment) => {
			if (isImageAttachment(attachment)) {
				void loadImageUrl(attachment);
			}
		});
	}, [attachments, isImageAttachment, loadImageUrl]);

	const handlePreview = useCallback(
		async (attachment: KanbanAttachment) => {
			const existing = previewUrls.get(attachment.id);
			let url = existing ?? null;

			if (!url) {
				url = await loadImageUrl(attachment);
			}

			if (!url) {
				toast.error("Failed to load image preview");
				return;
			}

			setSelectedAttachment(attachment);
			setSelectedPreviewUrl(url);
		},
		[loadImageUrl, previewUrls],
	);

	const handleUpload = useCallback(async () => {
		try {
			const selected = await openDialog({
				multiple: false,
				filters: [
					{
						name: "Attachments",
						extensions: supportedExtensions,
					},
				],
			});

			if (!selected) return;

			setIsUploading(true);

			const response = (await invoke("upload_image", {
				cardId,
				boardId,
				filePath: selected,
			})) as {
				success: boolean;
				filePath: string;
				attachment?: KanbanAttachment;
				error?: string;
			};

			if (response.success) {
				toast.success("Attachment uploaded successfully");
				if (response.attachment) {
					onUploadComplete?.(response.attachment);
				}
			} else {
				toast.error(response.error || "Failed to upload attachment");
			}
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to upload attachment";
			toast.error(message);
		} finally {
			setIsUploading(false);
		}
	}, [boardId, cardId, onUploadComplete, supportedExtensions]);

	const handleOpenAttachment = useCallback(
		async (attachment: KanbanAttachment) => {
			try {
				await invoke("open_attachment", { filePath: attachment.storagePath });
			} catch (error) {
				console.error("Failed to open attachment:", error);
				toast.error("Failed to open attachment");
			}
		},
		[],
	);

	const handleRestore = useCallback(
		async (attachment: KanbanAttachment) => {
			try {
				await restoreMutation.mutateAsync({
					attachmentId: attachment.id,
					version: attachment.version,
				});
				toast.success("Attachment restored");
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: "Failed to restore attachment";
				toast.error(message);
			}
		},
		[restoreMutation],
	);

	const handleDelete = useCallback(
		async (attachment: KanbanAttachment) => {
			try {
				await deleteMutation.mutateAsync({
					attachmentId: attachment.id,
					version: attachment.version,
				});
				toast.success("Attachment deleted");
				onRemoveComplete?.(attachment.id);
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: "Failed to delete attachment";
				toast.error(message);
			}
		},
		[deleteMutation, onRemoveComplete],
	);

	const closePreview = useCallback(() => {
		setSelectedAttachment(null);
		setSelectedPreviewUrl(null);
	}, []);

	useEffect(() => {
		if (!selectedAttachment) {
			return;
		}

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.preventDefault();
				closePreview();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [closePreview, selectedAttachment]);

	if (!attachments || attachments.length === 0) {
		return (
			<div className="flex items-center justify-center w-full">
				<Button
					type="button"
					variant="ghost"
					onClick={handleUpload}
					disabled={isUploading}
					className="flex items-center gap-2"
				>
					<Upload className="h-4 w-4" />
					{isUploading ? "Uploading..." : "Add Attachment"}
				</Button>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex justify-end">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={handleUpload}
					disabled={isUploading}
					className="flex items-center gap-2"
				>
					<Upload className="h-4 w-4" />
					{isUploading ? "Uploading..." : "Add Attachment"}
				</Button>
			</div>

			<div className="space-y-3">
				{attachments.map((attachment) => {
					const Icon = getAttachmentIcon(attachment);
					const isImage = isImageAttachment(attachment);
					const previewUrl = previewUrls.get(attachment.id);
					const formattedSize = formatBytes(attachment.sizeBytes);
					const formattedUpdatedAt = formatTimestamp(attachment.updatedAt);
					const restoreVariables = restoreMutation.variables;
					const deleteVariables = deleteMutation.variables;
					const isRestoring =
						restoreMutation.isPending &&
						restoreVariables?.attachmentId === attachment.id &&
						(restoreVariables.version ?? attachment.version) ===
							attachment.version;
					const isDeleting =
						deleteMutation.isPending &&
						deleteVariables?.attachmentId === attachment.id &&
						(deleteVariables.version ?? attachment.version) ===
							attachment.version;

					return (
						<div
							key={`${attachment.id}-${attachment.version}`}
							className="flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-center md:justify-between"
						>
							<div className="flex items-start gap-3 min-w-0">
								<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted">
									<Icon className="h-5 w-5" />
								</div>
								<div className="space-y-1 min-w-0">
									<span className="block text-sm font-medium truncate">
										{attachment.filename || attachment.originalName}
									</span>
									<div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
										<span>Version {attachment.version}</span>
										{attachment.mimeType ? (
											<span>• {attachment.mimeType}</span>
										) : null}
										{formattedSize ? <span>• {formattedSize}</span> : null}
										{formattedUpdatedAt ? (
											<span>• {formattedUpdatedAt}</span>
										) : null}
									</div>
								</div>
							</div>

							<Menu>
								<MenuTrigger asChild>
									<span className="inline-flex">
										<Button
											type="button"
											variant="ghost"
											size="icon"
											aria-label="Attachment actions"
											data-anchor
										>
											<MoreHorizontal className="h-4 w-4" />
										</Button>
									</span>
								</MenuTrigger>
								<MenuPortal>
									<MenuPositioner side="bottom" align="end" sideOffset={6}>
										<MenuPopup className="w-48">
											{isImage && previewUrl ? (
												<MenuItem
													onClick={() => {
														void handlePreview(attachment);
													}}
													disabled={isRestoring || isDeleting}
												>
													Preview
												</MenuItem>
											) : null}
											<MenuItem
												onClick={() => {
													handleOpenAttachment(attachment);
												}}
												disabled={isRestoring || isDeleting}
											>
												Open
											</MenuItem>
											<MenuSeparator />
											<MenuItem
												onClick={() => {
													void handleRestore(attachment);
												}}
												disabled={isRestoring}
											>
												<RotateCcw className="mr-2 h-4 w-4" /> Restore
											</MenuItem>
											<MenuItem
												onClick={() => {
													void handleDelete(attachment);
												}}
												disabled={isDeleting}
												destructive
											>
												<Trash2 className="mr-2 h-4 w-4" />{" "}
												{isDeleting ? "Deleting…" : "Delete"}
											</MenuItem>
										</MenuPopup>
									</MenuPositioner>
								</MenuPortal>
							</Menu>
						</div>
					);
				})}
			</div>

			{selectedAttachment && selectedPreviewUrl ? (
				<div
					role="dialog"
					aria-modal="true"
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
				>
					<button
						type="button"
						className="absolute inset-0 cursor-default"
						aria-label="Close attachment preview"
						onClick={closePreview}
					/>
					<div className="relative max-h-[80vh] max-w-[80vw] overflow-hidden rounded-lg bg-background shadow-lg">
						<div className="absolute top-2 right-2 z-10 flex gap-2">
							<Button
								type="button"
								variant="secondary"
								size="sm"
								onClick={closePreview}
							>
								<X className="h-4 w-4" />
							</Button>
						</div>
						<img
							src={selectedPreviewUrl}
							alt={
								selectedAttachment.filename || selectedAttachment.originalName
							}
							className="h-full w-full object-contain"
						/>
					</div>
				</div>
			) : null}
		</div>
	);
}
