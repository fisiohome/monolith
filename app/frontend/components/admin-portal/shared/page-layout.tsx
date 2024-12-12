import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

interface PageContainerProps extends ComponentProps<"article"> {}

export const PageContainer = ({ children, className }: PageContainerProps) => {
	return (
		<article
			className={cn(
				"p-4 md:p-6 rounded-xl shadow-inner bg-muted/50",
				className,
			)}
		>
			{children}
		</article>
	);
};
