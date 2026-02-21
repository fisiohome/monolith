import { AnimatePresence, motion } from "framer-motion";
import { Search } from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { humanize } from "@/lib/utils";
import type { TableRowDataProps } from "@/pages/AdminPortal/Service/Index";
import PackageTable from "./package-table";

export interface ExpandSubTableProps {
	row: TableRowDataProps;
}

const ExpandSubTable = memo(function Component({ row }: ExpandSubTableProps) {
	const packages = useMemo(
		() => row.original?.packages?.list || [],
		[row.original.packages],
	);
	const totalPrices = useMemo(
		() => row.original?.packages?.totalPrices || [],
		[row.original?.packages?.totalPrices],
	);
	const locations = useMemo(
		() => row.original?.locations || [],
		[row.original?.locations],
	);
	const locationsActive = useMemo(
		() => locations.filter((l) => l.active),
		[locations],
	);
	const locationsInactive = useMemo(
		() => locations.filter((l) => !l.active),
		[locations],
	);

	// City search
	const [citySearch, setCitySearch] = useState("");
	const filteredActive = useMemo(
		() =>
			locationsActive.filter((l) =>
				l.city.toLowerCase().includes(citySearch.toLowerCase()),
			),
		[locationsActive, citySearch],
	);
	const filteredInactive = useMemo(
		() =>
			locationsInactive.filter((l) =>
				l.city.toLowerCase().includes(citySearch.toLowerCase()),
			),
		[locationsInactive, citySearch],
	);

	// Measure the packages card to dynamically set locations content max-height
	const packagesCardRef = useRef<HTMLDivElement>(null);
	const locationsHeaderRef = useRef<HTMLDivElement>(null);
	const [locationsContentMaxHeight, setLocationsContentMaxHeight] = useState<
		number | undefined
	>(undefined);

	useEffect(() => {
		const updateHeight = () => {
			if (packagesCardRef.current && locationsHeaderRef.current) {
				const packagesHeight = packagesCardRef.current.offsetHeight;
				const headerHeight = locationsHeaderRef.current.offsetHeight;
				// Subtract the header height and some padding for the card border/spacing
				const contentMaxHeight = packagesHeight - headerHeight - 24;
				if (contentMaxHeight > 0) {
					setLocationsContentMaxHeight(contentMaxHeight);
				}
			}
		};

		updateHeight();

		const observer = new ResizeObserver(updateHeight);
		if (packagesCardRef.current) {
			observer.observe(packagesCardRef.current);
		}

		return () => observer.disconnect();
	}, []);

	return (
		<div className="grid w-full grid-cols-12 gap-2 text-sm motion-preset-bounce">
			<Card ref={packagesCardRef} className="col-span-full lg:col-span-9">
				<CardHeader>
					<CardTitle>{`Our ${humanize(row.original.name)} Packages`}</CardTitle>
					<CardDescription>
						Shows active and inactive packages of the brand.
					</CardDescription>
				</CardHeader>

				<CardContent>
					<PackageTable
						packages={packages}
						totalPrices={totalPrices}
						className="rounded-lg shadow bg-background"
					/>
				</CardContent>
			</Card>

			<Card className="col-span-full lg:col-span-3">
				<CardHeader ref={locationsHeaderRef}>
					<CardTitle>Locations</CardTitle>
					<CardDescription>
						Active and inactive locations for this brand.
					</CardDescription>

					<div className="flex items-center h-5 space-x-2 text-sm text-muted-foreground mt-2">
						<div className="flex items-baseline space-x-1">
							<div className="bg-green-700 rounded-full size-2" />
							<span>{`${locationsActive.length} Active`}</span>
						</div>
						<Separator
							orientation="vertical"
							className="bg-muted-foreground/25"
						/>
						<div className="flex items-baseline space-x-1">
							<div className="rounded-full bg-destructive size-2" />
							<span>{`${locationsInactive.length} Inactive`}</span>
						</div>
						<Separator
							orientation="vertical"
							className="bg-muted-foreground/25"
						/>
						<span>{`${locations.length} Total`}</span>
					</div>
				</CardHeader>

				<CardContent
					className="space-y-3 overflow-y-auto max-h-52"
					style={
						locationsContentMaxHeight
							? { maxHeight: locationsContentMaxHeight }
							: undefined
					}
				>
					{locations.length ? (
						<>
							<div className="sticky top-0 z-10 bg-card pb-2">
								<Input
									placeholder="Search city..."
									className="text-xs shadow-inner bg-input"
									StartIcon={{ icon: Search }}
									value={citySearch}
									onChange={(e) => setCitySearch(e.target.value)}
								/>
							</div>

							{filteredActive.length > 0 && (
								<div className="space-y-1">
									<p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
										Active
									</p>
									<AnimatePresence>
										{filteredActive.map((location) => (
											<motion.div
												key={location.id}
												initial={{ opacity: 0, y: -10 }}
												animate={{ opacity: 1, y: 0 }}
												exit={{ opacity: 0, y: 10 }}
												transition={{ duration: 0.15 }}
												className="flex items-center px-2 py-1 space-x-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground"
											>
												<div className="rounded-full size-2 shrink-0 bg-green-700" />
												<span>{location.city}</span>
											</motion.div>
										))}
									</AnimatePresence>
								</div>
							)}

							{filteredInactive.length > 0 && (
								<>
									<Separator />

									<div className="space-y-1">
										<p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
											Inactive
										</p>
										<AnimatePresence>
											{filteredInactive.map((location) => (
												<motion.div
													key={location.id}
													initial={{ opacity: 0, y: -10 }}
													animate={{ opacity: 1, y: 0 }}
													exit={{ opacity: 0, y: 10 }}
													transition={{ duration: 0.15 }}
													className="flex items-center px-2 py-1 space-x-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground"
												>
													<div className="rounded-full size-2 shrink-0 bg-destructive" />
													<span>{location.city}</span>
												</motion.div>
											))}
										</AnimatePresence>
									</div>
								</>
							)}
						</>
					) : (
						<p className="text-sm text-muted-foreground">
							No locations listed yet.
						</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
});

export default ExpandSubTable;
