"use client";

/* DEMO ONLY, DO NOT USE IN PRODUCTION */

import * as React from "react";

import { CopilotPlugin } from "@platejs/ai/react";
import {
	Check,
	ChevronsUpDown,
	ExternalLinkIcon,
	Eye,
	EyeOff,
	Settings,
	Wand2Icon,
	FolderIcon,
	Trash2,
	Edit2,
	Upload,
	X,
} from "lucide-react";
import { useEditorRef } from "platejs/react";

import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogCancel,
	AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { aiChatPlugin } from "@/components/editor/plugins/ai-kit";
import {
	useWorkspaces,
	useUpdateWorkspace,
	useDeleteWorkspace,
	useUpdateWorkspaceIconMutation,
	useRemoveWorkspaceIconMutation,
} from "@/services/workspaces";
import { useWorkspaceStore } from "@/store/workspace-store";
import { useBoards } from "@/services/kanban";
import { toast } from "sonner";
import type { Workspace } from "@/types/common";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";
import { ImageCropper } from "@/components/ui/image-cropper";
import { WorkspaceIcon } from "@/components/ui/workspace-icon";

interface Model {
	label: string;
	value: string;
}

export const models: Model[] = [
	{ label: "gpt-4o-mini", value: "gpt-4o-mini" },
	{ label: "gpt-4o", value: "gpt-4o" },
	{ label: "gpt-4-turbo", value: "gpt-4-turbo" },
	{ label: "gpt-4", value: "gpt-4" },
	{ label: "gpt-3.5-turbo", value: "gpt-3.5-turbo" },
	{ label: "gpt-3.5-turbo-instruct", value: "gpt-3.5-turbo-instruct" },
];

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

interface DeleteWorkspaceState {
	workspace: Workspace | null;
	action: "delete-all" | "move-to-other" | null;
	targetWorkspaceId: string | null;
}

