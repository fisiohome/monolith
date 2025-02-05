import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { useTimeAPI } from "@/hooks/use-time-api";
import type { AvailabilityFormSchema } from "@/lib/availabilities";
import { cn } from "@/lib/utils";
import type { Therapist } from "@/types/admin-portal/therapist";
import { Check, ChevronsUpDown, LoaderIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { useFormContext } from "react-hook-form";

export interface AppointmentSettingsFormProps extends ComponentProps<"div"> {
	selectedTherapist: Therapist | null;
}

export default function AppointmentSettingsForm({
	className,
	selectedTherapist,
}: AppointmentSettingsFormProps) {
	const form = useFormContext<AvailabilityFormSchema>();
	const { isLoading: isLoadingTimezone, timezones } = useTimeAPI();

	return (
		<div className={cn("px-3 mt-2", className)}>
			<FormField
				control={form.control}
				name="timeZone"
				render={({ field }) => (
					<FormItem className="flex flex-col w-fit">
						<FormLabel>Timezone</FormLabel>
						<FormControl>
							<Popover>
								<PopoverTrigger asChild>
									<FormControl>
										<Button
											variant="outline"
											disabled={isLoadingTimezone || !selectedTherapist}
											className={cn(
												"justify-between field-sizing-content w-fit",
												!field.value && "text-muted-foreground",
											)}
										>
											{isLoadingTimezone ? (
												<>
													<LoaderIcon className="animate-spin" />
													<span>Getting timezones...</span>
												</>
											) : (
												<>
													{field.value
														? timezones.find(
																(timezone) => timezone === field.value,
															)
														: "Select a timezone"}
													<ChevronsUpDown className="opacity-50" />
												</>
											)}
										</Button>
									</FormControl>
								</PopoverTrigger>
								<PopoverContent
									className="p-0 w-fit"
									side="bottom"
									align="start"
								>
									<Command>
										<CommandInput placeholder="Search timezone..." />
										<CommandList>
											<CommandEmpty>No timezone found.</CommandEmpty>
											<CommandGroup>
												{timezones.map((timezone) => (
													<CommandItem
														value={timezone}
														key={timezone}
														disabled
														onSelect={() => {
															form.setValue("timeZone", timezone);
														}}
													>
														{timezone}
														<Check
															className={cn(
																"ml-auto",
																timezone === field.value
																	? "opacity-100"
																	: "opacity-0",
															)}
														/>
													</CommandItem>
												))}
											</CommandGroup>
										</CommandList>
									</Command>
								</PopoverContent>
							</Popover>
						</FormControl>

						<FormMessage />
					</FormItem>
				)}
			/>
		</div>
	);
}
