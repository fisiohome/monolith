import { useMediaQuery } from "@uidotdev/usehooks";
import {
	FISIOHOME_PARTNER,
	GENDERS,
	IS_DEKSTOP_MEDIA_QUERY,
	PATIENT_CONDITIONS_WITH_DESCRIPTION,
	PATIENT_REFERRAL_OPTIONS,
	PREFERRED_THERAPIST_GENDER,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { useStepper } from "@/components/shared/stepper";
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
	AlertCircle,
	CalendarIcon,
	Check,
	ChevronsUpDown,
	LoaderIcon,
	Mars,
	Venus,
	VenusAndMars,
	X,
} from "lucide-react";
import {
	checkIsCustomFisiohomePartner,
	checkIsCustomReferral,
	DEFAULT_VALUES_LOCATION,
	DEFAULT_VALUES_PACKAGE,
	DEFAULT_VALUES_SERVICE,
	type AppointmentBookingSchema,
} from "@/lib/appointments";
import { useFormContext, useWatch } from "react-hook-form";
import {
	type ComponentProps,
	Fragment,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { PhoneInput } from "@/components/ui/phone-input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar, type CalendarProps } from "@/components/ui/calendar";
import { format } from "date-fns";
import {
	calculateAge,
	cn,
	goBackHandler,
	populateQueryParams,
} from "@/lib/utils";
import { boolSchema } from "@/lib/validation";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "@/components/ui/command";
import type { AppointmentNewGlobalPageProps } from "@/pages/AdminPortal/Appointment/New";
import { Deferred, router, usePage } from "@inertiajs/react";
import { Textarea } from "@/components/ui/textarea";
import { groupLocationsByCountry } from "@/lib/locations";
import type { Location } from "@/types/admin-portal/location";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import { Skeleton } from "@/components/ui/skeleton";
import { PulsatingOutlineShadowButton } from "@/components/shared/button-pulsating";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { HereMaphandler } from "@/components/shared/here-map";
import HereMap from "@/components/shared/here-map";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

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
	setFormStorage: React.Dispatch<
		React.SetStateAction<AppointmentBookingSchema | null>
	>;
}

