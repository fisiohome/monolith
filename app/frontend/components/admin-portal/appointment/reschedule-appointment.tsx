import { Button } from "@/components/ui/button";
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
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { getGenderIcon } from "@/hooks/use-gender";
import { cn } from "@/lib/utils";
import { Deferred } from "@inertiajs/react";
import {
	AlertCircle,
	Check,
	ChevronsRight,
	ChevronsUpDown,
	Hospital,
	LoaderIcon,
	User,
	X,
} from "lucide-react";
import { type ComponentProps, memo } from "react";
import {
	useFormActionButtons,
	useRescheduleFields,
} from "@/hooks/admin-portal/appointment/use-reschedule-form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DEFAULT_VALUES_THERAPIST } from "@/lib/appointments/form";
import { Textarea } from "@/components/ui/textarea";
import DateTimePicker from "./form/date-time";
import HereMap from "@/components/shared/here-map";

export interface FormActionButtonsprops extends ComponentProps<"div"> {
	isLoading: boolean;
}

export const FormActionButtons = memo(function Component({
	className,
	isLoading,
}: FormActionButtonsprops) {
	const { isDekstop, onBackRoute } = useFormActionButtons();

	return (
		<div
			className={cn(
				"flex flex-col w-full gap-4 lg:gap-2 md:flex-row col-span-full bg-background p-4 md:p-6 border shadow-inner border-border rounded-xl",
				className,
			)}
		>
			<Button
				type="button"
				size={!isDekstop ? "default" : "sm"}
				variant="accent-outline"
				disabled={isLoading}
				onClick={(event) => {
					event.preventDefault();
					onBackRoute();
				}}
			>
				Back
			</Button>

			<Button
				type="submit"
				size={!isDekstop ? "default" : "sm"}
				disabled={isLoading}
				className="order-first md:order-last"
			>
				{isLoading ? (
					<>
						<LoaderIcon className="animate-spin" />
						<span>Saving...</span>
					</>
				) : (
					<span>Save</span>
				)}
			</Button>
		</div>
	);
});

// * for fields components
export interface RescheduleFieldsProps extends ComponentProps<"div"> {}

