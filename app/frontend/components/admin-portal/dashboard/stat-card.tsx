import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideProps } from "lucide-react";
import type { ComponentProps } from "react";

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
	return (
		<Card
			className={cn(
				"bg-card motion-preset-confetti motion-delay-75",
				className,
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
