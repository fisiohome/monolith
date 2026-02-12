import { router, usePage } from "@inertiajs/react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import { cn, debounce, humanize, populateQueryParams } from "@/lib/utils";
import type { TableToolbarDataProps } from "@/pages/AdminPortal/Admin/Index";
import type { AdminTypes } from "@/types/admin-portal/admin";
import type { GlobalPageProps } from "@/types/globals";

export interface ToolbarTableProps {
	table: TableToolbarDataProps;
	adminTypeList: AdminTypes;
}

export default function ToolbarTable({
	table: _,
	adminTypeList,
}: ToolbarTableProps) {
	const { url: pageURL, props: globalProps } = usePage<GlobalPageProps>();

	const [filterBy, setFilterBy] = useState({
		email: globalProps?.adminPortal?.currentQuery?.email || "",
		name: globalProps?.adminPortal?.currentQuery?.name || "",
		adminType: globalProps?.adminPortal?.currentQuery?.adminType || "",
	});
	const updateQueryParams = useCallback(
		debounce((value) => {
			const { fullUrl, queryParams } = populateQueryParams(pageURL, {
				...value,
			});

			router.get(
				fullUrl,
				{ ...queryParams },
				{ preserveState: true, only: ["admins"] },
			);
		}, 500),
		[],
	);
	const handleFilterBy = ({
		value,
		type,
	}: {
		value: string;
		type: keyof typeof filterBy;
	}) => {
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
					placeholder="Filter by admin name..."
					onChange={(event) => {
						event.preventDefault();
						handleFilterBy({ type: "name", value: event.target.value });
					}}
				/>
			</div>

			<div className="col-span-full md:col-span-1">
				<Input
					value={filterBy.email}
					StartIcon={{ icon: Search }}
					type="text"
					placeholder="Filter by email..."
					onChange={(event) => {
						event.preventDefault();
						handleFilterBy({ type: "email", value: event.target.value });
					}}
				/>
			</div>

			<div className="col-span-full md:col-span-1">
				<Popover>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							className={cn(
								"w-full flex justify-between text-muted-foreground !font-normal !mt-0 px-3",
								!filterBy.adminType && "text-muted-foreground",
							)}
						>
							{filterBy.adminType
								? humanize(
										adminTypeList.find((type) => type === filterBy.adminType) ||
											"",
									)?.toUpperCase()
								: "Filter by admin type..."}
							<ChevronsUpDown className="opacity-50" />
						</Button>
					</PopoverTrigger>
					<PopoverContent align="start" className="w-full md:w-[200px] p-0">
						<Command>
							<CommandInput placeholder="Search admin type..." />
							<CommandList>
								<CommandEmpty>No admin type found.</CommandEmpty>
								<CommandGroup>
									{adminTypeList?.length ? (
										<>
											{adminTypeList.map((type) => (
												<CommandItem
													value={type}
													key={type}
													onSelect={() => {
														handleFilterBy({ value: type, type: "adminType" });
													}}
												>
													{humanize(type).toUpperCase()}
													<Check
														className={cn(
															"ml-auto",
															type === filterBy.adminType
																? "opacity-100"
																: "opacity-0",
														)}
													/>
												</CommandItem>
											))}
											{filterBy.adminType && (
												<>
													<CommandSeparator className="mb-2" />
													<Button
														className="w-full px-2"
														variant="ghost"
														size="sm"
														onClick={() => {
															handleFilterBy({
																type: "adminType",
																value: "",
															});
														}}
													>
														Clear
													</Button>
												</>
											)}
										</>
									) : (
										<CommandItem disabled>No admin type found.</CommandItem>
									)}
								</CommandGroup>
							</CommandList>
						</Command>
					</PopoverContent>
				</Popover>
			</div>
		</section>
	);
}
