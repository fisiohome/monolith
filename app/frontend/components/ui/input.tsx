import { cn } from "@/lib/utils";
import { LoaderIcon, type LucideIcon } from "lucide-react";
import * as React from "react";
import { Button } from "./button";

export interface IconProps {
	isButton?: boolean;
	handleOnClick?: React.MouseEventHandler;
	icon: LucideIcon;
}

export interface InputProps
	extends React.InputHTMLAttributes<HTMLInputElement> {
	StartIcon?: IconProps;
	EndIcon?: IconProps;
	isLoading?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
	({ className, type, StartIcon, EndIcon, isLoading, ...props }, ref) => {
		return (
			<div className="relative w-full">
				{StartIcon?.isButton ? (
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="absolute transform -translate-y-1/2 left-1 top-1/2 h-7 w-7"
					>
						<StartIcon.icon size={16} className="text-muted-foreground" />
					</Button>
				) : StartIcon?.icon ? (
					<div className="absolute transform -translate-y-1/2 left-3 top-1/2">
						<StartIcon.icon size={16} className="text-muted-foreground" />
					</div>
				) : (
					<></>
				)}

				<input
					type={type}
					className={cn(
						"flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 shadow text-sm transition-colors ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
						StartIcon ? "pl-10" : "",
						EndIcon ? "pr-8" : "",
						className,
					)}
					ref={ref}
					{...props}
				/>

				{EndIcon?.isButton ? (
					<Button
						type="button"
						variant="ghost"
						size="icon"
						disabled={isLoading}
						onClick={EndIcon.handleOnClick}
						className="absolute -translate-y-1/2 right-1 top-1/2 h-7 w-7"
					>
						{isLoading ? (
							<LoaderIcon className="animate-spin" />
						) : (
							<EndIcon.icon className="text-muted-foreground" size={16} />
						)}
					</Button>
				) : EndIcon?.icon ? (
					<div className="absolute transform -translate-y-1/2 right-3 top-1/2">
						{isLoading ? (
							<LoaderIcon className="animate-spin" />
						) : (
							<EndIcon.icon className="text-muted-foreground" size={16} />
						)}
					</div>
				) : (
					<></>
				)}
			</div>
		);
	},
);
Input.displayName = "Input";

export { Input };
