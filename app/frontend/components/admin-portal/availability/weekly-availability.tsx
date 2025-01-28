import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AvailabilityFormSchema } from "@/lib/availabilities";
import { cn } from "@/lib/utils";
import type { Therapist } from "@/types/admin-portal/therapist";
import { AlertCircle, Copy, MinusCircle, PlusCircle } from "lucide-react";
import {
	type ComponentProps,
	Fragment,
	useCallback,
	useMemo,
	useState,
} from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { toast } from "sonner";

// * for availability time field
interface AvailabilityTimeFieldProps extends ComponentProps<"div"> {
	weeklyField: AvailabilityFormSchema["weeklyAvailabilities"][number];
	weeklyFieldIndex: number;
	timeField: NonNullable<
		AvailabilityFormSchema["weeklyAvailabilities"][number]["times"]
	>[number];
	timeFieldIndex: number;
	actions: {
		isRemoved: boolean;
		handleRemoveTime: (timeFieldIndex: number) => void;
		handleAddTime: () => void;
		handleDuplicateTimes: (weeklyFieldIndex: number) => void;
	};
}

function AvailabilityTimeField({
	className,
	weeklyField: _weeklyField,
	weeklyFieldIndex,
	timeField: _timeField,
	timeFieldIndex,
	actions: { isRemoved, handleAddTime, handleRemoveTime, handleDuplicateTimes },
}: AvailabilityTimeFieldProps) {
	const form = useFormContext<AvailabilityFormSchema>();
	const watchTimeAvailabilities = useWatch({
		control: form.control,
		name: `weeklyAvailabilities.${weeklyFieldIndex}.times`,
	});
	const isValidTimeFields = useMemo(
		() =>
			!!watchTimeAvailabilities?.every(
				(time) => time?.startTime && time?.endTime,
			),
		[watchTimeAvailabilities],
	);

	return (
		<div
			className={cn(
				"flex gap-2",
				className,
				isRemoved
					? "motion-opacity-out-0"
					: "motion-translate-motion-scale-in-0 motion-opacity-in-0 motion-delay-100",
			)}
		>
			<div className="flex items-center w-full space-x-2">
				<FormField
					control={form.control}
					name={`weeklyAvailabilities.${weeklyFieldIndex}.times.${timeFieldIndex}.startTime`}
					render={({ field }) => (
						<FormItem className="w-fit">
							<Input
								{...field}
								value={String(field?.value || "")}
								type="time"
							/>

							<FormMessage />
						</FormItem>
					)}
				/>

				<span>-</span>

				<FormField
					control={form.control}
					name={`weeklyAvailabilities.${weeklyFieldIndex}.times.${timeFieldIndex}.endTime`}
					render={({ field }) => (
						<FormItem className="w-fit">
							<Input
								{...field}
								value={String(field?.value || "")}
								type="time"
							/>

							<FormMessage />
						</FormItem>
					)}
				/>
			</div>

			<div className="flex justify-end">
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								type="button"
								size="icon"
								variant="ghost"
								disabled={!isValidTimeFields}
								className={cn(
									"rounded-full",
									timeFieldIndex === 0 ? "" : "invisible",
								)}
								onClick={(event) => {
									event.preventDefault();
									handleDuplicateTimes(weeklyFieldIndex);
								}}
							>
								<Copy />
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p>Apply time to all</p>
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
									handleRemoveTime(timeFieldIndex);
								}}
							>
								<MinusCircle />
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p>Change to unavailable</p>
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
								disabled={!isValidTimeFields}
								className={cn(
									"rounded-full",
									timeFieldIndex === 0 ? "" : "invisible",
								)}
								onClick={(event) => {
									event.preventDefault();
									handleAddTime();
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
			</div>
		</div>
	);
}

// * for weekly availability field
interface WeeklyAvailabilityFieldProps extends ComponentProps<"tr"> {
	field: AvailabilityFormSchema["weeklyAvailabilities"][number];
	fieldIndex: number;
	selectedTherapist: Therapist;
}

