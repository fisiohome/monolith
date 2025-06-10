import { useDateContext } from "@/components/providers/date-provider";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAppointmentDateTime } from "@/hooks/admin-portal/appointment/use-appointment-utils";
import { generateTimeSlots } from "@/hooks/use-calendar-schedule";
import { cn } from "@/lib/utils";
import { format, parse } from "date-fns";
import { type ComponentProps, useEffect, useRef, useState } from "react";

export interface DateTimePickerProps extends ComponentProps<"div"> {
	value: Date | null;
	min?: Date | null;
	max?: Date | null;
	onChangeValue: (...event: any[]) => void;
	callbackOnChange: () => void;
}

export default function DateTimePicker({
	className,
	value,
	min = null,
	max = null,
	onChangeValue,
	callbackOnChange,
}: DateTimePickerProps) {
	const { locale, tzDate, timeFormatDateFns } = useDateContext();
	const {
		appointmentDate,
		appointmentDateCalendarProps,
		onSelectAppointmentDate,
		onSelectAppointmentTime,
	} = useAppointmentDateTime({
		sourceValue: value || undefined,
		min,
		max,
	});
	const calendarRef = useRef<HTMLDivElement>(null);
	const selectedButtonRef = useRef<HTMLButtonElement>(null);
	const [calendarHeight, setCalendarHeight] = useState<number>(0);
	const [timeGroupType, setTimeGroupType] = useState<"unique" | "basic">(
		"basic",
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
		if (timeGroupType === "unique") return;

		if (selectedButtonRef?.current && value && calendarHeight) {
			selectedButtonRef.current.scrollIntoView({
				behavior: "smooth",
				block: "center",
			});
		}
	}, [value, calendarHeight, timeGroupType]);

	return (
		<div ref={calendarRef} className={cn("flex w-full gap-2", className)}>
			<Calendar
				{...appointmentDateCalendarProps}
				initialFocus
				mode="single"
				captionLayout="dropdown"
				className="p-1 border rounded-md border-border bg-background"
				selected={
					(appointmentDate ?? value) != null
						? new Date((appointmentDate ?? value) as string | number | Date)
						: undefined
				}
				defaultMonth={value || undefined}
				onSelect={(date) => {
					onSelectAppointmentDate(date);
					onChangeValue(date || null);
					callbackOnChange();
				}}
			/>

			<ScrollArea
				style={{ height: calendarHeight }}
				className="w-full h-64 gap-4 py-1 md:w-auto"
			>
				{["09:00", "11:00", "13:00", "16:00", "18:00"].map((time) => {
					const isSelected = value && format(value, "HH:mm") === time;
					const slotDate = parse(time, "HH:mm", new Date(), {
						locale,
						in: tzDate,
					});
					const displayTime = format(slotDate, timeFormatDateFns, {
						locale,
						in: tzDate,
					});

					return (
						<div key={`${time}-unique`} className="flex flex-col">
							<Button
								variant={isSelected ? "default" : "primary-outline"}
								className={cn("w-full mb-1", !isSelected && "bg-sidebar")}
								onClick={(event) => {
									event.preventDefault();

									const date = onSelectAppointmentTime(time);
									if (date) {
										onChangeValue(date);
										callbackOnChange();
										setTimeGroupType("unique");
									}
								}}
							>
								{displayTime}
							</Button>
						</div>
					);
				})}

				<Separator className="my-4" />

				{generateTimeSlots(15).map((time) => {
					const isSelected = value && format(value, "HH:mm") === time;
					const slotDate = parse(time, "HH:mm", new Date(), {
						locale,
						in: tzDate,
					});
					const displayTime = format(slotDate, timeFormatDateFns, {
						locale,
						in: tzDate,
					});

					return (
						<div key={time} className="flex flex-col">
							<Button
								ref={isSelected ? selectedButtonRef : null}
								variant={isSelected ? "default" : "primary-outline"}
								className={cn("w-full mb-1", !isSelected && "bg-sidebar")}
								onClick={(event) => {
									event.preventDefault();

									const date = onSelectAppointmentTime(time);
									if (date) {
										onChangeValue(date);
										callbackOnChange();
										setTimeGroupType("basic");
									}
								}}
							>
								{displayTime}
							</Button>
						</div>
					);
				})}
			</ScrollArea>
		</div>
	);
}

