import { Deferred, Link, usePage } from "@inertiajs/react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { useIsFirstRender, useSessionStorage } from "@uidotdev/usehooks";
import { format } from "date-fns";
import {
	AlertCircle,
	Check,
	ChevronDownIcon,
	ChevronsUpDown,
	CircleCheckBig,
	Hospital,
	LoaderIcon,
	Pencil,
	X,
} from "lucide-react";
import {
	type ComponentProps,
	createContext,
	type Dispatch,
	Fragment,
	memo,
	type SetStateAction,
	Suspense,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { useTranslation } from "react-i18next";
import { useDateContext } from "@/components/providers/date-provider";
import HereMap from "@/components/shared/here-map";
import { RetroGridPattern } from "@/components/shared/retro-grid-pattern";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
} from "@/components/ui/accordion";
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
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
	SESSION_STORAGE_FORM_KEY,
	SESSION_STORAGE_FORM_SELECTIONS_KEY,
	useAdditionalSettingsForm,
	useAppointmentSchedulingForm,
	useFinalStep,
	usePatientDetailsForm,
	useReviewForm,
	useStepButtons,
} from "@/hooks/admin-portal/appointment/use-appointment-form";
import {
	type TherapistOption,
	usePartnerBookingSelection,
	usePartnerNameSelection,
	usePatientReferralSource,
} from "@/hooks/admin-portal/appointment/use-appointment-utils";
import { getGenderIcon } from "@/hooks/use-gender";
import {
	type AppointmentBookingSchema,
	DEFAULT_VALUES_SERVICE,
	defineAppointmentFormDefaultValues,
} from "@/lib/appointments/form";
import { getBadgeVariantStatus } from "@/lib/appointments/utils";
import { MAP_DEFAULT_COORDINATE } from "@/lib/here-maps";
import { cn, populateQueryParams } from "@/lib/utils";
import type { AppointmentNewGlobalPageProps } from "@/pages/AdminPortal/Appointment/New";
import DateTimePicker from "./form/date-time";
import ExistingPatientSelection from "./form/existing-patient-selection";
import PatientBasicInfoForm from "./form/patient-basic-info";
import PatientContactForm from "./form/patient-contact";
import PatientMedicalForm from "./form/patient-medical";
import PatientRegionForm from "./form/patient-region";
import { SeriesScheduler } from "./form/series-scheduler";
import TherapistSelection from "./form/therapist-selection";

export type FormMode = "new" | "series";
type FormStorage = AppointmentBookingSchema | null;
type FormStorageSelection = {
	therapist: null | TherapistOption;
	seriesTherapists: null | Record<number, TherapistOption | null>;
};

// * form provider props
interface FormProviderProps {
	children: React.ReactNode;
}

interface FormProviderState {
	mode: FormMode;
	isSuccessBooked: boolean;
	formStorage: FormStorage;
	setFormStorage: Dispatch<SetStateAction<FormStorage>>;
	formSelections: FormStorageSelection;
	setFormSelections: Dispatch<SetStateAction<FormStorageSelection>>;
}

const FormProviderContext = createContext<FormProviderState>({
	mode: "new",
	isSuccessBooked: false,
	formStorage: null,
	formSelections: {
		therapist: null,
		seriesTherapists: null,
	},
	setFormStorage: () => {},
	setFormSelections: () => {},
});

export function FormProvider({ children }: FormProviderProps) {
	const { props: globalProps, url: pageURL } =
		usePage<AppointmentNewGlobalPageProps>();
	const formMode = useMemo(() => {
		const reference = globalProps.adminPortal.currentQuery?.reference;

		return reference ? ("series" as const) : ("new" as const);
	}, [globalProps.adminPortal.currentQuery?.reference]);
	const isSuccessBooked = useMemo(() => {
		const appointmentId = globalProps?.appointment?.id;
		const { queryParams } = populateQueryParams(pageURL);

		return !!queryParams?.created && !!appointmentId;
	}, [globalProps?.appointment?.id, pageURL]);

	// define the form default values and the selections storage
	const formDefaultvalues = useMemo(
		() =>
			defineAppointmentFormDefaultValues({
				mode: formMode,
				user: globalProps.auth.currentUser,
				apptRef: globalProps.appointmentReference,
			}),
		[globalProps.auth.currentUser, globalProps.appointmentReference, formMode],
	);
	const [formStorage, setFormStorage] = useSessionStorage<
		FormProviderState["formStorage"]
	>(SESSION_STORAGE_FORM_KEY, {
		...formDefaultvalues,
	});
	const [formSelections, setFormSelections] = useSessionStorage<
		FormProviderState["formSelections"]
	>(SESSION_STORAGE_FORM_SELECTIONS_KEY, {
		therapist: null,
		seriesTherapists: null,
	});

	return (
		<FormProviderContext.Provider
			value={{
				mode: formMode,
				isSuccessBooked,
				formStorage,
				setFormStorage,
				formSelections,
				setFormSelections,
			}}
		>
			{children}
		</FormProviderContext.Provider>
	);
}

