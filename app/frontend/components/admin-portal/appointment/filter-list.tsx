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
import type { AppointmentIndexGlobalPageProps } from "@/pages/AdminPortal/Appointment/Index";
import { Deferred, router, usePage } from "@inertiajs/react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { Fragment, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import DotBadgeWithLabel from "@/components/shared/dot-badge";

export default function FilterList() {
	const { url: pageURL, props: globalProps } =
		usePage<AppointmentIndexGlobalPageProps>();
	const { t } = useTranslation("appointments");
	const { t: taf } = useTranslation("appointments", { keyPrefix: "filter" });

	const [isSearching, setIsSearching] = useState(false);
	const [filterBy, setFilterBy] = useState({
		status: globalProps?.adminPortal?.currentQuery?.status || "",
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

			// Only send the changed field, updateQueryParams will merge and clean status if needed
			updateQueryParams(
				deepTransformKeysToSnakeCase({ [type]: value }),
				pageURL,
			);
		},
		[filterBy, pageURL, updateQueryParams],
	);

	// filter by option items
	const locations = useMemo(
		() => globalProps?.filterOptionsData?.locations || [],
		[globalProps?.filterOptionsData?.locations],
	);
	const groupedLocations = useMemo(
		() => groupLocationsByCountry(locations),
		[locations],
	);

	// for filtering by statuses
	const apptStatuses = useMemo(() => {
		return [
			{
				label: t("tab.title.upcoming"),
				value: "upcoming",
				color: "success" as const,
			},
			{
				label: t("tab.title.pending_payment"),
				value: "pending_payment",
				color: "warning" as const,
			},
			{
				label: t("tab.title.pending_patient_approval"),
				value: "pending_patient_approval",
				color: "warning" as const,
			},
			{
				label: t("tab.title.pending_therapist"),
				value: "pending_therapist",
				color: "warning" as const,
			},
			{
				label: t("tab.title.unschedule"),
				value: "unschedule",
				color: "outline" as const,
			},
			{
				label: t("tab.title.past"),
				value: "past",
				color: "success" as const,
			},
			{
				label: t("tab.title.cancelled"),
				value: "cancel",
				color: "destructive" as const,
			},
		];
	}, [t]);
	const selectedStatus = useMemo(() => {
		return apptStatuses?.find((s) => s.value === filterBy?.status);
	}, [apptStatuses, filterBy?.status]);

	return (
		<section className="grid grid-cols-1 gap-4 mt-6 md:grid-cols-3 md:gap-2 lg:grid-cols-4 xl:grid-cols-5">
			<div className="col-span-full md:col-span-1">
				<Popover>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							className={cn(
								"relative w-full flex justify-between font-normal",
								!filterBy?.status && "text-muted-foreground",
							)}
						>
							<span className="truncate">
								{selectedStatus ? (
									<DotBadgeWithLabel
										className="relative flex-shrink-0 text-left"
										variant={selectedStatus.color}
									>
										<span
											title={selectedStatus.label}
											className="flex-grow-0 text-xs tracking-wide uppercase text-nowrap"
										>
											{selectedStatus.label}
										</span>
									</DotBadgeWithLabel>
								) : (
									<span>{`${taf("status.placeholder")}...`}</span>
								)}
							</span>

							<ChevronsUpDown className="flex-shrink-0 opacity-50" />
						</Button>
					</PopoverTrigger>
					<PopoverContent className="p-0 w-[300px]" align="start" side="bottom">
						<Command>
							<CommandInput
								placeholder={`${taf("status.search.placeholder")}...`}
								className="h-9"
							/>
							<CommandList>
								<CommandEmpty>{taf("status.search.empty")}</CommandEmpty>
								<CommandGroup>
									{apptStatuses?.length ? (
										apptStatuses?.map((s) => (
											<CommandItem
												key={s.value}
												value={s.value}
												onSelect={() =>
													handleFilterBy({ type: "status", value: s.value })
												}
											>
												<DotBadgeWithLabel
													className="relative flex-shrink-0 text-left"
													variant={s.color}
												>
													<span
														title={s.label}
														className="flex-grow-0 text-xs tracking-wide uppercase text-nowrap"
													>
														{s.label}
													</span>
												</DotBadgeWithLabel>

												<Check
													className={cn(
														"ml-auto",
														s.value === filterBy?.status
															? "opacity-100"
															: "opacity-0",
													)}
												/>
											</CommandItem>
										))
									) : (
										<CommandItem value="" disabled>
											<span>{taf("status.search.empty")}</span>
										</CommandItem>
									)}
								</CommandGroup>
							</CommandList>

							<CommandList>
								<CommandGroup>
									<CommandSeparator className="mb-2" />
									<CommandItem
										onSelect={() => {
											handleFilterBy({ type: "status", value: "" });
										}}
									>
										<span className="mx-auto font-medium text-center uppercase w-fit">
											{taf("status.search.clear")}
										</span>
									</CommandItem>
								</CommandGroup>
							</CommandList>
						</Command>
					</PopoverContent>
				</Popover>
			</div>

			<div className="col-span-full md:col-span-1">
				<Input
					type="text"
					placeholder={`${taf("therapist_name.placeholder")}...`}
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
					placeholder={`${taf("patient_name.placeholder")}...`}
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
					placeholder={`${taf("reg_number.placeholder")}...`}
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
										: `${taf("region.placeholder")}...`}
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
									placeholder={`${taf("region.search.placeholder")}...`}
									className="h-9"
									autoComplete="address-level2"
								/>
								<CommandList>
									<CommandEmpty>{taf("region.search.empty")}</CommandEmpty>
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
												{taf("region.search.clear")}
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
