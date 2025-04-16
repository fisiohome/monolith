import { useDateContext } from "@/components/providers/date-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
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
	Sheet,
	SheetClose,
	SheetContent,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import {
	checkPastTimeSlot,
	checkUnder2Hours,
	formatTimeLabel,
	getTherapistAvailabilityForDate,
	INTERVAL_MINUTES,
	SLOT_HEIGHT,
	START_HOUR,
} from "@/hooks/use-calendar-schedule";
import { useIsMobile } from "@/hooks/use-mobile";
import {
	cn,
	debounce,
	generateInitials,
	populateQueryParams,
} from "@/lib/utils";
import type { Appointment } from "@/types/admin-portal/appointment";
import type { Therapist } from "@/types/admin-portal/therapist";
import type { GlobalPageProps } from "@/types/globals";
import type { Metadata } from "@/types/pagy";
import { Deferred, router, usePage } from "@inertiajs/react";
import { format, isSameHour, isToday, parse } from "date-fns";
import {
	CalendarIcon,
	Check,
	ChevronLeft,
	ChevronRight,
	ChevronsUpDown,
	Hash,
} from "lucide-react";
import {
	Fragment,
	useCallback,
	useMemo,
	useState,
	type ComponentProps,
} from "react";
import { useTranslation } from "react-i18next";
import type { SchedulesPageGlobalProps } from "@/pages/AdminPortal/Therapist/Schedules";
import { groupLocationsByCountry } from "@/lib/locations";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import { Calendar } from "@/components/ui/calendar";
import { useHover } from "@uidotdev/usehooks";
import PatientDetailsSection, {
	AppointmentDetailsSection,
	PICDetailsSection,
	TherapistDetailsSection,
} from "./appointment-details";

type GeneralProps = {
	selectedDate: Date;
	therapists: Therapist[];
	timeSlots: string[];
};

// * for calendar container
export interface CalendarContainerProps extends ComponentProps<"div"> {}

export function CalendarContainer({
	className,
	children,
}: CalendarContainerProps) {
	return (
		<div
			className={cn(
				"w-full bg-background border rounded-lg border-border",
				className,
			)}
		>
			{children}
		</div>
	);
}

// * for the date toolbar component
export interface DateToolbarProps
	extends ComponentProps<"div">,
		Pick<GeneralProps, "selectedDate"> {
	actions: {
		goToToday: () => void;
		goToPrevDay: () => void;
		goToNextDay: () => void;
		goToByDate: (value: Date) => void;
	};
}

export function ScheduleDateToolbar({
	className,
	selectedDate,
	actions,
}: DateToolbarProps) {
	const isMobile = useIsMobile();
	const { locale, tzDate } = useDateContext();
	const { t } = useTranslation("translation", {
		keyPrefix: "therapist_schedules",
	});
	const displayedDate = useMemo(
		() => format(selectedDate, "PPPP", { locale, in: tzDate }),
		[selectedDate, locale, tzDate],
	);

	return (
		<div
			className={cn(
				"flex flex-col gap-4 md:flex-row md:items-center",
				className,
			)}
		>
			<div className="flex flex-col items-center gap-2 md:order-last md:flex-row">
				<Button
					variant={isToday(selectedDate) ? "default" : "primary-outline"}
					size={isMobile ? "sm" : "xs"}
					className={cn(isMobile && "w-full")}
					onClick={actions.goToToday}
				>
					{t("date_toolbar.today_btn")}
				</Button>

				<Popover>
					<PopoverTrigger asChild>
						<Button
							variant="primary-outline"
							size="icon"
							className={cn("md:order-first", isMobile && "w-full")}
						>
							<CalendarIcon className="size-4" />
							{selectedDate && isMobile && displayedDate}
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-0" align="center" side="bottom">
						<Calendar
							initialFocus
							mode="single"
							selected={selectedDate}
							onSelect={(value) => {
								if (!value) return;

								actions.goToByDate(value);
							}}
						/>
					</PopoverContent>
				</Popover>
			</div>

			<div className="flex items-center w-full gap-4 md:gap-0">
				<Button
					variant="ghost"
					size="sm"
					className="p-0 size-8 focus:border focus:border-border"
					onClick={actions.goToPrevDay}
				>
					<ChevronLeft />
				</Button>

				<p className="flex-1 font-semibold text-center md:order-first md:ml-4">
					{displayedDate}
				</p>

				<Button
					variant="ghost"
					size="sm"
					className="p-0 size-8 focus:border focus:border-border"
					onClick={actions.goToNextDay}
				>
					<ChevronRight />
				</Button>
			</div>
		</div>
	);
}

