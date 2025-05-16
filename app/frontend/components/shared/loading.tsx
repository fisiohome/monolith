import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";
import { Spinner } from "../ui/kibo-ui/spinner";

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
			<Spinner variant="ring" />
			<span className="text-muted-foreground">{text}</span>
		</div>
	);
}
