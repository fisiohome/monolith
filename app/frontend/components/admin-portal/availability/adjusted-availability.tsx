import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	FormControl,
	FormField,
	FormItem,
	FormMessage,
} from "@/components/ui/form";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { AvailabilityFormSchema } from "@/lib/availabilities";
import { cn } from "@/lib/utils";
import type { Therapist } from "@/types/admin-portal/therapist";
import { format, isSameDay } from "date-fns";
import { AlertCircle, CalendarIcon, PlusCircle, X } from "lucide-react";
import {
	type ComponentProps,
	Fragment,
	useCallback,
	useMemo,
	useState,
} from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import BaseAvailabilityTimeField from "./time-field";

// * for adjusted availability date field
interface AdjustedDateFieldProps extends ComponentProps<"tr"> {
	field: {
		data: NonNullable<AvailabilityFormSchema["adjustedAvailabilities"]>[number];
		index: number;
	};
	actions: {
		isRemoved: boolean;
		onRemoveDate: (index: number) => void;
	};
}

function AdjustedDateField({
	className,
	field,
	actions: { isRemoved, onRemoveDate },
}: AdjustedDateFieldProps) {
	const form = useFormContext<AvailabilityFormSchema>();

	// for weekly availability fields
	const watchAdjustedDates = useWatch({
		control: form.control,
		name: "adjustedAvailabilities",
	});
	const formAvailabilityTimeError = useMemo(() => {
		return form.formState.errors?.adjustedAvailabilities?.[field.index]?.times
			?.root?.message;
	}, [
		field.index,
		form.formState.errors?.adjustedAvailabilities?.[field.index]?.times?.root
			?.message,
	]);
	const getDisabledCalendarDates = useCallback(
		(date: Date) =>
			date < new Date() ||
			!!watchAdjustedDates?.some(
				(adjDate) =>
					adjDate.specificDate && isSameDay(date, adjDate.specificDate),
			),
		[watchAdjustedDates],
	);

	// for the adjusted availability time fields
	const adjustedTimeFields = useFieldArray({
		control: form.control,
		name: `adjustedAvailabilities.${field.index}.times`,
		keyName: "uuid",
	});
	const watchAdjustedTimes = useWatch({
		control: form.control,
		name: `adjustedAvailabilities.${field.index}.times`,
	});
	// for add the time availability
	const onAddTime = useCallback(() => {
		adjustedTimeFields.append({ startTime: "", endTime: "" });
	}, [adjustedTimeFields]);
	// for remove the time availability
	const [removed, setRemoved] = useState<number | null>(null);
	const onRemoveTime = useCallback(
		(index: number) => {
			setRemoved(index);
			setTimeout(() => {
				adjustedTimeFields.remove(index);
				setRemoved(null);
			}, 250);
		},
		[adjustedTimeFields],
	);

	return (
		<TableRow
			className={cn(
				"",
				className,
				isRemoved
					? "motion-opacity-out-0"
					: "motion-translate-motion-scale-in-0 motion-opacity-in-0 motion-delay-100",
			)}
		>
			<TableCell className={cn(watchAdjustedTimes?.length ? "align-top" : "")}>
				<FormField
					control={form.control}
					name={`adjustedAvailabilities.${field.index}.specificDate`}
					render={({ field }) => (
						<FormItem className="field-sizing-content">
							<Popover>
								<PopoverTrigger asChild>
									<FormControl>
										<Button
											variant={"outline"}
											className={cn(
												"pl-3 text-left font-normal",
												!field.value && "text-muted-foreground",
											)}
										>
											{field.value ? (
												format(new Date(String(field.value)), "PPP")
											) : (
												<span className="text-muted-foreground">
													Pick a date
												</span>
											)}
											<CalendarIcon className="ml-auto size-4 text-muted-foreground" />
										</Button>
									</FormControl>
								</PopoverTrigger>
								<PopoverContent className="w-auto p-0" align="start">
									<Calendar
										mode="single"
										selected={field?.value || undefined}
										onSelect={field.onChange}
										disabled={(date) => getDisabledCalendarDates(date)}
										initialFocus={true}
									/>
								</PopoverContent>
							</Popover>

							<FormMessage />
						</FormItem>
					)}
				/>
			</TableCell>

			{adjustedTimeFields?.fields?.length ? (
				<TableCell colSpan={2} className="space-y-2">
					{formAvailabilityTimeError && (
						<Alert variant="destructive" className="mb-4">
							<AlertCircle className="size-4" />
							<AlertTitle className="text-xs">Error</AlertTitle>
							<AlertDescription className="text-xs">
								{formAvailabilityTimeError}
							</AlertDescription>
						</Alert>
					)}

					{adjustedTimeFields?.fields?.map((timeField, timeFieldIndex) => (
						<BaseAvailabilityTimeField
							key={timeField.uuid}
							fieldType="adjusted"
							parentIndex={field.index}
							timeIndex={timeFieldIndex}
							timeFieldPath={
								`adjustedAvailabilities.${field.index}.times.${timeFieldIndex}` as const
							}
							timesArrayPath={
								`adjustedAvailabilities.${field.index}.times` as const
							}
							isRemoved={removed === timeFieldIndex}
							actions={{
								onAddTime,
								onRemoveTime,
								onRemoveDate,
							}}
						/>
					))}
				</TableCell>
			) : (
				<Fragment>
					<TableCell className="font-light text-muted-foreground">
						Unavailable
					</TableCell>
					<TableCell className="flex justify-end">
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										type="button"
										size="icon"
										variant="ghost"
										className="rounded-full"
										onClick={(event) => {
											event.preventDefault();
											onAddTime();
										}}
									>
										<PlusCircle />
									</Button>
								</TooltipTrigger>

								<TooltipContent>
									<p>Add another time to this day</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										type="button"
										size="icon"
										variant="ghost"
										className="rounded-full"
										onClick={(event) => {
											event.preventDefault();
											onRemoveDate(field.index);
										}}
									>
										<X />
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>Remove this day</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</TableCell>
				</Fragment>
			)}
		</TableRow>
	);
}