export const useFormProvider = () => {
	const context = useContext(FormProviderContext);

	if (context === undefined)
		throw new Error(
			"useFormProvider must be used within a FormProviderContext",
		);

	return context;
};

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
}

export function StepButtons({ className, isFormLoading }: StepButtonsProps) {
	const { setFormStorage } = useFormProvider();
	const {
		isDekstop,
		isDisabledStep,
		isLoading,
		isFirstStep,
		isLastStep,
		isOpenTherapistAlert,
		isOptionalStep,
		onSubmit,
		onPrevStep,
		onBack,
		setIsOpenTherapistAlert,
	} = useStepButtons({ setFormStorage });
	const { t: taf } = useTranslation("appointments-form");

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
				disabled={
					(isDisabledStep && !isFirstStep) || isLoading || isFormLoading
				}
				onClick={(event) => {
					event.preventDefault();
					isFirstStep ? onBack() : onPrevStep();
				}}
			>
				{isFirstStep ? taf("button.cancel") : taf("button.prev")}
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
							<span>{taf("button.save.loading")}</span>
						</>
					) : (
						<span>{taf("button.save.label")}</span>
					)}
				</Button>
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
							<span>{taf("button.next.loading")}</span>
						</>
					) : isOptionalStep ? (
						<span>{taf("button.skip")}</span>
					) : (
						<span>{taf("button.next.label")}</span>
					)}
				</Button>
			)}

			<AlertDialog
				open={isOpenTherapistAlert}
				onOpenChange={setIsOpenTherapistAlert}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{taf("modal.title")}</AlertDialogTitle>
						<AlertDialogDescription>
							{taf("modal.description")}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter className="space-y-4 md:space-y-0">
						<AlertDialogCancel>{taf("modal.button.cancel")}</AlertDialogCancel>
						<AlertDialogAction asChild>
							<Button
								type="button"
								size={!isDekstop ? "default" : "sm"}
								disabled={isLoading || isFormLoading}
								className="order-first md:order-last"
								onClick={(event) => {
									event.preventDefault();
									onSubmit({ skipTherapist: true });
								}}
							>
								{isLoading || isFormLoading ? (
									<>
										<LoaderIcon className="animate-spin" />
										<span>{taf("modal.button.next.loading")}</span>
									</>
								) : isOptionalStep ? (
									<span>{taf("modal.button.skip")}</span>
								) : (
									<span>{taf("modal.button.next.label")}</span>
								)}
							</Button>
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

export function FinalStep() {
	const { t: taf } = useTranslation("appointments-form", {
		keyPrefix: "final_step",
	});
	const { count, hasCompletedAllSteps, redirectURL } = useFinalStep();

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
					<span>{taf("title")}</span>
				</h1>

				<p className="text-xs text-pretty w-full md:w-[75%] mx-auto text-primary">
					{taf("description")}
				</p>

				<span className="my-2 text-3xl font-bold text-primary">{count}</span>

				<Button effect="shine" size="lg" asChild>
					<Link href={redirectURL}>{taf("button")}</Link>
				</Button>
			</div>

			<RetroGridPattern />
		</FormStepItemContainer>
	);
}

