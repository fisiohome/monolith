import { Fragment, useCallback, useMemo, useState } from "react";
import { Deferred, router, usePage } from "@inertiajs/react";
import { Input } from "@/components/ui/input";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import type { AppointmentIndexGlobalPageProps } from "@/pages/AdminPortal/Appointment/Index";
import { cn, debounce, populateQueryParams } from "@/lib/utils";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import { groupLocationsByCountry } from "@/lib/locations";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function FilterList() {
	const { url: pageURL, props: globalProps } =
		usePage<AppointmentIndexGlobalPageProps>();
	const locations = useMemo(
		() => globalProps?.filterOptionsData?.locations || [],
		[globalProps?.filterOptionsData?.locations],
	);
	const groupedLocations = useMemo(
		() => groupLocationsByCountry(locations),
		[locations],
	);

	const [isSearching, setIsSearching] = useState(false);
	const [filterBy, setFilterBy] = useState({
		patient: globalProps?.adminPortal?.currentQuery?.patient || "",
		therapist: globalProps?.adminPortal?.currentQuery?.therapist || "",
		registrationNumber:
			globalProps?.adminPortal?.currentQuery?.registrationNumber || "",
		city: globalProps?.adminPortal?.currentQuery?.city || "",
	});
	const updateQueryParams = useCallback(
		debounce((value, baseURL) => {
			const { fullUrl, queryParams } = populateQueryParams(baseURL, {
				...value,
			});

			router.get(
				fullUrl,
				{ ...queryParams },
				{
					preserveState: true,
					only: ["adminPortal", "flash", "errors", "appointments"],
					onStart: () => {
						setIsSearching(true);
					},
					onFinish: () => {
						setTimeout(() => {
							setIsSearching(false);
						}, 250);
					},
				},
			);
		}, 500),
		[],
	);
	const handleFilterBy = useCallback(
		({ value, type }: { value: string; type: keyof typeof filterBy }) => {
			setFilterBy({ ...filterBy, [type]: value });
			updateQueryParams(
				deepTransformKeysToSnakeCase({ [type]: value }),
				pageURL,
			);
		},
		[filterBy, pageURL, updateQueryParams],
	);

	return (
		<section className="grid grid-cols-1 gap-4 mt-6 md:grid-cols-3 md:gap-2 lg:grid-cols-4 xl:grid-cols-5">
			<div className="col-span-full md:col-span-1">
				<Input
					type="text"
					placeholder="Filter by therapist name..."
					value={filterBy.therapist}
					StartIcon={{ icon: Search }}
					isLoading={isSearching}
					EndIcon={
						filterBy.therapist
							? {
									icon: X,
									isButton: true,
									handleOnClick: () => {
										handleFilterBy({ type: "therapist", value: "" });
									},
								}
							: undefined
					}
					onChange={(event) => {
						event.preventDefault();
						handleFilterBy({ type: "therapist", value: event.target.value });
					}}
				/>
			</div>

			<div className="col-span-full md:col-span-1">
				<Input
					type="text"
					placeholder="Filter by patient name..."
					value={filterBy.patient}
					StartIcon={{ icon: Search }}
					isLoading={isSearching}
					EndIcon={
						filterBy.patient
							? {
									icon: X,
									isButton: true,
									handleOnClick: () => {
										handleFilterBy({ type: "patient", value: "" });
									},
								}
							: undefined
					}
					onChange={(event) => {
						event.preventDefault();
						handleFilterBy({ type: "patient", value: event.target.value });
					}}
				/>
			</div>

			<div className="col-span-full md:col-span-1">
				<Input
					type="text"
					placeholder="Filter by reg number..."
					value={filterBy.registrationNumber}
					StartIcon={{ icon: Search }}
					isLoading={isSearching}
					EndIcon={
						filterBy.registrationNumber
							? {
									icon: X,
									isButton: true,
									handleOnClick: () => {
										handleFilterBy({ type: "registrationNumber", value: "" });
									},
								}
							: undefined
					}
					onChange={(event) => {
						event.preventDefault();
						handleFilterBy({
							type: "registrationNumber",
							value: event.target.value,
						});
					}}
				/>
			</div>

			<Deferred
				data={["filterOptionsData"]}
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
										<CommandSeparator className="my-2" />
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