// * for adjusted availability form
export interface AdjustedAvailabilityFormProps extends ComponentProps<"div"> {
	selectedTherapist: Therapist | null;
}

export default function AdjustedAvailabilityForm({
	className,
	selectedTherapist,
}: AdjustedAvailabilityFormProps) {
	const form = useFormContext<AvailabilityFormSchema>();

	// for the adjusted date fields
	const adjustedDateFields = useFieldArray({
		control: form.control,
		name: "adjustedAvailabilities",
		keyName: "uuid",
	});
	const watchAdjustedDates = useWatch({
		control: form.control,
		name: "adjustedAvailabilities",
	});
	// to check if all fields are filled (date and times)
	const isAllFieldsFilled = useMemo(() => {
		return (
			!watchAdjustedDates?.length ||
			watchAdjustedDates.every(
				(date) =>
					date?.specificDate &&
					(!date?.times?.length ||
						date.times.every((time) => time.startTime && time.endTime)),
			)
		);
	}, [watchAdjustedDates]);
	// for add the date availability
	const handleAddDate = useCallback(() => {
		adjustedDateFields.append({ specificDate: null, times: null });
	}, [adjustedDateFields]);
	// for remove the date availability
	const [removed, setRemoved] = useState<number | null>(null);
	const onRemoveDate = useCallback(
		(index: number) => {
			setRemoved(index);
			setTimeout(() => {
				adjustedDateFields.remove(index);
				setRemoved(null);
			}, 250);
		},
		[adjustedDateFields],
	);

	return (
		<div className={cn("px-1", className)}>
			<Table>
				<TableBody>
					{selectedTherapist &&
						adjustedDateFields?.fields?.map((dateField, dateFieldIndex) => (
							<AdjustedDateField
								key={dateField.uuid}
								field={{
									data: dateField,
									index: dateFieldIndex,
								}}
								actions={{
									isRemoved: removed === dateFieldIndex,
									onRemoveDate,
								}}
							/>
						))}
				</TableBody>
			</Table>

			<div className="px-2 mt-3">
				<Button
					type="button"
					size="sm"
					variant="secondary"
					disabled={!selectedTherapist || !isAllFieldsFilled}
					onClick={(event) => {
						event.preventDefault();
						handleAddDate();
					}}
				>
					Change a date's availability
				</Button>
			</div>
		</div>
	);
}