export const RescheduleFields = memo(function Component({
	className,
}: RescheduleFieldsProps) {
	const {
		form,
		preferredTherapistGenderOption,
		watchAppointmentDateTimeValue,
		isLoading,
		errorsServerValidation,
		therapistsOptions,
		isTherapistFound,
		mapRef,
		coordinate,
		mapAddress,
		brandPackagesSource,
		onFindTherapists,
		onSelectTherapist,
		onResetAllTherapistState,
	} = useRescheduleFields();

	return (
		<div
			className={cn(
				"grid grid-cols-1 gap-4 p-4 border shadow-inner md:grid-cols-2 md:p-6 border-border rounded-xl bg-background",
				className,
			)}
		>
			<div className="p-3 text-sm border rounded-md shadow-inner border-input bg-sidebar col-span-full">
				<div className="flex items-center gap-3">
					<Avatar className="border rounded-lg border-black/10 bg-muted size-12">
						<AvatarImage src="#" />
						<AvatarFallback>
							<Hospital className="flex-shrink-0 size-5 text-muted-foreground/75" />
						</AvatarFallback>
					</Avatar>

					<div className="grid text-sm line-clamp-1">
						<p className="font-semibold uppercase truncate">
							{brandPackagesSource.brandName}
						</p>

						<div className="flex items-center gap-1 mt-2 text-xs">
							<p className="font-light text-pretty">
								<span className="uppercase">
									{brandPackagesSource.packageName}
								</span>
								<span className="mx-2">&#x2022;</span>
								<span className="italic font-light">
									{brandPackagesSource.packageVisit}
								</span>
							</p>
						</div>
					</div>
				</div>
			</div>

			<Deferred
				data={["optionsData"]}
				fallback={
					<div className="flex flex-col self-end gap-3 col-span-full">
						<Skeleton className="w-10 h-4 rounded-md" />
						<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
							<Skeleton className="relative w-full rounded-md h-9" />
							<Skeleton className="relative w-full rounded-md h-9" />
							<Skeleton className="relative w-full rounded-md h-9" />
						</div>
					</div>
				}
			>
				<FormField
					control={form.control}
					name="preferredTherapistGender"
					render={({ field }) => (
						<FormItem className="space-y-3 col-span-full">
							<FormLabel>Preferred Therapist Gender</FormLabel>
							<FormControl>
								<RadioGroup
									onValueChange={(value) => {
										field.onChange(value);
										onResetAllTherapistState();
									}}
									defaultValue={field.value}
									orientation="horizontal"
									className="grid grid-cols-1 gap-4 md:grid-cols-3"
								>
									{preferredTherapistGenderOption.map((gender) => (
										<FormItem
											key={gender}
											className="flex items-start p-3 space-x-3 space-y-0 border rounded-md shadow-inner border-input bg-sidebar"
										>
											<FormControl>
												<RadioGroupItem value={gender} />
											</FormControl>
											<FormLabel className="flex items-center gap-1 font-normal capitalize">
												{getGenderIcon(gender)}
												<span>{gender.toLowerCase()}</span>
											</FormLabel>
										</FormItem>
									))}
								</RadioGroup>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
			</Deferred>

			{!therapistsOptions?.feasible?.length && isTherapistFound && (
				<Alert
					variant="destructive"
					className="col-span-full motion-preset-rebound-down"
				>
					<AlertCircle className="w-4 h-4" />
					<AlertTitle>Therapist not found</AlertTitle>
					<AlertDescription>
						There are no therapists available for the selected appointment date
						and time. Please choose a different date or time.
					</AlertDescription>
				</Alert>
			)}

			<FormField
				control={form.control}
				name="appointmentDateTime"
				render={({ field }) => (
					<FormItem>
						<FormLabel>Appointment Date</FormLabel>

						<DateTimePicker
							value={field.value}
							onChangeValue={field.onChange}
							callbackOnChange={() => {
								// reset all therapist and isoline maps state
								onResetAllTherapistState();
							}}
						/>

						<FormMessage />
					</FormItem>
				)}
			/>

			<div className="grid gap-3 col-span-full">
				<Button
					type="button"
					effect="shine"
					iconPlacement="right"
					icon={ChevronsRight}
					disabled={!watchAppointmentDateTimeValue}
					onClick={(event) => {
						event.preventDefault();
						onFindTherapists();
					}}
				>
					Find the Available Therapists
				</Button>

				<HereMap
					ref={mapRef}
					coordinate={coordinate}
					address={{ ...mapAddress }}
					options={{ disabledEvent: false }}
					className="col-span-full"
				/>
			</div>

			<FormField
				control={form.control}
				name="therapist.name"
				render={({ field }) => {
					const selectedTherapist = therapistsOptions?.feasible?.find(
						(t) => t.name === field.value,
					);

					return (
						<FormItem>
							<FormLabel className="text-nowrap">Therapist</FormLabel>
							<Popover>
								<PopoverTrigger asChild>
									<FormControl>
										<Button
											variant="outline"
											className={cn(
												"relative w-full flex justify-between font-normal bg-sidebar shadow-inner",
												!field.value && "text-muted-foreground",
											)}
										>
											{field.value ? (
												<span className="uppercase">
													{selectedTherapist?.name || field.value}
												</span>
											) : (
												<span>Select therapist</span>
											)}

											{field.value ? (
												// biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
												<div
													className="cursor-pointer"
													onClick={(event) => {
														event.preventDefault();
														event.stopPropagation();

														onSelectTherapist(DEFAULT_VALUES_THERAPIST);
													}}
												>
													<X className="opacity-50" />
												</div>
											) : (
												<ChevronsUpDown className="opacity-50" />
											)}
										</Button>
									</FormControl>
								</PopoverTrigger>
								<PopoverContent
									className="p-0 w-[300px]"
									align="start"
									side="bottom"
								>
									<Command>
										<CommandInput
											placeholder="Search therapist..."
											className="h-9"
											disabled={isLoading.therapists}
										/>
										<CommandList>
											<CommandEmpty>No therapist found.</CommandEmpty>
											<CommandGroup>
												{isLoading.therapists ? (
													<CommandItem value={undefined} disabled>
														<LoaderIcon className="animate-spin" />
														<span>Please wait...</span>
													</CommandItem>
												) : (
													therapistsOptions?.feasible?.map((therapist) => (
														<CommandItem
															key={therapist.id}
															value={therapist.name}
															onSelect={() =>
																onSelectTherapist({
																	id: therapist.id,
																	name: therapist.name,
																})
															}
														>
															<div className="flex items-center gap-3">
																<Avatar className="border rounded-lg border-border bg-muted size-12">
																	<AvatarImage src="#" />
																	<AvatarFallback>
																		<User className="flex-shrink-0 size-5 text-muted-foreground/75" />
																	</AvatarFallback>
																</Avatar>

																<div className="grid text-sm line-clamp-1">
																	<p className="font-semibold uppercase truncate">
																		{therapist.name}
																	</p>

																	<div className="flex items-center gap-3 mt-2">
																		<Badge
																			variant="outline"
																			className="font-light"
																		>
																			{therapist.employmentType}
																		</Badge>

																		<Separator
																			orientation="vertical"
																			className="bg-black/10"
																		/>

																		<Badge
																			variant="outline"
																			className="flex items-center gap-1 text-xs font-light"
																		>
																			{therapist?.gender &&
																				getGenderIcon(
																					therapist.gender,
																					"size-3 text-muted-foreground",
																				)}

																			<span>{therapist?.gender || "N/A"}</span>
																		</Badge>
																	</div>
																</div>

																<Check
																	className={cn(
																		"ml-auto",
																		therapist.name === field.value
																			? "opacity-100"
																			: "opacity-0",
																	)}
																/>
															</div>
														</CommandItem>
													))
												)}
											</CommandGroup>
										</CommandList>
									</Command>
								</PopoverContent>
							</Popover>

							<FormMessage />
						</FormItem>
					);
				}}
			/>

			<FormField
				control={form.control}
				name="reason"
				render={({ field }) => (
					<FormItem className="col-span-full">
						<FormLabel>
							Reschedule Reason{" "}
							<span className="text-sm italic font-light">- (optional)</span>
						</FormLabel>
						<FormControl>
							<Textarea
								{...field}
								placeholder="Enter the reschedule reason..."
								className="shadow-inner bg-sidebar"
							/>
						</FormControl>

						<FormMessage />
					</FormItem>
				)}
			/>

			{/* for showing the alert error if there's any server validation error */}
			{!!errorsServerValidation?.length && (
				<Alert
					variant="destructive"
					className="col-span-full motion-preset-rebound-down"
				>
					<AlertCircle className="size-4" />
					<AlertTitle className="text-xs">Error</AlertTitle>
					<AlertDescription className="text-xs">
						<ul className="list-disc">
							{errorsServerValidation?.map((error) => (
								<li key={error}>{error}</li>
							))}
						</ul>
					</AlertDescription>
				</Alert>
			)}
		</div>
	);
});