export const PatientDetailsForm = memo(function Component() {
	const { isExistingPatientSource } = usePatientDetailsForm();

	return (
		<FormStepItemContainer>
			<Suspense
				fallback={
					<div className="col-span-full grid grid-cols-2 items-center gap-4">
						{Array.from({ length: 2 }).map((_, index) => (
							<Skeleton
								key={String(index)}
								className="w-full h-12 rounded-md shadow-inner border-input"
							/>
						))}

						<Skeleton className="w-full h-20 rounded-md shadow-inner border-input col-span-full" />
					</div>
				}
			>
				<ExistingPatientSelection />
			</Suspense>

			<Separator className="mt-3 col-span-full" />

			{isExistingPatientSource ? (
				<Suspense
					fallback={
						<div className="col-span-full grid items-center gap-4">
							<div className="flex items-center justify-between gap-4">
								<Skeleton className="w-[200px] h-6 rounded-md shadow-inner border-input" />
								<Skeleton className="w-12 h-6 rounded-md shadow-inner border-input" />
							</div>

							<Skeleton className="w-full h-20 rounded-md shadow-inner border-input col-span-full" />
						</div>
					}
				>
					<PatientMedicalForm />
				</Suspense>
			) : (
				<Fragment>
					<Suspense
						fallback={
							<div className="col-span-full grid items-center gap-4">
								<div className="flex items-center justify-between gap-4">
									<Skeleton className="w-[200px] h-6 rounded-md shadow-inner border-input" />
									<Skeleton className="w-12 h-6 rounded-md shadow-inner border-input" />
								</div>

								<Skeleton className="w-full h-20 rounded-md shadow-inner border-input col-span-full" />
							</div>
						}
					>
						<PatientContactForm />
					</Suspense>

					<Separator className="mt-3 col-span-full" />

					<Suspense
						fallback={
							<div className="col-span-full grid items-center gap-4">
								<div className="flex items-center justify-between gap-4">
									<Skeleton className="w-[200px] h-6 rounded-md shadow-inner border-input" />
									<Skeleton className="w-12 h-6 rounded-md shadow-inner border-input" />
								</div>

								<Skeleton className="w-full h-20 rounded-md shadow-inner border-input col-span-full" />
							</div>
						}
					>
						<PatientBasicInfoForm />
					</Suspense>

					<Separator className="mt-3 col-span-full" />

					<Suspense
						fallback={
							<div className="col-span-full grid items-center gap-4">
								<div className="flex items-center justify-between gap-4">
									<Skeleton className="w-[200px] h-6 rounded-md shadow-inner border-input" />
									<Skeleton className="w-12 h-6 rounded-md shadow-inner border-input" />
								</div>

								<Skeleton className="w-full h-20 rounded-md shadow-inner border-input col-span-full" />
							</div>
						}
					>
						<PatientMedicalForm />
					</Suspense>

					<Separator className="mt-3 col-span-full" />

					<PatientRegionForm />
				</Fragment>
			)}
		</FormStepItemContainer>
	);
});

