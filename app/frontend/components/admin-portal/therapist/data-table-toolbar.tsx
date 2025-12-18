import { Deferred, router, usePage } from "@inertiajs/react";
import { Check, ChevronsUpDown, Dot, Search } from "lucide-react";
import { Fragment, useCallback, useMemo, useState } from "react";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import { groupLocationsByCountry } from "@/lib/locations";
import { cn, debounce, populateQueryParams } from "@/lib/utils";
import type {
	TableToolbarDataProps,
	TherapistIndexGlobalPageProps,
} from "@/pages/AdminPortal/Therapist/Index";

export interface ToolbarTableProps {
	table: TableToolbarDataProps;
}

export default function ToolbarTable({ table: _ }: ToolbarTableProps) {
	const { url: pageURL, props: globalProps } =
		usePage<TherapistIndexGlobalPageProps>();
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
	const employmentStatuses = useMemo(
		() => globalProps?.filterOptions?.employmentStatuses || [],
		[globalProps?.filterOptions?.employmentStatuses],
	);
	const employmentTypes = useMemo(
		() => globalProps?.filterOptions?.employmentTypes || [],
		[globalProps?.filterOptions?.employmentTypes],
	);
	const locations = useMemo(
		() => globalProps?.filterOptions?.locations,
		[globalProps?.filterOptions?.locations],
	);
	const groupedLocations = useMemo(
		() => groupLocationsByCountry(globalProps?.filterOptions?.locations || []),
		[globalProps?.filterOptions?.locations],
	);

	const [filterBy, setFilterBy] = useState({
		name: globalProps?.adminPortal?.currentQuery?.name || "",
		accountStatus: globalProps?.adminPortal?.currentQuery?.accountStatus || "",
		employmentStatus:
			globalProps?.adminPortal?.currentQuery?.employmentStatus || "",
		employmentType:
			globalProps?.adminPortal?.currentQuery?.employmentType || "",
		city: globalProps?.adminPortal?.currentQuery?.city || "",
	});
	const updateQueryParams = useCallback(
		debounce((value) => {
			const { fullUrl } = populateQueryParams(pageURL, { ...value });

			router.get(
				fullUrl,
				{},
				{ preserveState: true, only: ["therapists", "adminPortal"] },
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
		updateQueryParams(
			deepTransformKeysToSnakeCase({ ...filterBy, [type]: value }),
		);
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
											className="w-full px-2 font-medium uppercase"
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

			<Deferred
				data={["filterOptions"]}
				fallback={
					<Skeleton className="w-full rounded-md col-span-full md:col-span-1 h-9" />
				}
			>
				<div className="col-span-full md:col-span-1">
					<Select
						value={filterBy.employmentStatus || ""}
						onValueChange={(value) => {
							handleFilterBy({ type: "employmentStatus", value });
						}}
					>
						<SelectTrigger
							className={cn(
								"",
								!filterBy.employmentStatus ? "text-muted-foreground" : "",
							)}
						>
							<SelectValue placeholder="Filter by employment status..." />
						</SelectTrigger>

						<SelectContent>
							{employmentStatuses?.length ? (
								<>
									{employmentStatuses.map((status) => (
										<SelectItem key={status} value={status}>
											<span>{status}</span>
										</SelectItem>
									))}
									{filterBy.employmentStatus && (
										<>
											<SelectSeparator />
											<Button
												className="w-full px-2 font-medium uppercase"
												variant="ghost"
												size="sm"
												onClick={(e) => {
													e.stopPropagation();
													handleFilterBy({
														type: "employmentStatus",
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
								<SelectItem value="no items" disabled>
									No employment status found.
								</SelectItem>
							)}
						</SelectContent>
					</Select>
				</div>
			</Deferred>

			<Deferred
				data={["filterOptions"]}
				fallback={
					<Skeleton className="w-full rounded-md col-span-full md:col-span-1 h-9" />
				}
			>
				<div className="col-span-full md:col-span-1">
					<Select
						value={filterBy.employmentType || ""}
						onValueChange={(value) => {
							handleFilterBy({ type: "employmentType", value });
						}}
					>
						<SelectTrigger
							className={cn(
								"",
								!filterBy.employmentType ? "text-muted-foreground" : "",
							)}
						>
							<SelectValue placeholder="Filter by employment type..." />
						</SelectTrigger>

						<SelectContent>
							{employmentTypes?.length ? (
								<>
									{employmentTypes.map((type) => (
										<SelectItem key={type} value={type}>
											<span>{type}</span>
										</SelectItem>
									))}
									{filterBy.employmentType && (
										<>
											<SelectSeparator />
											<Button
												className="w-full px-2 font-medium uppercase"
												variant="ghost"
												size="sm"
												onClick={(e) => {
													e.stopPropagation();
													handleFilterBy({ type: "employmentType", value: "" });
												}}
											>
												Clear
											</Button>
										</>
									)}
								</>
							) : (
								<SelectItem value="no items" disabled>
									No employment type found.
								</SelectItem>
							)}
						</SelectContent>
					</Select>
				</div>
			</Deferred>

			<Deferred
				data={["filterOptions"]}
				fallback={
					<Skeleton className="w-full rounded-md col-span-full md:col-span-1 h-9" />
				}
			>
				<div className="col-span-full md:col-span-1">
					<Popover>
						<PopoverTrigger asChild>
							<Button
								variant="outline"
								className={cn(
									"relative w-full flex justify-between font-normal",
									!filterBy?.city && "text-muted-foreground",
								)}
							>
								<p className="truncate">
									{filterBy?.city
										? locations?.find(
												(location) => location.city === filterBy?.city,
											)?.city
										: "Filter by region..."}
								</p>
								<ChevronsUpDown className="opacity-50" />
							</Button>
						</PopoverTrigger>
						<PopoverContent
							className="p-0 w-[300px]"
							align="start"
							side="bottom"
						>
							<Command>
								<CommandInput
									placeholder="Search region..."
									className="h-9"
									autoComplete="address-level2"
								/>
								<CommandList>
									<CommandEmpty>No region found.</CommandEmpty>
									{groupedLocations?.map((location) => (
										<Fragment key={location.country}>
											<span className="block px-2 py-2 text-xs font-bold text-primary-foreground bg-primary">
												{location.country}
											</span>

											{location.states.map((state, stateIndex) => (
												<CommandGroup key={state.name} heading={state.name}>
													{state.cities.map((city) => (
														<CommandItem
															key={city.name}
															value={city.name}
															onSelect={() =>
																handleFilterBy({
																	type: "city",
																	value: city.name,
																})
															}
														>
															<span>{city.name}</span>
															<Check
																className={cn(
																	"ml-auto",
																	city.name === filterBy?.city
																		? "opacity-100"
																		: "opacity-0",
																)}
															/>
														</CommandItem>
													))}
													{location.states.length !== stateIndex + 1 && (
														<CommandSeparator className="mt-2" />
													)}
												</CommandGroup>
											))}
										</Fragment>
									))}
								</CommandList>

								<CommandList>
									<CommandGroup>
										<CommandSeparator className="mb-2" />
										<CommandItem
											onSelect={() => {
												handleFilterBy({ type: "city", value: "" });
											}}
										>
											<span className="mx-auto font-medium text-center uppercase w-fit">
												Clear
											</span>
										</CommandItem>
									</CommandGroup>
								</CommandList>
							</Command>
						</PopoverContent>
					</Popover>
				</div>
			</Deferred>
		</section>
	);
}
