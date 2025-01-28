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
import type { AvailabilityFormSchema } from "@/lib/availabilities";
import { cn } from "@/lib/utils";
import type { Therapist } from "@/types/admin-portal/therapist";
import { format } from "date-fns";
import { CalendarIcon, PlusCircle } from "lucide-react";
import { Fragment, useCallback, type ComponentProps } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";

// * for adjusted availability time field

// * for adjusted availability form
export interface AdjustedAvailabilityFormProps extends ComponentProps<"div"> {
	selectedTherapist: Therapist;
}

export default function AdjustedAvailabilityForm({
	className,
	selectedTherapist,
}: AdjustedAvailabilityFormProps) {
	const form = useFormContext<AvailabilityFormSchema>();

	// for the adjusted availability time fields
	const adjustedTimeFields = useFieldArray({
		control: form.control,
		name: "adjustedAvailabilities.times",
		keyName: "uuid",
	});
	// for add the time availability
	const handleAddTime = useCallback(() => {
		adjustedTimeFields.append({ startTime: "", endTime: "" });
	}, [adjustedTimeFields]);

	return (
		<div className={cn("px-1", className)}>
			<Table>
				<TableBody>
					<TableRow className="motion-preset-focus">
						<TableCell>
							<FormField
								control={form.control}
								name="adjustedAvailabilities.specificDate"
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
													selected={new Date(String(field.value))}
													onSelect={field.onChange}
													disabled={(date) => date < new Date()}
													initialFocus
												/>
											</PopoverContent>
										</Popover>

										<FormMessage />
									</FormItem>
								)}
							/>
						</TableCell>

						{adjustedTimeFields?.fields?.length ? (
							adjustedTimeFields?.fields?.map((timeField, timeFieldIndex) => (
								<div key={timeField.uuid}>{timeField.startTime}</div>
							))
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
				</TableBody>
			</Table>

			<div className="px-2 mt-3">
				<Button size="sm">Change a date's availability</Button>
			</div>
		</div>
	);
}