function WeeklyAvailabilityField({
	className,
	field,
	fieldIndex,
	selectedTherapist,
}: WeeklyAvailabilityFieldProps) {
	const form = useFormContext<AvailabilityFormSchema>();

	// for weekly availability fields
	const watchWeeklyAvailabilities = useWatch({
		control: form.control,
		name: "weeklyAvailabilities",
	});

	// for time availability fields
	const formAvailabilityTimeError = useMemo(() => {
		return form.formState.errors?.weeklyAvailabilities?.[fieldIndex]?.times
			?.root?.message;
	}, [
		fieldIndex,
		form.formState.errors?.weeklyAvailabilities?.[fieldIndex]?.times?.root
			?.message,
	]);
	const timeAvailabilitiesFields = useFieldArray({
		control: form.control,
		name: `weeklyAvailabilities.${fieldIndex}.times`,
		keyName: "uuid",
	});
	const isTimesFormExist = useMemo(
		() => !!timeAvailabilitiesFields?.fields?.length,
		[timeAvailabilitiesFields?.fields?.length],
	);
	// for remove the time availability
	const [removed, setRemoved] = useState<number | null>(null);
	const handleRemoveTime = useCallback(
		(timeFieldIndex: number) => {
			setRemoved(timeFieldIndex);
			setTimeout(() => {
				timeAvailabilitiesFields.remove(timeFieldIndex);
				setRemoved(null);
			}, 250);
		},
		[timeAvailabilitiesFields],
	);
	// for add the time availability
	const handleAddTime = useCallback(() => {
		timeAvailabilitiesFields.append({ startTime: "", endTime: "" });
	}, [timeAvailabilitiesFields]);
	// for duplicate the time availability
	const handleDuplicateTimes = useCallback(
		(weeklyFieldIndex: number) => {
			const currentTimes = watchWeeklyAvailabilities?.[weeklyFieldIndex]?.times;
			const isCurrentTimesValid = currentTimes?.every(
				(time) => !!time.startTime && !!time.endTime,
			);
			if (!currentTimes?.length || !isCurrentTimesValid) {
				toast.error("This time availability is not valid as a reference");
				return;
			}

			const updatedAvailabilities = watchWeeklyAvailabilities?.map(
				(week, index) =>
					index !== weeklyFieldIndex && week?.times?.length
						? { ...week, times: currentTimes }
						: week,
			);

			form.setValue("weeklyAvailabilities", updatedAvailabilities);
			form.trigger("weeklyAvailabilities");
		},
		[watchWeeklyAvailabilities, form.setValue, form.trigger],
	);

	return (
		<TableRow className={cn("motion-preset-focus", className)}>
			<TableCell
				className={cn(
					"font-semibold uppercase",
					isTimesFormExist ? "align-top" : "",
				)}
			>
				{field.dayOfWeek}
			</TableCell>

			{selectedTherapist && timeAvailabilitiesFields?.fields?.length ? (
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

					{timeAvailabilitiesFields?.fields?.map(
						(timeField, timeFieldIndex) => (
							<AvailabilityTimeField
								key={timeField.uuid}
								weeklyField={field}
								weeklyFieldIndex={fieldIndex}
								timeField={timeField}
								timeFieldIndex={timeFieldIndex}
								actions={{
									isRemoved: removed === timeFieldIndex,
									handleAddTime,
									handleRemoveTime,
									handleDuplicateTimes,
								}}
							/>
						),
					)}
				</TableCell>
			) : (
				<Fragment>
					<TableCell>Unavailable</TableCell>
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
											handleAddTime();
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
					</TableCell>
				</Fragment>
			)}
		</TableRow>
	);
}

// * for weekly availability form
export interface WeeklyAvailabilityFormProps extends ComponentProps<"div"> {
	selectedTherapist: Therapist;
}

export default function WeeklyAvailabilityForm({
	className,
	selectedTherapist,
}: WeeklyAvailabilityFormProps) {
	const form = useFormContext<AvailabilityFormSchema>();

	// for the weekly availability form fields
	const formWeeklyAvailabilityError = useMemo(() => {
		return form.formState.errors?.weeklyAvailabilities?.root?.message;
	}, [form.formState.errors?.weeklyAvailabilities?.root?.message]);
	const weeklyAvailabilitiesFields = useFieldArray({
		name: "weeklyAvailabilities",
		control: form.control,
		keyName: "uuid",
	});

	return (
		<div className={cn("px-1", className)}>
			{formWeeklyAvailabilityError && (
				<Alert variant="destructive" className="mx-2 mb-4">
					<AlertCircle className="size-4" />
					<AlertTitle className="text-xs">Error</AlertTitle>
					<AlertDescription className="text-xs">
						{formWeeklyAvailabilityError}
					</AlertDescription>
				</Alert>
			)}

			<Table>
				<TableBody>
					{weeklyAvailabilitiesFields.fields.map(
						(weeklyField, weeklyFieldIndex) => (
							<WeeklyAvailabilityField
								key={weeklyField.uuid}
								selectedTherapist={selectedTherapist}
								field={weeklyField}
								fieldIndex={weeklyFieldIndex}
							/>
						),
					)}
				</TableBody>
			</Table>
		</div>
	);
}
