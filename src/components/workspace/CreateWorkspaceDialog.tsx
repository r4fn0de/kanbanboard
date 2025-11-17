import {
	useState,
	useCallback,
	useEffect,
	useRef,
	type FormEvent,
	useId,
} from "react";
import { X, Upload, Palette } from "lucide-react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";
import { cn } from "@/lib/utils";
import {
	Dialog,
	DialogPortal,
	DialogBackdrop,
	DialogPopup,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/base-ui-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageCropper } from "@/components/ui/image-cropper";
import { useCreateWorkspace } from "@/services/workspaces";
import { toast } from "sonner";

const DEFAULT_WORKSPACE_COLOR = "#6366F1";

const PRESET_COLORS = [
	{ name: "Indigo", value: "#6366F1" },
	{ name: "Purple", value: "#8B5CF6" },
	{ name: "Pink", value: "#EC4899" },
	{ name: "Rose", value: "#F43F5E" },
	{ name: "Orange", value: "#F97316" },
	{ name: "Amber", value: "#F59E0B" },
	{ name: "Emerald", value: "#10B981" },
	{ name: "Teal", value: "#14B8A6" },
	{ name: "Cyan", value: "#06B6D4" },
	{ name: "Blue", value: "#3B82F6" },
];

interface CreateWorkspaceDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess?: (workspaceId: string) => void;
}

