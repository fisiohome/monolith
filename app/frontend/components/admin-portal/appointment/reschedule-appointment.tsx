import HereMap from "@/components/shared/here-map";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
	useFormActionButtons,
	useRescheduleFields,
} from "@/hooks/admin-portal/appointment/use-reschedule-form";
import { getGenderIcon } from "@/hooks/use-gender";
import { cn } from "@/lib/utils";
import { Deferred } from "@inertiajs/react";
import { AlertCircle, Hospital, LoaderIcon } from "lucide-react";
import { type ComponentProps, memo } from "react";
import DateTimePicker from "./form/date-time";
import TherapistSelection from "./form/therapist-selection";

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
		isMapLoading,
		coordinate,
		mapAddress,
		brandPackagesSource,
		appointment,
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

			<div className="flex flex-col items-stretch gap-4 col-span-full lg:flex-row">
				<div className="grid gap-4">
					<Deferred
						data={["optionsData"]}
						fallback={
							<div className="flex flex-col self-end gap-3 col-span-full">
								<Skeleton className="w-10 h-4 rounded-md" />
								<div className="grid grid-cols-1 gap-4">
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
								<FormItem className="space-y-3">
									<FormLabel>Preferred Therapist Gender</FormLabel>
									<FormControl>
										<RadioGroup
											onValueChange={(value) => {
												field.onChange(value);
												onResetAllTherapistState();
											}}
											defaultValue={field.value}
											orientation="horizontal"
											className="grid grid-cols-1 gap-4"
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

					<FormField
						control={form.control}
						name="appointmentDateTime"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Appointment Date</FormLabel>

								<FormControl>
									<DateTimePicker
										value={field.value}
										onChangeValue={field.onChange}
										callbackOnChange={() => {
											// reset all therapist and isoline maps state
											onResetAllTherapistState();
										}}
									/>
								</FormControl>

								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				<FormField
					control={form.control}
					name="therapist.name"
					render={({ field }) => (
						<FormItem className="flex-1">
							<FormLabel>Therapist</FormLabel>

							<FormControl>
								<TherapistSelection
									value={field.value}
									isLoading={isLoading.therapists || isMapLoading}
									appt={appointment}
									therapists={therapistsOptions.feasible}
									isDisabledFind={!watchAppointmentDateTimeValue}
									onFindTherapists={onFindTherapists}
									onSelectTherapist={(value) => onSelectTherapist(value)}
								/>
							</FormControl>
						</FormItem>
					)}
				/>
			</div>

			<HereMap
				ref={mapRef}
				coordinate={coordinate}
				address={{ ...mapAddress }}
				options={{ disabledEvent: false }}
				className="col-span-full"
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
								rows={3}
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
