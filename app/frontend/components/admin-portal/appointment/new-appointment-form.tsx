import { PulsatingOutlineShadowButton } from "@/components/shared/button-pulsating";
import type { HereMaphandler } from "@/components/shared/here-map";
import HereMap from "@/components/shared/here-map";
import { RetroGridPattern } from "@/components/shared/retro-grid-pattern";
import { useStepper } from "@/components/shared/stepper";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, type CalendarProps } from "@/components/ui/calendar";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
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
import { PhoneInput } from "@/components/ui/phone-input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { usePatientRegion } from "@/hooks/admin-portal/use-appointment-utils";
import type { MarkerData } from "@/hooks/here-maps";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import {
	type AppointmentBookingSchema,
	DEFAULT_VALUES_LOCATION,
	DEFAULT_VALUES_PACKAGE,
	DEFAULT_VALUES_SERVICE,
	checkIsCustomFisiohomePartner,
	checkIsCustomReferral,
} from "@/lib/appointments";
import { IS_DEKSTOP_MEDIA_QUERY } from "@/lib/constants";
import {
	calculateAge,
	cn,
	goBackHandler,
	populateQueryParams,
} from "@/lib/utils";
import { boolSchema } from "@/lib/validation";
import type {
	AppointmentNewGlobalPageProps,
	AppointmentNewProps,
} from "@/pages/AdminPortal/Appointment/New";
import { Deferred, Link, router, usePage } from "@inertiajs/react";
import { useMediaQuery } from "@uidotdev/usehooks";
import { format } from "date-fns";
import {
	AlertCircle,
	CalendarIcon,
	Check,
	ChevronsRight,
	ChevronsUpDown,
	CircleCheckBig,
	LoaderIcon,
	MapPin,
	Mars,
	Pencil,
	Venus,
	VenusAndMars,
	X,
} from "lucide-react";
import {
	type ComponentProps,
	Fragment,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useFormContext, useWatch } from "react-hook-form";

// * component form container
export interface FormContainerProps extends ComponentProps<"div"> {}

export function FormContainer({ className, children }: FormContainerProps) {
	return <div className={cn("grid gap-4", className)}>{children}</div>;
}

// * component form step item container
interface FormStepItemContainerProps extends ComponentProps<"div"> {}

export function FormStepItemContainer({
	className,
	children,
}: FormStepItemContainerProps) {
	return (
		<div
			className={cn(
				"grid grid-cols-1 gap-4 p-4 border shadow-inner md:grid-cols-2 md:p-6 border-border rounded-xl bg-background",
				className,
			)}
		>
			{children}
		</div>
	);
}

// * component step button for next step, prev step, and submit
export interface StepButtonsProps extends ComponentProps<"div"> {
	isFormLoading: boolean;
	isCreated: boolean;
	setFormStorage: React.Dispatch<
		React.SetStateAction<AppointmentBookingSchema | null>
	>;
}

export function StepButtons({
	className,
	isFormLoading,
	isCreated,
	setFormStorage,
}: StepButtonsProps) {
	const isDekstop = useMediaQuery(IS_DEKSTOP_MEDIA_QUERY);
	const form = useFormContext<AppointmentBookingSchema>();
	const {
		prevStep,
		isLastStep,
		isOptionalStep,
		isDisabledStep,
		currentStep,
		isLoading,
		nextStep,
		setStep,
		steps,
	} = useStepper();
	const isFirstStep = useMemo(
		() => currentStep?.label === "Contact Information",
		[currentStep?.label],
	);
	const onPrevStep = useCallback(() => {
		prevStep();
	}, [prevStep]);
	const onSubmit = async () => {
		if (currentStep.label === "Contact Information") {
			const isValid = await form.trigger("contactInformation");

			if (!isValid) return;

			const values = form.getValues();
			setFormStorage({ ...values });
			nextStep();
		}

		if (currentStep.label === "Patient Profile") {
			const isValid = await form.trigger("patientDetails");

			if (!isValid) return;

			const values = form.getValues();
			setFormStorage({ ...values });
			nextStep();
		}

		if (currentStep.label === "Appointment Settings and Scheduling") {
			const isValid = await form.trigger("appointmentScheduling");

			if (!isValid) return;

			const values = form.getValues();
			setFormStorage({ ...values });
			nextStep();
		}

		if (currentStep.label === "Additional Settings") {
			const isValid = await form.trigger("additionalSettings");

			if (!isValid) return;

			const values = form.getValues();
			setFormStorage({ ...values });
			nextStep();
		}
	};

	// * redirect to the final step components
	useEffect(() => {
		if (isCreated) {
			setStep(steps?.length);
		}
	}, [isCreated, steps, setStep]);

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
				disabled={
					(isDisabledStep && !isFirstStep) || isLoading || isFormLoading
				}
				onClick={(event) => {
					event.preventDefault();
					isFirstStep ? goBackHandler() : onPrevStep();
				}}
			>
				{isFirstStep ? "Back" : "Prev"}
			</Button>

			{isLastStep ? (
				<Button
					type="submit"
					size={!isDekstop ? "default" : "sm"}
					disabled={isLoading || isFormLoading}
					className="order-first md:order-last"
				>
					{isLoading || isFormLoading ? (
						<>
							<LoaderIcon className="animate-spin" />
							<span>Saving...</span>
						</>
					) : (
						<span>Save</span>
					)}
				</Button>
			) : currentStep?.label === "Appointment Settings and Scheduling" &&
				!form.getValues()?.appointmentScheduling?.therapist ? (
				<AlertDialog>
					<AlertDialogTrigger asChild>
						<Button
							type="button"
							size={!isDekstop ? "default" : "sm"}
							disabled={isLoading || isFormLoading}
							className="order-first md:order-last"
						>
							Next
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
							<AlertDialogDescription>
								You haven't chosen a therapist for this appointment yet, but
								don't worry! You have the option to skip it. However, are you
								sure you want to assign a therapist to this appointment later?
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter className="space-y-4 md:space-y-0">
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction asChild>
								<Button
									type="button"
									size={!isDekstop ? "default" : "sm"}
									disabled={isLoading || isFormLoading}
									className="order-first md:order-last"
									onClick={(event) => {
										event.preventDefault();
										onSubmit();
									}}
								>
									{isLoading || isFormLoading ? (
										<>
											<LoaderIcon className="animate-spin" />
											<span>Please Wait...</span>
										</>
									) : isOptionalStep ? (
										<span>Skip</span>
									) : (
										<span>Next</span>
									)}
								</Button>
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			) : (
				<Button
					type="button"
					size={!isDekstop ? "default" : "sm"}
					disabled={isLoading || isFormLoading}
					className="order-first md:order-last"
					onClick={(event) => {
						event.preventDefault();
						onSubmit();
					}}
				>
					{isLoading || isFormLoading ? (
						<>
							<LoaderIcon className="animate-spin" />
							<span>Please Wait...</span>
						</>
					) : isOptionalStep ? (
						<span>Skip</span>
					) : (
						<span>Next</span>
					)}
				</Button>
			)}
		</div>
	);
}

