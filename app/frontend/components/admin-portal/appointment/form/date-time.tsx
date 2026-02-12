import { format, isAfter, isBefore, isEqual, isSameDay, parse } from "date-fns";
import {
	type ComponentProps,
	forwardRef,
	memo,
	useCallback,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from "react";
import { useDateContext } from "@/components/providers/date-provider";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
	type DisabledVisit,
	useAppointmentDateTime,
} from "@/hooks/admin-portal/appointment/use-appointment-utils";
import {
	checkPastTimeSlot,
	generateTimeSlots,
} from "@/hooks/use-calendar-schedule";
import { cn } from "@/lib/utils";

const UNIQUE_TIME_SLOTS = ["09:00", "11:00", "13:00", "16:00", "18:00"];

export const TimeSlotButton = memo(function TimeSlotButton({
	time,
	isSelected,
	isDisabled = false,
	onSelect,
	buttonRef,
}: {
	time: string;
	isSelected: boolean;
	isDisabled?: boolean;
	onSelect?: () => void;
	buttonRef?: React.Ref<HTMLButtonElement>;
}) {
	const { locale, tzDate, timeFormatDateFns } = useDateContext();

	// Optimization: Memoize the formatted time string to avoid recalculation on every render.
	const displayTime = useMemo(() => {
		const slotDate = parse(time, "HH:mm", new Date(), {
			locale,
			in: tzDate,
		});
		return format(slotDate, timeFormatDateFns, {
			locale,
			in: tzDate,
		});
	}, [time, locale, tzDate, timeFormatDateFns]);

	return (
		<Button
			ref={buttonRef}
			type="button"
			variant={isSelected ? "default" : "primary-outline"}
			className={cn("w-full", !isSelected && "bg-sidebar shadow-inner")}
			disabled={isDisabled}
			onClick={(event) => {
				event.preventDefault();
				event.stopPropagation();

				if (onSelect && typeof onSelect === "function") {
					onSelect();
				}
			}}
		>
			{displayTime}
		</Button>
	);
});

export interface DateTimePickerProps extends ComponentProps<"div"> {
	value: Date | null;
	min?: Date | null;
	max?: Date | null;
	disabledVisits?: DisabledVisit[];
	onChangeValue: (...event: any[]) => void;
	callbackOnChange: () => void;
	isAllOfDay?: boolean;
	autoScroll?: boolean;
}

