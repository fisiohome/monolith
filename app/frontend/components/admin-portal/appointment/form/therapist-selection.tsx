import { useDebounce } from "@uidotdev/usehooks";
import {
	AlertCircle,
	ChevronDown,
	ChevronsRight,
	Hash,
	MapPin,
	Search,
	Sparkles,
	Stethoscope,
	Timer,
	User,
} from "lucide-react";
import {
	type ComponentProps,
	Fragment,
	forwardRef,
	memo,
	useCallback,
	useMemo,
	useState,
} from "react";
import { useTranslation } from "react-i18next";
import { LoadingBasic } from "@/components/shared/loading";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/extended/input";
import { Spinner } from "@/components/ui/kibo-ui/spinner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import type {
	FeasibilityReportItem,
	TherapistOption,
} from "@/hooks/admin-portal/appointment/use-appointment-utils";
import { getGenderIcon } from "@/hooks/use-gender";
import { useIsMobile } from "@/hooks/use-mobile";
import { DEFAULT_VALUES_THERAPIST } from "@/lib/appointments/form";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/types/admin-portal/appointment";
import type { Therapist } from "@/types/admin-portal/therapist";
import { TimeSlotButton } from "./date-time";

// * button selection list
type TherapistSelectButtonProps = {
	selected: boolean;
	onSelect: () => void;
	badgeItems?: string[];
	className?: string;
	children: React.ReactNode;
} & React.ComponentPropsWithoutRef<"button">;

const TherapistSelectButton = forwardRef<
	HTMLButtonElement,
	TherapistSelectButtonProps
>(({ selected, onSelect, badgeItems, className, children, ...props }, ref) => (
	<button
		ref={ref}
		type="button"
		className={cn(
			"w-full border rounded-lg bg-background border-border transition-all relative",
			selected &&
				"border-primary-foreground bg-primary text-primary-foreground",
			className,
		)}
		onClick={(event) => {
			event.preventDefault();
			event.stopPropagation();
			onSelect();
		}}
		{...props}
	>
		{!!badgeItems?.length && (
			<div
				className={cn(
					"absolute top-0 left-0 z-10 flex items-center p-0 px-1 rounded-br-md text-[10px] lowercase border-b border-r",
					"text-yellow-900",
				)}
				style={{
					background: "linear-gradient(90deg, #fef08a 0%, #fde047 100%)",
					borderColor: "#fde047",
				}}
			>
				<Sparkles className="flex-shrink-0 size-3 text-yellow-700 mt-0.5 mr-1" />
				{badgeItems.map((label, index) => (
					<Fragment key={label}>
						{index > 0 && (
							<span className="mx-0.5 text-yellow-700" aria-hidden="true">
								&ndash;
							</span>
						)}
						<span className="font-semibold uppercase">{label}</span>
					</Fragment>
				))}
			</div>
		)}

		{children}
	</button>
));
TherapistSelectButton.displayName = "TherapistSelectButton";

// * card therapist component
interface CardTherapistProps extends ComponentProps<"div"> {
	therapist: Pick<
		Therapist,
		"registrationNumber" | "id" | "gender" | "name" | "employmentType"
	> & { timeSlots?: string[] };
}

const CardTherapist = forwardRef<HTMLDivElement, CardTherapistProps>(
	({ className, therapist }, ref) => (
		<div ref={ref} className={cn("p-2 text-left", className)}>
			<div className="flex gap-2">
				<Avatar className="border rounded-lg border-border bg-muted size-12">
					<AvatarImage src="#" />
					<AvatarFallback className="flex flex-col">
						<User className="flex-shrink-0 size-6 text-muted-foreground/50" />
					</AvatarFallback>
				</Avatar>

				<div>
					<div className="flex gap-1">
						<Badge
							variant="outline"
							className="font-light text-[10px] text-inherit p-0 px-1 mb-1 uppercase"
						>
							<Hash className="flex-shrink-0 size-2.5 text-inherit opacity-75 mr-0.5" />
							<span>{therapist.registrationNumber}</span>
						</Badge>

						<Badge
							variant="outline"
							className="font-light text-[10px] text-inherit p-0 px-1 mb-1 uppercase"
						>
							<span>{therapist?.employmentType || "N/A"}</span>
						</Badge>

						<Badge
							variant="outline"
							className="font-light text-[10px] text-inherit p-0 px-1 mb-1"
						>
							{therapist?.gender &&
								getGenderIcon(
									therapist.gender,
									"flex-shrink-0 size-2.5 text-inherit opacity-75 mr-0.5",
								)}

							<span>{therapist?.gender || "N/A"}</span>
						</Badge>
					</div>

					<p className="font-bold tracking-wide uppercase line-clamp-1">
						{therapist.name}
					</p>
				</div>
			</div>
		</div>
	),
);
CardTherapist.displayName = "CardTherapist";

