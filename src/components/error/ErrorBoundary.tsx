import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
	onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
	hasError: boolean;
	error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
	public override state: State = {
		hasError: false,
	};

	public static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.error("ErrorBoundary caught an error:", error, errorInfo);

		// Call optional error handler
		this.props.onError?.(error, errorInfo);

		// Log to external service in production
		if (process.env.NODE_ENV === "production") {
			// TODO: Send to error reporting service (e.g., Sentry)
		}
	}

	private handleReset = () => {
		this.setState({ hasError: false, error: undefined });
	};

	public override render() {
		if (this.state.hasError) {
			// Custom fallback UI
			if (this.props.fallback) {
				return this.props.fallback;
			}

			// Default error UI
			return (
				<div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
					<div className="p-4 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
						<AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
					</div>
					<h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
					<p className="text-sm text-muted-foreground mb-6 max-w-md">
						We encountered an unexpected error. Please try refreshing the page
						or contact support if the problem persists.
					</p>
					<div className="flex gap-3">
						<Button onClick={this.handleReset} className="gap-2">
							<RefreshCw className="h-4 w-4" />
							Try Again
						</Button>
						<Button variant="ghost" onClick={() => window.location.reload()}>
							Reload Page
						</Button>
					</div>
					{process.env.NODE_ENV === "development" && this.state.error && (
						<details className="mt-6 p-4 bg-muted rounded-lg text-left max-w-2xl">
							<summary className="cursor-pointer font-medium mb-2">
								Error Details (Development)
							</summary>
							<pre className="text-xs overflow-auto">
								{this.state.error.stack}
							</pre>
						</details>
					)}
				</div>
			);
		}

		return this.props.children;
	}
}
