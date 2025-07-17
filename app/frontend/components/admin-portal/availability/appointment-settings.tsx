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
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
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
									align="start"
									side="bottom"
									className="w-[200px] p-0"
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
														onSelect={() => {
															form.setValue("timeZone", timezone);
														}}
													>
														<Check
															className={cn(
																"mr-2 h-4 w-4",
																timezone === field.value
																	? "opacity-100"
																	: "opacity-0",
															)}
														/>
														{timezone}
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

			<div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
				<Separator className="col-span-full" />

				<div className="mb-2 col-span-full">
					<h3 className="text-sm font-semibold uppercase tracking-wide">
						Availability Rules
					</h3>
				</div>

				<FormField
					control={form.control}
					name="availabilityRules.0.distanceInMeters"
					render={({ field }) => {
						const isDefault = field.value === 25000;
						return (
							<FormItem>
								<div className="flex items-center justify-between">
									<FormLabel>Maximum Distance (in meters)</FormLabel>
									<div className="flex items-center space-x-2">
										<span className="text-xs text-muted-foreground">
											Use default
										</span>
										<Switch
											checked={isDefault}
											onCheckedChange={(checked) => {
												field.onChange(checked ? 25000 : 0);
											}}
											disabled={!selectedTherapist}
										/>
									</div>
								</div>
								<FormControl>
									<Input
										{...field}
										type="number"
										placeholder="Enter value in meters"
										className="[&::-webkit-inner-spin-button]:appearance-none"
										min={0}
										disabled={!selectedTherapist || isDefault}
										onChange={(e) => {
											const value = e.target.value;
											field.onChange(value ? parseInt(value, 10) : 0);
										}}
										value={field.value || 0}
									/>
								</FormControl>
								<FormDescription>
									Use the toggle to apply the default value of 25,000 meters.
									Set to 0 to disable this rule.
								</FormDescription>
								<FormMessage />
							</FormItem>
						);
					}}
				/>

				<FormField
					control={form.control}
					name="availabilityRules.0.durationInMinutes"
					render={({ field }) => {
						const isDefault = field.value === 50;
						return (
							<FormItem>
								<div className="flex items-center justify-between">
									<FormLabel>Maximum Duration (in minutes)</FormLabel>
									<div className="flex items-center space-x-2">
										<span className="text-xs text-muted-foreground">
											Use default
										</span>
										<Switch
											checked={isDefault}
											onCheckedChange={(checked) => {
												field.onChange(checked ? 50 : 0);
											}}
											disabled={!selectedTherapist}
										/>
									</div>
								</div>
								<FormControl>
									<Input
										{...field}
										type="number"
										placeholder="Enter value in minutes"
										className="[&::-webkit-inner-spin-button]:appearance-none"
										min={0}
										disabled={!selectedTherapist || isDefault}
										onChange={(e) => {
											const value = e.target.value;
											field.onChange(value ? parseInt(value, 10) : 0);
										}}
										value={field.value || 0}
									/>
								</FormControl>
								<FormDescription>
									Use the toggle to apply the default value of 50 minutes. Set
									to 0 to disable this rule.
								</FormDescription>
								<FormMessage />
							</FormItem>
						);
					}}
				/>

				<FormField
					control={form.control}
					name="availabilityRules.0.useLocationRules"
					render={({ field }) => (
						<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
							<div className="space-y-0.5">
								<FormLabel>Location Rules</FormLabel>
								<FormDescription>
									Enable location-based availability rules for this therapist.
								</FormDescription>
							</div>
							<FormControl>
								<Switch
									checked={field.value}
									onCheckedChange={field.onChange}
									disabled={!selectedTherapist}
								/>
							</FormControl>
						</FormItem>
					)}
				/>
			</div>
		</div>
	);
}
