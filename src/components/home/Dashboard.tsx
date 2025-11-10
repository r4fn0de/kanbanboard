import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { Settings, Search } from "lucide-react";
import { useWidgetLayout } from "@/hooks/useWidgetLayout";
import { useWorkspaceStatus } from "@/hooks/useWorkspaceStatus";
import { useUIStore } from "@/store/ui-store";
import { usePerformanceMonitor } from "@/hooks/usePerformanceMonitor";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { OverviewSection } from "./sections/OverviewSection";
import { QuickActionsSection } from "./sections/QuickActionsSection";
import { FavoritesSection } from "./sections/FavoritesSection";
import { ActivitySection } from "./sections/ActivitySection";
import { DeadlinesSection } from "./sections/DeadlinesSection";
import { WidgetContainer } from "./WidgetContainer";
import { Button } from "@/components/ui/button";
import { SettingsDialog } from "./SettingsDialog";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { EmptyOnboarding, NewUserOnboarding } from "@/components/onboarding";

export function Dashboard() {
	usePerformanceMonitor("Dashboard");

	const { widgets } = useWidgetLayout();
	const { data: workspaceStatus, isLoading: statusLoading } =
		useWorkspaceStatus();
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [showNewUserTips, setShowNewUserTips] = useState(true);
	const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore();

	// Check if this is a new user (has boards but no activity)
	const isNewUser = workspaceStatus?.isNewUser ?? false;
	const isEmpty = workspaceStatus?.isEmpty ?? false;

	const handleSettingsOpen = useCallback(() => setSettingsOpen(true), []);
	const handleSettingsClose = useCallback(
		(open: boolean) => setSettingsOpen(open),
		[],
	);
	const handleSearchOpen = useCallback(
		() => setCommandPaletteOpen(true),
		[setCommandPaletteOpen],
	);
	const handleDismissNewUserTips = useCallback(
		() => setShowNewUserTips(false),
		[],
	);
	const handleCreateBoard = useCallback(() => {
		// TODO: Open create board dialog
		console.log("Create board");
	}, []);

	// Memoize renderWidget function
	const renderWidget = useCallback(
		(widget: any) => {
			const actionButtons = {
				favorites: (
					<Button variant="ghost" size="sm" asChild>
						<Link to="/projects/favorites">View All</Link>
					</Button>
				),
				activity: (
					<Button variant="ghost" size="sm">
						<Link to="/activity">View All</Link>
					</Button>
				),
				deadlines: (
					<Button variant="ghost" size="sm">
						<Link to="/deadlines">View All</Link>
					</Button>
				),
			};

			const commonProps = {
				key: widget.id,
				title: widget.title,
				actionButton:
					actionButtons[widget.type as keyof typeof actionButtons] || null,
			};

			switch (widget.type) {
				case "overview":
					return (
						<WidgetContainer {...commonProps}>
							<div>
								<ErrorBoundary>
									<OverviewSection />
								</ErrorBoundary>
							</div>
						</WidgetContainer>
					);

				case "quick-actions":
					return (
						<WidgetContainer {...commonProps}>
							<div>
								<ErrorBoundary>
									<QuickActionsSection />
								</ErrorBoundary>
							</div>
						</WidgetContainer>
					);

				case "favorites":
					return (
						<WidgetContainer {...commonProps}>
							<div>
								<ErrorBoundary>
									<FavoritesSection />
								</ErrorBoundary>
							</div>
						</WidgetContainer>
					);

				case "activity":
					return (
						<WidgetContainer {...commonProps}>
							<div>
								<ErrorBoundary>
									<ActivitySection />
								</ErrorBoundary>
							</div>
						</WidgetContainer>
					);

				case "deadlines":
					return (
						<WidgetContainer {...commonProps}>
							<div>
								<ErrorBoundary>
									<DeadlinesSection />
								</ErrorBoundary>
							</div>
						</WidgetContainer>
					);

				default:
					return null;
			}
		},
		[],
	);

	// Memoize visible widgets
	const visibleWidgets = useMemo(
		() => widgets.filter((w) => w.visible),
		[widgets],
	);

	// Keyboard shortcut for search
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				handleSearchOpen();
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [handleSearchOpen]);

	// Show loading skeleton while checking workspace status
	if (statusLoading) {
		return (
			<div className="flex h-full flex-col gap-6 p-6 overflow-y-auto">
				<div className="flex items-center justify-between">
					<div className="space-y-2">
						<div className="h-8 w-64 bg-muted animate-pulse rounded" />
						<div className="h-4 w-96 bg-muted animate-pulse rounded" />
					</div>
				</div>
				<div className="space-y-8">
					<div className="space-y-4">
						<div className="h-6 w-32 bg-muted animate-pulse rounded" />
						<div className="grid gap-4 grid-cols-2 md:grid-cols-4">
							{Array.from({ length: 4 }).map((_, i) => (
								<div
									key={i}
									className="h-32 bg-muted animate-pulse rounded-lg"
								/>
							))}
						</div>
					</div>
				</div>
			</div>
		);
	}

	// Show empty state onboarding when workspace is empty
	if (isEmpty) {
		return (
			<>
				<div className="flex h-full flex-col gap-6 p-6 overflow-y-auto">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-2xl font-semibold tracking-tight text-foreground">
								Welcome to Modulo
							</h1>
							<p className="text-sm text-muted-foreground">
								Organize your work, keep projects on track, and stay focused
							</p>
						</div>
						<div className="flex items-center gap-2">
							<Button
								variant="ghost"
								onClick={handleSearchOpen}
								className="gap-2"
								title="Search (Cmd+K)"
							>
								<Search className="h-4 w-4" />
								<span className="hidden sm:inline text-sm">Search</span>
							</Button>
							<Button
								variant="ghost"
								size="icon"
								onClick={handleSettingsOpen}
								title="Customize dashboard"
							>
								<Settings className="h-4 w-4" />
							</Button>
						</div>
					</div>

					<EmptyOnboarding onCreateBoard={handleCreateBoard} />
				</div>

				<SettingsDialog
					open={settingsOpen}
					onOpenChange={handleSettingsClose}
				/>
			</>
		);
	}

	return (
		<>
			<div className="flex h-full flex-col gap-6 p-6 overflow-y-auto">
				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-2xl font-semibold tracking-tight text-foreground">
								Welcome to Modulo
							</h1>
							<p className="text-sm text-muted-foreground">
								Organize your work, keep projects on track, and stay focused
							</p>
						</div>
						<div className="flex items-center gap-2">
							<Button
								variant="ghost"
								onClick={handleSearchOpen}
								className="gap-2"
								title="Search (Cmd+K)"
							>
								<Search className="h-4 w-4" />
								<span className="hidden sm:inline text-sm">Search</span>
								<span className="text-xs text-muted-foreground ml-2 hidden sm:inline-flex items-center gap-1">
									<kbd className="px-1 py-0.5 rounded bg-muted text-xs">⌘</kbd>
									<kbd className="px-1 py-0.5 rounded bg-muted text-xs">K</kbd>
								</span>
							</Button>
							<Button
								variant="ghost"
								size="icon"
								onClick={handleSettingsOpen}
								title="Customize dashboard"
							>
								<Settings className="h-4 w-4" />
							</Button>
						</div>
					</div>
				</div>

				{/* New User Onboarding Tips */}
				{isNewUser && showNewUserTips && (
					<NewUserOnboarding
						onDismiss={handleDismissNewUserTips}
						onOpenSearch={handleSearchOpen}
					/>
				)}

				<div className="space-y-8">
					{visibleWidgets.map((widget) => renderWidget(widget))}
				</div>
			</div>

			<SettingsDialog open={settingsOpen} onOpenChange={handleSettingsClose} />

			<GlobalSearch
				open={commandPaletteOpen}
				onOpenChange={setCommandPaletteOpen}
			/>
		</>
	);
}
