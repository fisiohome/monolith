import { Deferred } from "@inertiajs/react";
import { useIsFirstRender } from "@uidotdev/usehooks";
import { AlertCircle, Hospital, Info, LoaderIcon } from "lucide-react";
import { type ComponentProps, memo, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
	useFormActionButtons,
	useRescheduleFields,
} from "@/hooks/admin-portal/appointment/use-reschedule-form";
import { getGenderIcon } from "@/hooks/use-gender";
import { cn } from "@/lib/utils";
import DateTimePicker from "./form/date-time";
import TherapistSelection from "./form/therapist-selection";

export interface FormActionButtonsprops extends ComponentProps<"div"> {
	isLoading: boolean;
}

export const FormActionButtons = memo(function Component({
	className,
	isLoading,
}: FormActionButtonsprops) {
	const { t: taf } = useTranslation("appointments-form");
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
				variant="ghost"
				disabled={isLoading}
				onClick={(event) => {
					event.preventDefault();
					onBackRoute();
				}}
			>
				{taf("button.back")}
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
						<span>{taf("button.save.loading")}</span>
					</>
				) : (
					<span>{taf("button.save.label")}</span>
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
	const { t: tas } = useTranslation("appointments-form", {
		keyPrefix: "appt_schedule",
	});
	const { t: tasf } = useTranslation("appointments-form", {
		keyPrefix: "appt_schedule.fields",
	});
	const isFirstRender = useIsFirstRender();
	const formHooks = useRescheduleFields();

	// * side effect to add isoline calculated and stored isoline and the marker marked to the map
	useEffect(() => {
		// Ensure the map is initialized, isoline not calculated, and restrict to first render
		if (
			!formHooks.mapRef?.current ||
			formHooks.isIsolineCalculated ||
			!isFirstRender
		)
			return;

		// Add Therapist marker to the map if appointment includes therapist details
		if (formHooks.appointment?.therapist) {
			const therapistMarkerData = formHooks.generateMarkerDataTherapist({
				address: formHooks.appointment.therapist.activeAddress?.address || "",
				position: {
					lat: formHooks.appointment.therapist.activeAddress?.latitude || 0,
					lng: formHooks.appointment.therapist.activeAddress?.longitude || 0,
				},
				therapist: formHooks.appointment.therapist,
			});

			// Add therapist marker as a secondary marker, routing and map-view adjustment disabled
			formHooks.mapRef.current.marker.onAdd([therapistMarkerData], {
				isSecondary: true,
				useRouting: false,
				changeMapView: false,
			});
		}

		// Add Patient marker to the map if appointment includes patient details
		if (formHooks.appointment?.patient) {
			const patientMarkerData = formHooks.generateMarkerDataPatient({
				address: formHooks.appointment.patient.activeAddress?.address || "",
				position: {
					lat: formHooks.appointment.patient.activeAddress?.latitude || 0,
					lng: formHooks.appointment.patient.activeAddress?.longitude || 0,
				},
				patient: {
					address: formHooks.appointment.patient.activeAddress?.address || "",
					latitude: formHooks.appointment.patient.activeAddress?.latitude || 0,
					longitude:
						formHooks.appointment.patient.activeAddress?.longitude || 0,
					fullName: formHooks.appointment.patient.name,
					locationId:
						formHooks.appointment.patient.activeAddress?.locationId || "",
				},
			});

			// Add patient marker to the map
			formHooks.mapRef.current.marker.onAdd([patientMarkerData]);
		}

		// Adjust map view to fit markers if either therapist or patient markers are added
		if (formHooks.appointment?.therapist || formHooks.appointment?.patient) {
			formHooks.mapRef.current.mapControl.getCameraBound({ expandCount: 0.3 });
		}
	}, [
		formHooks.mapRef?.current,
		formHooks.isIsolineCalculated,
		formHooks.appointment?.patient,
		formHooks.appointment?.therapist,
		formHooks.generateMarkerDataPatient,
		formHooks.generateMarkerDataTherapist,
		isFirstRender,
	]);

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
							{formHooks.brandPackagesSource.brandName}
						</p>

						<div className="flex items-center gap-1 mt-2 text-xs">
							<p className="text-pretty">
								<span className="uppercase">
									{formHooks.brandPackagesSource.packageName}
								</span>
								<span className="mx-1">&#x2022;</span>
								<span className="italic">
									{formHooks.brandPackagesSource.packageVisit}
								</span>
							</p>
						</div>
					</div>
				</div>
			</div>

			{!formHooks.therapistsOptions?.feasible?.length &&
				formHooks.isTherapistFound && (
					<Alert
						variant="destructive"
						className="col-span-full motion-preset-rebound-down"
					>
						<AlertCircle className="w-4 h-4" />
						<AlertTitle>{tas("alert_therapist.title")}</AlertTitle>
						<AlertDescription>
							{tas("alert_therapist.description")}
						</AlertDescription>
					</Alert>
				)}

			<div className="grid grid-cols-1 gap-4 col-span-full">
				<Deferred
					data={["optionsData"]}
					fallback={
						<div className="flex flex-col self-end gap-3 col-span-full">
							<Skeleton className="w-10 h-4 rounded-md" />
							<div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-1">
								<Skeleton className="relative w-full rounded-md h-9" />
								<Skeleton className="relative w-full rounded-md h-9" />
								<Skeleton className="relative w-full rounded-md h-9" />
							</div>
						</div>
					}
				>
					<FormField
						control={formHooks.form.control}
						name="preferredTherapistGender"
						render={({ field }) => (
							<FormItem className="space-y-3">
								<FormLabel>{tasf("pref_therapist_gender.label")}</FormLabel>
								<FormControl>
									<RadioGroup
										onValueChange={(value) => {
											field.onChange(value);
											formHooks.onResetAllTherapistState();
										}}
										defaultValue={field.value}
										orientation="horizontal"
										className="grid grid-cols-1 gap-4 md:grid-cols-3"
									>
										{formHooks.preferredTherapistGenderOption.map((gender) => (
											<FormItem
												key={gender}
												className="flex items-start p-3 space-x-3 space-y-0 border rounded-md shadow-inner border-input bg-sidebar"
											>
												<FormControl>
													<RadioGroupItem value={gender} />
												</FormControl>
												<FormLabel className="flex items-center gap-1 font-normal capitalize truncate">
													{getGenderIcon(gender, "shrink-0")}
													<span className="truncate text-nowrap">
														{tasf(
															`pref_therapist_gender.options.${gender.toLowerCase()}`,
														)}
													</span>
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
					control={formHooks.form.control}
					name="appointmentDateTime"
					render={({ field }) => (
						<FormItem>
							<FormLabel className="flex items-center justify-between">
								<span>{tasf("appt_date.label")}</span>
								<FormField
									control={formHooks.form.control}
									name="formOptions.findTherapistsAllOfDay"
									render={({ field }) => (
										<FormItem className="flex items-center gap-1.5">
											<FormLabel>All of day</FormLabel>
											<FormControl>
												<Switch
													className="!mt-0"
													checked={field.value}
													onCheckedChange={(value) => {
														formHooks.onSelectAllOfDay(value);

														// reset all therapist and isoline maps state
														formHooks.onResetAllTherapistState();
													}}
												/>
											</FormControl>
										</FormItem>
									)}
								/>
							</FormLabel>

							{formHooks.apptDateTime?.message && (
								<Alert className="text-xs">
									<Info className="size-3.5 shrink-0" />
									<AlertTitle>Info</AlertTitle>
									<AlertDescription className="text-xs text-pretty">
										{formHooks.apptDateTime.message}
									</AlertDescription>
								</Alert>
							)}

							<FormControl>
								<DateTimePicker
									value={field.value}
									min={formHooks.apptDateTime.min}
									max={formHooks.apptDateTime.max}
									disabledVisits={formHooks.apptDateTime.disabledVisits}
									onChangeValue={field.onChange}
									isAllOfDay={!!formHooks.watchAllOfDayValue}
									callbackOnChange={() => {
										// reset all therapist and isoline maps state
										formHooks.onResetAllTherapistState();
									}}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
			</div>

			<FormField
				control={formHooks.form.control}
				name="therapist.name"
				render={({ field }) => (
					<FormItem className="col-span-full">
						{/* <FormLabel>{tasf("therapist.label")}</FormLabel> */}

						<FormControl>
							<TherapistSelection
								items={formHooks.therapistsOptions.feasible}
								config={{
									isLoading:
										formHooks.isLoading.therapists || formHooks.isMapLoading,
									selectedTherapistName: field.value,
									selectedTherapist:
										formHooks.formSelections?.therapist || undefined,
									appt: formHooks.appointment,
									isAllOfDay: !!formHooks.watchAllOfDayValue,
									selectedTimeSlot: formHooks.selectedTimeSlot || undefined,
								}}
								find={{
									isDisabled: !formHooks.watchAppointmentDateTimeValue,
									handler: async (options?: {
										bypassConstraints?: boolean;
										employmentType?: "KARPIS" | "FLAT" | "ALL";
									}) => await formHooks.onFindTherapists(options),
								}}
								onSelectTherapist={(value) =>
									formHooks.onSelectTherapist(value)
								}
								onPersist={(value) => {
									formHooks.setFormSelections({
										...formHooks.formSelections,
										therapist: value,
									});
								}}
								onSelectTimeSlot={(value) => formHooks.onSelectTimeSlot(value)}
							/>
						</FormControl>
					</FormItem>
				)}
			/>

			<HereMap
				ref={formHooks.mapRef}
				coordinate={formHooks.coordinate}
				address={{ ...formHooks.mapAddress }}
				options={{ disabledEvent: false }}
				className="col-span-full"
			/>

			<FormField
				control={formHooks.form.control}
				name="reason"
				render={({ field }) => (
					<FormItem className="col-span-full">
						<FormLabel>
							{tasf("reschedule_reason.label")}{" "}
							<span className="text-sm italic font-light">- (optional)</span>
						</FormLabel>
						<FormControl>
							<Textarea
								{...field}
								placeholder={tasf("reschedule_reason.placeholder")}
								rows={3}
								className="shadow-inner bg-sidebar"
							/>
						</FormControl>

						<FormMessage />
					</FormItem>
				)}
			/>

			{/* for showing the alert error if there's any server validation error */}
			{!!formHooks.errorsServerValidation?.length && (
				<Alert
					variant="destructive"
					className="col-span-full motion-preset-rebound-down"
				>
					<AlertCircle className="size-4" />
					<AlertTitle className="text-xs">Error</AlertTitle>
					<AlertDescription className="text-xs">
						<ul className="list-disc">
							{formHooks.errorsServerValidation?.map((error) => (
								<li key={error}>{error}</li>
							))}
						</ul>
					</AlertDescription>
				</Alert>
			)}
		</div>
	);
});
