import { Deferred, Head, router, usePage } from "@inertiajs/react";
import { addMonths, format, isToday, isValid, parse } from "date-fns";
import { CalendarIcon, Check, ChevronsUpDown, X } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import type { DateRange } from "react-day-picker";
import { useTranslation } from "react-i18next";
import { PageContainer } from "@/components/admin-portal/shared/page-layout";
import ChangeViewButton from "@/components/admin-portal/therapist/schedules/change-view-button";
import { useDateContext } from "@/components/providers/date-provider";
import DotBadgeWithLabel from "@/components/shared/dot-badge";
import { LoadingBasic } from "@/components/shared/loading";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import { getDotVariantStatus } from "@/lib/appointments/utils";
import type { GENDERS } from "@/lib/constants";
import {
	cn,
	debounce,
	generateInitials,
	populateQueryParams,
} from "@/lib/utils";
import type { Appointment } from "@/types/admin-portal/appointment";
import type { Therapist } from "@/types/admin-portal/therapist";
import type { GlobalPageProps as BaseGlobalPageProps } from "@/types/globals";

type TherapistsOption = Pick<
	Therapist,
	| "id"
	| "name"
	| "registrationNumber"
	| "gender"
	| "employmentStatus"
	| "employmentType"
	| "service"
	| "user"
>;

type TherapistsApptSchedule = Pick<
	Appointment,
	| "id"
	| "appointmentDateTime"
	| "packageId"
	| "patientId"
	| "registrationNumber"
	| "serviceId"
	| "status"
	| "visitNumber"
> & {
	patientGender: (typeof GENDERS)[number];
	packageName: string;
	patientName: string;
	serviceCode: string;
	serviceName: string;
	totalVisit: number;
};

type TherapistSchedule = Therapist & {
	availabilityByDay?: Record<
		string,
		{
			startTime: string;
			endTime: string;
			freeWindows?: { startTime: string; endTime: string }[];
		}[]
	>;
	appointments?: TherapistsApptSchedule[];
};

type AvailabilitySlots = NonNullable<
	TherapistSchedule["availabilityByDay"]
>[string];

export interface PageProps {
	therapistsOption?: {
		data: TherapistsOption[];
	};
	therapistsSchedule?: {
		data: TherapistSchedule[];
	};
}

export interface SchedulesPageGlobalProps
	extends BaseGlobalPageProps,
		PageProps {
	[key: string]: any;
}

// * DayCard component
interface DayCardProps {
	dayKey: string;
	appointments: TherapistsApptSchedule[];
	availabilitySlots: AvailabilitySlots;
}

