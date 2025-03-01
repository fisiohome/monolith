import { cn } from "@/lib/utils";
import { type VariantProps, cva } from "class-variance-authority";
import { useMemo } from "react";

const dotBadgeVariants = cva(
	"text-center font-semibold transition-all duration-300 ease-in-out",
	{
		variants: {
			variant: {
				default:
					"bg-primary text-primary border-primary hover:bg-primary/80 hover:text-primary/80",
				secondary:
					"bg-secondary text-secondary border-secondary hover:bg-secondary/80 hover:text-secondary/80",
				accent:
					"bg-accent text-accent border-accent hover:bg-accent/80 hover:text-accent/80",
				destructive:
					"bg-destructive text-destructive border-destructive hover:bg-destructive/80 hover:text-destructive/80",
				warning:
					"bg-amber-500 text-amber-700 border-amber-500 hover:bg-amber-500/80 hover:text-amber-700/80",
				success:
					"bg-emerald-500 text-emerald-700 border-emerald-500 hover:bg-emerald-500/80 hover:text-emerald-700/80",
				outline: "text-foreground border-foreground hover:text-foreground/80",
			},
			size: {
				default: "text-sm",
				xs: "text-xs",
				base: "text-base",
				lg: "text-lg",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

export type VariantDotBadge = VariantProps<typeof dotBadgeVariants>;

export interface DotBadgeWithLabelProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantDotBadge {}

export default function DotBadgeWithLabel({
	className,
	variant,
	size,
	children,
	...props
}: DotBadgeWithLabelProps) {
	const dotSize = useMemo(() => {
		switch (size) {
			case "xs":
				return "size-2";
			case "base":
				return "size-3";
			case "lg":
				return "size-3.5";
			default:
				return "size-2.5";
		}
	}, [size]);

	return (
		<div
			className={cn(
				"inline-flex items-baseline justify-start !bg-transparent",
				dotBadgeVariants({ variant, size }),
				className,
			)}
		>
			<div
				className={cn(
					"inline-flex border rounded-full mr-2 p-0",
					dotBadgeVariants({ variant }),
					dotSize,
					className,
				)}
				{...props}
			/>
			{children}
		</div>
	);
}
