import { type ComponentProps, useMemo, useState } from "react";
import {
	Label,
	LabelList,
	Pie,
	PieChart,
	PolarRadiusAxis,
	RadialBar,
	RadialBarChart,
	Sector,
} from "recharts";
import type { PieSectorDataItem } from "recharts/types/polar/Pie";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartLegend,
	ChartStyle,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// admin by role type distribution chart
export interface AdminByRoleChartProps extends ComponentProps<"div"> {
	data: Record<string, number>;
}
export function AdminByRoleChart({ className, data }: AdminByRoleChartProps) {
	const chart = useMemo(() => {
		const adminTypeData = Object.entries(data).map(([type, count]) => ({
			type,
			count,
			fill: `var(--color-${type.toLowerCase()})`,
		}));
		const config = {
			...Object.fromEntries(
				adminTypeData.map(({ type }, index) => {
					const colors = [
						"hsl(var(--chart-1))",
						"hsl(var(--chart-2))",
						"hsl(var(--chart-3))",
						"hsl(var(--chart-4))",
						"hsl(var(--chart-5))",
					];

					return [
						type.toLowerCase(),
						{ label: type, color: colors[index % colors.length] },
					];
				}),
			),
		} satisfies ChartConfig;

		return {
			id: "pie-admin-type",
			data: adminTypeData,
			config,
		};
	}, [data]);
	const [activeMonth, setActiveMonth] = useState(
		chart.data.find((admin) => admin.type === "SUPER_ADMIN")?.type ||
			chart.data[0].type,
	);
	const activeIndex = useMemo(
		() => chart.data.findIndex((item) => item.type === activeMonth),
		[chart, activeMonth],
	);
	const adminChartCategories = useMemo(
		() => chart.data.map((item) => item.type),
		[chart],
	);

	return (
		<Card
			data-chart={chart.id}
			className={cn(
				"flex flex-col bg-card motion-preset-slide-right motion-delay-75",
				className,
			)}
		>
			<ChartStyle id={chart.id} config={chart.config} />
			<CardHeader className="flex-row items-start pb-0 space-y-0">
				<div className="grid gap-1 motion-preset-focus motion-delay-100">
					<CardTitle>Admins by Role Type</CardTitle>
					<CardDescription>
						Distribution of admins by admin role type.
					</CardDescription>
				</div>
				<Select value={activeMonth} onValueChange={setActiveMonth}>
					<SelectTrigger
						className="ml-auto h-7 w-[130px] rounded-lg pl-2.5"
						aria-label="Select a value"
					>
						<SelectValue placeholder="Select month" />
					</SelectTrigger>
					<SelectContent align="end" className="rounded-xl">
						{adminChartCategories.map((key) => {
							const config =
								chart.config[key.toLowerCase() as keyof typeof chart.config];

							if (!config) {
								return null;
							}

							return (
								<SelectItem
									key={key}
									value={key}
									className="rounded-lg [&_span]:flex"
								>
									<div className="flex items-center gap-2 text-xs">
										<span
											className="flex w-3 h-3 rounded-sm shrink-0"
											style={{
												backgroundColor: `var(--color-${key.toLowerCase()})`,
											}}
										/>
										{config?.label?.replaceAll("_", " ")}
									</div>
								</SelectItem>
							);
						})}
					</SelectContent>
				</Select>
			</CardHeader>
			<CardContent className="flex justify-center flex-1 pb-0">
				<ChartContainer
					id={chart.id}
					config={chart.config}
					className="mx-auto aspect-square w-full max-w-[300px]"
				>
					<PieChart>
						<ChartTooltip
							cursor={false}
							content={<ChartTooltipContent hideLabel />}
						/>
						<Pie
							data={chart.data}
							dataKey="count"
							nameKey="type"
							innerRadius={60}
							strokeWidth={5}
							activeIndex={activeIndex}
							activeShape={({
								outerRadius = 0,
								...props
							}: PieSectorDataItem) => (
								<g>
									<Sector {...props} outerRadius={outerRadius + 10} />
									<Sector
										{...props}
										outerRadius={outerRadius + 25}
										innerRadius={outerRadius + 12}
									/>
								</g>
							)}
						>
							<LabelList
								dataKey="type"
								className="fill-background"
								stroke="none"
								fontSize={8}
								formatter={(value: keyof typeof chart.config) =>
									String(value).replaceAll("_", " ")
								}
							/>
							<Label
								content={({ viewBox }) => {
									if (viewBox && "cx" in viewBox && "cy" in viewBox) {
										return (
											<text
												x={viewBox.cx}
												y={viewBox.cy}
												textAnchor="middle"
												dominantBaseline="middle"
												className="motion-preset-focus motion-delay-500"
											>
												<tspan
													x={viewBox.cx}
													y={viewBox.cy}
													className="text-3xl font-bold fill-foreground"
												>
													{chart.data[activeIndex].count.toLocaleString()}
												</tspan>
												<tspan
													x={viewBox.cx}
													y={(viewBox.cy || 0) + 24}
													className="fill-muted-foreground"
												>
													Admin
												</tspan>
											</text>
										);
									}
								}}
							/>
						</Pie>
					</PieChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}

// therapist by employment type chart
export interface TherapistByEmploymentTypeChartProps
	extends ComponentProps<"div"> {
	data: Record<string, number>;
}
export function TherapistByEmploymentTypeChart({
	className,
	data,
}: TherapistByEmploymentTypeChartProps) {
	const chart = useMemo(() => {
		const transformedData = Object.entries(data).reduce(
			(acc, [type, count]) => {
				acc[type.toLowerCase()] = count;
				return acc;
			},
			{} as Record<string, number>,
		);
		const colors = [
			"hsl(var(--chart-1))",
			"hsl(var(--chart-2))",
			"hsl(var(--chart-3))",
			"hsl(var(--chart-4))",
			"hsl(var(--chart-5))",
		];
		const config = {
			...Object.fromEntries(
				Object.keys(transformedData).map((type) => {
					const selectedColors = colors.sort(() => 0.5 - Math.random());
					const color = selectedColors.pop() || "hsl(var(--chart-1))";
					return [type, { label: type.toUpperCase(), color }];
				}),
			),
		} satisfies ChartConfig;

		return {
			id: "radial-therapist-by-employment-type",
			data: [transformedData],
			config,
		};
	}, [data]);
	// const totalVisitors = chart.data[0]?.flat + chart.data[0]?.karpis;

	return (
		<Card
			className={cn(
				"flex flex-col bg-card motion-preset-fade motion-delay-75",
				className,
			)}
		>
			<CardHeader className="pb-0 text-center motion-preset-focus motion-delay-100">
				<CardTitle className="leading-relaxed">
					Therapists by Emp.type
				</CardTitle>
				<CardDescription>
					Distribution of therapists by employment type.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex items-center flex-1 pb-0">
				<ChartContainer
					config={chart.config}
					className="mx-auto aspect-square w-full max-w-[250px]"
				>
					<RadialBarChart
						data={chart.data}
						endAngle={180}
						innerRadius={80}
						outerRadius={130}
					>
						<ChartTooltip
							cursor={false}
							content={<ChartTooltipContent hideLabel />}
						/>
						<PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
							{/* <Label
								content={({ viewBox }) => {
									if (viewBox && "cx" in viewBox && "cy" in viewBox) {
										return (
											<text
												x={viewBox.cx}
												y={viewBox.cy}
												textAnchor="middle"
												className="motion-preset-focus motion-delay-500"
											>
												<tspan
													x={viewBox.cx}
													y={(viewBox.cy || 0) - 16}
													className="text-2xl font-bold fill-foreground"
												>
													{totalVisitors.toLocaleString()}
												</tspan>
												<tspan
													x={viewBox.cx}
													y={(viewBox.cy || 0) + 4}
													className="fill-muted-foreground"
												>
													Therapist
												</tspan>
											</text>
										);
									}
								}}
							/> */}
						</PolarRadiusAxis>
						<RadialBar
							dataKey="karpis"
							stackId="a"
							cornerRadius={5}
							fill="var(--color-karpis)"
							className="stroke-2 stroke-transparent"
						/>
						<RadialBar
							dataKey="flat"
							fill="var(--color-flat)"
							stackId="a"
							cornerRadius={5}
							className="stroke-2 stroke-transparent"
						/>
						<ChartLegend
							content={() => {
								return (
									<div className="flex items-center justify-center pt-3 -translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center motion-preset-focus motion-delay-500">
										{Object.entries(chart.config).map(([key, value]) => (
											<div
												key={key}
												className="flex items-center gap-1.5 text-muted-foreground"
											>
												<div
													className="rounded-[2px] size-2 shrink-0"
													style={{
														backgroundColor: `var(--color-${key.toLowerCase()})`,
													}}
												/>
												<span>{value.label}</span>
											</div>
										))}
									</div>
								);
							}}
							className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
						/>
					</RadialBarChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}

// therapist by gender chart
export interface TherapistByGenderChartProps extends ComponentProps<"div"> {
	data: Record<string, number>;
}
export function TherapistByGenderChart({
	className,
	data,
}: TherapistByEmploymentTypeChartProps) {
	const chart = useMemo(() => {
		const transformedData = Object.entries(data).reduce(
			(acc, [type, count]) => {
				acc[type.toLowerCase()] = count;
				return acc;
			},
			{} as Record<string, number>,
		);
		const colors = [
			"hsl(var(--chart-1))",
			"hsl(var(--chart-2))",
			"hsl(var(--chart-3))",
			"hsl(var(--chart-4))",
			"hsl(var(--chart-5))",
		];
		const config = {
			...Object.fromEntries(
				Object.keys(transformedData).map((type) => {
					const selectedColors = colors.sort(() => 0.5 - Math.random());
					const color = selectedColors.pop() || "hsl(var(--chart-1))";
					return [type, { label: type.toUpperCase(), color }];
				}),
			),
		} satisfies ChartConfig;

		return {
			id: "radial-therapist-by-gender",
			data: [transformedData],
			config,
		};
	}, [data]);
	// const totalVisitors = chart.data[0]?.female + chart.data[0]?.male;

	return (
		<Card
			className={cn(
				"flex flex-col bg-card motion-preset-fade motion-delay-75",
				className,
			)}
		>
			<CardHeader className="pb-0 text-center motion-preset-focus motion-delay-100">
				<CardTitle className="leading-relaxed">Therapists by Gender</CardTitle>
				<CardDescription>Distribution of therapists by gender.</CardDescription>
			</CardHeader>
			<CardContent className="flex items-center flex-1 pb-0">
				<ChartContainer
					config={chart.config}
					className="mx-auto aspect-square w-full max-w-[250px]"
				>
					<RadialBarChart
						data={chart.data}
						endAngle={180}
						innerRadius={80}
						outerRadius={130}
					>
						<ChartTooltip
							cursor={false}
							content={<ChartTooltipContent hideLabel />}
						/>
						<PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
							{/* <Label
								content={({ viewBox }) => {
									if (viewBox && "cx" in viewBox && "cy" in viewBox) {
										return (
											<text
												x={viewBox.cx}
												y={viewBox.cy}
												textAnchor="middle"
												className="motion-preset-focus motion-delay-500"
											>
												<tspan
													x={viewBox.cx}
													y={(viewBox.cy || 0) - 16}
													className="text-2xl font-bold fill-foreground"
												>
													{totalVisitors.toLocaleString()}
												</tspan>
												<tspan
													x={viewBox.cx}
													y={(viewBox.cy || 0) + 4}
													className="fill-muted-foreground"
												>
													Therapist
												</tspan>
											</text>
										);
									}
								}}
							/> */}
						</PolarRadiusAxis>
						<RadialBar
							dataKey="female"
							stackId="a"
							cornerRadius={5}
							fill="var(--color-female)"
							className="stroke-2 stroke-transparent"
						/>
						<RadialBar
							dataKey="male"
							fill="var(--color-male)"
							stackId="a"
							cornerRadius={5}
							className="stroke-2 stroke-transparent"
						/>
						<ChartLegend
							content={() => {
								return (
									<div className="flex items-center justify-center pt-3 -translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center motion-preset-focus motion-delay-500">
										{Object.entries(chart.config).map(([key, value]) => (
											<div
												key={key}
												className="flex items-center gap-1.5 text-muted-foreground"
											>
												<div
													className="rounded-[2px] size-2 shrink-0"
													style={{
														backgroundColor: `var(--color-${key.toLowerCase()})`,
													}}
												/>
												<span>{value.label}</span>
											</div>
										))}
									</div>
								);
							}}
							className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
						/>
					</RadialBarChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