// * empty therapist component
const EmptyTherapists = forwardRef<HTMLDivElement, ComponentProps<"div">>(
	({ className, ...props }, ref) => {
		const { t: tasf } = useTranslation("appointments-form", {
			keyPrefix: "appt_schedule.fields",
		});

		return (
			<div ref={ref} className={className} {...props}>
				<p className="flex items-center gap-1.5 justify-center">
					<Stethoscope className="text-muted-foreground/75 size-4" />
					{tasf("therapist.search.empty")}
				</p>
			</div>
		);
	},
);
EmptyTherapists.displayName = "EmptyTherapists";

// * dialog for showing unfeasible therapists
const UnfeasibleTherapistsDialog = forwardRef<
	HTMLDivElement,
	{
		items: FeasibilityReportItem[];
	}
>(({ items }) => {
	if (items.length === 0) return null;

	const unavailableTherapists = items.filter(
		(item) => item.type === "unavailable",
	);
	const notFeasibleTherapists = items.filter(
		(item) => item.type === "not_feasible",
	);

	const getReasonIcon = (item: FeasibilityReportItem) => {
		if (item.type === "unavailable") {
			return <User className="size-4 text-gray-500" />;
		}
		if (item.reason.toLowerCase().includes("distance")) {
			return <MapPin className="size-4 text-orange-500" />;
		}
		if (
			item.reason.toLowerCase().includes("duration") ||
			item.reason.toLowerCase().includes("time")
		) {
			return <Timer className="size-4 text-blue-500" />;
		}
		return <AlertCircle className="size-4 text-red-500" />;
	};

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm" className="gap-1.5">
					<AlertCircle className="size-4 text-muted-foreground opacity-75" />
					<span>{items.length} Not Shown</span>
				</Button>
			</DialogTrigger>
			<DialogContent className="max-h-[80vh]">
				<DialogHeader>
					<DialogTitle>Therapists Not Shown ({items.length})</DialogTitle>
					<DialogDescription>
						These therapists are not shown in the list due to availability or
						location constraints.
					</DialogDescription>
				</DialogHeader>
				<ScrollArea className="max-h-[60vh] pr-4">
					<div className="space-y-4">
						{/* Unavailable Therapists Section */}
						{unavailableTherapists.length > 0 && (
							<div>
								<div className="mb-2 pb-1 border-b">
									<h4 className="text-sm font-semibold">
										Unavailable ({unavailableTherapists.length})
									</h4>
								</div>
								<div className="space-y-2">
									{unavailableTherapists.map((item, index) => (
										<div
											key={`unavailable-${item.regNumber}-${index}`}
											className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-1"
										>
											<div className="flex items-start justify-between gap-2">
												<div>
													<p className="font-medium text-sm">
														{item.name} &bull;{" "}
														<span className="text-xs text-muted-foreground">
															{item.regNumber}
														</span>
													</p>
												</div>
												{getReasonIcon(item)}
											</div>
											<p className="text-xs text-muted-foreground">
												{item.reason}
											</p>
										</div>
									))}
								</div>
							</div>
						)}

						{/* Not Feasible Therapists Section */}
						{notFeasibleTherapists.length > 0 && (
							<div>
								<div className="mb-2 pb-1 border-b">
									<h4 className="text-sm font-semibold">
										Outside Reachable Area ({notFeasibleTherapists.length})
									</h4>
								</div>
								<div className="space-y-2">
									{notFeasibleTherapists.map((item, index) => (
										<div
											key={`notfeasible-${item.regNumber}-${index}`}
											className="rounded-lg border p-3 space-y-2"
										>
											<div className="flex items-start justify-between gap-2">
												<div>
													<p className="font-medium text-sm">
														{item.name} &bull;{" "}
														<span className="text-xs text-muted-foreground">
															{item.regNumber}
														</span>
													</p>
												</div>
												{getReasonIcon(item)}
											</div>
											<div className="text-xs bg-muted rounded px-2 py-1.5">
												<p className="text-muted-foreground">{item.reason}</p>
											</div>
											<div className="flex flex-wrap gap-3 text-xs">
												{item.straightLineDistance && (
													<div className="flex items-center gap-1">
														<MapPin className="size-3 text-muted-foreground" />
														<span>
															Straight:{" "}
															{item.straightLineDistance.value.toFixed(1)}{" "}
															{item.straightLineDistance.unit}
														</span>
													</div>
												)}
												{item.routeDistance && (
													<div className="flex items-center gap-1">
														<MapPin className="size-3 text-green-600" />
														<span>
															Route: {item.routeDistance.value.toFixed(1)}{" "}
															{item.routeDistance.unit}
														</span>
													</div>
												)}
												{item.duration && (
													<div className="flex items-center gap-1">
														<Timer className="size-3 text-blue-600" />
														<span>
															~{Math.round(item.duration.value)}{" "}
															{item.duration.unit}
														</span>
													</div>
												)}
											</div>
										</div>
									))}
								</div>
							</div>
						)}
					</div>
				</ScrollArea>
			</DialogContent>
		</Dialog>
	);
});
UnfeasibleTherapistsDialog.displayName = "UnfeasibleTherapistsDialog";

