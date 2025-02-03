import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import { cn, debounce, populateQueryParams } from "@/lib/utils";
import type { TableToolbarDataProps } from "@/pages/AdminPortal/Therapist/Index";
import type { GlobalPageProps } from "@/types/globals";
import { router, usePage } from "@inertiajs/react";
import { Dot, Search } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

export interface ToolbarTableProps {
	table: TableToolbarDataProps;
}

export default function ToolbarTable({ table: _ }: ToolbarTableProps) {
	const { url: pageURL, props: globalProps } = usePage<GlobalPageProps>();
	const accountStatuses = useMemo(() => {
		return [
			{
				value: "ACTIVE",
				label: "Active",
				color: "text-emerald-600",
			},
			{
				value: "INACTIVE",
				label: "Inactive",
				color: "text-destructive",
			},
		];
	}, []);

	const [filterBy, setFilterBy] = useState({
		name: globalProps?.adminPortal?.currentQuery?.name || "",
		accountStatus: globalProps?.adminPortal?.currentQuery?.accountStatus || "",
	});
	const updateQueryParams = useCallback(
		debounce((value) => {
			const { fullUrl, queryParams } = populateQueryParams(pageURL, {
				...value,
			});

			router.get(
				fullUrl,
				{ ...queryParams },
				{ preserveState: true, only: ["therapists"] },
			);
		}, 500),
		[],
	);
	const handleFilterBy = ({
		value,
		type,
	}: { value: string; type: keyof typeof filterBy }) => {
		setFilterBy({ ...filterBy, [type]: value });
		updateQueryParams(deepTransformKeysToSnakeCase({ [type]: value }));
	};

	return (
		<section className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-2 lg:grid-cols-4 xl:grid-cols-5">
			<div className="col-span-full md:col-span-1">
				<Input
					value={filterBy.name}
					StartIcon={{ icon: Search }}
					type="text"
					placeholder="Filter by therapist name..."
					onChange={(event) => {
						event.preventDefault();
						handleFilterBy({ type: "name", value: event.target.value });
					}}
				/>
			</div>

			<div className="col-span-full md:col-span-1">
				<Select
					value={filterBy.accountStatus || ""}
					onValueChange={(value) => {
						handleFilterBy({ type: "accountStatus", value });
					}}
				>
					<SelectTrigger
						className={cn(
							"",
							!filterBy.accountStatus ? "text-muted-foreground" : "",
						)}
					>
						<SelectValue placeholder="Filter by account status..." />
					</SelectTrigger>

					<SelectContent>
						{accountStatuses?.length ? (
							<>
								{accountStatuses.map((status) => (
									<SelectItem key={status.value} value={status.value}>
										<span className="flex items-center gap-2">
											<Dot
												className={status.color}
												width={10}
												height={10}
												strokeWidth={20}
											/>
											<span className="truncate">{status.label}</span>
										</span>
									</SelectItem>
								))}
								{filterBy.accountStatus && (
									<>
										<SelectSeparator />
										<Button
											className="w-full px-2"
											variant="ghost"
											size="sm"
											onClick={(e) => {
												e.stopPropagation();
												handleFilterBy({ type: "accountStatus", value: "" });
											}}
										>
											Clear
										</Button>
									</>
								)}
							</>
						) : (
							<SelectItem value="no items" disabled>
								No account status found.
							</SelectItem>
						)}
					</SelectContent>
				</Select>
			</div>
		</section>
	);
}