function DayCard({ dayKey, appointments, availabilitySlots }: DayCardProps) {
	const { t: tappt } = useTranslation("appointments");
	const { locale, tzDate, timeFormatDateFns } = useDateContext();
	const isApptToday = isToday(new Date(dayKey));
	const dateLabel =
		dayKey === "unscheduled"
			? "Unscheduled"
			: format(new Date(dayKey), "dd", {
					in: tzDate,
					locale,
				});
	const monthAndDayLabel =
		dayKey === "unscheduled"
			? "Unscheduled"
			: format(new Date(dayKey), "MMM, EEE", {
					in: tzDate,
					locale,
				});

	return (
		<div key={dayKey} className="border border-border/80">
			<div className="flex justify-between gap-3">
				<div className="inline-block">
					<div
						className={cn(
							"px-1 flex flex-initial items-center gap-1.5 text-xs font-semibold uppercase tracking-wider",
							isApptToday
								? "bg-primary/10 text-primary border border-primary/60"
								: "bg-background text-muted-foreground border border-border/60",
						)}
					>
						<span className="font-bold text-base">{dateLabel}</span>
						<span
							className={cn(
								"text-nowrap",
								isApptToday ? "text-primary" : "text-muted-foreground/80",
							)}
						>
							{monthAndDayLabel}
						</span>
					</div>
				</div>

				{availabilitySlots.some((s: any) => s.freeWindows?.length) && (
					<div className="mt-1 flex flex-wrap gap-1 text-xs text-muted-foreground px-2 justify-end">
						<span className="inline-block mr-1">Available time:</span>

						{availabilitySlots.flatMap(
							(slot: any) =>
								slot.freeWindows?.map((fw: any) => (
									<Badge
										key={`${dayKey}-fw-${slot.startTime}-${slot.endTime}-${fw.startTime}-${fw.endTime}`}
										variant="outline"
										className="text-[10px] px-1"
									>
										{fw.startTime} &mdash; {fw.endTime}
									</Badge>
								)) || [],
						)}
					</div>
				)}
			</div>

			<div>
				{appointments.map((appt, idx: number) => {
					const apptTime = appt.appointmentDateTime
						? format(new Date(appt.appointmentDateTime), timeFormatDateFns, {
								in: tzDate,
								locale,
							})
						: "N/A";
					const genderTitle =
						appt.patientGender === "MALE"
							? "Bapak "
							: appt.patientGender === "FEMALE"
								? "Ibu "
								: "";
					const title = `${genderTitle}${appt.patientName || "(No patient)"}`;
					const statusDotVariant = getDotVariantStatus(appt.status);
					const statusLine = tappt(`statuses.${appt.status}`);
					const regLine = appt?.registrationNumber;
					const packageLine = appt?.packageName;
					const visitLine = appt?.totalVisit
						? `Visit ${appt.visitNumber}/${appt.totalVisit}`
						: null;

					return (
						<button
							type="button"
							key={appt.id}
							className={cn(
								"text-sm p-2 space-y-1 hover:bg-primary/5 w-full text-left",
								idx !== appointments.length - 1 && "border-b",
							)}
							onClick={() => {
								if (appt.registrationNumber) {
									window.open(
										`/admin-portal/appointments?registration_number=${appt.registrationNumber}`,
										"_blank",
									);
								}
							}}
						>
							<div className="flex justify-between gap-3 w-full">
								<p className="font-bold tracking-tight flex-1">{apptTime}</p>

								<DotBadgeWithLabel
									size="xs"
									className="relative flex-shrink-0"
									variant={statusDotVariant}
								>
									<span
										title={statusLine}
										className="text-[0.7rem] tracking-tight uppercase line-clamp-1"
									>
										{statusLine}
									</span>
								</DotBadgeWithLabel>
							</div>

							<p className="font-semibold tracking-tight leading-tight capitalize">
								{title}
							</p>

							<div className="!mt-2 text-xs flex items-center justify-between gap-3">
								<div className="tracking-tight">
									{visitLine && <span>{visitLine}</span>}
									{packageLine && (
										<>
											<span className="mx-1">&bull;</span>
											<span>{packageLine}</span>
										</>
									)}
								</div>

								{regLine && (
									<span className="italic tracking-tighter">#{regLine}</span>
								)}
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
}

// * therapist schedule column component
interface TherapistScheduleColumnProps {
	therapist: TherapistsOption;
	entry?: TherapistSchedule;
	isDateWithinFilter: (key: string) => boolean;
	groupAppointmentsByDay: (
		appointments: TherapistsApptSchedule[],
	) => Record<string, TherapistsApptSchedule[]>;
	globalPageProps: SchedulesPageGlobalProps;
}

function TherapistScheduleColumn({
	therapist,
	entry,
	isDateWithinFilter,
	groupAppointmentsByDay,
	globalPageProps,
}: TherapistScheduleColumnProps) {
	const grouped = groupAppointmentsByDay(entry?.appointments || []);
	const availabilityByDay = entry?.availabilityByDay || {};
	const dayKeys = Array.from(
		new Set([...Object.keys(grouped), ...Object.keys(availabilityByDay)]),
	)
		.filter((key) => isDateWithinFilter(key))
		.filter((key) => {
			const hasAppointments = (grouped[key]?.length || 0) > 0;
			const hasAvailability = (availabilityByDay[key]?.length || 0) > 0;
			return hasAppointments || hasAvailability;
		})
		.sort();

	return (
		<div
			key={therapist.id}
			className="md:w-[380px] w-full md:min-w-[380px] md:max-w-[380px] flex-shrink-0 flex flex-col gap-2 snap-start"
		>
			<div className="flex pb-2 items-center justify-between border-b border-border mr-2">
				<HoverCard key={therapist.id} openDelay={10} closeDelay={100}>
					<HoverCardTrigger asChild>
						<Button
							variant="ghost"
							className="line-clamp-1 w-full truncate border shadow bg-background uppercase"
						>
							{therapist.name}
						</Button>
					</HoverCardTrigger>
					<HoverCardContent className="flex w-[--radix-hover-card-trigger-width] flex-col gap-0.5 text-xs">
						<div className="flex gap-4 flex-col">
							<div className="flex items-center gap-2 text-left">
								<Avatar className="w-8 h-8 border rounded-lg bg-muted">
									<AvatarImage src="#" alt={therapist.name} />
									<AvatarFallback
										className={cn(
											"text-xs rounded-lg",
											therapist.user.email ===
												globalPageProps.auth.currentUser?.user.email
												? "bg-primary text-primary-foreground"
												: therapist.user["isOnline?"]
													? "bg-emerald-700 text-white"
													: "",
										)}
									>
										{generateInitials(therapist.name)}
									</AvatarFallback>
								</Avatar>
								<div className="flex-1 space-y-0.5 leading-tight text-left">
									<p className="font-bold uppercase truncate max-w-52 md:max-w-16 lg:max-w-full">
										{therapist.name}
									</p>
									<p className="font-light">#{therapist.registrationNumber}</p>
								</div>
							</div>

							<Separator />

							<div className="flex w-full flex-col gap-2">
								<dl className="flex items-center justify-between gap-2">
									<dt className="text-muted-foreground text-nowrap">Type</dt>
									<dd className="font-medium text-right">
										{therapist.employmentType}
									</dd>
								</dl>
								<dl className="flex items-center justify-between gap-2">
									<dt className="text-muted-foreground text-nowrap">
										Therapist at
									</dt>
									<dd className="font-medium text-right">
										{therapist.service.name.replaceAll("_", " ")}
									</dd>
								</dl>
							</div>
						</div>
					</HoverCardContent>
				</HoverCard>
			</div>

			<div className="space-y-2 max-h-[calc(100vh-23rem)] overflow-y-auto pr-2">
				{dayKeys.length === 0 && (
					<div className="p-2 bg-background text-sm text-muted-foreground border border-border/60">
						No schedules in this range.
					</div>
				)}

				{dayKeys.map((dayKey) => (
					<DayCard
						key={dayKey}
						dayKey={dayKey}
						appointments={grouped[dayKey] || []}
						availabilitySlots={availabilityByDay[dayKey] || []}
					/>
				))}
			</div>
		</div>
	);
}

// * core component
export default function SchedulesPage({
	therapistsOption,
	therapistsSchedule,
}: PageProps) {
	const { props: globalPageProps, url: pageURL } =
		usePage<SchedulesPageGlobalProps>();
	const { currentQuery } = globalPageProps.adminPortal;
	const { locale, tzDate } = useDateContext();
	const { t } = useTranslation("therapist-schedules");

	// * helpers & filter data states
	const parsedTherapists = useMemo(() => {
		const fromQuery = currentQuery?.therapists;
		if (Array.isArray(fromQuery)) return fromQuery.map((item) => String(item));
		if (typeof fromQuery === "string") {
			return fromQuery
				.split(",")
				.map((item) => item.trim())
				.filter(Boolean);
		}
		return [] as string[];
	}, [currentQuery?.therapists]);

	const parseOrFallback = (value: string | undefined, fallback: Date) => {
		if (!value) return fallback;
		const parsed = parse(value, "dd-MM-yyyy", fallback, { in: tzDate, locale });
		return isValid(parsed) ? parsed : fallback;
	};
	const [filters, setFilters] = useState<{
		therapists: string[];
		date: DateRange | undefined;
	}>({
		therapists: parsedTherapists,
		date: {
			from: parseOrFallback(
				currentQuery?.dateFrom as string | undefined,
				new Date(),
			),
			to: parseOrFallback(
				currentQuery?.dateTo as string | undefined,
				addMonths(new Date(), 1, { in: tzDate }),
			),
		},
	});

	const [filterAlerts, setFilterAlerts] = useState<{
		therapists: string | null;
		date: string | null;
	}>({
		therapists: null,
		date: null,
	});
	const therapistsSnapshotRef = useRef(filters.therapists.join(","));

	const updateQueryParams = useCallback(
		debounce((url) => {
			router.get(
				url,
				{},
				{
					preserveState: true,
					only: ["adminPortal", "therapistsSchedule"],
				},
			);
		}, 500),
		[],
	);

	const applyFiltersToUrl = useCallback(
		(therapists: string[], dateRange: DateRange | undefined) => {
			const from = dateRange?.from;
			const to = dateRange?.to;

			const formattedFrom = from
				? format(from, "dd-MM-yyyy", { in: tzDate, locale })
				: undefined;
			const formattedTo = to
				? format(to, "dd-MM-yyyy", { in: tzDate, locale })
				: undefined;
			therapistsSnapshotRef.current = therapists.join(",");

			setFilterAlerts((prevAlerts) => ({
				...prevAlerts,
				therapists: therapists.length
					? null
					: t("filters.therapist.alert", {
							defaultValue:
								"Choose one or more therapists to preview their schedules side by side.",
						}),
			}));

			const { fullUrl } = populateQueryParams(
				pageURL,
				deepTransformKeysToSnakeCase({
					therapists: therapists.length ? therapists.join(",") : undefined,
					dateFrom: formattedFrom,
					dateTo: formattedTo,
				}),
			);

			updateQueryParams(fullUrl);
		},
		[pageURL, t, updateQueryParams, tzDate, locale],
	);

	// * filter therapists states
	const sortedTherapistOptions = useMemo(() => {
		if (!therapistsOption?.data) return [];
		return [...therapistsOption.data].sort((a, b) => {
			const aSelected = filters.therapists.includes(String(a.id));
			const bSelected = filters.therapists.includes(String(b.id));

			if (aSelected && !bSelected) return -1;
			if (!aSelected && bSelected) return 1;
			return 0;
		});
	}, [therapistsOption?.data, filters.therapists]);

	const selectedTherapistOptions = useMemo(
		() =>
			sortedTherapistOptions.filter((option) =>
				filters.therapists.includes(String(option.id)),
			),
		[filters.therapists, sortedTherapistOptions],
	);

	const schedulesByTherapist = useMemo(() => {
		const map: Record<string, TherapistSchedule> = {};
		const source = therapistsSchedule?.data ?? [];
		for (const therapist of source) {
			if (!filters.therapists.includes(String(therapist.id))) continue;
			const sortedAppointments = [...(therapist.appointments || [])].sort(
				(a, b) =>
					new Date(a.appointmentDateTime || 0).getTime() -
					new Date(b.appointmentDateTime || 0).getTime(),
			);
			map[String(therapist.id)] = {
				...therapist,
				appointments: sortedAppointments,
			};
		}
		// Ensure selected therapists are always in the map, even if no schedule data returned
		for (const therapist of selectedTherapistOptions) {
			const id = String(therapist.id);
			if (!map[id]) {
				map[id] = {
					...therapist,
					appointments: [],
					availabilityByDay: {},
				} as unknown as TherapistSchedule;
			}
		}
		return map;
	}, [filters.therapists, therapistsSchedule?.data, selectedTherapistOptions]);

	const isDateWithinFilter = useCallback(
		(dateString: string) => {
			if (dateString === "unscheduled") return true;
			const dateObj = new Date(dateString);
			if (!isValid(dateObj)) return false;
			const from = filters.date?.from;
			const to = filters.date?.to;
			if (from && dateObj < from) return false;
			if (to && dateObj > to) return false;
			return true;
		},
		[filters.date?.from, filters.date?.to],
	);

	const groupAppointmentsByDay = useCallback(
		(appointments: TherapistsApptSchedule[]) => {
			return appointments.reduce(
				(acc: Record<string, TherapistsApptSchedule[]>, appt) => {
					const key = appt.appointmentDateTime
						? format(new Date(appt.appointmentDateTime), "yyyy-MM-dd", {
								in: tzDate,
								locale,
							})
						: "unscheduled";
					acc[key] = acc[key] || [];
					acc[key].push(appt);
					return acc;
				},
				{},
			);
		},
		[tzDate, locale],
	);
	const [firstSelectedTherapist, extraSelectedTherapists] = useMemo(() => {
		const [first, ...rest] = selectedTherapistOptions || [];
		return [first, rest];
	}, [selectedTherapistOptions]);

	// Surface alert when no therapist is selected on close and sync URL
	const handleTherapistPopoverChange = useCallback(
		(open: boolean) => {
			if (open) return;

			const serializedTherapists = filters.therapists.join(",");
			const therapistsChanged =
				serializedTherapists !== therapistsSnapshotRef.current;

			if (!filters.therapists.length) {
				setFilterAlerts((prev) => ({
					...prev,
					therapists: t("filters.therapist.alert", {
						defaultValue:
							"Choose one or more therapists to preview their schedules side by side.",
					}),
				}));
			} else {
				setFilterAlerts((prev) => ({ ...prev, therapists: null }));
			}

			if (therapistsChanged) {
				applyFiltersToUrl(filters.therapists, filters.date);
			}
		},
		[applyFiltersToUrl, filters, t],
	);

	// Toggle a therapist in selection and sync filters
	const toggleTherapist = useCallback((therapistId: string) => {
		setFilters((prev) => {
			const exists = prev.therapists.includes(therapistId);
			const updatedTherapists = exists
				? prev.therapists.filter((id) => id !== therapistId)
				: [...prev.therapists, therapistId];

			return { ...prev, therapists: updatedTherapists };
		});
	}, []);

	// Remove a specific therapist from selection and sync filters
	const removeTherapist = useCallback(
		(therapistId: string) => {
			setFilters((prev) => {
				const updatedTherapists = prev.therapists.filter(
					(id) => id !== therapistId,
				);

				applyFiltersToUrl(updatedTherapists, prev.date);

				return { ...prev, therapists: updatedTherapists };
			});
		},
		[applyFiltersToUrl],
	);

	// Keep only the first selected therapist, clearing the rest
	const clearAdditionalTherapists = useCallback(() => {
		setFilters((prev) => {
			const [first, ...rest] = prev.therapists;

			if (rest.length === 0) return prev;

			const nextTherapists = first ? [first] : [];

			applyFiltersToUrl(nextTherapists, prev.date);

			return { ...prev, therapists: nextTherapists };
		});
	}, [applyFiltersToUrl]);

	// * filter date range states
	const onChangeDateRange = useCallback(
		(value: DateRange | undefined) => {
			setFilters({ ...filters, date: value });

			const from = value?.from;
			const to = value?.to;
			if (!from || !to) {
				setFilterAlerts((prev) => ({
					...prev,
					date: "Please select both start and end dates to filter.",
				}));
				return;
			}

			setFilterAlerts((prev) => ({ ...prev, date: null }));

			applyFiltersToUrl(filters.therapists, { from, to });
		},
		[applyFiltersToUrl, filters],
	);

	return (
		<>
			<Head title={t("title")} />

			<PageContainer className="grid overflow-hidden space-y-4">
				<div className="flex justify-between gap-4 flex-row">
					<div>
						<h1 className="text-lg font-bold tracking-tight uppercase">
							{t("title")}
						</h1>
					</div>

					<div>
						<ChangeViewButton
							currentPage="schedules"
							routes={{
								daySchedules:
									globalPageProps.adminPortal.router.adminPortal
										.therapistManagement.daySchedules,
								schedules:
									globalPageProps.adminPortal.router.adminPortal
										.therapistManagement.schedules,
							}}
						/>
					</div>
				</div>

				<Separator className="bg-border" />

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-2">
					<div className="col-span-full md:col-span-1 lg:col-span-2">
						<Deferred
							data={["therapistsOption"]}
							fallback={<Skeleton className="h-full" />}
						>
							<Popover onOpenChange={handleTherapistPopoverChange}>
								<PopoverTrigger asChild>
									<Button
										variant="outline"
										className={cn(
											"w-full justify-between font-normal bg-background h-auto shadow min-h-10 p-2",
											selectedTherapistOptions?.length === 0 &&
												"text-muted-foreground",
										)}
									>
										<div className="flex flex-wrap items-center gap-1">
											{firstSelectedTherapist ? (
												<>
													<Badge
														key={firstSelectedTherapist.id}
														variant="accent"
														className="text-xs group"
													>
														{firstSelectedTherapist.name}
														{/* biome-ignore lint/a11y/useSemanticElements: icon as button */}
														<div
															onClick={(e) => {
																e.stopPropagation();
																e.preventDefault();
																removeTherapist(
																	String(firstSelectedTherapist.id),
																);
															}}
															onKeyDown={() => {}}
															className="ml-1 hover:text-destructive opacity-70 hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-1 rounded p-0.5 cursor-pointer"
															role="button"
															tabIndex={0}
															aria-label={`Remove ${firstSelectedTherapist.name}`}
														>
															<X className="h-3 w-3" />
														</div>
													</Badge>

													{extraSelectedTherapists.length > 0 && (
														<Badge
															variant="accent"
															className="text-xs flex items-center gap-1"
														>
															+{extraSelectedTherapists.length} more
															{/* biome-ignore lint/a11y/useSemanticElements: icon as button */}
															<div
																onClick={(e) => {
																	e.stopPropagation();
																	e.preventDefault();
																	clearAdditionalTherapists();
																}}
																onKeyDown={() => {}}
																className="ml-1 hover:text-destructive opacity-70 hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-1 rounded p-0.5 cursor-pointer"
																role="button"
																tabIndex={0}
																aria-label={`Clear ${extraSelectedTherapists.length} additional therapists`}
															>
																<X className="h-3 w-3" />
															</div>
														</Badge>
													)}
												</>
											) : (
												<span>
													{t("filters.therapist.placeholder", {
														defaultValue: "Select therapists...",
													})}
												</span>
											)}
										</div>
										<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
									</Button>
								</PopoverTrigger>
								<PopoverContent
									className="p-0 w-[var(--radix-popover-trigger-width)]"
									align="start"
								>
									<Command>
										<CommandInput
											placeholder={t("filters.therapist.search", {
												defaultValue: "Search therapist...",
											})}
										/>
										<CommandList>
											<CommandEmpty>
												{t("filters.therapist.empty", {
													defaultValue: "No therapist found.",
												})}
											</CommandEmpty>
											<CommandGroup>
												{sortedTherapistOptions?.map((t) => {
													const isSelected = filters.therapists.includes(
														String(t.id),
													);

													return (
														<CommandItem
															key={t.id}
															value={t.name}
															onSelect={() => toggleTherapist(String(t.id))}
															className={cn(isSelected && "bg-primary/5")}
														>
															<div className="flex items-center gap-2 flex-1">
																<Avatar className="size-6 !rounded-[0px] text-primary border border-primary">
																	<AvatarFallback className="text-xs !rounded-[0px]">
																		{t.name?.charAt(0)?.toUpperCase() || "T"}
																	</AvatarFallback>
																</Avatar>
																<div className="flex flex-col">
																	<span className="text-sm uppercase tracking-tight">
																		{t.name}
																	</span>
																	{t.user?.email && (
																		<span className="text-xs text-muted-foreground/60">
																			{t.user.email}
																		</span>
																	)}
																</div>
															</div>
															<div className="flex items-center gap-4">
																<Check
																	className={cn(
																		"h-4 w-4",
																		isSelected ? "opacity-100" : "opacity-0",
																	)}
																/>
															</div>
														</CommandItem>
													);
												})}
											</CommandGroup>
										</CommandList>
									</Command>
								</PopoverContent>
							</Popover>
						</Deferred>

						{filterAlerts?.therapists && (
							<p className="mt-2 text-[0.8rem] font-medium text-destructive">
								{filterAlerts.therapists}
							</p>
						)}
					</div>

					<div className="col-span-full md:col-span-1 lg:col-span-1">
						<Popover>
							<PopoverTrigger asChild>
								<Button
									variant="outline"
									id="date-picker-range"
									className="justify-start px-2.5 w-full h-full"
								>
									<CalendarIcon />
									{filters.date?.from ? (
										filters.date.to ? (
											<>
												{format(filters.date.from, "LLL dd, y", {
													in: tzDate,
													locale,
												})}{" "}
												-{" "}
												{format(filters.date.to, "LLL dd, y", {
													in: tzDate,
													locale,
												})}
											</>
										) : (
											format(filters.date.from, "LLL dd, y", {
												in: tzDate,
												locale,
											})
										)
									) : (
										<span>
											{t("filters.date.placeholder", {
												defaultValue: "Select dates...",
											})}
										</span>
									)}
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-auto p-0" align="start">
								<Calendar
									mode="range"
									defaultMonth={filters.date?.from}
									selected={filters.date}
									onSelect={onChangeDateRange}
									numberOfMonths={2}
								/>
							</PopoverContent>
						</Popover>

						{filterAlerts?.date && (
							<p className="mt-2 text-[0.8rem] font-medium text-destructive">
								{filterAlerts.date}
							</p>
						)}
					</div>
				</div>

				<Deferred
					data={["therapistsSchedule"]}
					fallback={<LoadingBasic columnBased />}
				>
					{!selectedTherapistOptions?.length ? (
						<div className="flex items-center justify-center px-3 py-8 border rounded-md border-border bg-background text-muted-foreground">
							<div className="text-center space-y-2">
								<h2 className="text-sm font-semibold">No schedules to show</h2>
								<p className="text-xs text-pretty">
									Select at least one therapist and a date range to preview
									their schedules.
								</p>
							</div>
						</div>
					) : (
						<div className="w-full overflow-x-auto pb-2 snap-x">
							<div className="flex items-start gap-2 min-w-full">
								{selectedTherapistOptions.map((t) => (
									<TherapistScheduleColumn
										key={t.id}
										therapist={t}
										entry={schedulesByTherapist[String(t.id)]}
										isDateWithinFilter={isDateWithinFilter}
										groupAppointmentsByDay={groupAppointmentsByDay}
										globalPageProps={globalPageProps}
									/>
								))}
							</div>
						</div>
					)}
				</Deferred>
			</PageContainer>
		</>
	);
}