// * core component
export interface TherapistSelectionProps extends ComponentProps<"div"> {
	items: TherapistOption[];
	config: {
		height?: number;
		isLoading: boolean;
		selectedTherapist?: TherapistOption;
		selectedTherapistName: string | undefined;
		appt?: Appointment;
		isAllOfDay?: boolean;
		selectedTimeSlot?: string;
	};
	find: {
		isDisabled: boolean;
		handler: (options?: { bypassConstraints?: boolean }) => Promise<void>;
	};
	unfeasibleTherapists?: FeasibilityReportItem[];
	onSelectTherapist: (value: { id: string; name: string }) => void;
	onPersist: (value: TherapistOption | null) => void;
	onSelectTimeSlot?: (value: string) => void;
}

const TherapistSelection = memo(
	forwardRef<HTMLDivElement, TherapistSelectionProps>(function Component(
		{
			className,
			items,
			config: {
				isLoading,
				height = 525,
				selectedTherapistName,
				selectedTherapist,
				selectedTimeSlot,
				isAllOfDay,
				appt,
			},
			find,
			unfeasibleTherapists = [],
			onSelectTherapist,
			onPersist,
			onSelectTimeSlot,
		},
		ref,
	) {
		const { t: tasf } = useTranslation("appointments-form", {
			keyPrefix: "appt_schedule.fields",
		});
		const isMobile = useIsMobile();
		const [search, setSearch] = useState("");
		const [isBypassConstraints, setIsBypassConstraints] = useState(false);
		const debouncedSearchTerm = useDebounce(search, 250);
		// Filter by search term first
		const filteredTherapists = useMemo(
			() =>
				items.filter((t) => {
					const searchTerm = debouncedSearchTerm.toLowerCase();

					if (searchTerm) {
						return (
							t.name.toLowerCase().includes(searchTerm) ||
							t.registrationNumber.toLowerCase().includes(searchTerm)
						);
					}
					return true;
				}),
			[items, debouncedSearchTerm],
		);
		const allVisitIds = useMemo(
			() => new Set(appt?.allVisits?.map((v) => v.id) || []),
			[appt?.allVisits],
		);

		// Use a single loop to split therapists into suggested (onSeries) and other
		const { suggestedTherapists, otherTherapists } = useMemo(
			() =>
				filteredTherapists.reduce(
					(acc, therapist) => {
						const isSuggested = therapist.appointments?.some((ap) =>
							allVisitIds.has(ap.id),
						);
						if (isSuggested) {
							acc.suggestedTherapists.push(therapist);
						} else {
							acc.otherTherapists.push(therapist);
						}

						return acc;
					},
					{ suggestedTherapists: [], otherTherapists: [] } as {
						suggestedTherapists: TherapistOption[];
						otherTherapists: TherapistOption[];
					},
				),
			[filteredTherapists, allVisitIds],
		);
		// Helper to get visit progress labels for a therapist assigned in this appointment's series to show in the suggested badge
		const getAssignedVisitProgress = useCallback(
			(therapist: TherapistOption, appt?: Appointment) => {
				if (!therapist?.appointments || !appt?.allVisits) return [];

				const assigned = therapist.appointments.filter((ap) =>
					appt?.allVisits?.some((v) => v.id === ap.id),
				);

				const visitProgressLabels = Array.from(
					new Set(
						assigned
							.map((ap) => {
								const progress =
									ap.visitProgress ||
									(ap.visitNumber &&
									(ap.totalPackageVisits || appt?.totalPackageVisits)
										? `${ap.visitNumber}/${
												ap.totalPackageVisits || appt?.totalPackageVisits
											}`
										: null);

								return progress ? `Visit ${progress}` : null;
							})
							.filter((progress): progress is string => Boolean(progress)),
					),
				);

				return visitProgressLabels.length > 0 ? visitProgressLabels : [];
			},
			[],
		);

		// therapist reference for selected therapist (new form) or existing therapist (reschedule-form)
		const therapistReference = useMemo<
			null | CardTherapistProps["therapist"]
		>(() => {
			if (!appt?.therapist && !selectedTherapist) return null;

			return {
				id: appt?.therapist?.id || selectedTherapist?.id || "",
				name: appt?.therapist?.name || selectedTherapist?.name || "",
				gender: appt?.therapist?.gender || selectedTherapist?.gender || "MALE",
				registrationNumber:
					appt?.therapist?.registrationNumber ||
					selectedTherapist?.registrationNumber ||
					"",
				employmentType:
					appt?.therapist?.employmentType ||
					selectedTherapist?.employmentType ||
					"KARPIS",
				timeSlots:
					appt?.therapist?.availabilityDetails?.availableSlots ||
					selectedTherapist?.availabilityDetails?.availableSlots ||
					[],
			};
		}, [appt?.therapist, selectedTherapist]);

		// time suggested
		const [timeSlotIds, setTimeSlotIds] = useState<string[]>([]);
		const isOpenTimeSlot = useCallback(
			(id: string) => {
				return timeSlotIds.includes(id);
			},
			[timeSlotIds],
		);
		const toggleTimeSlot = useCallback((idCheck: string) => {
			setTimeSlotIds((prev) => {
				if (prev.includes(idCheck)) {
					return prev.filter((id) => id !== idCheck);
				}

				return [...prev, idCheck];
			});
		}, []);

		return (
			<div ref={ref} className={cn("flex flex-col gap-6", className)}>
				<div className="flex items-start justify-between gap-4 p-3 border rounded-md border-border bg-sidebar">
					<div>
						<p className="text-sm font-semibold">
							Bypass distance & duration rules
						</p>
						<p className="text-xs text-muted-foreground">
							Shows all available therapists even if travel limits flag them as
							unreachable.
						</p>
					</div>
					<Switch
						checked={isBypassConstraints}
						onCheckedChange={setIsBypassConstraints}
						aria-label="Bypass distance and duration rules"
					/>
				</div>

				{isLoading ? (
					<Button type="button" effect="shine" className="w-full" disabled>
						Finding therapists...
						<Spinner className="h-4 w-4 animate-spin" />
					</Button>
				) : (
					<Button
						type="button"
						effect="shine"
						iconPlacement="right"
						className="w-full"
						icon={ChevronsRight}
						disabled={find.isDisabled}
						onClick={async (event) => {
							event.preventDefault();

							await find.handler({ bypassConstraints: isBypassConstraints });
						}}
					>
						{tasf("therapist.button")}
					</Button>
				)}

				<ScrollArea
					className="relative p-3 text-sm border rounded-md border-border bg-sidebar text-muted-foreground"
					style={{ height }}
				>
					{!isLoading && items?.length > 0 && (
						<div className="sticky top-0 z-10 pb-2 bg-sidebar mb-[0.5rem]">
							<Input
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								type="text"
								placeholder={tasf("therapist.search.placeholder")}
								className="mb-0 shadow-none"
							>
								<Input.Group>
									<Input.LeftIcon>
										<Search />
									</Input.LeftIcon>
								</Input.Group>
							</Input>
							<div className="flex items-center justify-between mt-1">
								<p className="text-xs text-muted-foreground">
									Showing {filteredTherapists.length} of {items.length}{" "}
									therapists
								</p>
								<UnfeasibleTherapistsDialog items={unfeasibleTherapists} />
							</div>
						</div>
					)}

					<div className="grid gap-2">
						{isLoading ? (
							<LoadingBasic columnBased />
						) : items?.length ? (
							<Fragment>
								{suggestedTherapists.length > 0 && (
									<div>
										<div className="mb-4 border-l-8 border-primary">
											<p className="pl-2 text-xs font-semibold tracking-wide uppercase">
												{tasf("therapist.search.suggested_label")}
											</p>
										</div>

										<div className="grid gap-3">
											{suggestedTherapists.map((t) => {
												const visitLabels = getAssignedVisitProgress(t, appt);

												return (
													<div key={t.id}>
														<div>
															<TherapistSelectButton
																badgeItems={visitLabels}
																selected={selectedTherapistName === t.name}
																onSelect={() => {
																	// save values for react-hook-form
																	onSelectTherapist(
																		selectedTherapistName === t.name
																			? DEFAULT_VALUES_THERAPIST
																			: { id: t.id, name: t.name },
																	);

																	// save values for session-storage form-selection object
																	onPersist(
																		selectedTherapistName === t.name ? null : t,
																	);
																}}
															>
																<CardTherapist
																	therapist={{
																		name: t.name,
																		gender: t.gender,
																		id: t.id,
																		registrationNumber: t.registrationNumber,
																		employmentType: t.employmentType,
																	}}
																	className={cn(
																		!!visitLabels?.length && "mt-5",
																	)}
																/>
															</TherapistSelectButton>
														</div>

														{!!t.availabilityDetails?.availableSlots?.length &&
															!!isAllOfDay && (
																<div>
																	<Button
																		type="button"
																		variant="outline"
																		size={isMobile ? "default" : "sm"}
																		className="w-full !border-t-0 shadow-none"
																		onClick={() => toggleTimeSlot(t.id)}
																	>
																		<span className="font-light uppercase">
																			Suggested Time Slots
																		</span>
																		<ChevronDown
																			className={cn(
																				"transition-transform duration-100 text-muted-foreground/50",
																				isOpenTimeSlot(t.id)
																					? "rotate-180"
																					: "",
																			)}
																		/>
																	</Button>

																	{isOpenTimeSlot(t.id) && (
																		<div className="grid grid-cols-3 gap-2 mt-2 md:grid-cols-6 xl:grid-cols-7">
																			{t.availabilityDetails?.availableSlots?.map(
																				(slot) => (
																					<TimeSlotButton
																						key={slot}
																						time={slot}
																						isSelected={
																							selectedTimeSlot === slot || false
																						}
																						onSelect={() => {
																							if (
																								onSelectTimeSlot &&
																								typeof onSelectTimeSlot ===
																									"function"
																							) {
																								onSelectTimeSlot(slot);
																							}

																							// save values for react-hook-form
																							onSelectTherapist(
																								selectedTherapistName === t.name
																									? DEFAULT_VALUES_THERAPIST
																									: { id: t.id, name: t.name },
																							);

																							// save values for session-storage form-selection object
																							onPersist(
																								selectedTherapistName === t.name
																									? null
																									: t,
																							);
																						}}
																					/>
																				),
																			)}
																		</div>
																	)}
																</div>
															)}
													</div>
												);
											})}
										</div>
									</div>
								)}

								{otherTherapists.length > 0 && (
									<div className={cn(!!suggestedTherapists?.length && "mt-1")}>
										{!!suggestedTherapists?.length && (
											<div className="my-4 border-l-8 border-secondary">
												<p className="pl-2 text-xs font-semibold tracking-wide uppercase">
													{tasf("therapist.search.other_label")}
												</p>
											</div>
										)}

										<div className="grid gap-3">
											{otherTherapists.map((t) => (
												<div key={t.id}>
													<div>
														<TherapistSelectButton
															selected={selectedTherapistName === t.name}
															onSelect={() => {
																if (isAllOfDay) {
																	toggleTimeSlot(t.id);
																	return;
																}

																// save values for react-hook-form
																onSelectTherapist(
																	selectedTherapistName === t.name
																		? DEFAULT_VALUES_THERAPIST
																		: { id: t.id, name: t.name },
																);
																// save values for session-storage form-selection object
																onPersist(
																	selectedTherapistName === t.name ? null : t,
																);
															}}
														>
															<CardTherapist
																therapist={{
																	name: t.name,
																	gender: t.gender,
																	id: t.id,
																	registrationNumber: t.registrationNumber,
																	employmentType: t.employmentType,
																}}
															/>
														</TherapistSelectButton>
													</div>

													{!!t.availabilityDetails?.availableSlots?.length &&
														!!isAllOfDay && (
															<div>
																<Button
																	type="button"
																	variant="outline"
																	size={isMobile ? "default" : "sm"}
																	className="w-full !border-t-0 shadow-none"
																	onClick={() => toggleTimeSlot(t.id)}
																>
																	<span className="font-light uppercase">
																		Suggested Time Slots
																	</span>
																	<ChevronDown
																		className={cn(
																			"transition-transform duration-100 text-muted-foreground/50",
																			isOpenTimeSlot(t.id) ? "rotate-180" : "",
																		)}
																	/>
																</Button>

																{isOpenTimeSlot(t.id) && (
																	<div className="grid grid-cols-3 gap-2 mt-2 md:grid-cols-6 xl:grid-cols-7">
																		{t.availabilityDetails?.availableSlots?.map(
																			(slot) => (
																				<TimeSlotButton
																					key={slot}
																					time={slot}
																					isSelected={
																						selectedTimeSlot === slot || false
																					}
																					onSelect={() => {
																						if (
																							onSelectTimeSlot &&
																							typeof onSelectTimeSlot ===
																								"function"
																						) {
																							onSelectTimeSlot(slot);
																						}

																						// save values for react-hook-form
																						onSelectTherapist(
																							selectedTherapistName === t.name
																								? DEFAULT_VALUES_THERAPIST
																								: { id: t.id, name: t.name },
																						);

																						// save values for session-storage form-selection object
																						onPersist(
																							selectedTherapistName === t.name
																								? null
																								: t,
																						);
																					}}
																				/>
																			),
																		)}
																	</div>
																)}
															</div>
														)}
												</div>
											))}
										</div>
									</div>
								)}
							</Fragment>
						) : therapistReference &&
							therapistReference?.name === selectedTherapistName ? (
							<div>
								<CardTherapist
									therapist={therapistReference}
									className="border rounded-lg text-primary-foreground border-primary-foreground bg-primary"
								/>

								{!!therapistReference?.timeSlots?.length && !!isAllOfDay && (
									<div>
										<Button
											type="button"
											variant="outline"
											size={isMobile ? "default" : "sm"}
											className="w-full !border-t-0 shadow-none text"
											onClick={() => toggleTimeSlot(therapistReference.id)}
										>
											<span className="font-light uppercase">
												Suggested Time Slots
											</span>
											<ChevronDown
												className={cn(
													"transition-transform duration-100 text-muted-foreground/50",
													isOpenTimeSlot(therapistReference.id)
														? "rotate-180"
														: "",
												)}
											/>
										</Button>

										{isOpenTimeSlot(therapistReference.id) && (
											<div className="grid grid-cols-3 gap-2 mt-2 md:grid-cols-6 xl:grid-cols-7">
												{therapistReference.timeSlots.map((slot) => (
													<TimeSlotButton
														key={slot}
														time={slot}
														isSelected={selectedTimeSlot === slot || false}
														isDisabled={true}
													/>
												))}
											</div>
										)}
									</div>
								)}
							</div>
						) : (
							<EmptyTherapists />
						)}
					</div>
				</ScrollArea>
			</div>
		);
	}),
);
TherapistSelection.displayName = "TherapistSelection";
export default TherapistSelection;
