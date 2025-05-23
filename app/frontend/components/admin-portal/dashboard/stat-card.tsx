import { useMotion } from "@/components/providers/motion-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideProps } from "lucide-react";
import { type ComponentProps, useMemo } from "react";

export interface StatCardProps extends ComponentProps<"div"> {
	data: {
		title: string;
		data: number;
		icon: React.ForwardRefExoticComponent<
			Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>
		>;
		additional: string;
	};
}
export default function StatCard({ className, data }: StatCardProps) {
	// * state for motion toggler
	const { motion: motionPref } = useMotion();
	// If motion is off, disable animation/transition
	const shouldReduceMotion = useMemo(() => motionPref === "off", [motionPref]);

	return (
		<Card
			className={cn(
				"bg-card",
				className,
				!shouldReduceMotion && "motion-preset-confetti motion-duration-1000",
			)}
		>
			<CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
				<CardTitle className="text-sm font-medium">{data.title}</CardTitle>
				<data.icon className="size-4" />
			</CardHeader>
			<CardContent>
				<div className="text-2xl font-bold">{data.data}</div>
				<p className="text-xs text-muted-foreground">{data.additional}</p>
			</CardContent>
		</Card>
	);
}