export function SettingsDialog() {
	const editor = useEditorRef();

	const [tempModel, setTempModel] = React.useState<Model>(models[0]);
	const [tempKeys, setTempKeys] = React.useState<Record<string, string>>({
		openai: "",
		uploadthing: "",
	});
	const [showKey, setShowKey] = React.useState<Record<string, boolean>>({});
	const [open, setOpen] = React.useState(false);
	const [openModel, setOpenModel] = React.useState(false);

	// Workspace management state
	const [activeTab, setActiveTab] = React.useState<"ai" | "workspaces">("ai");

	React.useEffect(() => {
		console.log("SettingsDialog mounted, activeTab:", activeTab);
	}, [activeTab]);
	const [editingWorkspace, setEditingWorkspace] = React.useState<string | null>(
		null,
	);
	const [workspaceName, setWorkspaceName] = React.useState("");
	const [workspaceColor, setWorkspaceColor] = React.useState<string | null>(
		null,
	);
	const [deleteState, setDeleteState] = React.useState<DeleteWorkspaceState>({
		workspace: null,
		action: null,
		targetWorkspaceId: null,
	});
	const [cropperOpen, setCropperOpen] = React.useState(false);
	const [originalImageSrc, setOriginalImageSrc] = React.useState<string | null>(
		null,
	);
	const [currentEditingWorkspaceId, setCurrentEditingWorkspaceId] =
		React.useState<string | null>(null);

	// Queries and mutations
	const { data: workspaces = [] } = useWorkspaces();
	const { data: boards = [] } = useBoards();
	const { mutateAsync: updateWorkspace } = useUpdateWorkspace();
	const { mutateAsync: deleteWorkspace } = useDeleteWorkspace();
	const { mutateAsync: updateWorkspaceIcon } = useUpdateWorkspaceIconMutation();
	const { mutateAsync: removeWorkspaceIcon } = useRemoveWorkspaceIconMutation();
	const { selectedWorkspaceId, setSelectedWorkspaceId } = useWorkspaceStore();

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		// Update AI chat options
		const chatOptions = editor.getOptions(aiChatPlugin).chatOptions ?? {};

		editor.setOption(aiChatPlugin, "chatOptions", {
			...chatOptions,
			body: {
				...chatOptions.body,
				apiKey: tempKeys.openai,
				model: tempModel.value,
			},
		});

		setOpen(false);

		// Update AI complete options
		const completeOptions =
			editor.getOptions(CopilotPlugin).completeOptions ?? {};
		editor.setOption(CopilotPlugin, "completeOptions", {
			...completeOptions,
			body: {
				...completeOptions.body,
				apiKey: tempKeys.openai,
				model: tempModel.value,
			},
		});
	};

	const handleEditWorkspace = (workspace: Workspace) => {
		setEditingWorkspace(workspace.id);
		setWorkspaceName(workspace.name);
		setWorkspaceColor(workspace.color ?? null);
	};

	const handleSaveWorkspace = async (workspaceId: string) => {
		try {
			await updateWorkspace({
				id: workspaceId,
				name: workspaceName.trim() || undefined,
				color: workspaceColor,
			});
			toast.success("Workspace updated successfully");
			setEditingWorkspace(null);
		} catch (error) {
			toast.error("Failed to update workspace");
			console.error(error);
		}
	};

	const handleCancelEdit = () => {
		setEditingWorkspace(null);
		setWorkspaceName("");
		setWorkspaceColor(null);
	};

	const handleDeleteWorkspace = (workspace: Workspace) => {
		const workspaceBoards = boards.filter(
			(b) => b.workspaceId === workspace.id,
		);

		if (workspaceBoards.length === 0) {
			// No projects, can delete immediately
			setDeleteState({
				workspace,
				action: "delete-all",
				targetWorkspaceId: null,
			});
		} else {
			// Has projects, show options
			setDeleteState({
				workspace,
				action: null,
				targetWorkspaceId: null,
			});
		}
	};

	const confirmDeleteWorkspace = async () => {
		if (!deleteState.workspace) return;

		try {
			if (
				deleteState.action === "move-to-other" &&
				deleteState.targetWorkspaceId
			) {
				// Move all boards to target workspace
				const workspaceBoards = boards.filter(
					(b) => b.workspaceId === deleteState.workspace!.id,
				);

				for (const board of workspaceBoards) {
					await invoke("update_board_workspace", {
						boardId: board.id,
						workspaceId: deleteState.targetWorkspaceId,
					});
				}
			}

			// Delete the workspace
			await deleteWorkspace(deleteState.workspace.id);

			// Update selected workspace if needed
			if (selectedWorkspaceId === deleteState.workspace.id) {
				const remainingWorkspaces = workspaces.filter(
					(w) => w.id !== deleteState.workspace!.id,
				);
				setSelectedWorkspaceId(remainingWorkspaces[0]?.id ?? null);
			}

			toast.success("Workspace deleted successfully");
			setDeleteState({
				workspace: null,
				action: null,
				targetWorkspaceId: null,
			});
		} catch (error) {
			toast.error("Failed to delete workspace");
			console.error(error);
		}
	};

	const handleSelectIcon = async (workspaceId: string) => {
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
			setCurrentEditingWorkspaceId(workspaceId);
			setCropperOpen(true);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to select image";
			toast.error(message);
		}
	};

	const handleCropComplete = React.useCallback(
		async (croppedBlob: Blob) => {
			if (!currentEditingWorkspaceId) return;

			try {
				const arrayBuffer = await croppedBlob.arrayBuffer();
				const uint8Array = new Uint8Array(arrayBuffer);

				const iconPath = await invoke<string>("save_cropped_workspace_icon", {
					workspaceId: currentEditingWorkspaceId,
					imageData: Array.from(uint8Array),
				});

				await updateWorkspaceIcon({
					workspaceId: currentEditingWorkspaceId,
					filePath: iconPath,
				});

				toast.success("Workspace icon updated");
				setCropperOpen(false);
				if (originalImageSrc) {
					URL.revokeObjectURL(originalImageSrc);
				}
				setOriginalImageSrc(null);
				setCurrentEditingWorkspaceId(null);
			} catch (error) {
				toast.error("Failed to update workspace icon");
				console.error(error);
			}
		},
		[currentEditingWorkspaceId, originalImageSrc, updateWorkspaceIcon],
	);

	const handleRemoveIcon = async (workspaceId: string) => {
		try {
			await removeWorkspaceIcon(workspaceId);
			toast.success("Workspace icon removed");
		} catch (error) {
			toast.error("Failed to remove workspace icon");
			console.error(error);
		}
	};

	const toggleKeyVisibility = (key: string) => {
		setShowKey((prev) => ({ ...prev, [key]: !prev[key] }));
	};

	const renderApiKeyInput = (service: string, label: string) => (
		<div className="group relative">
			<div className="flex items-center justify-between">
				<label
					className="absolute top-1/2 block -translate-y-1/2 cursor-text px-1 text-sm text-muted-foreground/70 transition-all group-focus-within:pointer-events-none group-focus-within:top-0 group-focus-within:cursor-default group-focus-within:text-xs group-focus-within:font-medium group-focus-within:text-foreground has-[+input:not(:placeholder-shown)]:pointer-events-none has-[+input:not(:placeholder-shown)]:top-0 has-[+input:not(:placeholder-shown)]:cursor-default has-[+input:not(:placeholder-shown)]:text-xs has-[+input:not(:placeholder-shown)]:font-medium has-[+input:not(:placeholder-shown)]:text-foreground"
					htmlFor={label}
				>
					<span className="inline-flex bg-background px-2">{label}</span>
				</label>
				<Button
					asChild
					size="icon"
					variant="ghost"
					className="absolute top-0 right-[28px] h-full"
				>
					<a
						className="flex items-center"
						href={
							service === "openai"
								? "https://platform.openai.com/api-keys"
								: "https://uploadthing.com/dashboard"
						}
						rel="noopener noreferrer"
						target="_blank"
					>
						<ExternalLinkIcon className="size-4" />
						<span className="sr-only">Get {label}</span>
					</a>
				</Button>
			</div>

			<Input
				id={label}
				className="pr-10"
				value={tempKeys[service]}
				onChange={(e) =>
					setTempKeys((prev) => ({ ...prev, [service]: e.target.value }))
				}
				placeholder=""
				data-1p-ignore
				type={showKey[service] ? "text" : "password"}
			/>
			<Button
				size="icon"
				variant="ghost"
				className="absolute top-0 right-0 h-full"
				onClick={() => toggleKeyVisibility(service)}
				type="button"
			>
				{showKey[service] ? (
					<EyeOff className="size-4" />
				) : (
					<Eye className="size-4" />
				)}
				<span className="sr-only">
					{showKey[service] ? "Hide" : "Show"} {label}
				</span>
			</Button>
		</div>
	);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button
					size="icon"
					variant="default"
					className={cn(
						"group fixed right-4 bottom-4 z-50 size-10 overflow-hidden",
						"rounded-full shadow-md hover:shadow-lg",
					)}
					// data-block-hide
				>
					<Settings className="size-4" />
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="text-xl">Settings</DialogTitle>
					<DialogDescription>
						Configure your API keys and preferences.
					</DialogDescription>
				</DialogHeader>

				{/* Tabs */}
				<div className="flex border-b">
					<button
						type="button"
						className={cn(
							"px-4 py-2 text-sm font-medium border-b-2 transition-colors",
							activeTab === "ai"
								? "border-primary text-primary"
								: "border-transparent text-muted-foreground hover:text-foreground",
						)}
						onClick={() => setActiveTab("ai")}
					>
						AI Settings
					</button>
					<button
						type="button"
						className={cn(
							"px-4 py-2 text-sm font-medium border-b-2 transition-colors",
							activeTab === "workspaces"
								? "border-primary text-primary"
								: "border-transparent text-muted-foreground hover:text-foreground",
						)}
						onClick={() => setActiveTab("workspaces")}
					>
						Workspaces
					</button>
				</div>

				<form className="space-y-10" onSubmit={handleSubmit}>
					{/* AI Settings Group */}
					{activeTab === "ai" && (
						<div className="space-y-4">
							<div className="flex items-center gap-2">
								<div className="size-8 rounded-full bg-purple-100 p-2 dark:bg-purple-900">
									<Wand2Icon className="size-4 text-purple-600 dark:text-purple-400" />
								</div>
								<h4 className="font-semibold">AI</h4>
							</div>

							<div className="space-y-4">
								{renderApiKeyInput("openai", "OpenAI API key")}

								<div className="group relative">
									<label
										className="absolute start-1 top-0 z-10 block -translate-y-1/2 bg-background px-2 text-xs font-medium text-foreground group-has-disabled:opacity-50"
										htmlFor="select-model"
									>
										Model
									</label>
									<Popover open={openModel} onOpenChange={setOpenModel}>
										<PopoverTrigger id="select-model" asChild>
											<Button
												size="lg"
												variant="ghost"
												className="w-full justify-between"
												aria-expanded={openModel}
												role="combobox"
											>
												<code>{tempModel.label}</code>
												<ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
											</Button>
										</PopoverTrigger>
										<PopoverContent className="w-full p-0">
											<Command>
												<CommandInput placeholder="Search model..." />
												<CommandEmpty>No model found.</CommandEmpty>
												<CommandList>
													<CommandGroup>
														{models.map((m) => (
															<CommandItem
																key={m.value}
																value={m.value}
																onSelect={() => {
																	setTempModel(m);
																	setOpenModel(false);
																}}
															>
																<Check
																	className={cn(
																		"mr-2 size-4",
																		tempModel.value === m.value
																			? "opacity-100"
																			: "opacity-0",
																	)}
																/>
																<code>{m.label}</code>
															</CommandItem>
														))}
													</CommandGroup>
												</CommandList>
											</Command>
										</PopoverContent>
									</Popover>
								</div>
							</div>
						</div>
					)}

					{/* Workspace Settings Group */}
					{activeTab === "workspaces" && (
						<div className="space-y-4">
							<div className="flex items-center gap-2">
								<div className="size-8 rounded-full bg-blue-100 p-2 dark:bg-blue-900">
									<FolderIcon className="size-4 text-blue-600 dark:text-blue-400" />
								</div>
								<h4 className="font-semibold">Manage Workspaces</h4>
							</div>

							<div className="space-y-3 max-h-[400px] overflow-y-auto">
								{workspaces.length === 0 ? (
									<p className="text-sm text-muted-foreground text-center py-8">
										No workspaces found. Create one to get started.
									</p>
								) : (
									workspaces.map((workspace) => {
										const workspaceBoards = boards.filter(
											(b) => b.workspaceId === workspace.id,
										);
										const isEditing = editingWorkspace === workspace.id;

										return (
											<div
												key={workspace.id}
												className="border rounded-lg p-4 space-y-3"
											>
												{isEditing ? (
													<>
														<div className="space-y-2">
															<Label htmlFor={`name-${workspace.id}`}>
																Workspace Name
															</Label>
															<Input
																id={`name-${workspace.id}`}
																value={workspaceName}
																onChange={(e) =>
																	setWorkspaceName(e.target.value)
																}
																placeholder="Workspace name"
															/>
														</div>

														<div className="space-y-2">
															<Label>Color</Label>
															<div className="flex gap-2 flex-wrap">
																{PRESET_COLORS.map((color) => (
																	<button
																		key={color.value}
																		type="button"
																		className={cn(
																			"size-8 rounded-full border-2 transition-all",
																			workspaceColor === color.value
																				? "border-foreground scale-110"
																				: "border-transparent hover:scale-105",
																		)}
																		style={{ backgroundColor: color.value }}
																		onClick={() =>
																			setWorkspaceColor(color.value)
																		}
																		title={color.name}
																	/>
																))}
															</div>
														</div>

														<div className="flex gap-2">
															<Button
																type="button"
																size="sm"
																onClick={() =>
																	handleSaveWorkspace(workspace.id)
																}
															>
																Save
															</Button>
															<Button
																type="button"
																size="sm"
																variant="ghost"
																onClick={handleCancelEdit}
															>
																Cancel
															</Button>
														</div>
													</>
												) : (
													<>
														<div className="flex items-center justify-between">
															<div className="flex items-center gap-3">
																{workspace.iconPath ? (
																	<img
																		src={`asset://localhost/${workspace.iconPath}`}
																		alt=""
																		className="size-10 rounded-full object-cover"
																	/>
																) : (
																	<div
																		className="size-10 rounded-full flex items-center justify-center text-white font-semibold"
																		style={{
																			backgroundColor:
																				workspace.color ?? "#6366F1",
																		}}
																	>
																		{workspace.name.charAt(0).toUpperCase()}
																	</div>
																)}
																<div>
																	<h5 className="font-medium">
																		{workspace.name}
																	</h5>
																	<p className="text-xs text-muted-foreground">
																		{workspaceBoards.length} project
																		{workspaceBoards.length !== 1 ? "s" : ""}
																	</p>
																</div>
															</div>

															<div className="flex gap-1">
																<Button
																	type="button"
																	size="icon"
																	variant="ghost"
																	onClick={() => handleSelectIcon(workspace.id)}
																	title="Change icon"
																>
																	<Upload className="size-4" />
																</Button>
																{workspace.iconPath && (
																	<Button
																		type="button"
																		size="icon"
																		variant="ghost"
																		onClick={() =>
																			handleRemoveIcon(workspace.id)
																		}
																		title="Remove icon"
																	>
																		<X className="size-4" />
																	</Button>
																)}
																<Button
																	type="button"
																	size="icon"
																	variant="ghost"
																	onClick={() => handleEditWorkspace(workspace)}
																	title="Edit"
																>
																	<Edit2 className="size-4" />
																</Button>
																<Button
																	type="button"
																	size="icon"
																	variant="ghost"
																	onClick={() =>
																		handleDeleteWorkspace(workspace)
																	}
																	className="text-destructive hover:text-destructive"
																	title="Delete"
																>
																	<Trash2 className="size-4" />
																</Button>
															</div>
														</div>
													</>
												)}
											</div>
										);
									})
								)}
							</div>
						</div>
					)}

					{/* Upload Settings Group */}
					{/* <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-full bg-red-100 p-2 dark:bg-red-900">
                <Upload className="size-4 text-red-600 dark:text-red-400" />
              </div>
              <h4 className="font-semibold">Upload</h4>
            </div>

            <div className="space-y-4">
              {renderApiKeyInput('uploadthing', 'Uploadthing API key')}
            </div>
          </div> */}

					{activeTab === "ai" && (
						<Button size="lg" className="w-full" type="submit">
							Save changes
						</Button>
					)}
				</form>

				{activeTab === "ai" && (
					<p className="text-sm text-muted-foreground">
						Not stored anywhere. Used only for current session requests.
					</p>
				)}
			</DialogContent>

			{/* Delete Workspace Confirmation Dialog */}
			<AlertDialog
				open={deleteState.workspace !== null}
				onOpenChange={(open) => {
					if (!open) {
						setDeleteState({
							workspace: null,
							action: null,
							targetWorkspaceId: null,
						});
					}
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Workspace</AlertDialogTitle>
						<AlertDialogDescription>
							{deleteState.workspace && (
								<>
									{boards.filter(
										(b) => b.workspaceId === deleteState.workspace!.id,
									).length === 0 ? (
										<>
											Are you sure you want to delete the workspace{" "}
											<strong>{deleteState.workspace.name}</strong>? This action
											cannot be undone.
										</>
									) : (
										<>
											The workspace{" "}
											<strong>{deleteState.workspace.name}</strong> contains{" "}
											{
												boards.filter(
													(b) => b.workspaceId === deleteState.workspace!.id,
												).length
											}{" "}
											project(s). What would you like to do?
										</>
									)}
								</>
							)}
						</AlertDialogDescription>
					</AlertDialogHeader>

					{deleteState.workspace &&
						boards.filter((b) => b.workspaceId === deleteState.workspace!.id)
							.length > 0 && (
							<div className="space-y-3">
								<div className="space-y-2">
									<button
										type="button"
										className={cn(
											"w-full p-3 border rounded-lg text-left transition-colors",
											deleteState.action === "delete-all"
												? "border-primary bg-primary/5"
												: "hover:border-muted-foreground/50",
										)}
										onClick={() =>
											setDeleteState((prev) => ({
												...prev,
												action: "delete-all",
												targetWorkspaceId: null,
											}))
										}
									>
										<div className="font-medium text-destructive">
											Delete workspace and all projects
										</div>
										<div className="text-sm text-muted-foreground">
											This will permanently delete all projects in this
											workspace
										</div>
									</button>

									<button
										type="button"
										className={cn(
											"w-full p-3 border rounded-lg text-left transition-colors",
											deleteState.action === "move-to-other"
												? "border-primary bg-primary/5"
												: "hover:border-muted-foreground/50",
										)}
										onClick={() =>
											setDeleteState((prev) => ({
												...prev,
												action: "move-to-other",
											}))
										}
									>
										<div className="font-medium">
											Move projects to another workspace
										</div>
										<div className="text-sm text-muted-foreground">
											Keep the projects by moving them first
										</div>
									</button>
								</div>

								{deleteState.action === "move-to-other" && (
									<div className="space-y-2">
										<Label>Select target workspace</Label>
										<select
											className="w-full p-2 border rounded-lg bg-background"
											value={deleteState.targetWorkspaceId ?? ""}
											onChange={(e) =>
												setDeleteState((prev) => ({
													...prev,
													targetWorkspaceId: e.target.value,
												}))
											}
										>
											<option value="">Select a workspace...</option>
											{workspaces
												.filter((w) => w.id !== deleteState.workspace?.id)
												.map((w) => (
													<option key={w.id} value={w.id}>
														{w.name}
													</option>
												))}
										</select>
									</div>
								)}
							</div>
						)}

					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmDeleteWorkspace}
							disabled={
								deleteState.action === null ||
								(deleteState.action === "move-to-other" &&
									!deleteState.targetWorkspaceId)
							}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Delete Workspace
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Image Cropper Dialog */}
			{cropperOpen && originalImageSrc && (
				<ImageCropper
					open={cropperOpen}
					onOpenChange={setCropperOpen}
					imageSrc={originalImageSrc}
					onCropComplete={handleCropComplete}
					onCancel={() => {
						if (originalImageSrc) {
							URL.revokeObjectURL(originalImageSrc);
						}
						setOriginalImageSrc(null);
						setCurrentEditingWorkspaceId(null);
						setCropperOpen(false);
					}}
				/>
			)}
		</Dialog>
	);
}