export function AppointmentSchedulingForm() {
	const { t: tas } = useTranslation("appointments-form", {
		keyPrefix: "appt_schedule",
	});
	const { t: tasf } = useTranslation("appointments-form", {
		keyPrefix: "appt_schedule.fields",
	});

	const { locale, tzDate } = useDateContext();
	const isFirstRender = useIsFirstRender();
	const { mode, formSelections, setFormSelections } = useFormProvider();

	// For scheduling-first approach, location selection will be added to the form
	const {
		form,
		isLoading,
		watchAppointmentSchedulingValue,
		watchAllOfDayValue,
		watchSelectedTimeSlotValue,
		onSelectAllOfDay,
		onSelectTimeSlot,
		...restSchedulingHooks
	} = useAppointmentSchedulingForm();
	const { preferredTherapistGenderOption } = restSchedulingHooks;
	const {
		alertService,
		servicesOption,
		packagesOption,
		onFocusServiceField,
		onSelectService,
		onSelectPackage,
		onCheckServiceError,
	} = restSchedulingHooks;
	const {
		mapRef,
		isIsolineCalculated,
		isMapLoading,
		markerStorage,
		isolineStorage,
		generateMarkerDataTherapist,
	} = restSchedulingHooks;
	const {
		isTherapistFound,
		therapistsOptions,
		onFindTherapists,
		onSelectTherapist,
		onResetAllTherapistState,
	} = restSchedulingHooks;

	// get the badge statuses
	const getStatusBadge = useMemo(() => {
		const className = !watchAppointmentSchedulingValue?.appointmentDateTime
			? getBadgeVariantStatus("unscheduled")
			: watchAppointmentSchedulingValue?.therapist?.id
				? getBadgeVariantStatus("paid")
				: getBadgeVariantStatus("pending_therapist_assignment");
		const label = !watchAppointmentSchedulingValue?.appointmentDateTime
			? "Unscheduled"
			: watchAppointmentSchedulingValue?.therapist?.id
				? "Scheduled"
				: "Pending Therapist Assignment";

		return { className, label };
	}, [watchAppointmentSchedulingValue]);

	// For scheduling-first approach, we'll implement region selection directly in the form
	// Location will be selected before services/packages are filtered
	const coordinate = useMemo(() => {
		// For scheduling-first approach, coordinates will be determined later
		// when patient provides specific address within the selected location
		return MAP_DEFAULT_COORDINATE; // Default fallback - will be updated when patient details are added
	}, []);
	const mapAddress = useMemo(() => {
		return {
			country: "", // Will be determined from location selection
			state: "", // Will be determined from location selection
			city: "", // Will be determined from location selection
			postalCode: "", // Will be filled later in patient details
			address: "", // Will be filled later in patient details
		};
	}, []);
	const [isOpenAccordion, setIsOpenAccordion] = useState<string>("first-visit");
	const onCloseAccordionItem = useCallback(() => {
		setIsOpenAccordion("");
	}, []);

	// * side effect to add isoline calculated and stored isoline and the marker marked to the map
	useEffect(() => {
		// Ensure the map is initialized and isolane not calculated, therapist selected not changed, and restrict to the first render
		if (
			!mapRef?.current ||
			isIsolineCalculated ||
			(watchAppointmentSchedulingValue?.therapist?.id !==
				formSelections?.therapist?.id &&
				(!isFirstRender || !isOpenAccordion))
		)
			return;

		// Add previously stored isolines to the map, if available
		if (isolineStorage) {
			mapRef.current.isoline.onAddAll(isolineStorage);
		}

		// Add previously stored patient markers to the map, if available
		if (markerStorage) {
			mapRef.current.marker.onAdd(markerStorage.patient);
		}

		// Check if therapist information is selected and add therapist marker
		if (formSelections.therapist) {
			// Prepare therapist marker data with fallback defaults
			const therapistMarkerData = generateMarkerDataTherapist({
				address: formSelections.therapist.activeAddress?.address || "",
				position: {
					lat: formSelections.therapist.activeAddress?.latitude || 0,
					lng: formSelections.therapist.activeAddress?.longitude || 0,
				},
				therapist: formSelections.therapist,
			});
			// Add therapist marker to the map as a secondary marker with routing enabled
			mapRef.current.marker.onAdd([therapistMarkerData], {
				isSecondary: true,
				useRouting: true,
			});
		}
	}, [
		mapRef?.current,
		isolineStorage,
		isIsolineCalculated,
		markerStorage,
		formSelections.therapist,
		watchAppointmentSchedulingValue?.therapist,
		isFirstRender,
		isOpenAccordion,
		generateMarkerDataTherapist,
	]);

	return (
		<FormStepItemContainer>
			{mode === "series" && (
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
								{watchAppointmentSchedulingValue.service.name.replaceAll(
									"_",
									" ",
								)}
							</p>

							<div className="flex items-center gap-1 mt-2 text-xs">
								<p className="font-light text-pretty">
									<span className="uppercase">
										{watchAppointmentSchedulingValue.package.name}
									</span>
									<span className="mx-2">&#x2022;</span>
									<span className="italic font-light">
										{watchAppointmentSchedulingValue.package.numberOfVisit ||
											"N/A"}{" "}
										visit(s)
									</span>
								</p>
							</div>
						</div>
					</div>
				</div>
			)}

			{(alertService !== null ||
				(!therapistsOptions?.feasible?.length && isTherapistFound)) && (
				<Alert
					variant="destructive"
					className="col-span-full motion-preset-rebound-down"
				>
					<AlertCircle className="w-4 h-4" />
					<AlertTitle>
						{alertService?.title || tas("alert_therapist.title")}
					</AlertTitle>
					<AlertDescription>
						{alertService?.description || tas("alert_therapist.description")}
					</AlertDescription>
				</Alert>
			)}

			{mode === "new" && (
				<>
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
									<FormLabel className="text-nowrap">
										{tasf("service.label")}
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
													onFocus={() => onFocusServiceField()}
												>
													<p>
														{field.value
															? servicesOption
																	?.find(
																		(service) => service.name === field.value,
																	)
																	?.name?.replaceAll("_", " ") ||
																field.value.replaceAll("_", " ")
															: tasf("service.placeholder")}
													</p>
													{field.value ? (
														<button
															type="button"
															className="cursor-pointer"
															onClick={(event) => {
																event.preventDefault();
																event.stopPropagation();

																onSelectService(DEFAULT_VALUES_SERVICE);
															}}
														>
															<X className="opacity-50" />
														</button>
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
													placeholder={tasf("service.search.placeholder")}
													className="h-9"
													disabled={isLoading.services}
												/>
												<CommandList>
													<CommandEmpty>
														{tasf("service.search.empty")}
													</CommandEmpty>
													<CommandGroup>
														{isLoading.services ? (
															<CommandItem value={undefined} disabled>
																<LoaderIcon className="animate-spin" />
																<span>{tasf("service.search.loading")}</span>
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
																		<span>
																			{service.name.replaceAll("_", " ")}
																		</span>
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
							name="appointmentScheduling.package.name"
							render={({ field }) => {
								const selectedPackage = packagesOption?.find(
									(packageItem) => packageItem.name === field.value,
								);

								return (
									<FormItem>
										<FormLabel className="text-nowrap">
											{tasf("package.label")}
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
														{field.value ? (
															<p>
																<span>
																	{selectedPackage?.name || field.value}
																</span>{" "}
																<span className="italic font-light">{`(${selectedPackage?.numberOfVisit || watchAppointmentSchedulingValue?.package?.numberOfVisit} visit(s))`}</span>
															</p>
														) : (
															<span>{tasf("package.placeholder")}</span>
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
														placeholder={tasf("package.search.placeholder")}
														className="h-9"
													/>
													<CommandList>
														<CommandEmpty>
															{tasf("package.search.empty")}
														</CommandEmpty>
														<CommandGroup>
															{packagesOption?.map((packageItem) => (
																<CommandItem
																	key={packageItem.id}
																	value={packageItem.name}
																	onSelect={() =>
																		onSelectPackage({
																			id: packageItem.id,
																			name: packageItem.name,
																			numberOfVisit: packageItem.numberOfVisit,
																		})
																	}
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
					</Deferred>
				</>
			)}

			<Accordion
				collapsible
				type="single"
				value={isOpenAccordion}
				onValueChange={setIsOpenAccordion}
				className="w-full col-span-full -mb-2"
			>
				<AccordionItem
					value="first-visit"
					className="bg-sidebar text-muted-foreground border border-border rounded-md has-focus-visible:border-ring has-focus-visible:ring-ring/50 px-4 py-1 outline-none last:border-b has-focus-visible:ring-[3px]"
				>
					<AccordionPrimitive.Header className="flex">
						<AccordionPrimitive.Trigger className="focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-center justify-between rounded-md py-2 text-left text-[15px] leading-6 font-semibold transition-all outline-none focus-visible:ring-[3px] [&[data-state=open]>svg]:rotate-180">
							<div className="flex items-center gap-3">
								<span
									className="flex size-10 shrink-0 items-center justify-center rounded-full border bg-primary/75 text-primary-foreground"
									aria-hidden="true"
								>
									1
								</span>
								<span className="flex flex-col space-y-1">
									<span>Visit 1</span>
									{watchAppointmentSchedulingValue?.appointmentDateTime ? (
										<span className="text-sm font-normal">
											{format(
												watchAppointmentSchedulingValue.appointmentDateTime,
												"MMM d, yyyy h:mm a",
												{ locale, in: tzDate },
											)}
										</span>
									) : (
										<span className="text-sm font-normal">Unscheduled</span>
									)}
								</span>
							</div>

							<div className="flex items-center gap-3">
								<Badge
									variant="outline"
									className={cn("uppercase", getStatusBadge.className)}
								>
									{getStatusBadge.label}
								</Badge>

								<ChevronDownIcon
									size={16}
									className="pointer-events-none shrink-0 opacity-60 transition-transform duration-200"
									aria-hidden="true"
								/>
							</div>
						</AccordionPrimitive.Trigger>
					</AccordionPrimitive.Header>
					<AccordionContent className="text-muted-foreground pb-2">
						<div className="p-4 px-0 pb-0 border-t bg-muted/5 grid grid-cols-1 md:grid-cols-2 gap-4">
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
									name="appointmentScheduling.preferredTherapistGender"
									render={({ field }) => (
										<FormItem className="space-y-3 col-span-full">
											<FormLabel>
												{tasf("pref_therapist_gender.label")}
											</FormLabel>
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
															<FormLabel className="flex items-center gap-1 font-normal uppercase">
																{getGenderIcon(gender)}
																<span>
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
								control={form.control}
								name="appointmentScheduling.appointmentDateTime"
								render={({ field }) => (
									<FormItem className="col-span-full">
										<FormLabel className="flex items-center justify-between">
											<span>{tasf("appt_date.label")}</span>

											<FormField
												control={form.control}
												name="formOptions.findTherapistsAllOfDay"
												render={({ field }) => (
													<FormItem className="flex items-center gap-1.5">
														<FormLabel>All of day</FormLabel>

														<FormControl>
															<Switch
																className="!mt-0"
																checked={field.value}
																onCheckedChange={(value) => {
																	onSelectAllOfDay(value);

																	// reset all therapist and isoline maps state
																	onResetAllTherapistState();
																}}
															/>
														</FormControl>
													</FormItem>
												)}
											/>
										</FormLabel>

										<FormControl>
											<DateTimePicker
												value={field.value}
												onChangeValue={field.onChange}
												isAllOfDay={!!watchAllOfDayValue}
												autoScroll={false}
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

							<FormField
								control={form.control}
								name="appointmentScheduling.therapist.name"
								render={({ field }) => (
									<FormItem className="col-span-full">
										{/* <FormLabel>{tasf("therapist.label")}</FormLabel> */}

										<FormControl>
											<TherapistSelection
												items={therapistsOptions.feasible}
												config={{
													isLoading: isLoading.therapists || isMapLoading,
													selectedTherapistName: field.value,
													selectedTherapist:
														formSelections?.therapist || undefined,
													isAllOfDay: !!watchAllOfDayValue,
													selectedTimeSlot: watchSelectedTimeSlotValue,
												}}
												find={{
													isDisabled:
														!watchAppointmentSchedulingValue.appointmentDateTime,
													handler: async () => {
														const isError = onCheckServiceError();
														if (isError) return;

														onFindTherapists();
													},
												}}
												onSelectTherapist={(value) => onSelectTherapist(value)}
												onPersist={(value) => {
													setFormSelections({
														...formSelections,
														therapist: value,
													});
												}}
												onSelectTimeSlot={(value) => onSelectTimeSlot(value)}
											/>
										</FormControl>
									</FormItem>
								)}
							/>

							<HereMap
								ref={mapRef}
								coordinate={coordinate}
								address={{ ...mapAddress }}
								options={{ disabledEvent: false }}
								className="col-span-full"
							/>
						</div>

						<div className="mt-4 flex items-center gap-2">
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={onCloseAccordionItem}
							>
								Close
							</Button>
						</div>
					</AccordionContent>
				</AccordionItem>
			</Accordion>

			<SeriesScheduler />
		</FormStepItemContainer>
	);
}

export function AdditionalSettingsForm() {
	const { mode } = useFormProvider();
	const { isPartnerBooking } = usePartnerBookingSelection();
	const { isCustomFisiohomePartner } = usePartnerNameSelection();
	const { isCustomReferral } = usePatientReferralSource();
	const { form, additionalFormOptions, watchAdditionalSettingsValue } =
		useAdditionalSettingsForm();

	return (
		<FormStepItemContainer>
			{mode === "new" ? (
				<>
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
										<span className="text-sm italic font-light">
											- (optional)
										</span>
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
								<div
									className={cn(isCustomFisiohomePartner ? "flex gap-3 " : "")}
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
													<FormLabel className="invisible">
														Other Partner
													</FormLabel>
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
				</>
			) : (
				<div className="grid grid-cols-1 gap-4 p-3 text-sm border rounded-md shadow-inner md:grid-cols-3 border-input bg-sidebar col-span-full">
					<div>
						<p className="font-light">Referral Source:</p>
						<p className="text-pretty">
							{watchAdditionalSettingsValue?.customReferralSource ||
								watchAdditionalSettingsValue?.referralSource ||
								"N/A"}
						</p>
					</div>
					<div>
						<p className="font-light">Booking Partner:</p>
						<p className="text-pretty">
							{watchAdditionalSettingsValue?.customFisiohomePartnerName ||
								watchAdditionalSettingsValue?.fisiohomePartnerName ||
								"N/A"}
						</p>
					</div>
					<div>
						<p className="font-light">Voucher:</p>
						<p className="text-pretty">
							{watchAdditionalSettingsValue?.voucherCode || "N/A"}
						</p>
					</div>
				</div>
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
	const { sections, errorsServerValidation, onEdit } = useReviewForm();

	return (
		<FormStepItemContainer className="!grid-cols-1 gap-6">
			{sections.map((section) => (
				<div key={section.key} className="grid gap-2 text-sm">
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
							{section.subs.map((sub, index) => (
								<TableRow key={`${sub.key}-${index}`}>
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
			{!!errorsServerValidation?.length && (
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
