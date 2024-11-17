import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import * as React from "react";
import { Button } from "./button";

export interface InputProps
	extends React.InputHTMLAttributes<HTMLInputElement> {
	startIcon?: LucideIcon;
	endIcon?: LucideIcon;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
	({ className, type, startIcon, endIcon, ...props }, ref) => {
		const StartIcon = startIcon;
		const EndIcon = endIcon;

		return (
			<div className="relative w-full">
				{StartIcon && (
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="absolute transform -translate-y-1/2 left-1 top-1/2 h-7 w-7"
					>
						<StartIcon size={16} className="text-muted-foreground" />
					</Button>
				)}
				<input
					type={type}
					className={cn(
						"flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 shadow-sm text-sm transition-colors ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
						startIcon ? "pl-10" : "",
						endIcon ? "pr-8" : "",
						className,
					)}
					ref={ref}
					{...props}
				/>
				{EndIcon && (
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="absolute -translate-y-1/2 right-1 top-1/2 h-7 w-7"
					>
						<EndIcon className="text-muted-foreground" size={16} />
					</Button>
				)}
			</div>
		);
	},
);
Input.displayName = "Input";

export { Input };