const DateTimePicker = forwardRef<HTMLDivElement, DateTimePickerProps>(
	function DateTimePicker(
		{
			className,
			value,
			min = null,
			max = null,
			disabledVisits = [],
			isAllOfDay = false,
			autoScroll = true,
			onChangeValue,
			callbackOnChange,
		}: DateTimePickerProps,
		ref,
	) {
		const { locale, tzDate } = useDateContext();
		const {
			appointmentDate,
			appointmentDateCalendarProps,
			onSelectAppointmentDate,
			onSelectAppointmentTime,
		} = useAppointmentDateTime({
			sourceValue: { date: value || undefined, isAllOfDay },
			min,
			max,
			disabledVisits,
		});
		const calendarRef = useRef<HTMLDivElement>(null);
		const selectedButtonRef = useRef<HTMLButtonElement>(null);
		const [calendarHeight, setCalendarHeight] = useState<number>(0);
		const [timeGroupType, setTimeGroupType] = useState<"unique" | "basic">(
			"basic",
		);

		// Set up ref forwarding
		useImperativeHandle(ref, () => {
			if (!calendarRef.current) {
				// Create a dummy div as fallback - this should never happen
				// but satisfies TypeScript's type requirements
				return document.createElement("div");
			}
			return calendarRef.current;
		}, []);

		const handleDateSelect = useCallback(
			(date: Date | undefined) => {
				onSelectAppointmentDate(date);
				onChangeValue(date || null);
				callbackOnChange();
			},
			[onSelectAppointmentDate, onChangeValue, callbackOnChange],
		);
		const handleTimeSelect = useCallback(
			(time: string, type: "unique" | "basic") => {
				const date = onSelectAppointmentTime(time);
				if (date) {
					onChangeValue(date);
					callbackOnChange();
					setTimeGroupType(type);
				}
			},
			[onSelectAppointmentTime, onChangeValue, callbackOnChange],
		);
		const selectedTime = useMemo(
			() => (value ? format(value, "HH:mm") : null),
			[value],
		);
		const basicTimeSlots = useMemo(() => generateTimeSlots(30), []);
		const isTimeSlotDisabled = useCallback(
			(time: string): boolean => {
				if (isAllOfDay) {
					return true;
				}

				if (!appointmentDate) {
					return true;
				}

				// Check if this time slot is disabled due to another visit being scheduled
				// A time slot is disabled if it falls within the range [startTime, endTime) of any visit
				const isDisabledByVisit = disabledVisits.some((visit) => {
					const visitDate = new Date(visit.date);
					if (!isSameDay(appointmentDate, visitDate)) return false;

					const slotDate = parse(time, "HH:mm", appointmentDate);
					const visitStartDate = parse(
						visit.startTime,
						"HH:mm",
						appointmentDate,
					);
					const visitEndDate = parse(visit.endTime, "HH:mm", appointmentDate);

					return (
						(isEqual(slotDate, visitStartDate) ||
							isAfter(slotDate, visitStartDate)) &&
						isBefore(slotDate, visitEndDate)
					);
				});

				if (isDisabledByVisit) {
					return true;
				}

				return checkPastTimeSlot({
					time,
					date: appointmentDate,
					dateOpt: { locale, in: tzDate },
				});
			},
			[isAllOfDay, appointmentDate, locale, tzDate, disabledVisits],
		);

		// * measure calendar height whenever it renders or resizes
		useEffect(() => {
			if (!calendarRef.current) return;
			const el = calendarRef.current;

			// Initial measurement
			setCalendarHeight(el.offsetHeight);

			// Watch for dynamic size changes
			const observer = new ResizeObserver(() => {
				setCalendarHeight(el.offsetHeight);
			});
			observer.observe(el);
			return () => observer.disconnect();
		}, []);

		// * auto-scroll selected time into center
		useEffect(() => {
			if (timeGroupType === "unique" || !autoScroll) return;

			if (selectedButtonRef?.current && value && calendarHeight) {
				selectedButtonRef.current.scrollIntoView({
					behavior: "smooth",
					block: "center",
				});
			}
		}, [value, autoScroll, calendarHeight, timeGroupType]);

		return (
			<div ref={calendarRef} className={cn("flex w-full gap-2", className)}>
				<Calendar
					{...appointmentDateCalendarProps}
					mode="single"
					captionLayout="dropdown"
					className="p-1 border rounded-md border-border bg-background"
					selected={
						(appointmentDate ?? value) != null
							? new Date((appointmentDate ?? value) as string | number | Date)
							: undefined
					}
					defaultMonth={value || undefined}
					onSelect={handleDateSelect}
				/>

				<ScrollArea
					style={{ height: calendarHeight }}
					className="w-full h-64 gap-4 py-1 md:w-auto"
				>
					<div className="grid grid-cols-1 gap-2 md:grid-cols-3 xl:grid-cols-5">
						{UNIQUE_TIME_SLOTS.map((time) => (
							<TimeSlotButton
								key={`${time}-unique`}
								time={time}
								isSelected={selectedTime === time}
								isDisabled={isTimeSlotDisabled(time)}
								onSelect={() => handleTimeSelect(time, "unique")}
							/>
						))}
					</div>

					<Separator className="my-4" />

					<div className="grid grid-cols-1 gap-2 md:grid-cols-4 xl:grid-cols-6">
						{basicTimeSlots.map((time) => (
							<TimeSlotButton
								key={time}
								buttonRef={selectedTime === time ? selectedButtonRef : null}
								time={time}
								isSelected={selectedTime === time}
								isDisabled={isTimeSlotDisabled(time)}
								onSelect={() => handleTimeSelect(time, "basic")}
							/>
						))}
					</div>
				</ScrollArea>
			</div>
		);
	},
);

DateTimePicker.displayName = "DateTimePicker";

export default DateTimePicker;
