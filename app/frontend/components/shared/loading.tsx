import { cn } from "@/lib/utils";
import { LoaderIcon } from "lucide-react";
import type { ComponentProps } from "react";

export interface LoadingBasicProps extends ComponentProps<"div"> {
	text?: string;
	columnBased?: boolean;
}
export function LoadingBasic({
	className,
	text = "Please wait...",
	columnBased = false,
}: LoadingBasicProps) {
	return (
		<div
			className={cn(
				"flex items-center gap-2",
				columnBased && "flex flex-col",
				className,
			)}
		>
			<LoaderIcon className="animate-spin" />
			<span className="text-muted-foreground">{text}</span>
		</div>
	);
}
