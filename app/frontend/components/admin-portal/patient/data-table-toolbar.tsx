import { Deferred, router, usePage } from "@inertiajs/react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { Fragment, memo, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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
import { Skeleton } from "@/components/ui/skeleton";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import { groupLocationsByCountry } from "@/lib/locations";
import { cn, debounce, populateQueryParams } from "@/lib/utils";
import type {
	PatientIndexGlobalPageProps,
	TableToolbarDataProps,
} from "@/pages/AdminPortal/Patient/Index";

export interface ToolbarTableProps {
	table: TableToolbarDataProps;
}
const ToolbarTable = memo(function Component({ table: _ }: ToolbarTableProps) {
	const { t: tpf } = useTranslation("patients", { keyPrefix: "filter" });
	const { url: pageURL, props: globalProps } =
		usePage<PatientIndexGlobalPageProps>();
	const locations = useMemo(
		() => globalProps?.filterOptions?.locations,
		[globalProps?.filterOptions?.locations],
	);
	const groupedLocations = useMemo(
		() => groupLocationsByCountry(globalProps?.filterOptions?.locations || []),
		[globalProps?.filterOptions?.locations],
	);
	const [isSearching, setIsSearching] = useState(false);
	const [search, setSearch] = useState(() => {
		const currentQuery = globalProps?.adminPortal?.currentQuery;
		const text = currentQuery?.text || "";
		const city = currentQuery?.city || "";

		return { text, city };
	});
	const updateQueryParams = useCallback(
		debounce((url) => {
			router.get(
				url,
				{},
				{
					preserveState: true,
					only: ["adminPortal", "flash", "errors", "patients"],
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
		}, 250),
		[],
	);
	const handleFilterBy = useCallback(
		({ value, type }: { value: string; type: keyof typeof search }) => {
			const nextFilters = { ...search, [type]: value };
			setSearch(nextFilters);

			// Only send the changed field, updateQueryParams will merge and clean status if needed
			const { fullUrl } = populateQueryParams(
				pageURL,
				deepTransformKeysToSnakeCase({
					...nextFilters,
					// null value means reset the another param value
					page: null,
					limit: null,
				}),
			);
			updateQueryParams(fullUrl);
		},
		[search, pageURL, updateQueryParams],
	);

	return (
		<section className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-2 lg:grid-cols-3 xl:grid-cols-5">
			<div className="grid gap-2">
				<Input
					placeholder={tpf("search.placeholder")}
					className="shadow-inner bg-input"
					value={search.text}
					isLoading={isSearching}
					StartIcon={{ icon: Search }}
					EndIcon={
						search.text
							? {
									isButton: true,
									icon: X,
									handleOnClick: (event) => {
										event.preventDefault();

										handleFilterBy({ type: "text", value: "" });
									},
								}
							: undefined
					}
					onChange={(event) => {
						const value = event.target.value;

						handleFilterBy({ type: "text", value });
					}}
				/>
				<p className="text-[0.8rem] text-pretty text-muted-foreground">
					{tpf("search.description")}
				</p>
			</div>

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
									"relative w-full flex justify-between font-normal !px-3 bg-input shadow-inner",
									!search?.city && "text-muted-foreground",
								)}
							>
								<p className="truncate">
									{search?.city
										? locations?.find(
												(location) => location.city === search?.city,
											)?.city
										: `${tpf("region.placeholder")}...`}
								</p>
								<ChevronsUpDown className="flex-shrink-0 text-muted-foreground/50" />
							</Button>
						</PopoverTrigger>
						<PopoverContent className="p-0 w-fit" align="start" side="bottom">
							<Command>
								<CommandInput
									placeholder={`${tpf("region.search.placeholder")}...`}
									className="h-9"
									autoComplete="address-level2"
								/>
								<CommandList>
									<CommandEmpty>{tpf("region.search.empty")}</CommandEmpty>
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
																	city.name === search?.city
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
												{tpf("region.search.clear")}
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
});
export default ToolbarTable;