// * for the pagination component
export interface SchedulePaginationProps extends ComponentProps<"div"> {
	metadata: Metadata;
	actions: {
		goToPrevpage: () => void;
		goToNextPage: () => void;
	};
}

export function SchedulePagination({
	className,
	metadata,
	actions,
}: SchedulePaginationProps) {
	const { t } = useTranslation("translation", {
		keyPrefix: "therapist_schedules",
	});
	const { t: tp } = useTranslation("translation", {
		keyPrefix: "components.pagination",
	});
	const isPrevDisabled = useMemo(() => !metadata.prev, [metadata.prev]);
	const isNextDisabled = useMemo(() => !metadata.next, [metadata.next]);

	return (
		<div
			className={cn(
				"flex items-center gap-4 justify-between md:justify-end",
				className,
			)}
		>
			<span className="text-sm text-muted-foreground text-nowrap">
				{t("pagination.showing")} {metadata.from}–{metadata.to} {tp("of")}{" "}
				{metadata.count} {t("pagination.therapists")}
			</span>

			<div className="flex gap-2">
				<Button
					variant="outline"
					className="p-0 size-8"
					disabled={isPrevDisabled}
					onClick={actions.goToPrevpage}
				>
					<ChevronLeft />
				</Button>

				<Button
					variant="outline"
					className="p-0 size-8"
					disabled={isNextDisabled}
					onClick={actions.goToNextPage}
				>
					<ChevronRight />
				</Button>
			</div>
		</div>
	);
}

// * for schedule filter data
export function ScheduleFilters() {
	const { props: globalProps, url: pageURL } =
		usePage<SchedulesPageGlobalProps>();
	const locations = useMemo(
		() => globalProps?.filterOptions?.locations,
		[globalProps?.filterOptions?.locations],
	);
	const groupedLocations = useMemo(
		() => groupLocationsByCountry(globalProps?.filterOptions?.locations || []),
		[globalProps?.filterOptions?.locations],
	);
	const [filterBy, setFilterBy] = useState({
		city: globalProps?.adminPortal?.currentQuery?.city || "",
	});
	const updateQueryParams = useCallback(
		debounce((url) => {
			router.get(
				url,
				{},
				{ preserveState: true, only: ["therapists", "params", "adminPortal"] },
			);
		}, 500),
		[],
	);
	const handleFilterBy = useCallback(
		({ value, type }: { value: string; type: keyof typeof filterBy }) => {
			setFilterBy((prev) => ({ ...prev, [type]: value }));
			const { fullUrl } = populateQueryParams(
				pageURL,
				deepTransformKeysToSnakeCase({
					...filterBy,
					[type]: value,
					// null value means reset the another param value
					page: null,
				}),
			);
			updateQueryParams(fullUrl);
		},
		[pageURL, filterBy, updateQueryParams],
	);

	return (
		<div className="grid w-full grid-cols-1 gap-4 md:grid-cols-3 md:gap-2 lg:grid-cols-4">
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
		</div>
	);
}

// * for calendar header component
export interface CalendarHeaderProps
	extends ComponentProps<"div">,
		Pick<GeneralProps, "therapists"> {}

