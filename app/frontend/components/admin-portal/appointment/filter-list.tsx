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
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
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
import { Check, ChevronsUpDown, Search, User, Users, X } from "lucide-react";
import {
	type ComponentProps,
	Fragment,
	useCallback,
	useMemo,
	useState,
} from "react";
import { useTranslation } from "react-i18next";
import DotBadgeWithLabel from "@/components/shared/dot-badge";
import MultiSelectBadges, {
	type MultiSelectBadgesProps,
} from "@/components/shared/multi-select-badge";

export interface FilterListProps extends ComponentProps<"section"> {
	isShow: boolean;
	onToggleShow: () => void;
}

export default function FilterList({
	className,
	onToggleShow,
}: FilterListProps) {
	const { url: pageURL, props: globalProps } =
		usePage<AppointmentIndexGlobalPageProps>();
	const { t } = useTranslation("appointments");
	const { t: taf } = useTranslation("appointments", { keyPrefix: "filter" });

	const [isSearching, setIsSearching] = useState(false);
	const [filterBy, setFilterBy] = useState(() => {
		const currentQuery = globalProps?.adminPortal?.currentQuery;

		return {
			status: currentQuery?.status || "",
			patient: currentQuery?.patient || "",
			therapist: currentQuery?.therapist || "",
			registrationNumber: currentQuery?.registrationNumber || "",
			city: currentQuery?.city || "",
			assignedTo: currentQuery?.assignedTo || "",
			serviceIds: currentQuery?.serviceIds || "",
			packageIds: currentQuery?.packageIds || "",
			patientGenders: currentQuery?.patientGenders || "",
		};
	});
	const updateQueryParams = useCallback(
		debounce((url) => {
			router.get(
				url,
				{},
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
			const nextFilters = { ...filterBy, [type]: value };
			setFilterBy(nextFilters);

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
		[filterBy, pageURL, updateQueryParams],
	);
	const onResetAll = useCallback(() => {
		const resetFilters = {
			status: "",
			patient: "",
			therapist: "",
			registrationNumber: "",
			city: "",
			assignedTo: "",
			serviceIds: "",
			packageIds: "",
			patientGenders: "",
		};
		setFilterBy(resetFilters);

		const { fullUrl } = populateQueryParams(
			pageURL,
			deepTransformKeysToSnakeCase({
				...resetFilters,
				// null value means reset the another param value
				page: null,
				limit: null,
			}),
		);
		updateQueryParams(fullUrl);
	}, [pageURL, updateQueryParams]);

	// * filter by option items
	const locations = useMemo(
		() => globalProps?.filterOptionsData?.locations || [],
		[globalProps?.filterOptionsData?.locations],
	);
	const groupedLocations = useMemo(
		() => groupLocationsByCountry(locations),
		[locations],
	);
	const assignedToList = useMemo(() => {
		return [
			{
				value: "me",
				label: taf("assigned_to.items.me").toUpperCase(),
				icon: (
					<User className="flex-shrink-0 text-muted-foreground/75 size-4" />
				),
			},
			{
				value: "anyone",
				label: taf("assigned_to.items.anyone").toUpperCase(),
				icon: (
					<Users className="flex-shrink-0 text-muted-foreground/75 size-4" />
				),
			},
		];
	}, [taf]);

	// * for filtering by patient genders
	// Memoized list of all available patient genders from global props
	const availableGenders = useMemo(
		() => globalProps?.filterOptionsData?.patientGenders || [],
		[globalProps?.filterOptionsData?.patientGenders],
	);
	// Extract selected genders as objects with value/label for the UI
	const selectedGenderOptions = useMemo(() => {
		const selectedValues = filterBy.patientGenders.split(",");
		return availableGenders
			.filter((gender) => selectedValues.includes(gender))
			.map((gender) => ({
				value: gender,
				label: gender,
			}));
	}, [availableGenders, filterBy.patientGenders]);
	// Raw selected genders as an array of strings
	const selectedGenderValues = useMemo(
		() => filterBy?.patientGenders?.split(",").map((g) => g.trim()),
		[filterBy.patientGenders],
	);
	// Handler to remove a gender badge from selection
	const handleRemoveGenderBadge = useCallback(
		(items: MultiSelectBadgesProps["items"]) => {
			const updatedValues = items.map((item) => item.value).join(",");
			handleFilterBy({
				type: "patientGenders",
				value: updatedValues,
			});
		},
		[handleFilterBy],
	);
	// Handler to select/unselect a gender
	const handleToggleGenderSelection = useCallback(
		(gender: string) => {
			const currentSelection = selectedGenderValues ?? [];
			const isSelected = currentSelection.includes(gender);

			const updatedSelection = isSelected
				? currentSelection.filter((g) => g !== gender)
				: [...currentSelection, gender];

			handleFilterBy({
				type: "patientGenders",
				value: updatedSelection.filter(Boolean).join(","),
			});
		},
		[selectedGenderValues, handleFilterBy],
	);

	// * for filtering by services
	// Memoized list of available services with formatted labels
	const availableServices = useMemo(
		() =>
			globalProps?.filterOptionsData?.services?.map((service) => ({
				...service,
				label: service.name.replaceAll("_", " "),
			})) || [],
		[globalProps?.filterOptionsData?.services],
	);
	// Selected services as full objects (for UI badges)
	const selectedServiceOptions = useMemo(
		() =>
			availableServices
				.filter((service) => filterBy.serviceIds.includes(String(service.id)))
				.map((service) => ({ ...service, label: service.label })),
		[availableServices, filterBy.serviceIds],
	);
	// Raw selected service IDs as an array of strings
	const selectedServiceIds = useMemo(
		() => filterBy?.serviceIds?.split(",").map((id) => id.trim()),
		[filterBy.serviceIds],
	);
	// Handler to remove a service badge
	const handleRemoveServiceBadge = useCallback(
		(items: MultiSelectBadgesProps["items"]) => {
			const updatedIds = items.map((item) => String(item.id)).join(",");
			handleFilterBy({
				type: "serviceIds",
				value: updatedIds,
			});
		},
		[handleFilterBy],
	);
	// Handler to toggle service selection
	const handleToggleServiceSelection = useCallback(
		(id: string) => {
			const currentSelection = selectedServiceIds ?? [];
			const isSelected = currentSelection.includes(id);

			const updatedSelection = isSelected
				? currentSelection.filter((sid) => sid !== id)
				: [...currentSelection, id];

			handleFilterBy({
				type: "serviceIds",
				value: updatedSelection.filter(Boolean).join(","),
			});
		},
		[selectedServiceIds, handleFilterBy],
	);

	// *for filtering by packages
	// * Flat list of all available packages across all services
	const availablePackages = useMemo(() => {
		return (
			globalProps?.filterOptionsData?.services
				?.flatMap((service) =>
					(service.packages || []).map((pkg) => ({
						...pkg,
						label: pkg.name,
						serviceName: service.name,
					})),
				)
				?.filter(Boolean) || []
		);
	}, [globalProps?.filterOptionsData?.services]);

	// * Grouped package list, organized by service name
	const groupedPackageOptions = useMemo(
		() =>
			availableServices?.map((service) => ({
				header: service.name.replaceAll("_", " "),
				packages: service.packages || [],
			})),
		[availableServices],
	);

	// * Raw selected package IDs as an array
	const selectedPackageIds = useMemo(
		() =>
			filterBy?.packageIds
				? filterBy.packageIds.split(",").map((id) => id.trim())
				: [],
		[filterBy.packageIds],
	);

	// * Selected packages (for UI badges)
	const selectedPackageOptions = useMemo(() => {
		return availablePackages.filter((pkg) =>
			selectedPackageIds.includes(String(pkg.id)),
		);
	}, [availablePackages, selectedPackageIds]);

	// * Handler to remove a package badge
	const handleRemovePackageBadge = useCallback(
		(items: MultiSelectBadgesProps["items"]) => {
			const updatedIds = items.map((item) => String(item.id)).join(",");
			handleFilterBy({
				type: "packageIds",
				value: updatedIds,
			});
		},
		[handleFilterBy],
	);
	// Handler to toggle service selection
	const handleTogglePackageSelection = useCallback(
		(id: string) => {
			const currentSelection = selectedPackageIds ?? [];
			const isSelected = currentSelection.includes(id);

			const updatedSelection = isSelected
				? currentSelection.filter((sid) => sid !== id)
				: [...currentSelection, id];

			handleFilterBy({
				type: "packageIds",
				value: updatedSelection.filter(Boolean).join(","),
			});
		},
		[selectedPackageIds, handleFilterBy],
	);

	// * for filtering by statuses
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
		<section
			className={cn(
				"grid w-full grid-cols-1 gap-4 md:grid-cols-2 md:gap-2 lg:grid-cols-3 xl:grid-cols-5 transition-all shadow-inner",
				className,
			)}
		>
			<div className="col-span-full md:col-span-1">
				<Select
					value={filterBy.assignedTo}
					onValueChange={(value) =>
						handleFilterBy({ type: "assignedTo", value })
					}
				>
					<SelectTrigger
						className={cn(
							"bg-input shadow-inner",
							!filterBy.assignedTo ? "text-muted-foreground" : "",
						)}
					>
						<SelectValue placeholder={`${taf("assigned_to.placeholder")}...`} />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							{assignedToList.map((i) => (
								<SelectItem key={i.value} value={i.value}>
									<div className="flex flex-row items-center gap-2 uppercase">
										{i.icon}
										{i.label}
									</div>
								</SelectItem>
							))}
						</SelectGroup>

						<SelectSeparator />

						<SelectGroup>
							<Button
								className="w-full px-2 font-medium uppercase"
								variant="ghost"
								size="sm"
								onClick={(e) => {
									e.stopPropagation();
									handleFilterBy({ type: "assignedTo", value: "" });
								}}
							>
								{taf("assigned_to.search.clear")}
							</Button>
						</SelectGroup>
					</SelectContent>
				</Select>
			</div>

			<div className="col-span-full md:col-span-1">
				<Popover>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							className={cn(
								"relative w-full flex justify-between font-normal !px-3 bg-input shadow-inner",
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

							<ChevronsUpDown className="flex-shrink-0 text-muted-foreground/50" />
						</Button>
					</PopoverTrigger>
					<PopoverContent className="p-0 w-fit" align="start" side="bottom">
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
					className="shadow-inner bg-input"
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
									"relative w-full flex justify-between font-normal !px-3 bg-input shadow-inner",
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
								<ChevronsUpDown className="flex-shrink-0 text-muted-foreground/50" />
							</Button>
						</PopoverTrigger>
						<PopoverContent className="p-0 w-fit" align="start" side="bottom">
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
									"relative w-full flex justify-between font-normal !px-3 bg-input shadow-inner",
									!selectedServiceOptions?.length && "text-muted-foreground",
								)}
							>
								<MultiSelectBadges
									placeholder={`${taf("services.placeholder")}...`}
									maxShows={1}
									items={selectedServiceOptions}
									onRemoveRestAll={(values) => handleRemoveServiceBadge(values)}
									onRemoveSingle={(values) => handleRemoveServiceBadge(values)}
								/>

								<ChevronsUpDown className="flex-shrink-0 text-muted-foreground/50" />
							</Button>
						</PopoverTrigger>
						<PopoverContent className="p-0 w-fit" align="start" side="bottom">
							<Command>
								<CommandInput
									placeholder={`${taf("services.search.placeholder")}...`}
									className="h-9"
								/>
								<CommandList>
									<CommandEmpty>{taf("services.search.empty")}</CommandEmpty>
									<CommandGroup>
										{availableServices?.length ? (
											availableServices?.map((service) => (
												<CommandItem
													key={service.id}
													value={String(service.id)}
													onSelect={() => {
														const id = String(service.id);
														handleToggleServiceSelection(id);
													}}
												>
													<span
														title={service.label}
														className="flex-grow-0 text-xs tracking-wide uppercase text-nowrap"
													>
														{service.label}
													</span>

													<Check
														className={cn(
															"ml-auto",
															filterBy?.serviceIds.includes(String(service.id))
																? "opacity-100"
																: "opacity-0",
														)}
													/>
												</CommandItem>
											))
										) : (
											<CommandItem value="" disabled>
												<span>{taf("services.search.empty")}</span>
											</CommandItem>
										)}
									</CommandGroup>
								</CommandList>

								<CommandList>
									<CommandGroup>
										<CommandSeparator className="mb-2" />
										<CommandItem
											onSelect={() => {
												handleFilterBy({ type: "serviceIds", value: "" });
											}}
										>
											<span className="mx-auto font-medium text-center uppercase w-fit">
												{taf("services.search.clear")}
											</span>
										</CommandItem>
									</CommandGroup>
								</CommandList>
							</Command>
						</PopoverContent>
					</Popover>
				</div>
			</Deferred>

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
									"relative w-full flex justify-between font-normal !px-3 bg-input shadow-inner",
									!selectedPackageOptions?.length && "text-muted-foreground",
								)}
							>
								<MultiSelectBadges
									placeholder={`${taf("packages.placeholder")}...`}
									maxShows={1}
									items={selectedPackageOptions}
									onRemoveRestAll={(values) => handleRemovePackageBadge(values)}
									onRemoveSingle={(values) => handleRemovePackageBadge(values)}
								/>

								<ChevronsUpDown className="flex-shrink-0 text-muted-foreground/50" />
							</Button>
						</PopoverTrigger>
						<PopoverContent className="p-0 w-fit" align="start" side="bottom">
							<Command>
								<CommandInput
									placeholder={`${taf("packages.search.placeholder")}...`}
									className="h-9"
								/>
								<CommandList>
									<CommandEmpty>{taf("packages.search.empty")}</CommandEmpty>
									<CommandGroup>
										{groupedPackageOptions?.length ? (
											groupedPackageOptions?.map((service) => (
												<CommandGroup
													key={service.header}
													heading={service.header}
												>
													{service?.packages?.length ? (
														service.packages.map((pkg) => (
															<CommandItem
																key={pkg.id}
																value={String(pkg.id)}
																onSelect={() => {
																	handleTogglePackageSelection(String(pkg.id));
																}}
															>
																<span
																	title={pkg.name}
																	className="flex-grow-0 text-xs tracking-wide uppercase text-nowrap"
																>
																	{pkg.name}
																</span>
																<Check
																	className={cn(
																		"ml-auto",
																		selectedPackageIds?.some(
																			(p) => p === String(pkg.id),
																		)
																			? "opacity-100"
																			: "opacity-0",
																	)}
																/>
															</CommandItem>
														))
													) : (
														<CommandItem value={""} disabled>
															<span className="flex-grow-0 text-xs tracking-wide uppercase text-nowrap">
																{taf("packages.search.empty")}
															</span>
														</CommandItem>
													)}
												</CommandGroup>
											))
										) : (
											<CommandItem value="" disabled>
												<span>{taf("packages.search.empty")}</span>
											</CommandItem>
										)}
									</CommandGroup>
								</CommandList>

								<CommandList>
									<CommandGroup>
										<CommandSeparator className="mb-2" />
										<CommandItem
											onSelect={() => {
												handleFilterBy({ type: "packageIds", value: "" });
											}}
										>
											<span className="mx-auto font-medium text-center uppercase w-fit">
												{taf("packages.search.clear")}
											</span>
										</CommandItem>
									</CommandGroup>
								</CommandList>
							</Command>
						</PopoverContent>
					</Popover>
				</div>
			</Deferred>

			<div className="col-span-full md:col-span-1">
				<Input
					type="text"
					className="shadow-inner bg-input"
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
					className="shadow-inner bg-input"
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
									"relative w-full flex justify-between font-normal !px-3 bg-input shadow-inner",
									!selectedGenderOptions?.length && "text-muted-foreground",
								)}
							>
								<MultiSelectBadges
									placeholder={`${taf("patient_genders.placeholder")}...`}
									maxShows={1}
									items={selectedGenderOptions}
									onRemoveRestAll={(values) => handleRemoveGenderBadge(values)}
									onRemoveSingle={(values) => handleRemoveGenderBadge(values)}
								/>

								<ChevronsUpDown className="flex-shrink-0 text-muted-foreground/50" />
							</Button>
						</PopoverTrigger>
						<PopoverContent className="p-0 w-fit" align="start" side="bottom">
							<Command>
								<CommandInput
									placeholder={`${taf("patient_genders.search.placeholder")}...`}
									className="h-9"
								/>
								<CommandList>
									<CommandEmpty>
										{taf("patient_genders.search.empty")}
									</CommandEmpty>
									<CommandGroup>
										{availableGenders?.length ? (
											availableGenders?.map((gender) => (
												<CommandItem
													key={gender}
													value={gender}
													onSelect={() => {
														handleToggleGenderSelection(gender);
													}}
												>
													<span
														title={gender}
														className="flex-grow-0 text-xs tracking-wide uppercase text-nowrap"
													>
														{gender}
													</span>

													<Check
														className={cn(
															"ml-auto",
															selectedGenderOptions.some(
																(pg) => pg.value === gender,
															)
																? "opacity-100"
																: "opacity-0",
														)}
													/>
												</CommandItem>
											))
										) : (
											<CommandItem value="" disabled>
												<span>{taf("patient_genders.search.empty")}</span>
											</CommandItem>
										)}
									</CommandGroup>
								</CommandList>

								<CommandList>
									<CommandGroup>
										<CommandSeparator className="mb-2" />
										<CommandItem
											onSelect={() => {
												handleFilterBy({ type: "patientGenders", value: "" });
											}}
										>
											<span className="mx-auto font-medium text-center uppercase w-fit">
												{taf("patient_genders.search.clear")}
											</span>
										</CommandItem>
									</CommandGroup>
								</CommandList>
							</Command>
						</PopoverContent>
					</Popover>
				</div>
			</Deferred>

			<div className="flex flex-col justify-end gap-4 mt-4 md:gap-2 col-span-full md:flex-row">
				<Button
					type="button"
					size="sm"
					variant="ghost"
					className="w-full md:w-fit"
					onClick={(event) => {
						event.preventDefault();

						onToggleShow();
					}}
				>
					{t("button.close_filter")}
				</Button>

				<Button
					type="button"
					size="sm"
					variant="ghost-destructive"
					className="w-full md:w-fit"
					onClick={(event) => {
						event.preventDefault();

						onResetAll();
					}}
				>
					{t("button.clear_all_filters")}
				</Button>
			</div>
		</section>
	);
}