// export default function DateTimePicker() {
// 	return (
// 		<div className="grid w-full grid-cols-3 gap-4">
// 			<FormField
// 				control={form.control}
// 				name="appointmentDateTime"
// 				render={({ field }) => (
// 					<FormItem className="col-span-2">
// 						<FormLabel>Appointment Date</FormLabel>
// 						<Popover
// 							open={isOpenAppointmentDate}
// 							onOpenChange={setIsOpenAppointmentDate}
// 						>
// 							<PopoverTrigger asChild>
// 								<FormControl>
// 									<Button
// 										variant={"outline"}
// 										className={cn(
// 											"relative w-full pl-3 text-left font-normal shadow-inner bg-sidebar",
// 											!field.value && "text-muted-foreground",
// 										)}
// 									>
// 										<p className="truncate">
// 											{field?.value
// 												? format(field.value, "PPPP")
// 												: "Pick a appointment date"}
// 										</p>

// 										{field.value ? (
// 											// biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
// 											<div
// 												className="cursor-pointer"
// 												onClick={(event) => {
// 													event.preventDefault();
// 													event.stopPropagation();

// 													onSelectAppointmentDate(undefined);
// 													field.onChange(null);
// 												}}
// 											>
// 												<X className="opacity-50" />
// 											</div>
// 										) : (
// 											<CalendarIcon className="w-4 h-4 ml-auto opacity-75" />
// 										)}
// 									</Button>
// 								</FormControl>
// 							</PopoverTrigger>
// 							<PopoverContent
// 								className="w-auto p-0"
// 								align="start"
// 								side="bottom"
// 							>
// 								<Calendar
// 									{...appointmentDateCalendarProps}
// 									initialFocus
// 									mode="single"
// 									captionLayout="dropdown"
// 									selected={
// 										(appointmentDate ?? field?.value) != null
// 											? new Date(
// 													(appointmentDate ?? field.value) as
// 														| string
// 														| number
// 														| Date,
// 												)
// 											: undefined
// 									}
// 									defaultMonth={field?.value || undefined}
// 									onSelect={(date) => {
// 										onSelectAppointmentDate(date);
// 										field.onChange(date || null);
// 									}}
// 								/>
// 							</PopoverContent>
// 						</Popover>

// 						<FormMessage />
// 					</FormItem>
// 				)}
// 			/>

// 			<FormField
// 				control={form.control}
// 				name="appointmentDateTime"
// 				render={({ field }) => (
// 					<FormItem className="col-span-1">
// 						<FormLabel className="invisible">Time</FormLabel>
// 						<FormControl>
// 							<Select
// 								value={appointmentTime}
// 								onValueChange={(time) => {
// 									const date = onSelectAppointmentTime(time);
// 									if (date) {
// 										field.onChange(date);
// 									}
// 								}}
// 							>
// 								<SelectTrigger
// 									className={cn(
// 										"shadow-inner bg-sidebar focus:ring-0 w-[100px] focus:ring-offset-0",
// 										!appointmentDate && "text-muted-foreground",
// 									)}
// 								>
// 									<SelectValue placeholder="Time" />
// 								</SelectTrigger>
// 								<SelectContent>
// 									<ScrollArea className="h-[15rem]">
// 										{generateTimeSlots(15).map((time) => (
// 											<SelectItem key={time} value={time}>
// 												{time}
// 											</SelectItem>
// 										))}
// 										{/* {Array.from({ length: 96 }).map((_, i) => {
//                             const hour = Math.floor(i / 4)
//                               .toString()
//                               .padStart(2, "0");
//                             const minute = ((i % 4) * 15)
//                               .toString()
//                               .padStart(2, "0");
//                             return (
//                               <SelectItem
//                                 key={String(i)}
//                                 value={`${hour}:${minute}`}
//                               >
//                                 {hour}:{minute}
//                               </SelectItem>
//                             );
//                           })} */}
// 									</ScrollArea>
// 								</SelectContent>
// 							</Select>
// 						</FormControl>
// 					</FormItem>
// 				)}
// 			/>
// 		</div>
// 	);
// }
