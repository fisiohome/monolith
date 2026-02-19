import { Copy, MinusCircle, PlusCircle, X } from "lucide-react";
import { type ComponentProps, useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AvailabilityFormSchema } from "@/lib/availabilities";
import { cn } from "@/lib/utils";

function TimeInput({
	name,
}: {
	name:
		| `weeklyAvailabilities.${number}.times.${number}.startTime`
		| `adjustedAvailabilities.${number}.times.${number}.startTime`
		| `weeklyAvailabilities.${number}.times.${number}.endTime`
		| `adjustedAvailabilities.${number}.times.${number}.endTime`;
}) {
	const form = useFormContext<AvailabilityFormSchema>();

	return (
		<FormField
			control={form.control}
			name={name}
			render={({ field }) => (
				<FormItem className="w-fit">
					<Input {...field} value={String(field.value || "")} type="time" />
					<FormMessage />
				</FormItem>
			)}
		/>
	);
}

interface ActionButtonsProps extends ComponentProps<"div"> {
	fieldType: "weekly" | "adjusted";
	parentIndex: number;
	timeIndex: number;
	isValid: boolean;
	hasSingleTime: boolean;
	actions: BaseAvailabilityTimeFieldProps["actions"];
}

function ActionButtons({
	className,
	fieldType,
	parentIndex,
	timeIndex,
	isValid,
	hasSingleTime,
	actions,
}: ActionButtonsProps) {
	return (
		<div
			className={cn(
				"flex justify-between md:justify-end gap-2 lg:gap-0",
				className,
			)}
		>
			{/* Duplicate Button (Weekly only) */}
			{fieldType === "weekly" && (
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								type="button"
								size="icon"
								variant="ghost"
								disabled={!isValid}
								className={cn(
									"rounded-full",
									timeIndex === 0 ? "" : "invisible",
								)}
								onClick={(event) => {
									event.preventDefault();
									actions.onDuplicate?.(parentIndex);
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
			)}

			{/* Remove Time Button */}
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
								actions.onRemoveTime(timeIndex);
							}}
						>
							<MinusCircle />
						</Button>
					</TooltipTrigger>
					<TooltipContent>
						<p>
							{hasSingleTime ? "Unavailable all day" : "Remove this time set"}
						</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>

			{/* Add Time Button */}
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							type="button"
							size="icon"
							variant="ghost"
							disabled={!isValid}
							className={cn("rounded-full", timeIndex === 0 ? "" : "invisible")}
							onClick={(event) => {
								event.preventDefault();
								actions.onAddTime();
							}}
						>
							<PlusCircle />
						</Button>
					</TooltipTrigger>
					<TooltipContent>
						<p>Add another time</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>

			{/* Remove Date Button (Adjusted only) */}
			{fieldType === "adjusted" && (
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								type="button"
								size="icon"
								variant="ghost"
								className={cn(
									"rounded-full",
									timeIndex === 0 ? "" : "invisible",
								)}
								onClick={(event) => {
									event.preventDefault();
									actions.onRemoveDate?.(parentIndex);
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
			)}
		</div>
	);
}

export interface BaseAvailabilityTimeFieldProps extends ComponentProps<"div"> {
	fieldType: "weekly" | "adjusted";
	parentIndex: number;
	timeIndex: number;
	timeFieldPath:
		| `weeklyAvailabilities.${number}.times.${number}`
		| `adjustedAvailabilities.${number}.times.${number}`;
	timesArrayPath:
		| `weeklyAvailabilities.${number}.times`
		| `adjustedAvailabilities.${number}.times`;
	actions: {
		onAddTime: () => void;
		onRemoveTime: (index: number) => void;
		onDuplicate?: (parentIndex: number) => void;
		onRemoveDate?: (parentIndex: number) => void;
	};
	isRemoved: boolean;
}

/**
 * Base component for time field management in availability forms
 * Handles both weekly and adjusted availability types with unified logic
 *
 * @prop fieldType - Determines behavior variant (weekly/adjusted)
 * @prop parentIndex - Index of parent container (week/day)
 * @prop timeIndex - Index within the times array
 * @prop timeFieldPath - RHF path to the time field (for form control)
 * @prop timesArrayPath - RHF path to the times array (for validation)
 * @prop actions - Callbacks for time manipulation actions
 * @prop isRemoved - Flag for removal animation state
 */
export default function BaseAvailabilityTimeField({
	className,
	fieldType,
	parentIndex,
	timeIndex,
	timeFieldPath,
	timesArrayPath,
	actions,
	isRemoved,
}: BaseAvailabilityTimeFieldProps) {
	const form = useFormContext<AvailabilityFormSchema>();
	// motion classes for removed component
	const motionClasses = useMemo(
		() =>
			isRemoved
				? "motion-opacity-out-0"
				: "motion-translate-motion-scale-in-0 motion-opacity-in-0 motion-delay-100",
		[isRemoved],
	);
	// Watch time availabilities for the current weekly index
	const timesArray = useWatch({ control: form.control, name: timesArrayPath });
	// Calculate field error
	const timeError = useMemo(() => {
		const errors = form.formState.errors;

		return fieldType === "weekly"
			? (errors?.weeklyAvailabilities?.[parentIndex]?.times?.[timeIndex] ??
					null)
			: (errors?.adjustedAvailabilities?.[parentIndex]?.times?.[timeIndex] ??
					null);
	}, [form.formState.errors, parentIndex, timeIndex, fieldType]);
	// Determine if all time fields are valid
	const isValidAllTimes = useMemo(
		() => !!timesArray?.every((time) => time?.startTime && time?.endTime),
		[timesArray],
	);
	// Check if there is only one time set
	const hasSingleTime = useMemo(() => timesArray?.length === 1, [timesArray]);

	return (
		<div
			className={cn(
				"flex flex-col md:flex-row gap-2",
				className,
				motionClasses,
			)}
		>
			<div className="flex flex-wrap items-center justify-between w-full gap-2 md:justify-normal">
				<TimeInput name={`${timeFieldPath}.startTime` as const} />
				<span className="text-center">—</span>
				<TimeInput name={`${timeFieldPath}.endTime` as const} />

				{timeError && (
					<p className="flex-none w-full text-xs text-destructive text-pretty">
						{timeError.root?.message}
					</p>
				)}

				{fieldType === "adjusted" && (
					<div className="flex-none w-full">
						<FormField
							control={form.control}
							name={`adjustedAvailabilities.${parentIndex}.reason`}
							render={({ field }) => (
								<FormItem>
									<Textarea
										{...field}
										placeholder="Enter the reason (optional)..."
									/>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>
				)}
			</div>

			<ActionButtons
				fieldType={fieldType}
				parentIndex={parentIndex}
				timeIndex={timeIndex}
				isValid={isValidAllTimes && !timeError}
				hasSingleTime={hasSingleTime}
				actions={actions}
			/>
		</div>
	);
}