export function FinalStep() {
	const { props: globalProps } = usePage<AppointmentNewGlobalPageProps>();
	const { hasCompletedAllSteps } = useStepper();
	const [count, setCount] = useState(3);
	useEffect(() => {
		if (count > 0) {
			const timer = setTimeout(() => {
				setCount((prev) => prev - 1);
			}, 1000);
			return () => clearTimeout(timer);
		}

		if (count === 0) {
			setTimeout(() => {
				router.get(
					globalProps.adminPortal.router.adminPortal.appointment.index,
				);
			}, 1000);
		}
	}, [count, globalProps.adminPortal.router.adminPortal.appointment.index]);

	if (!hasCompletedAllSteps) return null;

	return (
		<FormStepItemContainer
			className={cn(
				"!grid-cols-1 !gap-2 mt-0 text-center md:mt-4 relative",
				count === 0 && "motion-preset-confetti",
			)}
		>
			<div className="flex flex-col gap-3">
				<CircleCheckBig className="mx-auto size-8 text-primary" />
				<h1 className="mx-auto space-x-3 text-sm font-bold text-primary">
					<span>Appointments are Booked!</span>
				</h1>

				<p className="text-xs text-pretty w-full md:w-[75%] mx-auto text-primary">
					The appointment has been successfully created. You can start to inform
					the therapist and patient concerned. And you will be redirected in a
					few seconds.
				</p>

				<span className="my-2 text-3xl font-bold text-primary">{count}</span>

				<Button effect="shine" size="lg" asChild>
					<Link
						href={globalProps.adminPortal.router.adminPortal.appointment.index}
					>
						Redirect now
					</Link>
				</Button>
			</div>

			<RetroGridPattern />
		</FormStepItemContainer>
	);
}

export function ContactInformationForm() {
	const form = useFormContext<AppointmentBookingSchema>();

	return (
		<FormStepItemContainer>
			<FormField
				control={form.control}
				name="contactInformation.contactName"
				render={({ field }) => (
					<FormItem>
						<FormLabel>Contact Name</FormLabel>
						<FormControl>
							<Input
								{...field}
								type="text"
								autoComplete="name"
								placeholder="Enter the contact name..."
								className="shadow-inner bg-sidebar"
							/>
						</FormControl>

						<FormMessage />
					</FormItem>
				)}
			/>

			<FormField
				control={form.control}
				name="contactInformation.contactPhone"
				render={({ field }) => (
					<FormItem>
						<FormLabel>Contact Phone Number</FormLabel>
						<FormControl>
							<PhoneInput
								{...field}
								international
								placeholder="Enter the contact phone number..."
								defaultCountry="ID"
								autoComplete="tel"
								className="shadow-inner bg-sidebar"
							/>
						</FormControl>

						<FormMessage />
					</FormItem>
				)}
			/>

			<FormField
				control={form.control}
				name="contactInformation.email"
				render={({ field }) => (
					<FormItem className="col-span-1">
						<FormLabel>Email</FormLabel>
						<FormControl>
							<Input
								{...field}
								type="email"
								autoComplete="email"
								placeholder="Enter the email..."
								className="shadow-inner bg-sidebar"
							/>
						</FormControl>

						<FormMessage />
					</FormItem>
				)}
			/>

			<FormField
				control={form.control}
				name="contactInformation.miitelLink"
				render={({ field }) => (
					<FormItem>
						<FormLabel>MiiTel Link</FormLabel>
						<FormControl>
							<Input
								{...field}
								type="url"
								placeholder="Enter the MiiTel link..."
								className="shadow-inner bg-sidebar"
							/>
						</FormControl>

						<FormMessage />
					</FormItem>
				)}
			/>
		</FormStepItemContainer>
	);
}

