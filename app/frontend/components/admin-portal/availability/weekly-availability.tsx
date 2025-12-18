import { useMediaQuery } from "@uidotdev/usehooks";
import { AlertCircle, PlusCircle } from "lucide-react";
import {
	type ComponentProps,
	Fragment,
	useCallback,
	useMemo,
	useState,
} from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AvailabilityFormSchema } from "@/lib/availabilities";
import { IS_MOBILE_MEDIA_QUERY } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Therapist } from "@/types/admin-portal/therapist";
import BaseAvailabilityTimeField from "./time-field";

// * for weekly availability field
interface WeeklyAvailabilityFieldProps extends ComponentProps<"tr"> {
	field: NonNullable<AvailabilityFormSchema["weeklyAvailabilities"]>[number];
	fieldIndex: number;
	selectedTherapist: Therapist | null;
}

function WeeklyAvailabilityField({
	className,
	field,
	fieldIndex,
	selectedTherapist,
}: WeeklyAvailabilityFieldProps) {
	const form = useFormContext<AvailabilityFormSchema>();
	const isMobile = useMediaQuery(IS_MOBILE_MEDIA_QUERY);

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
	const onRemoveTime = useCallback(
		(timeFieldIndex: number) => {
			setRemoved(timeFieldIndex);
			setTimeout(() => {
				setRemoved(null);
				timeAvailabilitiesFields.remove(timeFieldIndex);
				form.trigger("weeklyAvailabilities");
			}, 250);
		},
		[timeAvailabilitiesFields, form.trigger],
	);
	// for add the time availability
	const onAddTime = useCallback(() => {
		timeAvailabilitiesFields.append({ startTime: "", endTime: "" });
	}, [timeAvailabilitiesFields]);
	// for duplicate the time availability
	const onDuplicate = useCallback(
		(weeklyFieldIndex: number) => {
			const currentTimes = watchWeeklyAvailabilities?.[weeklyFieldIndex]?.times;
			const isCurrentTimesValid = currentTimes?.every(
				(time) => !!time.startTime && !!time.endTime,
			);
			if (
				!currentTimes?.length ||
				!isCurrentTimesValid ||
				!watchWeeklyAvailabilities?.length
			) {
				toast.error("This time availability is not valid as a reference");
				return;
			}

			const updatedAvailabilities = watchWeeklyAvailabilities.map(
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
		<TableRow
			className={cn("motion-preset-rebound-down motion-delay-200", className)}
		>
			<TableCell
				className={cn(
					"font-semibold uppercase",
					isTimesFormExist ? "align-top" : "",
				)}
			>
				{isMobile ? field.dayOfWeek.slice(0, 3) : field.dayOfWeek}
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

					<div className="flex flex-col w-full gap-4 lg:gap-2">
						{timeAvailabilitiesFields?.fields?.map(
							(timeField, timeFieldIndex) => (
								<BaseAvailabilityTimeField
									key={timeField.uuid}
									fieldType="weekly"
									parentIndex={fieldIndex}
									timeIndex={timeFieldIndex}
									timeFieldPath={
										`weeklyAvailabilities.${fieldIndex}.times.${timeFieldIndex}` as const
									}
									timesArrayPath={
										`weeklyAvailabilities.${fieldIndex}.times` as const
									}
									isRemoved={removed === timeFieldIndex}
									actions={{
										onAddTime,
										onRemoveTime,
										onDuplicate,
									}}
								/>
							),
						)}
					</div>
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
										disabled={!selectedTherapist}
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
					</TableCell>
				</Fragment>
			)}
		</TableRow>
	);
}

// * for weekly availability form
export interface WeeklyAvailabilityFormProps extends ComponentProps<"div"> {
	selectedTherapist: Therapist | null;
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
