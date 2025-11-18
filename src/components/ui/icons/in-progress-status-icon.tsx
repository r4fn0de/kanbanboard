import { cn } from "@/lib/utils";

interface InProgressStatusIconProps {
	className?: string;
}

export function InProgressStatusIcon({ className }: InProgressStatusIconProps) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 18 18"
			fill="none"
			className={cn("h-4 w-4", className)}
		>
			<title>In Progress</title>
			<path
				d="M16 9C16 12.866 12.866 16 8.99998 16C8.99998 16 9 12.866 9 9C9 5.13401 8.99998 2 8.99998 2C12.866 2 16 5.13401 16 9Z"
				fill="#FACC15"
			/>
			<circle cx="9" cy="9" r="8.5" stroke="#9E9E9E" />
		</svg>
	);
}