export function CalendarHeader({ className, therapists }: CalendarHeaderProps) {
	const { props: globalProps } = usePage<GlobalPageProps>();

	return (
		<div className={cn("flex sticky top-[64px] z-20 min-h-8", className)}>
			<div className="w-24" /> {/* Empty space for time column */}
			<div className="flex-1">
				<div className="grid grid-flow-col auto-cols-[minmax(200px,1fr)]">
					{therapists.map((t) => (
						<div
							key={t.id}
							className="p-2 space-y-1 text-sm font-semibold tracking-tight truncate border-l shadow bg-background"
						>
							<p className="uppercase">{t.name}</p>

							<div className="flex gap-2">
								<Avatar className="border rounded-lg size-8">
									<AvatarImage src="#" alt={t.name} />
									<AvatarFallback
										className={cn(
											"text-xs rounded-lg",
											t.user.email === globalProps.auth.currentUser?.user.email
												? "bg-primary text-primary-foreground"
												: t.user["isOnline?"]
													? "bg-emerald-700 text-white"
													: "",
										)}
									>
										{generateInitials(t.name)}
									</AvatarFallback>
								</Avatar>

								<div>
									<p className="text-xs font-light truncate">
										{t.service.name.replaceAll("_", " ")}
									</p>
									<p className="text-xs font-light">{t.employmentType}</p>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

// * for calendar body
export interface CalendarBodyContainerProps extends ComponentProps<"div"> {}

export function CalendarBodyContainer({
	className,
	children,
}: CalendarBodyContainerProps) {
	return <div className={cn("flex", className)}>{children}</div>;
}

// * for time slot component
interface TimeSlotProps
	extends ComponentProps<"div">,
		Pick<GeneralProps, "selectedDate"> {
	time: string;
	label: string;
	isPastTime: boolean;
	isCurrentTime: boolean;
}

function TimeSlot({
	className,
	time,
	selectedDate,
	label,
	isPastTime,
	isCurrentTime,
}: TimeSlotProps) {
	const { locale, tzDate } = useDateContext();
	const isTodayDate = useMemo(() => {
		const parsedTime = parse(time, "HH:mm", new Date(selectedDate), {
			locale,
			in: tzDate,
		});
		return isToday(parsedTime);
	}, [locale, tzDate, time, selectedDate]);

	return (
		<div
			className={cn(
				"text-xs text-right p-2",
				className,
				isPastTime && "bg-sidebar text-muted-foreground",
				isCurrentTime && "bg-primary text-primary-foreground font-bold",
				isPastTime && isCurrentTime && !isTodayDate && "bg-primary/50",
			)}
			style={{
				height: `${SLOT_HEIGHT}px`,
			}}
		>
			<p className="uppercase">{label}</p>
		</div>
	);
}

export interface CalendarTimeSlotProps
	extends ComponentProps<"div">,
		Pick<GeneralProps, "selectedDate" | "timeSlots"> {
	currentTimeSlot: string;
}

export function CalendarTimeSlot({
	className,
	selectedDate,
	timeSlots,
	currentTimeSlot,
}: CalendarTimeSlotProps) {
	const { locale, tzDate } = useDateContext();

	return (
		<div className={cn("flex flex-col w-24 bg-background", className)}>
			{timeSlots?.map((time) => {
				return (
					<TimeSlot
						key={time}
						time={time}
						selectedDate={selectedDate}
						label={formatTimeLabel({
							time,
							locale,
							tzDate,
						})}
						isPastTime={checkPastTimeSlot({
							time,
							date: selectedDate,
							locale,
							tzDate,
						})}
						isCurrentTime={time.includes(currentTimeSlot)}
					/>
				);
			})}
		</div>
	);
}

// * for therapist slot component
interface TherapistSlotProps
	extends ComponentProps<"div">,
		Pick<GeneralProps, "selectedDate"> {
	time: string;
	therapist: Therapist;
}

function TherapistSlot({
	className,
	therapist,
	time,
	selectedDate,
}: TherapistSlotProps) {
	const { locale, tzDate } = useDateContext();
	const appointments = useMemo(() => {
		const list = therapist?.activeAppointments?.filter((a) => {
			if (!a?.startTime) return;

			const startTimeParsed = parse(a?.startTime, "HH:mm", new Date());
			const timeSlotParsed = parse(time, "HH:mm", new Date());

			return isSameHour(startTimeParsed, timeSlotParsed);
		});

		return list;
	}, [therapist, time]);
	const isPastTime = useMemo(
		() =>
			checkPastTimeSlot({
				time,
				date: selectedDate,
				locale,
				tzDate,
			}),
		[locale, tzDate, time, selectedDate],
	);

	return (
		<div
			className={cn(
				"relative border-b border-l",
				className,
				isPastTime && "bg-sidebar",
			)}
			style={{
				height: `${SLOT_HEIGHT}px`,
			}}
		>
			{appointments?.map((appointment) => (
				<AppointmentBlock
					key={appointment.id}
					therapist={therapist}
					appointment={appointment}
					isPastTime={isPastTime}
				/>
			))}
		</div>
	);
}

export interface CalendarTherapistSlotProps
	extends ComponentProps<"div">,
		Pick<GeneralProps, "selectedDate" | "therapists" | "timeSlots"> {}

export function CalendarTherapistSlot({
	className,
	therapists,
	timeSlots,
	selectedDate,
}: CalendarTherapistSlotProps) {
	return (
		<div className={cn("flex-1 overflow-x-auto", className)}>
			<div className="grid grid-flow-col auto-cols-[minmax(200px,1fr)] min-w-max">
				{therapists?.map((therapist) => {
					// Determine the availability block for this therapist and selected date.
					const availabilities = getTherapistAvailabilityForDate(
						therapist,
						selectedDate,
					);

					return (
						<div key={therapist.id} className="relative">
							{timeSlots?.map((time) => (
								<TherapistSlot
									key={time}
									time={time}
									therapist={therapist}
									selectedDate={selectedDate}
								/>
							))}

							{!!availabilities?.length &&
								availabilities?.map((availability) => (
									<AvailabilityBlock
										key={`${availability.startTime}-${availability.startTime}`}
										selectedDate={selectedDate}
										startTime={availability.startTime}
										endTime={availability.endTime}
									/>
								))}
						</div>
					);
				})}
			</div>
		</div>
	);
}

// * for the appointment blocks component
export interface AppointmentBlockProps extends ComponentProps<"div"> {
	isPastTime: boolean;
	appointment: Appointment;
	therapist: Therapist;
	slotHeight?: number;
	intervalMinutes?: number;
}

export const AppointmentBlock: React.FC<AppointmentBlockProps> = ({
	appointment,
	therapist,
	isPastTime,
	slotHeight = SLOT_HEIGHT,
	intervalMinutes = INTERVAL_MINUTES,
	className,
}) => {
	const isMobile = useIsMobile();
	const { locale, tzDate } = useDateContext();
	const appointmentTime = useMemo(() => {
		if (!appointment?.startTime || !appointment?.endTime) return "";

		const startTime = formatTimeLabel({
			time: appointment.startTime,
			type: "appointment-block",
			locale,
			tzDate,
		});
		const endTime = formatTimeLabel({
			time: appointment.endTime,
			type: "appointment-block",
			locale,
			tzDate,
		});

		return `${startTime} - ${endTime}`;
	}, [appointment.startTime, appointment.endTime, locale, tzDate]);
	// calculate the height of the component
	const heightBlock = useMemo(() => {
		if (!appointment?.startTime || !appointment?.endTime) return 0;

		const [startH, startM] = appointment.startTime.split(":").map(Number);
		const [endH, endM] = appointment.endTime.split(":").map(Number);

		const start = startH * 60 + startM;
		const end = endH * 60 + endM;
		const duration = end - start;

		const heightPerMinute = slotHeight / intervalMinutes;

		return duration * heightPerMinute;
	}, [appointment.startTime, appointment.endTime, intervalMinutes, slotHeight]);
	// Calculate the top offset based on the minutes past the hour.
	const topOffset = useMemo(() => {
		if (!appointment?.startTime) return 0;

		const [_, startM] = appointment.startTime.split(":").map(Number);

		return (startM / intervalMinutes) * slotHeight;
	}, [appointment.startTime, intervalMinutes, slotHeight]);
	const blockColor = useMemo(() => {
		const pending =
			"text-yellow-800 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-100";
		const cancel = "text-red-800 bg-red-100 dark:bg-red-900 dark:text-red-100";
		const paid =
			"text-emerald-800 bg-emerald-100 dark:bg-emerald-900 dark:text-emerald-100";

		return appointment.status === "pending_patient_approval" ||
			appointment.status === "pending_payment" ||
			appointment.status === "pending_therapist_assignment"
			? pending
			: appointment.status === "cancelled"
				? cancel
				: paid;
	}, [appointment.status]);
	const patientDetails = useMemo(
		() => appointment.patient,
		[appointment.patient],
	);
	const patientMedicalRecord = useMemo(
		() => appointment.patientMedicalRecord,
		[appointment.patientMedicalRecord],
	);
	const therapistDetails = useMemo(() => therapist, [therapist]);
	const picList = useMemo(() => appointment.admins, [appointment.admins]);

	return (
		<Sheet>
			<SheetTrigger asChild>
				<Button
					variant="link"
					className={cn(
						"absolute left-1 right-1 z-20 p-2 rounded shadow cursor-pointer inset-2 border border-border",
						blockColor,
						className,
						isPastTime && "opacity-75",
					)}
					style={{
						top: `${topOffset}px`, // set the offset from the top
						height: `${heightBlock}px`,
					}}
					onClick={() => {
						console.log(appointment);
					}}
				>
					<div className="flex flex-col items-start justify-between w-full h-full text-xs line-clamp-1">
						<p className="flex items-center font-bold truncate">
							<Hash className="!size-3" /> {appointment.registrationNumber}{" "}
							&bull; {patientDetails?.name}
						</p>

						<p className="font-light uppercase">{appointmentTime}</p>
					</div>
				</Button>
			</SheetTrigger>

			<SheetContent
				side={isMobile ? "bottom" : "right"}
				className="max-h-screen p-0 overflow-auto bg-sidebar"
			>
				<div className="flex flex-col w-full h-full px-6">
					<SheetHeader className="flex-none py-6 bg-muted">
						<SheetTitle className="flex items-center">
							<Hash className="!size-3" />
							{appointment.registrationNumber}
						</SheetTitle>
					</SheetHeader>

					<div className="grid flex-1 gap-8 py-4 overflow-y-auto text-sm">
						<AppointmentDetailsSection appointment={appointment} />

						{patientDetails && (
							<PatientDetailsSection
								patientDetails={patientDetails}
								patientMedicalRecord={patientMedicalRecord}
							/>
						)}

						{therapistDetails && (
							<TherapistDetailsSection therapistDetails={therapistDetails} />
						)}

						{!!picList?.length && <PICDetailsSection picList={picList} />}
					</div>

					<SheetFooter className="sticky bottom-0 left-0 flex-none py-6 bg-muted">
						<SheetClose asChild>
							<Button variant="primary-outline">Close</Button>
						</SheetClose>
					</SheetFooter>
				</div>
			</SheetContent>
		</Sheet>
	);
};

// Renders a translucent block representing the therapist's available time slot.
interface AvailabilityBlockProps
	extends ComponentProps<"div">,
		Pick<GeneralProps, "selectedDate"> {
	startTime: string;
	endTime: string;
	slotHeight?: number;
	intervalMinutes?: number;
}
const AvailabilityBlock: React.FC<AvailabilityBlockProps> = ({
	className,
	selectedDate,
	startTime,
	endTime,
	slotHeight = SLOT_HEIGHT,
	intervalMinutes = INTERVAL_MINUTES,
}) => {
	const [ref, hovering] = useHover();
	const { t } = useTranslation("translation", {
		keyPrefix: "therapist_schedules.calendar.block.availability",
	});
	const { locale, tzDate } = useDateContext();
	const heightBlock = useMemo(() => {
		const [startH, startM] = startTime.split(":").map(Number);
		const [endH, endM] = endTime.split(":").map(Number);

		const startTotal = startH * 60 + startM;
		const endTotal = endH * 60 + endM;

		// Clip the start if it's before the visible calendar start.
		const visibleDuration = endTotal - Math.max(startTotal, START_HOUR * 60);
		return (visibleDuration / intervalMinutes) * slotHeight;
	}, [startTime, endTime, intervalMinutes, slotHeight]);
	const topOffset = useMemo(() => {
		const [startH, startM] = startTime.split(":").map(Number);
		const startTotal = startH * 60 + startM;
		// Calculate the visible start (in minutes) from the configured calendar start
		const displayStartTotal = START_HOUR * 60;
		// Adjust so that if startTime equals the calendar START_HOUR, topOffset becomes 0
		return ((startTotal - displayStartTotal) / intervalMinutes) * slotHeight;
	}, [startTime, intervalMinutes, slotHeight]);
	const availableTime = useMemo(() => {
		const start = formatTimeLabel({
			time: startTime,
			type: "appointment-block",
			locale,
			tzDate,
		});
		const end = formatTimeLabel({
			time: endTime,
			type: "appointment-block",
			locale,
			tzDate,
		});

		return `${start} - ${end}`;
	}, [startTime, endTime, locale, tzDate]);
	const isPastTime = useMemo(
		() =>
			checkPastTimeSlot({
				time: startTime,
				date: selectedDate,
				locale,
				tzDate,
			}),
		[locale, tzDate, startTime, selectedDate],
	);
	const isUnder2Hours = useMemo(
		() => checkUnder2Hours(startTime, endTime),
		[startTime, endTime],
	);

	return (
		<div
			ref={ref}
			className={cn(
				"absolute flex flex-col items-start justify-between p-2 text-xs rounded shadow left-1 right-1 inset-1 bg-purple-100/25 text-purple-800 border border-border transition-all",
				className,
				isPastTime && "opacity-75",
				hovering && "-translate-y-4 z-10",
			)}
			style={{
				top: `${topOffset}px`,
				height: `${heightBlock}px`,
			}}
		>
			{!isUnder2Hours ? (
				<>
					<p className="flex items-center font-medium truncate">{t("title")}</p>

					<p className="font-light uppercase">{availableTime}</p>
				</>
			) : (
				<p className="flex items-center font-medium truncate">
					Available ({availableTime.toUpperCase()})
				</p>
			)}
		</div>
	);
};
