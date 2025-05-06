import { GridPattern } from "@/components/shared/grid-pattern";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Hash } from "lucide-react";
import type { ComponentProps } from "react";

// * for page container
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

// * for form page container
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

// * for form page header
export interface FormPageHeaderProps extends ComponentProps<"div"> {
	title: string;
	description: string;
	separator?: boolean;
}

export function FormPageHeader({
	className,
	title,
	description,
	separator = true,
}: FormPageHeaderProps) {
	return (
		<>
			<div className={cn("flex flex-col space-y-1.5", className)}>
				<h1 className="font-bold leading-none tracking-tight">{title}</h1>
				<span className="text-sm text-muted-foreground text-pretty">
					{description}
				</span>
			</div>

			{separator && <Separator />}
		</>
	);
}

// * for form page header with grid pattern
export interface FormPageHeaderGridPatternProps extends ComponentProps<"div"> {
	title: string;
	description: string;
	regNumber?: string;
	series?: string;
	titleClass?: string;
	descriptionClass?: string;
}

export function FormPageHeaderGridPattern({
	title,
	description,
	regNumber,
	series,
	titleClass,
	descriptionClass,
}: FormPageHeaderGridPatternProps) {
	return (
		<div className="relative flex p-4 overflow-hidden border shadow-inner rounded-xl md:p-6 size-full bg-background border-border">
			<div>
				{regNumber && series && (
					<Badge
						variant="outline"
						className="text-[10px] mb-1 px-1 border-primary text-primary"
					>
						<Hash className="size-3 mr-0.5" />
						<span>{regNumber}</span>
					</Badge>
				)}

				<h1
					className={cn(
						"z-10 text-base font-bold tracking-tighter whitespace-pre-wrap uppercase",
						titleClass,
					)}
				>
					{title}

					{series && (
						<>
							<span className="mx-1">—</span>
							<span>{series}</span>
						</>
					)}
				</h1>

				<p
					className={cn(
						"text-sm text-muted-foreground text-pretty tracking-tight",
						descriptionClass,
					)}
				>
					{description}
				</p>
			</div>

			<GridPattern
				width={20}
				height={20}
				x={-1}
				y={-1}
				className={cn(
					"[mask-image:linear-gradient(to_bottom_right,white,transparent,transparent)] ",
				)}
			/>
		</div>
	);
}
