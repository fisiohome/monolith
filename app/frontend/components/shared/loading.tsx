import { cn } from "@/lib/utils";
import { LoaderIcon } from "lucide-react";
import type { ComponentProps } from "react";

export interface LoadingBasicProps extends ComponentProps<"div"> {
	text?: string;
}
export function LoadingBasic({
	className,
	text = "Please wait...",
}: LoadingBasicProps) {
	return (
		<div className={cn("flex items-center gap-2", className)}>
			<LoaderIcon className="animate-spin" />
			<span className="text-muted-foreground">{text}</span>
		</div>
	);
}