export function PatientDetailsForm() {
	const {
		form,
		globalProps,
		watchPatientDetailsValue,
		locationsOption,
		groupedLocationsOption,
		selectedLocation,
		coordinate,
		mapAddress,
		coordinateError,
	} = usePatientRegion();
	const isDekstop = useMediaQuery(IS_DEKSTOP_MEDIA_QUERY);
	const [isLoading, setIsLoading] = useState({
		locations: false,
	});
	const patientFormOptions = useMemo(() => {
		const genders = globalProps.optionsData?.patientGenders || [];
		const patientConditions = globalProps.optionsData?.patientConditions || [];

		return { genders, patientConditions };
	}, [
		globalProps.optionsData?.patientGenders,
		globalProps.optionsData?.patientConditions,
	]);

	// * patient gender state
	const getGenderIcon = (
		gender: AppointmentBookingSchema["appointmentScheduling"]["preferredTherapistGender"],
	) => {
		const lower = gender.toLowerCase();
		if (lower === "male") return <Mars className="size-4" />;
		if (lower === "female") return <Venus className="size-4" />;
		return <VenusAndMars className="size-4" />;
	};

	// * watching the date of birth and calculate the age value
	const dateOfBirthCalendarProps = useMemo<CalendarProps>(() => {
		return {
			// Show 100 years range
			fromYear: new Date().getFullYear() - 100,
			toYear: new Date().getFullYear(),
			// Disable future dates
			disabled: (date) => date >= new Date(),
		};
	}, []);
	useEffect(() => {
		const value =
			typeof watchPatientDetailsValue.dateOfBirth === "string"
				? new Date(watchPatientDetailsValue.dateOfBirth)
				: watchPatientDetailsValue.dateOfBirth;
		if (value !== null && value instanceof Date) {
			// Calculate age using your custom function
			const age = calculateAge(value);
			// Update the age field in the form
			form.setValue("patientDetails.age", age);
			form.trigger("patientDetails.age");
		} else {
			form.setValue("patientDetails.age", 0);
		}
	}, [watchPatientDetailsValue.dateOfBirth, form.setValue, form.trigger]);

	// * watching the changes of location selected value
	const onFocusLocationField = useCallback(() => {
		// fetch the locations options data
		router.reload({
			only: ["locations"],
			onStart: () => {
				setIsLoading((prev) => ({
					...prev,
					locations: true,
				}));
			},
			onFinish: () => {
				setTimeout(() => {
					setIsLoading((prev) => ({
						...prev,
						locations: false,
					}));
				}, 250);
			},
		});
	}, []);
	const onSelectLocation = useCallback(
		(location: AppointmentBookingSchema["patientDetails"]["location"]) => {
			// set value to the location selected, and reset some value if location changed
			form.resetField("appointmentScheduling.service", {
				defaultValue: DEFAULT_VALUES_SERVICE,
			});
			form.resetField("appointmentScheduling.package", {
				defaultValue: DEFAULT_VALUES_PACKAGE,
			});
			form.resetField("patientDetails.postalCode", { defaultValue: "" });
			form.resetField("patientDetails.address", { defaultValue: "" });
			form.resetField("patientDetails.latitude", { defaultValue: 0 });
			form.resetField("patientDetails.longitude", { defaultValue: 0 });
			form.setValue("patientDetails.location", location, {
				shouldValidate: true,
			});
		},
		[form.setValue, form.resetField],
	);

	// * latitude, longitude, and map state fields
	const mapRef = useRef<(H.Map & HereMaphandler) | null>(null);
	const isMapButtonsDisabled = useMemo(() => {
		const { latitude, longitude, address, postalCode } =
			watchPatientDetailsValue;
		const isValidCoordinate = !!latitude && !!longitude;
		const isValidAddress =
			!!selectedLocation?.country &&
			!!selectedLocation?.state &&
			!!selectedLocation?.city &&
			!!address &&
			!!postalCode &&
			!isValidCoordinate;

		return {
			calculate: !isValidAddress,
			reset: !isValidCoordinate,
			gmaps: !isValidCoordinate,
		};
	}, [watchPatientDetailsValue, selectedLocation]);
	const onResetCoordinate = useCallback(() => {
		// reset the lat, lng form values
		form.resetField("patientDetails.latitude", { defaultValue: 0 });
		form.resetField("patientDetails.longitude", { defaultValue: 0 });

		// remove the map markers
		mapRef.current?.marker.onRemove();
	}, [form.resetField]);
	const onClickGMaps = useCallback(() => {
		window.open(
			`https://www.google.com/maps/search/?api=1&query=${coordinate.join(",")}`,
		);
	}, [coordinate]);
	const onCalculateCoordinate = useCallback(async () => {
		try {
			// Fetch geocode result
			const geocodeResult = await mapRef.current?.geocode.onCalculate();
			if (
				!geocodeResult ||
				!geocodeResult?.position?.lat ||
				!geocodeResult?.position?.lng
			) {
				// Validate geocode result
				console.error("Address cannot be found!");

				// Set error message for the form
				const errorMessage =
					"The address cannot be found. Ensure the region, postal code, and address line are entered correctly.";
				form.setError("patientDetails.address", {
					message: errorMessage,
					type: "custom",
				});
				return;
			}

			// Update form values with latitude and longitude
			const { lat, lng } = geocodeResult.position;
			form.setValue("patientDetails.latitude", lat, {
				shouldValidate: true,
			});
			form.setValue("patientDetails.longitude", lng, {
				shouldValidate: true,
			});

			// Add markers to the map
			mapRef.current?.marker.onAdd(
				[
					{
						position: geocodeResult.position,
						address: geocodeResult.address.label,
					},
				] satisfies MarkerData[],
				{ changeMapView: true },
			);
		} catch (error) {
			console.error("An unexpected error occurred:", error);

			// Handle unexpected errors
			form.setError("patientDetails.address", {
				message:
					"An unexpected error occurred while calculating the coordinates from the address.",
				type: "custom",
			});
		}
	}, [form.setError, form.setValue]);

	return (
		<FormStepItemContainer>
			<FormField
				control={form.control}
				name="patientDetails.fullName"
				render={({ field }) => (
					<FormItem>
						<FormLabel>Full Name</FormLabel>
						<FormControl>
							<Input
								{...field}
								type="text"
								autoComplete="name"
								placeholder="Enter the full name..."
								className="shadow-inner bg-sidebar"
							/>
						</FormControl>

						<FormMessage />
					</FormItem>
				)}
			/>

			<div className="flex flex-wrap gap-3">
				<FormField
					control={form.control}
					name="patientDetails.dateOfBirth"
					render={({ field }) => (
						<FormItem className="flex-1">
							<FormLabel>Date of birth</FormLabel>
							<Popover>
								<PopoverTrigger asChild>
									<FormControl>
										<Button
											variant={"outline"}
											className={cn(
												"relative w-full flex justify-between font-normal shadow-inner bg-sidebar",
												!field.value && "text-muted-foreground",
											)}
										>
											<p>
												{field.value
													? `${format(field.value, "PPP")}`
													: "Pick a date of birth"}
											</p>

											{field.value ? (
												// biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
												<div
													className="cursor-pointer"
													onClick={(event) => {
														event.preventDefault();
														event.stopPropagation();

														form.setValue(
															"patientDetails.dateOfBirth",
															null as unknown as Date,
														);
													}}
												>
													<X className="opacity-50" />
												</div>
											) : (
												<CalendarIcon className="w-4 h-4 ml-auto opacity-75" />
											)}
										</Button>
									</FormControl>
								</PopoverTrigger>
								<PopoverContent
									className="w-auto p-0"
									align="start"
									side="bottom"
								>
									<Calendar
										{...dateOfBirthCalendarProps}
										initialFocus
										mode="single"
										captionLayout="dropdown"
										selected={new Date(field.value)}
										onSelect={field.onChange}
										defaultMonth={field.value}
									/>
								</PopoverContent>
							</Popover>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="patientDetails.age"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Age</FormLabel>
							<FormControl>
								<Input
									{...field}
									readOnly
									type="number"
									min={0}
									value={field?.value || ""}
									placeholder="Enter the age..."
									className="shadow-inner w-fit field-sizing-content bg-sidebar"
								/>
							</FormControl>

							<FormMessage />
						</FormItem>
					)}
				/>
				<FormDescription className="flex-none">
					Your date of birth is used to calculate your age.
				</FormDescription>
			</div>

			<Deferred
				data={["optionsData"]}
				fallback={
					<div className="flex flex-col self-end gap-3 col-span-full">
						<Skeleton className="w-10 h-4 rounded-md" />
						<div className="grid grid-cols-2 gap-4">
							<Skeleton className="relative w-full rounded-md h-9" />
							<Skeleton className="relative w-full rounded-md h-9" />
						</div>
					</div>
				}
			>
				<FormField
					control={form.control}
					name="patientDetails.gender"
					render={({ field }) => (
						<FormItem className="space-y-3 col-span-full">
							<FormLabel>Gender</FormLabel>
							<FormControl>
								<RadioGroup
									onValueChange={field.onChange}
									defaultValue={field.value}
									orientation="horizontal"
									className="grid grid-cols-2 gap-4"
								>
									{patientFormOptions.genders.map((gender) => (
										<Fragment key={gender}>
											<FormItem className="flex items-start p-3 space-x-3 space-y-0 border rounded-md shadow-inner border-input bg-sidebar">
												<FormControl>
													<RadioGroupItem value={gender} />
												</FormControl>
												<FormLabel className="flex items-center gap-1 font-normal capitalize">
													{getGenderIcon(gender)}
													<span>{gender.toLowerCase()}</span>
												</FormLabel>
											</FormItem>
										</Fragment>
									))}
								</RadioGroup>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
			</Deferred>

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
					name="patientDetails.condition"
					render={({ field }) => (
						<FormItem className="space-y-3 col-span-full">
							<FormLabel>Current Condition</FormLabel>
							<FormControl>
								<RadioGroup
									onValueChange={field.onChange}
									defaultValue={field.value}
									orientation="horizontal"
									className="flex flex-col gap-3"
								>
									{patientFormOptions.patientConditions.map((condition) => (
										<Fragment key={condition.title}>
											<FormItem className="flex items-start p-4 space-x-3 space-y-0 border rounded-md shadow-inner border-input bg-sidebar">
												<FormControl>
													<RadioGroupItem value={condition.title} />
												</FormControl>
												<FormLabel className="w-full space-y-1 font-normal capitalize">
													<span>{condition.title.toLowerCase()}</span>
													<FormDescription>
														{condition.description}
													</FormDescription>
												</FormLabel>
											</FormItem>
										</Fragment>
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
				name="patientDetails.complaintDescription"
				render={({ field }) => (
					<FormItem className="col-span-full">
						<FormLabel>Complaint Description</FormLabel>
						<FormControl>
							<Textarea
								{...field}
								placeholder="Enter the complaint description..."
								className="shadow-inner bg-sidebar"
							/>
						</FormControl>

						<FormMessage />
					</FormItem>
				)}
			/>

			<FormField
				control={form.control}
				name="patientDetails.illnessOnsetDate"
				render={({ field }) => (
					<FormItem className="col-span-full">
						<FormLabel>
							Illness Onset Date{" "}
							<span className="text-sm italic font-light">- (optional)</span>
						</FormLabel>
						<FormControl>
							<Textarea
								{...field}
								placeholder="Enter the illness onset date..."
								className="shadow-inner bg-sidebar"
							/>
						</FormControl>

						<FormDescription>
							Enter the date when the illness first began. You can use an exact
							date if known, or an estimate if unsure.
						</FormDescription>

						<FormMessage />
					</FormItem>
				)}
			/>

			<FormField
				control={form.control}
				name="patientDetails.medicalHistory"
				render={({ field }) => (
					<FormItem className="col-span-full">
						<FormLabel>
							Medical History{" "}
							<span className="text-sm italic font-light">- (optional)</span>
						</FormLabel>
						<FormControl>
							<Textarea
								{...field}
								placeholder="Enter the medical history..."
								className="shadow-inner bg-sidebar"
							/>
						</FormControl>

						<FormDescription>
							Provide an overview of the patient’s medical history including
							allergies, chronic conditions, and any past medical events or
							treatments relevant to the current complaint.
						</FormDescription>

						<FormMessage />
					</FormItem>
				)}
			/>

			<Deferred
				data={["locations"]}
				fallback={
					<div className="flex flex-col self-end gap-3">
						<Skeleton className="w-10 h-4 rounded-md" />
						<Skeleton className="relative w-full rounded-md h-9" />
					</div>
				}
			>
				<FormField
					control={form.control}
					name="patientDetails.location.city"
					render={({ field }) => (
						<FormItem>
							<FormLabel className="text-nowrap">Region</FormLabel>
							<Popover>
								<PopoverTrigger asChild>
									<FormControl>
										<Button
											variant="outline"
											className={cn(
												"relative w-full flex justify-between font-normal bg-sidebar shadow-inner",
												!field.value && "text-muted-foreground",
											)}
											onFocus={() => onFocusLocationField()}
										>
											<p>
												{field.value
													? locationsOption?.find(
															(location) => location.city === field.value,
														)?.city
													: "Select region"}
											</p>
											{field.value ? (
												// biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
												<div
													className="cursor-pointer"
													onClick={(event) => {
														event.preventDefault();
														event.stopPropagation();

														onSelectLocation(DEFAULT_VALUES_LOCATION);
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
											placeholder="Search region..."
											className="h-9"
											autoComplete="address-level2"
										/>
										<CommandList>
											<CommandEmpty>No region found.</CommandEmpty>
											{isLoading.locations ? (
												<CommandItem value={undefined} disabled>
													<LoaderIcon className="animate-spin" />
													<span>Please wait...</span>
												</CommandItem>
											) : (
												groupedLocationsOption?.map((location) => (
													<Fragment key={location.country}>
														<span className="block px-2 py-2 text-xs font-bold text-primary-foreground bg-primary">
															{location.country}
														</span>
														{location.states.map((state, stateIndex) => (
															<CommandGroup
																key={state.name}
																heading={state.name}
															>
																{state.cities.map((city) => (
																	<CommandItem
																		key={city.name}
																		value={city.name}
																		onSelect={() =>
																			onSelectLocation({
																				id: String(city.id),
																				city: city.name,
																			})
																		}
																	>
																		<span>{city.name}</span>
																		<Check
																			className={cn(
																				"ml-auto",
																				city.name === field.value
																					? "opacity-100"
																					: "opacity-0",
																			)}
																		/>
																	</CommandItem>
																))}
																{location.states.length !== stateIndex + 1 && (
																	<CommandSeparator className="mt-2" />
																)}
															</CommandGroup>
														))}
													</Fragment>
												))
											)}
										</CommandList>
									</Command>
								</PopoverContent>
							</Popover>

							<FormMessage />
						</FormItem>
					)}
				/>
			</Deferred>

			<FormField
				control={form.control}
				name="patientDetails.postalCode"
				render={({ field }) => (
					<FormItem>
						<FormLabel>Postal Code</FormLabel>
						<FormControl>
							<Input
								{...field}
								type="text"
								placeholder="Enter the postal code..."
								autoComplete="postal-code"
								className="shadow-inner w-fit field-sizing-content bg-sidebar"
							/>
						</FormControl>

						<FormMessage />
					</FormItem>
				)}
			/>

			<FormField
				control={form.control}
				name="patientDetails.address"
				render={({ field }) => (
					<FormItem className="col-span-full">
						<FormLabel>Address</FormLabel>
						<FormControl>
							<Textarea
								placeholder="Enter the address..."
								autoComplete="street-address"
								className="shadow-inner bg-sidebar"
								// className="resize-none"
								{...field}
							/>
						</FormControl>

						<FormMessage />
					</FormItem>
				)}
			/>

			<FormField
				control={form.control}
				name="patientDetails.addressNotes"
				render={({ field }) => (
					<FormItem className="col-span-full">
						<FormLabel>
							Address Notes{" "}
							<span className="text-sm italic font-light">- (optional)</span>
						</FormLabel>
						<FormControl>
							<Textarea
								{...field}
								placeholder="Enter the address notes..."
								className="shadow-inner bg-sidebar"
							/>
						</FormControl>

						<FormDescription>
							Any additional notes that are relevant to the location of the
							patient address, e.g. Google Maps link.
						</FormDescription>

						<FormMessage />
					</FormItem>
				)}
			/>

			{coordinateError && (
				<Alert variant="destructive" className="col-span-full">
					<AlertCircle className="size-4" />
					<AlertTitle className="text-xs">Error</AlertTitle>
					<AlertDescription className="text-xs">
						{coordinateError}
					</AlertDescription>
				</Alert>
			)}

			<FormField
				control={form.control}
				name="patientDetails.latitude"
				render={({ field }) => (
					<FormItem>
						<FormLabel>Latitude</FormLabel>
						<FormControl>
							<Input
								{...field}
								readOnly
								type="number"
								min={0}
								value={field?.value || ""}
								placeholder="Enter the latitude..."
								className="shadow-inner bg-sidebar"
							/>
						</FormControl>

						<FormMessage />
					</FormItem>
				)}
			/>

			<FormField
				control={form.control}
				name="patientDetails.longitude"
				render={({ field }) => (
					<FormItem>
						<FormLabel>Longitude</FormLabel>
						<FormControl>
							<Input
								{...field}
								readOnly
								type="number"
								min={0}
								value={field?.value || ""}
								placeholder="Enter the longitude..."
								className="shadow-inner bg-sidebar"
							/>
						</FormControl>

						<FormMessage />
					</FormItem>
				)}
			/>

			<div className="grid gap-4 md:gap-2 md:grid-cols-3 col-span-full">
				<PulsatingOutlineShadowButton
					size={!isDekstop ? "default" : "sm"}
					disabled={isMapButtonsDisabled.calculate}
					type="button"
					className="w-full"
					onClick={async (event) => {
						event.preventDefault();

						await onCalculateCoordinate();
					}}
				>
					Calculate Coordinate
				</PulsatingOutlineShadowButton>

				<Button
					size={!isDekstop ? "default" : "sm"}
					type="button"
					variant="destructive-outline"
					disabled={isMapButtonsDisabled.reset}
					onClick={(event) => {
						event.preventDefault();

						if (
							window.confirm(
								"Are you absolutely sure? \nThis action is irreversible. Resetting coordinates deletes the calculated latitude and longitude, so you must recalculate.",
							)
						) {
							onResetCoordinate();
						}
					}}
				>
					Reset Coordinate
				</Button>

				<Button
					size={!isDekstop ? "default" : "sm"}
					type="button"
					variant="accent-outline"
					disabled={isMapButtonsDisabled.gmaps}
					onClick={(event) => {
						event.preventDefault();

						onClickGMaps();
					}}
				>
					See on Google Maps
				</Button>
			</div>

			<HereMap
				ref={mapRef}
				coordinate={coordinate}
				address={{ ...mapAddress }}
				options={{ disabledEvent: true }}
				className="col-span-full"
			/>
		</FormStepItemContainer>
	);
}

export function AppointmentSchedulingForm() {
	const { form, watchPatientDetailsValue, coordinate, mapAddress } =
		usePatientRegion();
	const { props: globalProps, url: pageURL } =
		usePage<AppointmentNewGlobalPageProps>();
	const [isLoading, setIsLoading] = useState({
		services: false,
		therapists: false,
	});
	const watchAppointmentSchedulingValue = useWatch({
		control: form.control,
		name: "appointmentScheduling",
	});
	const appointmentFormOptions = useMemo(() => {
		const preferredTherapistGender =
			globalProps.optionsData?.preferredTherapistGender || [];

		return { preferredTherapistGender };
	}, [globalProps.optionsData?.preferredTherapistGender]);

	// * for preferred therapist field
	const getGenderIcon = (
		gender: AppointmentBookingSchema["appointmentScheduling"]["preferredTherapistGender"],
	) => {
		const lower = gender.toLowerCase();
		if (lower === "male") return <Mars className="size-4" />;
		if (lower === "female") return <Venus className="size-4" />;
		return <VenusAndMars className="size-4" />;
	};

	// * watching the changes of service selected value
	const servicesOption = useMemo(
		() =>
			globalProps?.services?.filter(
				(service) => service.name !== "PERAWAT_HOMECARE",
			),
		[globalProps?.services],
	);
	const packagesOption = useMemo(
		() =>
			servicesOption
				?.filter(
					(service) =>
						String(service.id) === watchAppointmentSchedulingValue?.service?.id,
				)
				?.flatMap((service) => service.packages),
		[servicesOption, watchAppointmentSchedulingValue?.service?.id],
	);
	const onFocusServiceField = useCallback(() => {
		// fetch the services options data
		const { queryParams } = populateQueryParams(
			pageURL,
			deepTransformKeysToSnakeCase({
				locationId: watchPatientDetailsValue?.location?.id,
			}),
		);
		router.get(pageURL, queryParams, {
			only: ["services"],
			preserveScroll: true,
			preserveState: true,
			replace: false,
			onStart: () => {
				setIsLoading((prev) => ({
					...prev,
					services: true,
				}));
			},
			onFinish: () => {
				setTimeout(() => {
					setIsLoading((prev) => ({
						...prev,
						services: false,
					}));
				}, 250);
			},
		});
	}, [pageURL, watchPatientDetailsValue?.location?.id]);
	const onSelectService = useCallback(
		(service: AppointmentBookingSchema["appointmentScheduling"]["service"]) => {
			// reset the value of the package if the service changed
			form.resetField("appointmentScheduling.package", {
				defaultValue: DEFAULT_VALUES_PACKAGE,
			});
			form.setValue("appointmentScheduling.service", service, {
				shouldValidate: true,
			});
		},
		[form.setValue, form.resetField],
	);

	// * for appointment date field
	const [isOpenAppointmentDate, setIsOpenAppointmentDate] = useState(false);
	const [appointmentDate, setAppointmentDate] = useState<Date | null>(
		watchAppointmentSchedulingValue?.appointmentDateTime
			? new Date(watchAppointmentSchedulingValue.appointmentDateTime.toString())
			: null,
	);
	const [appointmentTime, setAppointmentTime] = useState<string>(
		watchAppointmentSchedulingValue?.appointmentDateTime
			? format(watchAppointmentSchedulingValue.appointmentDateTime, "HH:mm")
			: "",
	);
	// Memoized calendar properties for the appointment date field
	const appointmentDateCalendarProps = useMemo<CalendarProps>(() => {
		// Define the range of years to be displayed in the calendar
		const currentYear = new Date().getFullYear();
		const sixMonthsFromToday = new Date();
		sixMonthsFromToday.setMonth(sixMonthsFromToday.getMonth() + 6);

		return {
			// Close the calendar popover when a day is clicked
			onDayClick: () => setIsOpenAppointmentDate(false),
			// Set the range of years to be displayed
			fromYear: currentYear,
			toYear: currentYear,
			// Disable dates that are in the past or more than 6 months in the future
			disabled: (date) => {
				const today = new Date();
				return date <= today || date > sixMonthsFromToday;
			},
		};
	}, []);

	// * for assigning the therapist
	const mapRef = useRef<(H.Map & HereMaphandler) | null>(null);
	const [therapistsOptions, setTherapistsOptions] = useState({
		available: [] as AppointmentNewProps["therapists"],
		unavailable: [] as AppointmentNewProps["therapists"],
		feasibile: [] as AppointmentNewProps["therapists"],
		notFeasible: [] as AppointmentNewProps["therapists"],
	});
	const [isIsolineCalculated, setIsIsolineCalculated] = useState(false);
	const onFindTherapists = useCallback(() => {
		// fetch the services options data
		const { queryParams } = populateQueryParams(
			pageURL,
			deepTransformKeysToSnakeCase({
				locationId: watchPatientDetailsValue?.location?.id,
				serviceId: watchAppointmentSchedulingValue?.service?.id,
				preferredTherapistGender:
					watchAppointmentSchedulingValue.preferredTherapistGender,
				appointmentDateTime:
					watchAppointmentSchedulingValue.appointmentDateTime,
			}),
		);
		router.get(pageURL, queryParams, {
			only: ["therapists"],
			preserveScroll: true,
			preserveState: true,
			replace: false,
			onStart: () => {
				setIsLoading((prev) => ({
					...prev,
					therapists: true,
				}));
			},
			onFinish: () => {
				setTimeout(() => {
					setIsLoading((prev) => ({
						...prev,
						therapists: false,
					}));
				}, 250);
			},
			onSuccess: ({ props }) => {
				// map the available and unavailable therapists
				const result = (props as unknown as AppointmentNewGlobalPageProps)
					.therapists;
				const therapistsAvailable =
					result?.filter((t) => t.availabilityDetails?.available) || [];
				const therapistsUnavailable =
					result?.filter((t) => !t.availabilityDetails?.available) || [];

				setTherapistsOptions((prev) => ({
					...prev,
					available: therapistsAvailable,
					unavailable: therapistsUnavailable,
				}));
				onCalculateIsoline(therapistsAvailable);
			},
		});
	}, [pageURL, watchPatientDetailsValue, watchAppointmentSchedulingValue]);
	const onCalculateIsoline = useCallback(
		async (therapists: AppointmentNewProps["therapists"]) => {
			// TODO: show UI for therapists unavailable
			if (!mapRef.current || !therapists?.length) return;

			// calculate the isoline
			const { latitude, longitude } = watchPatientDetailsValue;
			const patientCoords = { lat: latitude, lng: longitude };
			await mapRef.current.isoline.onCalculate.both({
				coord: patientCoords,
				constraints: [
					{ type: "distance", value: 1000 * 25 }, // 25 km
					{ type: "time", value: 60 * 50 }, // 50 minutes
				],
			});

			// Map therapists to MarkerData
			const therapistCoords: MarkerData[] =
				therapists
					.map((therapist) => {
						// Safely handle missing activeAddress
						if (!therapist?.activeAddress) return null;

						return {
							position: {
								lat: therapist.activeAddress.latitude,
								lng: therapist.activeAddress.longitude,
							},
							address: therapist.activeAddress.address,
							bubbleContent: `
            <div class="w-[180px] text-xs flex flex-col">
              <span class="font-bold text-sm">${therapist.name}</span>
              <span class="font-light text-[10px]">#${therapist.registrationNumber}</span>
            </div>
          `,
							additional: { therapist },
						} satisfies MarkerData;
					})
					.filter((coord) => coord !== null) || [];

			// Get feasibility therapists result
			const feasibleResult = mapRef.current.isLocationFeasible(therapistCoords);
			const therapistList = {
				feasible: [] as AppointmentNewProps["therapists"],
				notFeasible: [] as AppointmentNewProps["therapists"],
			};
			for (const item of feasibleResult || []) {
				const therapist = item?.additional?.therapist;
				if (!therapist) continue;

				if (item.isFeasible) {
					therapistList?.feasible?.push(therapist);
				} else {
					therapistList?.notFeasible?.push(therapist);
				}
			}
			setTherapistsOptions((prev) => ({ ...prev, ...therapistList }));

			// Add markers for feasible therapists
			const markerFeasibleData: MarkerData[] =
				therapistList.feasible
					?.map(
						(feasibleTherapist) =>
							therapistCoords?.find(
								(coord) =>
									coord?.additional?.therapist?.id === feasibleTherapist.id,
							) || null,
					)
					?.filter((coord) => coord !== null) || [];

			mapRef.current.marker.onAdd(markerFeasibleData, {
				isSecondary: true,
				useRouting: true,
			});

			// Mark isoline as calculated
			setIsIsolineCalculated(true);
		},
		[watchPatientDetailsValue],
	);

	return (
		<FormStepItemContainer>
			<Deferred
				data={["services"]}
				fallback={
					<div className="flex flex-col self-end gap-3">
						<Skeleton className="w-10 h-4 rounded-md" />
						<Skeleton className="relative w-full rounded-md h-9" />
					</div>
				}
			>
				<FormField
					control={form.control}
					name="appointmentScheduling.service.name"
					render={({ field }) => (
						<FormItem>
							<FormLabel className="text-nowrap">Service</FormLabel>
							<Popover>
								<PopoverTrigger asChild>
									<FormControl>
										<Button
											variant="outline"
											className={cn(
												"relative w-full flex justify-between font-normal bg-sidebar shadow-inner",
												!field.value && "text-muted-foreground",
											)}
											onFocus={() => onFocusServiceField()}
										>
											<p>
												{field.value
													? servicesOption
															?.find((service) => service.name === field.value)
															?.name?.replaceAll("_", " ") ||
														field.value.replaceAll("_", " ")
													: "Select service"}
											</p>
											{field.value ? (
												// biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
												<div
													className="cursor-pointer"
													onClick={(event) => {
														event.preventDefault();
														event.stopPropagation();

														onSelectService(DEFAULT_VALUES_SERVICE);
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
											placeholder="Search service..."
											className="h-9"
											disabled={isLoading.services}
										/>
										<CommandList>
											<CommandEmpty>No service found.</CommandEmpty>
											<CommandGroup>
												{isLoading.services ? (
													<CommandItem value={undefined} disabled>
														<LoaderIcon className="animate-spin" />
														<span>Please wait...</span>
													</CommandItem>
												) : (
													servicesOption?.map((service) => (
														<CommandItem
															key={service.id}
															value={service.name}
															onSelect={() =>
																onSelectService({
																	id: String(service.id),
																	name: service.name,
																})
															}
														>
															<span className="flex flex-col items-start">
																<span>{service.name.replaceAll("_", " ")}</span>
																<span className="text-xs font-light text-pretty">
																	{service.description}
																</span>
															</span>

															<Check
																className={cn(
																	"ml-auto",
																	service.name === field.value
																		? "opacity-100"
																		: "opacity-0",
																)}
															/>
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
					)}
				/>
			</Deferred>

			<FormField
				control={form.control}
				name="appointmentScheduling.package.name"
				render={({ field }) => {
					const selectedPackage = packagesOption?.find(
						(packageItem) => packageItem.name === field.value,
					);

					return (
						<FormItem>
							<FormLabel className="text-nowrap">Package</FormLabel>
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
												<p>
													<span>{selectedPackage?.name || field.value}</span>{" "}
													<span className="italic font-light">{`(${selectedPackage?.numberOfVisit || watchAppointmentSchedulingValue?.package?.numberOfVisit} visit(s))`}</span>
												</p>
											) : (
												<span>Select package</span>
											)}
											<ChevronsUpDown className="opacity-50" />
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
											placeholder="Search package..."
											className="h-9"
										/>
										<CommandList>
											<CommandEmpty>No package found.</CommandEmpty>
											<CommandGroup>
												{packagesOption?.map((packageItem) => (
													<CommandItem
														key={packageItem.id}
														value={packageItem.name}
														onSelect={() => {
															form.setValue(
																"appointmentScheduling.package",
																{
																	id: packageItem.id,
																	name: packageItem.name,
																	numberOfVisit: packageItem.numberOfVisit,
																},
																{ shouldValidate: true },
															);
														}}
													>
														<p>
															<span>{packageItem.name}</span>{" "}
															<span className="italic font-light">{`(${packageItem.numberOfVisit} visit(s))`}</span>
														</p>

														<Check
															className={cn(
																"ml-auto",
																packageItem.name === field.value
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

							<FormMessage />
						</FormItem>
					);
				}}
			/>

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
					name="appointmentScheduling.preferredTherapistGender"
					render={({ field }) => (
						<FormItem className="space-y-3 col-span-full">
							<FormLabel>Preferred Therapist Gender</FormLabel>
							<FormControl>
								<RadioGroup
									onValueChange={field.onChange}
									defaultValue={field.value}
									orientation="horizontal"
									className="grid grid-cols-1 gap-4 md:grid-cols-3"
								>
									{appointmentFormOptions.preferredTherapistGender.map(
										(gender) => (
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
										),
									)}
								</RadioGroup>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
			</Deferred>

			<div className="flex w-full gap-4">
				<FormField
					control={form.control}
					name="appointmentScheduling.appointmentDateTime"
					render={({ field }) => (
						<FormItem className="flex-grow">
							<FormLabel>Appointment Date</FormLabel>
							<Popover
								open={isOpenAppointmentDate}
								onOpenChange={setIsOpenAppointmentDate}
							>
								<PopoverTrigger asChild>
									<FormControl>
										<Button
											variant={"outline"}
											className={cn(
												"relative w-full pl-3 text-left font-normal shadow-inner bg-sidebar",
												!field.value && "text-muted-foreground",
											)}
										>
											{field.value ? (
												format(field.value, "PPPP")
											) : (
												<span>Pick a appointment date</span>
											)}
											<CalendarIcon className="w-4 h-4 ml-auto opacity-75" />
										</Button>
									</FormControl>
								</PopoverTrigger>
								<PopoverContent
									className="w-auto p-0"
									align="start"
									side="bottom"
								>
									<Calendar
										{...appointmentDateCalendarProps}
										initialFocus
										mode="single"
										captionLayout="dropdown"
										selected={new Date(appointmentDate || field.value)}
										onSelect={(selectedDate) => {
											// Set the selected time to the selected date
											const [hours, minutes] = appointmentTime.split(":");
											selectedDate?.setHours(
												Number.parseInt(hours),
												Number.parseInt(minutes),
											);

											// update state reference and form field value data
											setAppointmentDate(selectedDate || null);
											field.onChange(selectedDate);
										}}
										defaultMonth={field.value}
									/>
								</PopoverContent>
							</Popover>

							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="appointmentScheduling.appointmentDateTime"
					render={({ field }) => (
						<FormItem className="flex-auto">
							<FormLabel className="invisible">Time</FormLabel>
							<FormControl>
								<Select
									defaultValue={appointmentTime}
									onValueChange={(e) => {
										setAppointmentTime(e);
										if (appointmentDate) {
											const [hours, minutes] = e.split(":");
											const newDate = new Date(appointmentDate.getTime());
											newDate.setHours(
												Number.parseInt(hours),
												Number.parseInt(minutes),
											);
											setAppointmentDate(newDate);
											field.onChange(newDate);
										}
									}}
								>
									<SelectTrigger
										className={cn(
											"shadow-inner bg-sidebar focus:ring-0 w-[100px] focus:ring-offset-0",
											!appointmentDate && "text-muted-foreground",
										)}
									>
										<SelectValue placeholder="Time" />
									</SelectTrigger>
									<SelectContent>
										<ScrollArea className="h-[15rem]">
											{Array.from({ length: 96 }).map((_, i) => {
												const hour = Math.floor(i / 4)
													.toString()
													.padStart(2, "0");
												const minute = ((i % 4) * 15)
													.toString()
													.padStart(2, "0");
												return (
													<SelectItem
														key={String(i)}
														value={`${hour}:${minute}`}
													>
														{hour}:{minute}
													</SelectItem>
												);
											})}
										</ScrollArea>
									</SelectContent>
								</Select>
							</FormControl>

							<FormMessage />
						</FormItem>
					)}
				/>
			</div>

			<div className="grid gap-3 col-span-full">
				<Button
					type="button"
					effect="shine"
					iconPlacement="right"
					icon={ChevronsRight}
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

			<p>Visit #1: assigned to therapist: </p>
		</FormStepItemContainer>
	);
}

export function AdditionalSettingsForm() {
	const { props: globalProps } = usePage<AppointmentNewGlobalPageProps>();
	const form = useFormContext<AppointmentBookingSchema>();
	const additionalFormOptions = useMemo(() => {
		const referralSources = globalProps.optionsData?.referralSources || [];
		const fisiohomePartnerNames =
			globalProps.optionsData?.fisiohomePartnerNames || [];

		return { referralSources, fisiohomePartnerNames };
	}, [
		globalProps.optionsData?.referralSources,
		globalProps.optionsData?.fisiohomePartnerNames,
	]);

	// * Watching changes to the partner booking value
	const watchPartnerBookingValue = useWatch({
		control: form.control,
		name: "additionalSettings.fisiohomePartnerBooking",
	});
	const isPartnerBooking = useMemo(
		() => boolSchema.parse(watchPartnerBookingValue),
		[watchPartnerBookingValue],
	);
	useEffect(() => {
		// if partner booking is change to false value reset the other form value below
		if (!isPartnerBooking) {
			form.setValue("additionalSettings.fisiohomePartnerName", "");
			form.setValue("additionalSettings.customFisiohomePartnerName", "");
			form.setValue("additionalSettings.voucherCode", "");
		}
	}, [isPartnerBooking, form.setValue]);

	// * Watching changes to the fisiohome partner name and handling custom partner names
	const watchFisiohomePartnerName = useWatch({
		control: form.control,
		name: "additionalSettings.fisiohomePartnerName",
	});
	const watchCustomFisiohomePartnerName = useWatch({
		control: form.control,
		name: "additionalSettings.customFisiohomePartnerName",
	});
	const isCustomFisiohomePartner = useMemo(
		() => checkIsCustomFisiohomePartner(watchFisiohomePartnerName || ""),
		[watchFisiohomePartnerName],
	);
	useEffect(() => {
		// If the fisiohome partner is custom, set the custom fisiohome partner name value
		if (isCustomFisiohomePartner) {
			form.setValue(
				"additionalSettings.customFisiohomePartnerName",
				watchCustomFisiohomePartnerName,
			);
			return;
		}

		// If the fisiohome partner is not custom, clear the custom fisiohome partner name value
		form.setValue("additionalSettings.customFisiohomePartnerName", "");
	}, [
		isCustomFisiohomePartner,
		watchCustomFisiohomePartnerName,
		form.setValue,
	]);

	// * Watching changes to the patient referral source and handling custom referral sources
	const watchReferralSource = useWatch({
		control: form.control,
		name: "additionalSettings.referralSource",
	});
	const watchCustomReferralSource = useWatch({
		control: form.control,
		name: "additionalSettings.customReferralSource",
	});
	const isCustomReferral = useMemo(
		() => checkIsCustomReferral(watchReferralSource || ""),
		[watchReferralSource],
	);
	useEffect(() => {
		// If the referral source is custom, set the custom referral source value
		if (isCustomReferral) {
			form.setValue(
				"additionalSettings.customReferralSource",
				watchCustomReferralSource,
			);
			return;
		}

		// If the referral source is not custom, clear the custom referral source value
		form.setValue("additionalSettings.customReferralSource", "");
	}, [isCustomReferral, watchCustomReferralSource, form.setValue]);

	return (
		<FormStepItemContainer>
			<Deferred
				data={["optionsData"]}
				fallback={
					<div className="flex flex-col self-end gap-3 col-span-full">
						<Skeleton className="w-10 h-4 rounded-md" />
						<div className="grid grid-cols-1 gap-4 md:grid-cols-5">
							<Skeleton className="relative w-full rounded-md h-9" />
							<Skeleton className="relative w-full rounded-md h-9" />
							<Skeleton className="relative w-full rounded-md h-9" />
							<Skeleton className="relative w-full rounded-md h-9" />
						</div>
					</div>
				}
			>
				<FormField
					control={form.control}
					name="additionalSettings.referralSource"
					render={({ field }) => (
						<FormItem className="space-y-3 col-span-full">
							<FormLabel>
								Referral Source{" "}
								<span className="text-sm italic font-light">- (optional)</span>
							</FormLabel>
							<FormControl>
								<RadioGroup
									onValueChange={field.onChange}
									value={field.value}
									className="flex flex-col gap-5 md:items-center md:flex-row"
								>
									{additionalFormOptions.referralSources.map((option) => (
										<FormItem
											key={option}
											className="flex items-center space-x-3 space-y-0"
										>
											<FormControl>
												<RadioGroupItem value={option} />
											</FormControl>
											<FormLabel className="flex items-center gap-1 font-normal capitalize">
												<span>{option.toLowerCase()}</span>
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

			{isCustomReferral && (
				<Deferred
					data={["optionsData"]}
					fallback={
						<div className="grid grid-cols-1 gap-4 col-span-full">
							<Skeleton className="relative w-full rounded-md h-9" />
						</div>
					}
				>
					<FormField
						control={form.control}
						name="additionalSettings.customReferralSource"
						render={({ field }) => (
							<FormItem className="col-span-full motion-preset-rebound-down">
								<FormControl>
									<Input
										{...field}
										type="text"
										placeholder="Please specify the referral source"
										className="shadow-inner bg-sidebar"
									/>
								</FormControl>

								<FormMessage />
							</FormItem>
						)}
					/>
				</Deferred>
			)}

			<FormField
				control={form.control}
				name="additionalSettings.fisiohomePartnerBooking"
				render={({ field }) => (
					<FormItem className="space-y-3 col-span-full">
						<FormLabel>Booking from Partner?</FormLabel>
						<FormControl>
							<RadioGroup
								onValueChange={field.onChange}
								defaultValue={String(!!field.value)}
								orientation="horizontal"
								className="flex flex-row items-center gap-5"
							>
								{[true, false].map((booleanValue) => (
									<FormItem
										key={String(booleanValue)}
										className="flex items-center space-x-3 space-y-0"
									>
										<FormControl>
											<RadioGroupItem value={String(booleanValue)} />
										</FormControl>
										<FormLabel className="font-normal">
											{booleanValue ? "Yes" : "No"}
										</FormLabel>
									</FormItem>
								))}
							</RadioGroup>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>

			{isPartnerBooking && (
				<>
					<Deferred
						data={["optionsData"]}
						fallback={
							<div className="flex flex-col self-end gap-3">
								<Skeleton className="w-10 h-4 rounded-md" />
								<div className="grid grid-cols-2 gap-4">
									<Skeleton className="relative w-full rounded-md h-9" />
									<Skeleton className="relative w-full rounded-md h-9" />
								</div>
							</div>
						}
					>
						<div className={cn(isCustomFisiohomePartner ? "flex gap-3 " : "")}>
							<FormField
								control={form.control}
								name="additionalSettings.fisiohomePartnerName"
								render={({ field }) => (
									<FormItem className="motion-preset-rebound-down">
										<FormLabel className="text-nowrap">
											Fisiohome Partner
										</FormLabel>
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
														{field.value
															? additionalFormOptions.fisiohomePartnerNames.find(
																	(partner) => partner === field.value,
																)
															: "Select fisiohome partner"}
														<ChevronsUpDown className="opacity-50" />
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
														placeholder="Search fisiohome partner..."
														className="h-9"
													/>
													<CommandList>
														<CommandEmpty>
															No fisiohome partner found.
														</CommandEmpty>
														<CommandGroup>
															{additionalFormOptions.fisiohomePartnerNames.map(
																(partner) => (
																	<CommandItem
																		value={partner}
																		key={partner}
																		onSelect={() => {
																			form.setValue(
																				"additionalSettings.fisiohomePartnerName",
																				partner,
																				{ shouldValidate: true },
																			);
																		}}
																	>
																		{partner}
																		<Check
																			className={cn(
																				"ml-auto",
																				partner === field.value
																					? "opacity-100"
																					: "opacity-0",
																			)}
																		/>
																	</CommandItem>
																),
															)}
														</CommandGroup>
													</CommandList>
												</Command>
											</PopoverContent>
										</Popover>

										<FormMessage />
									</FormItem>
								)}
							/>

							{isCustomFisiohomePartner && (
								<FormField
									control={form.control}
									name="additionalSettings.customFisiohomePartnerName"
									render={({ field }) => (
										<FormItem className="w-full motion-preset-rebound-down">
											<FormLabel className="invisible">Other Partner</FormLabel>
											<FormControl>
												<Input
													{...field}
													type="text"
													placeholder="Please specify the fisiohome partner name"
													className="relative shadow-inner bg-sidebar"
												/>
											</FormControl>

											<FormMessage />
										</FormItem>
									)}
								/>
							)}
						</div>
					</Deferred>

					<Deferred
						data={["optionsData"]}
						fallback={
							<div className="flex flex-col self-end gap-3">
								<Skeleton className="w-10 h-4 rounded-md" />
								<div className="grid grid-cols-1 gap-4">
									<Skeleton className="relative w-full rounded-md h-9" />
								</div>
							</div>
						}
					>
						<FormField
							control={form.control}
							name="additionalSettings.voucherCode"
							render={({ field }) => (
								<FormItem className="motion-preset-rebound-down">
									<FormLabel>
										Voucher Code{" "}
										<span className="text-sm italic font-light">
											- (optional)
										</span>
									</FormLabel>
									<FormControl>
										<Input
											{...field}
											type="text"
											autoComplete="name"
											placeholder="Enter the voucher code..."
											className="shadow-inner bg-sidebar"
										/>
									</FormControl>

									<FormMessage />
								</FormItem>
							)}
						/>
					</Deferred>
				</>
			)}

			<FormField
				control={form.control}
				name="additionalSettings.notes"
				render={({ field }) => (
					<FormItem className="col-span-full">
						<FormLabel>
							Notes{" "}
							<span className="text-sm italic font-light">- (optional)</span>
						</FormLabel>
						<FormControl>
							<Textarea
								{...field}
								placeholder="Enter the additional appointment notes..."
								className="shadow-inner bg-sidebar"
							/>
						</FormControl>

						<FormDescription>
							Any notes that are relevant to this appointment.
						</FormDescription>

						<FormMessage />
					</FormItem>
				)}
			/>
		</FormStepItemContainer>
	);
}

export function ReviewForm() {
	const { props: globalProps } = usePage<AppointmentNewGlobalPageProps>();
	const errorsServerValidation = useMemo(
		() => (globalProps?.errors?.fullMessages as unknown as string[]) || null,
		[globalProps?.errors?.fullMessages],
	);
	const form = useFormContext<AppointmentBookingSchema>();
	const { setStep } = useStepper();
	const review = useMemo(() => form.getValues(), [form.getValues]);
	const sections = useMemo(() => {
		const {
			contactInformation,
			patientDetails,
			appointmentScheduling,
			additionalSettings,
		} = review;
		const getGenderIcon = (gender: string) => {
			const lower = gender.toLowerCase();
			if (lower === "male") return <Mars className="size-4" />;
			if (lower === "female") return <Venus className="size-4" />;
			return <VenusAndMars className="size-4" />;
		};
		const onClickGMaps = (coordinate: number[]) => {
			window.open(
				`https://www.google.com/maps/search/?api=1&query=${coordinate.join(",")}`,
			);
		};

		return [
			{
				title: "Contact" as const,
				stepValue: 0,
				subs: [
					{
						title: "Name",
						value: contactInformation.contactName,
					},
					{
						title: "Phone Number",
						value: contactInformation.contactPhone,
					},
					{
						title: "Email",
						value: contactInformation?.email || "-",
					},
					{
						title: "MiiTel Link",
						value: contactInformation?.miitelLink || "-",
					},
				],
			},
			{
				title: "Patient Profile" as const,
				stepValue: 1,
				subs: [
					{
						title: "Full Name",
						value: patientDetails.fullName,
					},
					{
						title: "Date of Birth",
						value: format(patientDetails.dateOfBirth, "PPP", {}),
					},
					{
						title: "Age",
						value: `${patientDetails.age} years`,
					},
					{
						title: "Gender",
						value: patientDetails.gender ? (
							<Badge variant="secondary">
								<span className="flex items-center justify-end gap-1">
									{getGenderIcon(patientDetails.gender.toLowerCase())}
									{patientDetails.gender}
								</span>
							</Badge>
						) : (
							"-"
						),
					},
					{
						title: "Current Condition",
						value: <Badge variant="outline">{patientDetails?.condition}</Badge>,
					},
					{
						title: "Illness Onset Date",
						value: patientDetails?.illnessOnsetDate || "-",
					},
					{
						title: "Medical History",
						value: patientDetails?.medicalHistory || "-",
					},
					{
						title: "Region",
						value: patientDetails.location.city,
					},
					{
						title: "Postal Code",
						value: patientDetails.postalCode,
					},
					{
						title: "Address",
						value: (
							<div className="space-y-2">
								<p>{patientDetails.address}</p>
								<Button
									type="button"
									variant="link"
									effect="hoverUnderline"
									iconPlacement="left"
									icon={MapPin}
									onClick={(event) => {
										event.preventDefault();
										onClickGMaps([
											patientDetails.latitude,
											patientDetails.longitude,
										]);
									}}
								>
									View on map
								</Button>
							</div>
						),
					},
					{
						title: "Address Note",
						value: patientDetails?.addressNotes || "-",
					},
				],
			},
			{
				title: "Schedule and Settings" as const,
				stepValue: 2,
				subs: [
					{
						title: "Service",
						value: appointmentScheduling.service.name,
					},
					{
						title: "Package",
						value: `${appointmentScheduling.package.name} (${appointmentScheduling.package.numberOfVisit} visit(s))`,
					},
					{
						title: "Preferred Therapist Gender",
						value: (
							<Badge variant="secondary">
								<span className="flex items-center justify-end gap-1">
									{getGenderIcon(
										appointmentScheduling.preferredTherapistGender.toLowerCase(),
									)}
									{appointmentScheduling.preferredTherapistGender}
								</span>
							</Badge>
						),
					},
					{
						title: "Appointment Date & Time",
						value: format(
							appointmentScheduling.appointmentDateTime,
							"PPP, hh:mm a",
						),
					},
					{
						title: "Assigned Therapist",
						value: appointmentScheduling.therapist?.name || "-",
					},
				],
			},
			{
				title: "Additionals" as const,
				stepValue: 3,
				subs: [
					{
						title: "Referral Source",
						value: additionalSettings?.referralSource
							? `${additionalSettings?.referralSource} - ${additionalSettings?.customReferralSource}`
							: "-",
					},
					{
						title: "Fisiohome Partner Booking",
						value: additionalSettings?.fisiohomePartnerName
							? `${additionalSettings?.fisiohomePartnerName} - ${additionalSettings?.customFisiohomePartnerName}`
							: "-",
					},
					{
						title: "Voucher Code",
						value: additionalSettings?.voucherCode || "-",
					},
					{
						title: "Notes",
						value: additionalSettings?.notes || "-",
					},
				],
			},
		];
	}, [review]);
	const onEdit = useCallback(
		(value: (typeof sections)[number]["stepValue"]) => {
			setStep(value);
		},
		[setStep],
	);

	return (
		<FormStepItemContainer className="!grid-cols-1 gap-6">
			{sections.map((section) => (
				<div key={section.title} className="grid gap-2 text-sm">
					<div className="flex items-center justify-between">
						<p className="text-sm font-medium tracking-tight">
							{section.title}
						</p>
						<Button
							type="button"
							variant="link"
							effect="expandIcon"
							iconPlacement="left"
							className="p-0"
							icon={Pencil}
							onClick={(event) => {
								event.preventDefault();
								onEdit(section.stepValue);
							}}
						>
							Edit
						</Button>
					</div>

					<Table className="border rounded-lg border-border">
						<TableBody>
							{section.subs.map((sub) => (
								<TableRow key={sub.title}>
									<TableCell className="p-2 font-light tracking-tight md:p-4">
										{sub.title}
									</TableCell>
									<TableCell className="p-2 font-medium text-right break-all md:p-4 text-clip text-pretty">
										{sub.value}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			))}

			{/* for showing the alert error if there's any server validation error */}
			{errorsServerValidation?.length && (
				<Alert variant="destructive">
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
		</FormStepItemContainer>
	);
}