export function CreateWorkspaceDialog({
	open,
	onOpenChange,
	onSuccess,
}: CreateWorkspaceDialogProps) {
	const [workspaceName, setWorkspaceName] = useState("");
	const [workspaceColor, setWorkspaceColor] = useState(DEFAULT_WORKSPACE_COLOR);
	const [workspaceIconPreview, setWorkspaceIconPreview] = useState<
		string | null
	>(null);
	const [cropperOpen, setCropperOpen] = useState(false);
	const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null);
	const [croppedImageBlob, setCroppedImageBlob] = useState<Blob | null>(null);
	const [error, setError] = useState<string | null>(null);
	const dialogRef = useRef<HTMLDivElement>(null);

	const nameId = useId();
	const { mutateAsync: createWorkspace, isPending } = useCreateWorkspace();

	// Auto-focus the dialog when it opens
	useEffect(() => {
		if (open && dialogRef.current) {
			// Small delay to ensure the dialog is fully rendered
			const timeoutId = setTimeout(() => {
				// Find the first focusable element (the name input with autofocus)
				const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
					"input[autofocus], input, button",
				);
				if (firstFocusable) {
					firstFocusable.focus();
				}
			}, 150);
			return () => clearTimeout(timeoutId);
		}
	}, [open]);

	const resetForm = useCallback(() => {
		// Revoke object URLs to prevent memory leaks
		if (originalImageSrc) {
			URL.revokeObjectURL(originalImageSrc);
		}
		if (workspaceIconPreview) {
			URL.revokeObjectURL(workspaceIconPreview);
		}
		setWorkspaceName("");
		setWorkspaceColor(DEFAULT_WORKSPACE_COLOR);
		setWorkspaceIconPreview(null);
		setCropperOpen(false);
		setOriginalImageSrc(null);
		setCroppedImageBlob(null);
		setError(null);
	}, [originalImageSrc, workspaceIconPreview]);

	const handleDialogChange = useCallback(
		(newOpen: boolean) => {
			onOpenChange(newOpen);
			if (!newOpen) {
				// Delay reset to avoid visual glitch during close animation
				setTimeout(resetForm, 300);
			}
		},
		[onOpenChange, resetForm],
	);

	const handleSelectIcon = useCallback(async () => {
		try {
			const selected = await openDialog({
				multiple: false,
				filters: [
					{
						name: "Images",
						extensions: ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"],
					},
				],
			});

			if (!selected) return;

			const filePath = Array.isArray(selected) ? selected[0] : selected;
			if (!filePath) return;

			const fileBytes = await readFile(filePath);
			const extension = filePath.split(".").pop()?.toLowerCase();
			const mimeTypes: Record<string, string> = {
				png: "image/png",
				jpg: "image/jpeg",
				jpeg: "image/jpeg",
				gif: "image/gif",
				webp: "image/webp",
				svg: "image/svg+xml",
				bmp: "image/bmp",
			};
			const mimeType = mimeTypes[extension ?? ""] ?? "image/png";

			const blob = new Blob([fileBytes], { type: mimeType });
			const dataUrl = URL.createObjectURL(blob);

			setOriginalImageSrc(dataUrl);
			setCropperOpen(true);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to select image";
			toast.error(message);
		}
	}, []);

	const handleClearIcon = useCallback(() => {
		if (workspaceIconPreview) {
			URL.revokeObjectURL(workspaceIconPreview);
		}
		setWorkspaceIconPreview(null);
		setCroppedImageBlob(null);
	}, [workspaceIconPreview]);

	const handleCropComplete = useCallback((croppedBlob: Blob) => {
		setCroppedImageBlob(croppedBlob);
		setWorkspaceIconPreview(URL.createObjectURL(croppedBlob));
		setCropperOpen(false);
	}, []);

	const handleCropCancel = useCallback(() => {
		if (originalImageSrc) {
			URL.revokeObjectURL(originalImageSrc);
		}
		setOriginalImageSrc(null);
		setCroppedImageBlob(null);
		setCropperOpen(false);
	}, [originalImageSrc]);

	const handleSubmit = async (event: FormEvent) => {
		event.preventDefault();
		if (isPending) return;

		const trimmedName = workspaceName.trim();
		if (!trimmedName) {
			setError("Workspace name is required");
			return;
		}

		setError(null);

		try {
			const workspaceId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`;
			let finalIconPath: string | null = null;

			// If we have a cropped image, save it first
			if (croppedImageBlob) {
				const arrayBuffer = await croppedImageBlob.arrayBuffer();
				const uint8Array = new Uint8Array(arrayBuffer);

				finalIconPath = await invoke<string>("save_cropped_workspace_icon", {
					workspaceId,
					imageData: Array.from(uint8Array),
				});
			}

			// Create the workspace with the final icon path (null if no icon)
			const workspace = await createWorkspace({
				id: workspaceId,
				name: trimmedName,
				color: workspaceColor?.trim() ? workspaceColor : null,
				iconPath: finalIconPath,
			});

			toast.success("Workspace created successfully!");
			handleDialogChange(false);
			onSuccess?.(workspace.id);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to create workspace";
			setError(message);
			toast.error(message);
		}
	};

	return (
		<>
			<Dialog open={open} onOpenChange={handleDialogChange}>
				<DialogPortal>
					<DialogBackdrop />
					<DialogPopup
						ref={dialogRef}
						className="sm:max-w-[440px] p-0 gap-0 overflow-hidden"
						showCloseButton={false}
					>
						{/* Header */}
						<div className="relative px-6 pt-6 pb-4">
							<button
								onClick={() => handleDialogChange(false)}
								className="absolute right-6 top-6 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
							>
								<X className="h-4 w-4" />
								<span className="sr-only">Close</span>
							</button>
							<DialogTitle className="text-xl font-semibold">
								Create Workspace
							</DialogTitle>
							<DialogDescription className="text-sm text-muted-foreground mt-1">
								Create and customize a workspace.
							</DialogDescription>
						</div>

						{/* Form Content */}
						<form onSubmit={handleSubmit} className="px-6 pb-6 space-y-6">
							{/* Icon Section */}
							<div className="flex items-start gap-4">
								<div className="relative flex-shrink-0">
									{workspaceIconPreview ? (
										<>
											<img
												src={workspaceIconPreview}
												alt="Workspace icon"
												className="h-16 w-16 rounded-xl object-cover"
											/>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												onClick={handleClearIcon}
												className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-background shadow-sm hover:bg-destructive hover:text-destructive-foreground"
											>
												<X className="h-3 w-3" />
											</Button>
										</>
									) : (
										<div
											className="h-16 w-16 rounded-xl flex items-center justify-center font-semibold text-white text-xl"
											style={{ backgroundColor: workspaceColor }}
										>
											{workspaceName.charAt(0).toUpperCase() || "W"}
										</div>
									)}
								</div>
								<div className="flex-1 space-y-2">
									<Label className="text-xs font-medium text-muted-foreground">
										Set an Icon
									</Label>
									<div className="flex gap-2">
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={handleSelectIcon}
											className="gap-2 h-8 text-xs"
										>
											<Upload className="h-3 w-3" />
											Upload Image
										</Button>
										{workspaceIconPreview && (
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={handleClearIcon}
												className="h-8 text-xs"
											>
												Remove
											</Button>
										)}
									</div>
								</div>
							</div>

							{/* Name Input */}
							<div className="space-y-2">
								<Label htmlFor={nameId} className="text-sm font-medium">
									Name
								</Label>
								<Input
									id={nameId}
									value={workspaceName}
									onChange={(e) => {
										setWorkspaceName(e.target.value);
										setError(null);
									}}
									placeholder="workspace"
									autoFocus
									className="h-10 border-0 bg-muted/70 text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:border-0"
									maxLength={50}
								/>
							</div>

							{/* Color Picker - Only show if no icon */}
							{!workspaceIconPreview && (
								<div className="space-y-3">
									<Label className="text-sm font-medium flex items-center gap-2">
										<Palette className="h-4 w-4" />
										Color
									</Label>
									<div className="flex flex-wrap gap-2">
										{PRESET_COLORS.map((color) => (
											<button
												key={color.value}
												type="button"
												onClick={() => setWorkspaceColor(color.value)}
												className={cn(
													"h-8 w-8 rounded-lg transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
													workspaceColor === color.value
														? "ring-2 ring-primary ring-offset-2 scale-110"
														: "",
												)}
												style={{ backgroundColor: color.value }}
												title={color.name}
												aria-label={`Select ${color.name} color`}
											/>
										))}
										<div className="relative">
											<input
												type="color"
												value={workspaceColor}
												onChange={(e) => setWorkspaceColor(e.target.value)}
												className="h-8 w-8 rounded-lg cursor-pointer"
												title="Custom color"
												style={{
													border: "2px solid hsl(var(--border))",
													backgroundColor: workspaceColor,
												}}
											/>
										</div>
									</div>
									<p className="text-xs text-muted-foreground">
										Choose a color for your workspace icon.
									</p>
								</div>
							)}

							{error && <p className="text-sm text-destructive">{error}</p>}

							{/* Action Buttons */}
							<div className="flex gap-3 pt-2">
								<Button
									type="button"
									variant="ghost"
									onClick={() => handleDialogChange(false)}
									disabled={isPending}
									className="flex-1"
								>
									Cancel
								</Button>
								<Button
									type="submit"
									disabled={!workspaceName.trim() || isPending}
									className="flex-1"
								>
									{isPending ? "Creating..." : "Create Workspace"}
								</Button>
							</div>
						</form>
					</DialogPopup>
				</DialogPortal>
			</Dialog>

			{/* Image Cropper Dialog */}
			{originalImageSrc && (
				<ImageCropper
					open={cropperOpen}
					onOpenChange={setCropperOpen}
					imageSrc={originalImageSrc}
					onCropComplete={handleCropComplete}
					onCancel={handleCropCancel}
					aspectRatio={1}
					recommendedSize="64x64px"
				/>
			)}
		</>
	);
}