export function StepButtons({ className, setFormStorage }: StepButtonsProps) {
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
	} = useStepper();
	const isFirstStep = useMemo(
		() => currentStep.label === "Contact Information",
		[currentStep.label],
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
				disabled={(isDisabledStep && !isFirstStep) || isLoading}
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
			) : (
				<Button
					type="button"
					size={!isDekstop ? "default" : "sm"}
					disabled={isLoading}
					className="order-first md:order-last"
					onClick={(event) => {
						event.preventDefault();
						onSubmit();
					}}
				>
					{isLoading ? (
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
	const { hasCompletedAllSteps, resetSteps } = useStepper();

	if (!hasCompletedAllSteps) return null;

	return (
		<>
			<div className="flex items-center justify-center h-40 border rounded-md">
				<h1 className="text-xl">Woohoo! All steps completed! 🎉</h1>
			</div>
			<div className="flex justify-end w-full gap-2">
				<Button size="sm" onClick={resetSteps}>
					Reset
				</Button>
			</div>
		</>
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
								variant="secondary"
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

export function AppointmentSchedulingForm() {
	const { props: globalProps, url: pageURL } =
		usePage<AppointmentNewGlobalPageProps>();
	const isDekstop = useMediaQuery(IS_DEKSTOP_MEDIA_QUERY);
	const [isLoading, setIsLoading] = useState({
		locations: false,
		services: false,
	});

	// form management state
	const form = useFormContext<AppointmentBookingSchema>();
	const watchAppointmentSchedulingValue = useWatch({
		control: form.control,
		name: "appointmentScheduling",
	});

	// for preferred therapist field
	const getGenderIcon = (
		gender: AppointmentBookingSchema["appointmentScheduling"]["preferredTherapistGender"],
	) => {
		const lower = gender.toLowerCase();
		if (lower === "male") return <Mars className="size-4" />;
		if (lower === "female") return <Venus className="size-4" />;
		return <VenusAndMars className="size-4" />;
	};

	// * watching the changes of location selected value
	const locationsOption = useMemo(
		() => globalProps?.locations,
		[globalProps?.locations],
	);
	const groupedLocationsOption = useMemo(() => {
		const locations = globalProps?.locations || [];

		return groupLocationsByCountry(locations as Location[]);
	}, [globalProps?.locations]);
	const selectedLocation = useMemo(() => {
		return locationsOption?.find(
			(location) =>
				String(location.id) === watchAppointmentSchedulingValue?.location?.id,
		);
	}, [watchAppointmentSchedulingValue?.location?.id, locationsOption]);
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
		(
			location: AppointmentBookingSchema["appointmentScheduling"]["location"],
		) => {
			// set value to the location selected, and reset some value if location changed
			form.resetField("appointmentScheduling.service", {
				defaultValue: DEFAULT_VALUES_SERVICE,
			});
			form.resetField("appointmentScheduling.package", {
				defaultValue: DEFAULT_VALUES_PACKAGE,
			});
			form.resetField("appointmentScheduling.postalCode", { defaultValue: "" });
			form.resetField("appointmentScheduling.address", { defaultValue: "" });
			form.resetField("appointmentScheduling.latitude", { defaultValue: 0 });
			form.resetField("appointmentScheduling.longitude", { defaultValue: 0 });
			form.setValue("appointmentScheduling.location", location, {
				shouldValidate: true,
			});
		},
		[form.setValue, form.resetField],
	);

	// * latitude, longitude, and map state fields
	const coordinateError = useMemo(() => {
		const latError = form.formState.errors.appointmentScheduling?.latitude;
		const lngError = form.formState.errors.appointmentScheduling?.longitude;

		return latError || lngError ? "Calculate the coordinate first." : null;
	}, [
		form.formState.errors.appointmentScheduling?.latitude,
		form.formState.errors.appointmentScheduling?.longitude,
	]);
	const mapRef = useRef<(H.Map & HereMaphandler) | null>(null);
	const coordinate = useMemo(
		() => [
			watchAppointmentSchedulingValue.latitude,
			watchAppointmentSchedulingValue.longitude,
		],
		[
			watchAppointmentSchedulingValue.latitude,
			watchAppointmentSchedulingValue.longitude,
		],
	);
	const mapAddress = useMemo(() => {
		const { address, postalCode } = watchAppointmentSchedulingValue;

		return {
			country: selectedLocation?.country || "",
			state: selectedLocation?.state || "",
			city: selectedLocation?.city || "",
			postalCode,
			address,
		};
	}, [selectedLocation, watchAppointmentSchedulingValue]);
	const isMapButtonsDisabled = useMemo(() => {
		const { latitude, longitude, address, postalCode } =
			watchAppointmentSchedulingValue;
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
	}, [watchAppointmentSchedulingValue, selectedLocation]);
	const onResetCoordinate = useCallback(() => {
		// reset the lat, lng form values
		form.resetField("appointmentScheduling.latitude", { defaultValue: 0 });
		form.resetField("appointmentScheduling.longitude", { defaultValue: 0 });

		// remove the map markers
		mapRef.current?.removeMarkers();
	}, [form.resetField]);
	const onClickGMaps = useCallback(() => {
		window.open(
			`https://www.google.com/maps/search/?api=1&query=${coordinate.join(",")}`,
		);
	}, [coordinate]);
	const onCalculateCoordinate = useCallback(async () => {
		try {
			// Fetch geocode result
			const geocodeResult = await mapRef.current?.geocodeAddress();
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
				form.setError("appointmentScheduling.address", {
					message: errorMessage,
					type: "custom",
				});
				return;
			}

			// Update form values with latitude and longitude
			const { lat, lng } = geocodeResult.position;
			form.setValue("appointmentScheduling.latitude", lat, {
				shouldValidate: true,
			});
			form.setValue("appointmentScheduling.longitude", lng, {
				shouldValidate: true,
			});

			// Add markers to the map
			mapRef.current?.addMarkers([geocodeResult]);
		} catch (error) {
			console.error("An unexpected error occurred:", error);

			// Handle unexpected errors
			form.setError("appointmentScheduling.address", {
				message:
					"An unexpected error occurred while calculating the coordinates from the address.",
				type: "custom",
			});
		}
	}, [form.setError, form.setValue]);

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
				locationId: watchAppointmentSchedulingValue?.location?.id,
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
	}, [pageURL, watchAppointmentSchedulingValue?.location?.id]);
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
	const [appointmentTime, setAppointmentTime] = useState<string>(
		format(watchAppointmentSchedulingValue.appointmentDate, "HH:mm"),
	);
	const [appointmentDate, setAppointmentDate] = useState<Date | null>(
		new Date(watchAppointmentSchedulingValue.appointmentDate.toString()),
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

	return (
		<FormStepItemContainer>
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
					name="appointmentScheduling.location.city"
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
												<Button
													variant="ghost"
													size="icon"
													className="w-auto h-auto py-0"
													onClick={(event) => {
														event.preventDefault();
														event.stopPropagation();

														onSelectLocation(DEFAULT_VALUES_LOCATION);
													}}
												>
													<X className="opacity-50" />
												</Button>
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
				name="appointmentScheduling.postalCode"
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
				name="appointmentScheduling.address"
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
				name="appointmentScheduling.latitude"
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
				name="appointmentScheduling.longitude"
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
				address={{
					country: mapAddress.country,
					state: mapAddress.state,
					city: mapAddress.city,
					postalCode: mapAddress.postalCode,
					address: mapAddress.address,
				}}
				className="col-span-full"
			/>

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
												<Button
													variant="ghost"
													size="icon"
													className="w-auto h-auto py-0"
													onClick={(event) => {
														event.preventDefault();
														event.stopPropagation();

														onSelectService(DEFAULT_VALUES_SERVICE);
													}}
												>
													<X className="opacity-50" />
												</Button>
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
								className="flex flex-col gap-5 md:flex-row md:items-center"
							>
								{PREFERRED_THERAPIST_GENDER.map((gender) => (
									<FormItem
										key={gender}
										className="flex items-center space-x-3 space-y-0"
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

			<div className="flex w-full gap-4">
				<FormField
					control={form.control}
					name="appointmentScheduling.appointmentDate"
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
												format(field.value, "PPP")
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
					name="appointmentScheduling.appointmentDate"
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
									<SelectTrigger className="font-normal shadow-inner bg-sidebar focus:ring-0 w-[100px] focus:ring-offset-0">
										<SelectValue />
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
		</FormStepItemContainer>
	);
}

export function PatientDetailsForm() {
	const form = useFormContext<AppointmentBookingSchema>();

	// for getting the gender icon
	const getGenderIcon = (
		gender: AppointmentBookingSchema["appointmentScheduling"]["preferredTherapistGender"],
	) => {
		const lower = gender.toLowerCase();
		if (lower === "male") return <Mars className="size-4" />;
		if (lower === "female") return <Venus className="size-4" />;
		return <VenusAndMars className="size-4" />;
	};

	// * watching the date of birth and calculate the age value
	const watchDateOfBirth = useWatch({
		control: form.control,
		name: "patientDetails.dateOfBirth",
	});
	// Memoized calendar properties for the date of birth field
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
		if (watchDateOfBirth && watchDateOfBirth instanceof Date) {
			// Calculate age using your custom function
			const age = calculateAge(watchDateOfBirth);
			// Update the age field in the form
			form.setValue("patientDetails.age", age);
		}
	}, [watchDateOfBirth, form.setValue]);

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
												"relative w-full pl-3 text-left font-normal shadow-inner bg-sidebar",
												!field.value && "text-muted-foreground",
											)}
										>
											{field.value ? (
												`${format(field.value, "PPP")}`
											) : (
												<span>Pick a date of birth</span>
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
								className="flex flex-row items-center gap-5"
							>
								{GENDERS.map((gender) => (
									<FormItem
										key={gender}
										className="flex items-center space-x-3 space-y-0"
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
								{PATIENT_CONDITIONS_WITH_DESCRIPTION.map((condition) => (
									<>
										<FormItem
											key={condition.title}
											className="flex items-start p-4 space-x-3 space-y-0 border rounded-md shadow-inner bg-sidebar"
										>
											<FormControl>
												<RadioGroupItem value={condition.title} />
											</FormControl>
											<FormLabel className="w-full space-y-1 font-normal">
												<span>{condition.title}</span>
												<FormDescription>
													{condition.description}
												</FormDescription>
											</FormLabel>
										</FormItem>
									</>
								))}
							</RadioGroup>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>

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
						<FormLabel>Medical History</FormLabel>
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
		</FormStepItemContainer>
	);
}

export function AdditionalSettings() {
	const form = useFormContext<AppointmentBookingSchema>();

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
	const fisiohomePartnerOptions = useMemo(
		() => [...FISIOHOME_PARTNER, "Other"] as const,
		[],
	);
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
	const patientReferralOptions = useMemo(
		() => [...PATIENT_REFERRAL_OPTIONS, "Other"] as const,
		[],
	);
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
								{patientReferralOptions.map((option) => (
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

			{isCustomReferral && (
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
					<div
						className={cn(
							isCustomFisiohomePartner ? "flex gap-3 col-span-full" : "",
						)}
					>
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
														? fisiohomePartnerOptions.find(
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
														{fisiohomePartnerOptions.map((partner) => (
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
														))}
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
				</>
			)}
		</FormStepItemContainer>
	);
}
