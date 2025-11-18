import { cn } from "@/lib/utils";

interface BacklogStatusIconProps {
	className?: string;
}

export function BacklogStatusIcon({ className }: BacklogStatusIconProps) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 18 18"
			fill="none"
			className={cn("h-4 w-4", className)}
		>
			<title>Backlog</title>
			<circle cx="9" cy="9" r="8.5" stroke="currentColor" strokeDasharray="2 2" />
		</svg>
	);
}
