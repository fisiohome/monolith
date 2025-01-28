import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export interface PageContainerProps extends ComponentProps<"article"> {}

export const PageContainer = ({ children, className }: PageContainerProps) => {
	return (
		<article
			className={cn(
				"p-4 md:p-6 rounded-xl shadow-inner bg-sidebar text-sidebar-foreground",
				className,
			)}
		>
			{children}
		</article>
	);
};

export interface FormPageContainerProps extends ComponentProps<"article"> {}

export function FormPageContainer({
	className,
	children,
}: FormPageContainerProps) {
	return (
		<article
			className={cn(
				"min-h-[100vh] flex-1 rounded-xl bg-sidebar md:min-h-min p-4 md:p-6 space-y-4",
				className,
			)}
		>
			{children}
		</article>
	);
}

export interface FormPageHeaderProps extends ComponentProps<"div"> {
	title: string;
	description: string;
}

export function FormPageHeader({
	className,
	title,
	description,
}: FormPageHeaderProps) {
	return (
		<>
			<div className={cn("flex flex-col space-y-1.5", className)}>
				<h1 className="font-bold leading-none tracking-tight">{title}</h1>
				<span className="text-sm text-muted-foreground">{description}</span>
			</div>

			<Separator />
		</>
	);
}
