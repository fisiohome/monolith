import { usePage } from "@inertiajs/react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { type ContextFn, format, startOfDay } from "date-fns";
import { ChevronDownIcon, RefreshCcwIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	type FieldArrayWithId,
	useFieldArray,
	useFormContext,
	useWatch,
} from "react-hook-form";
import { TherapistSearchField } from "@/components/admin-portal/appointment/form/therapist-search-field";
import TherapistSelection from "@/components/admin-portal/appointment/form/therapist-selection";
import { useFormProvider } from "@/components/admin-portal/appointment/new-appointment-form";
import { useDateContext } from "@/components/providers/date-provider";
import HereMap from "@/components/shared/here-map";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Spinner } from "@/components/ui/kibo-ui/spinner";
import {
	DRAFT_STEPS,
	useAppointmentDraft,
} from "@/hooks/admin-portal/appointment/use-appointment-draft";
import { USE_DRAFT_DATABASE } from "@/hooks/admin-portal/appointment/use-appointment-form";
import {
	type TherapistOption,
	useTherapistAvailability,
} from "@/hooks/admin-portal/appointment/use-appointment-utils";
import type { AppointmentBookingSchema } from "@/lib/appointments/form";
import { getBadgeVariantStatus } from "@/lib/appointments/utils";
import { MAP_DEFAULT_COORDINATE } from "@/lib/here-maps";
import { cn } from "@/lib/utils";
import type { AppointmentNewGlobalPageProps } from "@/pages/AdminPortal/Appointment/New";
import DateTimePicker from "./date-time";

const getUseNewTherapistSelection = (
	pageProps?: AppointmentNewGlobalPageProps["props"],
) => {
	try {
		return (
			pageProps?.adminPortal?.featureFlags?.useNewTherapistSelectionEnabled ??
			false
		);
	} catch {
		// Fallback for development or when page props are not available
		return false;
	}
};

const VISIT_STATUSES = {
	PENDING_THERAPIST_ASSIGNMENT: "pending_therapist_assignment",
	UNSCHEDULED: "unscheduled",
	SCHEDULED: "scheduled",
} as const;

const createDefaultSeriesVisit = (
	{
		isAllOfDay,
		apptDate: _apptDate,
		therapist,
	}: {
		isAllOfDay: AppointmentBookingSchema["appointmentScheduling"]["findTherapistsAllOfDay"];
		apptDate: AppointmentBookingSchema["appointmentScheduling"]["appointmentDateTime"];
		therapist: AppointmentBookingSchema["appointmentScheduling"]["therapist"];
	},
	visitNumber: number,
	_tzDate: ContextFn<Date>,
) => ({
	visitNumber,
	appointmentDateTime: null,
	findTherapistsAllOfDay: !!isAllOfDay,
	therapist,
});

// Custom hook for individual series visit form logic
const useSeriesVisitForm = (index: number) => {
	const { tzDate, locale } = useDateContext();
	const { props: globalProps } = usePage<AppointmentNewGlobalPageProps>();
	const form = useFormContext<AppointmentBookingSchema>();
	const { formSelections, setFormSelections } = useFormProvider();
	const fieldPath = `appointmentScheduling.seriesVisits.${index}` as const;

	// Watch values for this specific visit
	const watchTherapistValue = useWatch({
		control: form.control,
		name: `${fieldPath}.therapist`,
	});
	const watchAppointmentDateTimeValue = useWatch({
		control: form.control,
		name: `${fieldPath}.appointmentDateTime`,
	});
	const watchPreferredTherapistGenderValue = useWatch({
		control: form.control,
		name: "appointmentScheduling.preferredTherapistGender",
	});
	const watchAllOfDayValue = useWatch({
		control: form.control,
		name: `${fieldPath}.findTherapistsAllOfDay`,
	});

	// Get main appointment context for service/package info
	const watchMainServiceValue = useWatch({
		control: form.control,
		name: "appointmentScheduling.service.id",
	});
	const watchPatientDetailsValue = useWatch({
		control: form.control,
		name: "patientDetails",
	});

	const [isLoading, setIsLoading] = useState({
		services: false,
		therapists: false,
	});

	// Session storage keys specific to this visit
	const SESSION_ISOLINE_KEY_VISIT = `appointment-series-isoline-${index}`;

	// Therapist selection handlers
	const onSelectTherapist = useCallback(
		(value: AppointmentBookingSchema["appointmentScheduling"]["therapist"]) => {
			form.setValue(`${fieldPath}.therapist`, value, {
				shouldValidate: true,
			});
		},
		[form, fieldPath],
	);

	const onResetTherapistFormValue = useCallback(() => {
		// Use setValue instead of resetField for more reliable clearing
		form.setValue(`appointmentScheduling.seriesVisits.${index}.therapist`, {
			id: "",
			name: "",
		});
	}, [form, index]);

	const onChangeTherapistLoading = useCallback((value: boolean) => {
		setIsLoading((prev) => ({ ...prev, therapists: value }));
	}, []);

	const {
		isMapLoading,
		therapistsOptions,
		mapRef,
		isIsolineCalculated,
		onResetTherapistOptions,
		onResetIsoline,
		onFindTherapists,
		isolineStorage,
		generateMarkerDataPatient,
		generateMarkerDataTherapist,
		feasibilityReport,
	} = useTherapistAvailability({
		serviceIdValue: watchMainServiceValue,
		preferredTherapistGenderValue: watchPreferredTherapistGenderValue,
		appointmentDateTImeValue: watchAppointmentDateTimeValue,
		isAllOfDayValue: !!watchAllOfDayValue,
		patientValues: {
			fullName: watchPatientDetailsValue.fullName,
			address: watchPatientDetailsValue.address,
			latitude: watchPatientDetailsValue.latitude,
			longitude: watchPatientDetailsValue.longitude,
			locationId: watchPatientDetailsValue.location.id as string | number,
		},
		fetchURL: globalProps.adminPortal.router.api.therapists.feasible,
		fetchMode: "json",
		isolineStorageKey: SESSION_ISOLINE_KEY_VISIT,
		onChangeTherapistLoading,
		onResetTherapistFormValue,
	});

	// Reset all therapist state
	const onResetAllTherapistState = useCallback(() => {
		onResetTherapistFormValue();
		onResetTherapistOptions();
		onResetIsoline();
	}, [onResetTherapistFormValue, onResetTherapistOptions, onResetIsoline]);

	// Time slot selection
	const watchSelectedTimeSlotValue = useMemo(() => {
		if (!watchAppointmentDateTimeValue) return "";
		return format(watchAppointmentDateTimeValue, "HH:mm", {
			in: tzDate,
			locale,
		});
	}, [watchAppointmentDateTimeValue, tzDate, locale]);

	const onSelectTimeSlot = useCallback(
		(value: string) => {
			const date = form.getValues(`${fieldPath}.appointmentDateTime`);
			if (date) {
				const [hours, minutes] = value.split(":");
				const newDate = new Date(date);
				newDate.setHours(Number.parseInt(hours), Number.parseInt(minutes));
				form.setValue(`${fieldPath}.appointmentDateTime`, newDate);
			}
		},
		[form, fieldPath],
	);

	// Persist therapist selection
	const onPersistTherapist = useCallback(
		(value: TherapistOption | null) => {
			setFormSelections((prev) => ({
				...prev,
				seriesTherapists: {
					...prev.seriesTherapists,
					[index]: value,
				},
			}));
		},
		[index, setFormSelections],
	);

	// All of day selection logic for individual series visit
	const onSelectAllOfDay = useCallback(
		(value: boolean) => {
			const selectedDate = form.getValues(`${fieldPath}.appointmentDateTime`);
			const selectedDateOrToday = selectedDate ?? new Date();
			form.setValue(`${fieldPath}.findTherapistsAllOfDay`, value);

			if (value) {
				form.setValue(
					`${fieldPath}.appointmentDateTime`,
					startOfDay(selectedDateOrToday, { in: tzDate }),
					{ shouldValidate: false },
				);
			} else {
				const now = new Date();
				const minutes = now.getMinutes();
				let hours = now.getHours();

				// Round up to next 30 minute interval
				let roundedMinutes = 0;
				if (minutes >= 30) {
					hours += 1;
				} else {
					roundedMinutes = 30;
				}

				// Create new date with selected date and rounded time
				const selectedDateObj = new Date(selectedDateOrToday);
				const nextHalfHour = new Date(
					selectedDateObj.getFullYear(),
					selectedDateObj.getMonth(),
					selectedDateObj.getDate(),
					hours,
					roundedMinutes,
					0, // seconds
					0, // milliseconds
				);

				form.setValue(`${fieldPath}.appointmentDateTime`, nextHalfHour, {
					shouldValidate: false,
				});
			}
		},
		[form, fieldPath, tzDate],
	);

	// * side effect to restore isoline and therapist markers to the map for series visits
	useEffect(() => {
		const currentMap = mapRef.current;

		// Ensure the map is initialized and isoline not calculated, therapist selected not changed
		if (
			!currentMap ||
			isIsolineCalculated ||
			watchTherapistValue?.id !== formSelections?.seriesTherapists?.[index]?.id
		)
			return;

		// Add previously stored isolines to the map, if available
		if (isolineStorage) {
			currentMap.isoline.onAddAll(isolineStorage);
		}

		// Add patient marker (shared across all series visits)
		const markerPatientData = generateMarkerDataPatient({
			address: watchPatientDetailsValue.address,
			position: {
				lat: watchPatientDetailsValue.latitude,
				lng: watchPatientDetailsValue.longitude,
			},
			patient: {
				fullName: watchPatientDetailsValue.fullName,
				address: watchPatientDetailsValue.address,
				latitude: watchPatientDetailsValue.latitude,
				longitude: watchPatientDetailsValue.longitude,
				locationId: watchPatientDetailsValue.location.id as string | number,
			},
		});
		currentMap.marker.onAdd([markerPatientData]);

		// Check if therapist information is selected for this specific series visit
		if (formSelections.seriesTherapists?.[index]) {
			const therapist = formSelections.seriesTherapists[index];
			// Prepare therapist marker data with fallback defaults
			const therapistMarkerData = generateMarkerDataTherapist({
				address: therapist.activeAddress?.address || "",
				position: {
					lat: therapist.activeAddress?.latitude || 0,
					lng: therapist.activeAddress?.longitude || 0,
				},
				therapist: therapist,
			});
			// Add therapist marker to the map as a secondary marker with routing enabled
			currentMap.marker.onAdd([therapistMarkerData], {
				isSecondary: true,
				useRouting: true,
			});
		}
	}, [
		isolineStorage,
		isIsolineCalculated,
		mapRef,
		formSelections.seriesTherapists,
		watchTherapistValue,
		index,
		generateMarkerDataPatient,
		generateMarkerDataTherapist,
		watchPatientDetailsValue,
	]);

	return {
		isLoading,
		isMapLoading,
		fieldPath,
		watchSelectedTimeSlotValue,
		watchAllOfDayValue,
		watchAppointmentDateTimeValue,
		watchPatientDetailsValue,
		watchMainServiceValue,
		onSelectTherapist,
		onResetTherapistFormValue,
		onFindTherapists,
		onSelectTimeSlot,
		onPersistTherapist,
		onSelectAllOfDay,
		onResetAllTherapistState,
		mapRef,
		therapistsOptions,
		isIsolineCalculated,
		isolineStorage,
		generateMarkerDataPatient,
		generateMarkerDataTherapist,
		formSelections,
		feasibilityReport,
	};
};

export function SeriesScheduler() {
	const { locale, tzDate } = useDateContext();
	const { control, getValues, setValue } =
		useFormContext<AppointmentBookingSchema>();
	const { fields, append, remove } = useFieldArray({
		control,
		name: "appointmentScheduling.seriesVisits",
	});

	// Auto-save draft functionality
	const { saveDraft } = useAppointmentDraft({
		onError: (error) => {
			console.error("Series scheduler draft save error:", error);
		},
	});

	// Auto-save callback for series visits date/time changes
	const handleSeriesDateTimeChange = useCallback(async () => {
		if (!USE_DRAFT_DATABASE) {
			return;
		}

		try {
			const values = getValues();
			const admins = values.additionalSettings?.admins || [];
			const validAdmins = admins.filter(
				(admin: any) => admin?.id && admin.id !== "0",
			);
			const primaryAdmin = validAdmins?.find((admin: any) => admin.isPrimary);
			const validPrimaryAdmin =
				primaryAdmin?.id && primaryAdmin.id !== "0"
					? primaryAdmin
					: validAdmins?.[0];

			if (validPrimaryAdmin) {
				const result = await saveDraft({
					adminPicId: String(validPrimaryAdmin.id),
					adminIds: validAdmins?.map((a: any) => String(a.id)),
					primaryAdminId: String(validPrimaryAdmin.id),
					currentStep: DRAFT_STEPS[1], // appointment_scheduling step
					formData: values,
					draftId: values.formOptions?.draftId
						? String(values.formOptions.draftId)
						: undefined,
				});

				// Update form with draft ID if a new draft was created
				if (result?.success && result?.draft?.id) {
					const currentDraftId = getValues("formOptions.draftId");
					if (!currentDraftId || currentDraftId !== String(result.draft.id)) {
						setValue("formOptions.draftId", String(result.draft.id));
					}
				}
			}
		} catch (error) {
			console.error(
				"Failed to auto-save draft on series date/time change:",
				error,
			);
		}
	}, [getValues, setValue, saveDraft]);

	// Auto-save callback for series visits therapist selection
	const handleSeriesTherapistChange = useCallback(async () => {
		if (!USE_DRAFT_DATABASE) {
			return;
		}

		try {
			const values = getValues();
			const admins = values.additionalSettings?.admins || [];
			const validAdmins = admins.filter(
				(admin: any) => admin?.id && admin.id !== "0",
			);
			const primaryAdmin = validAdmins?.find((admin: any) => admin.isPrimary);
			const validPrimaryAdmin =
				primaryAdmin?.id && primaryAdmin.id !== "0"
					? primaryAdmin
					: validAdmins?.[0];

			if (validPrimaryAdmin) {
				const result = await saveDraft({
					adminPicId: String(validPrimaryAdmin.id),
					adminIds: validAdmins?.map((a: any) => String(a.id)),
					primaryAdminId: String(validPrimaryAdmin.id),
					currentStep: DRAFT_STEPS[1], // appointment_scheduling step
					formData: values,
					draftId: values.formOptions?.draftId
						? String(values.formOptions.draftId)
						: undefined,
				});

				// Update form with draft ID if a new draft was created
				if (result?.success && result?.draft?.id) {
					const currentDraftId = getValues("formOptions.draftId");
					if (!currentDraftId || currentDraftId !== String(result.draft.id)) {
						setValue("formOptions.draftId", String(result.draft.id));
					}
				}
			}
		} catch (error) {
			console.error(
				"Failed to auto-save draft on series therapist change:",
				error,
			);
		}
	}, [getValues, setValue, saveDraft]);

	// accordion state
	const [isOpenAccordion, setIsOpenAccordion] = useState<string[]>([]);
	const onCloseAccordionItem = useCallback((id: string) => {
		setIsOpenAccordion((prev) => prev.filter((item) => item !== id));
	}, []);

	// get the first visit data and then initialize for this
	const [isLoading, setIsLoading] = useState(false);
	const firstVisitIsAllOfDay = getValues("formOptions.findTherapistsAllOfDay");
	const firstVisitApptDate = getValues(
		"appointmentScheduling.appointmentDateTime",
	);
	const firstVisitPackageVisits = getValues(
		"appointmentScheduling.package.numberOfVisit",
	);
	const firstVisitData = useMemo(
		() => ({
			isAllOfDay: firstVisitIsAllOfDay,
			apptDate: firstVisitApptDate,
			packageVisits: firstVisitPackageVisits,
		}),
		[firstVisitIsAllOfDay, firstVisitApptDate, firstVisitPackageVisits],
	);
	const initializeSeriesVisits = useCallback(() => {
		if (firstVisitPackageVisits <= 1) {
			// remove all series visits
			remove();
			return;
		}

		const targetCount = Math.max(0, firstVisitPackageVisits - 1);
		const currentCount = fields.length;

		if (currentCount === targetCount) return;

		if (currentCount > targetCount) {
			// Remove excess items from the end (remove indices from targetCount to currentCount-1)
			remove(
				Array.from(
					{ length: currentCount - targetCount },
					(_, i) => currentCount - 1 - i,
				),
			);
			return;
		}

		// Add new items ensuring correct visit numbering
		// Series visits should be numbered 2, 3, 4, ..., packageVisits
		const toAdd = Array.from({ length: targetCount - currentCount }, (_, i) => {
			const visitNumber = currentCount + i + 2; // Start from visit 2
			return createDefaultSeriesVisit(
				{ isAllOfDay: false, apptDate: null, therapist: null },
				visitNumber,
				tzDate,
			);
		});
		append(toAdd);
	}, [fields.length, append, remove, firstVisitPackageVisits, tzDate]);
	useEffect(() => {
		setIsLoading(true);
		initializeSeriesVisits();

		const timer = setTimeout(() => setIsLoading(false), 250);
		return () => clearTimeout(timer);
	}, [initializeSeriesVisits]);

	// accordion status badge
	const getStatusBadge = useCallback(
		(index: number) => {
			const visitDate = getValues(
				`appointmentScheduling.seriesVisits.${index}.appointmentDateTime`,
			);
			const therapist = getValues(
				`appointmentScheduling.seriesVisits.${index}.therapist`,
			);

			const badgeConfig = {
				[VISIT_STATUSES.SCHEDULED]: {
					className: getBadgeVariantStatus("paid"),
					label: "Scheduled",
				},
				[VISIT_STATUSES.PENDING_THERAPIST_ASSIGNMENT]: {
					className: getBadgeVariantStatus("pending_therapist_assignment"),
					label: "Pending Therapist",
				},
				[VISIT_STATUSES.UNSCHEDULED]: {
					className: getBadgeVariantStatus("unscheduled"),
					label: "Unscheduled",
				},
			};
			const selectedConfig =
				badgeConfig[
					!visitDate
						? VISIT_STATUSES.UNSCHEDULED
						: therapist?.id
							? VISIT_STATUSES.SCHEDULED
							: VISIT_STATUSES.PENDING_THERAPIST_ASSIGNMENT
				];

			return (
				<Badge
					variant="outline"
					className={cn(
						selectedConfig.className,
						"uppercase !text-[10px] !px-1",
					)}
				>
					{selectedConfig.label}
				</Badge>
			);
		},
		[getValues],
	);

	// for resetting the visit each series data
	const [isResetting, setIsResetting] = useState(false);
	const resetVisit = useCallback(
		(index: number) => {
			const fieldPath = `appointmentScheduling.seriesVisits.${index}` as const;
			const visitNumber = index + 2;

			setIsResetting(true);
			setValue(
				fieldPath,
				createDefaultSeriesVisit(
					{
						isAllOfDay: false,
						apptDate: null,
						therapist: null,
					},
					visitNumber,
					tzDate,
				),
				{ shouldDirty: true, shouldTouch: true, shouldValidate: true },
			);
			setTimeout(() => {
				setIsResetting(false);
			}, 500);
		},
		[setValue, tzDate],
	);

	if (firstVisitData.packageVisits <= 1) return null;

	return fields.map((field, index) => {
		const visitNumber = getValues(
			`appointmentScheduling.seriesVisits.${index}.visitNumber`,
		);
		const appointmentDateTime = getValues(
			`appointmentScheduling.seriesVisits.${index}.appointmentDateTime`,
		);
		const therapist = getValues(
			`appointmentScheduling.seriesVisits.${index}.therapist`,
		);

		return (
			<Accordion
				key={field.id}
				value={isOpenAccordion}
				onValueChange={setIsOpenAccordion}
				type="multiple"
				className="w-full space-y-2"
			>
				<AccordionItem
					value={field.id}
					className="bg-sidebar text-muted-foreground border border-border rounded-md has-focus-visible:border-ring has-focus-visible:ring-ring/50 px-4 py-1 outline-none last:border-b has-focus-visible:ring-[3px]"
				>
					<AccordionPrimitive.Header className="flex">
						<AccordionPrimitive.Trigger className="focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-center justify-between rounded-md py-2 text-left text-[15px] leading-6 font-semibold transition-all outline-none focus-visible:ring-[3px] [&[data-state=open]>svg]:rotate-180">
							<div className="flex gap-3">
								<span
									className="flex size-10 shrink-0 items-center justify-center rounded-full border bg-primary/75 text-primary-foreground"
									aria-hidden="true"
								>
									{visitNumber}
								</span>
								<span className="flex flex-col">
									<span>Visit {visitNumber}</span>
									{appointmentDateTime ? (
										<span className="text-sm font-normal">
											{format(
												appointmentDateTime,
												locale.code === "id"
													? "d MMMM yyyy, HH.mm"
													: "MMMM d, yyyy, h:mm a",
												{
													locale,
													in: tzDate,
												},
											)}
										</span>
									) : (
										<span className="text-sm font-normal">Unscheduled</span>
									)}
									{therapist?.name ? (
										<span className="text-xs text-muted-foreground font-normal uppercase">
											{therapist.name}
										</span>
									) : (
										<span className="text-xs text-muted-foreground font-normal uppercase">
											{locale.code === "id" ? "T/A" : "N/A"}
										</span>
									)}
								</span>
							</div>

							<div className="flex items-center gap-3 uppercase">
								{getStatusBadge(index)}

								<ChevronDownIcon
									size={16}
									className="pointer-events-none shrink-0 opacity-60 transition-transform duration-200"
									aria-hidden="true"
								/>
							</div>
						</AccordionPrimitive.Trigger>
					</AccordionPrimitive.Header>
					<AccordionContent className="text-muted-foreground pb-2">
						<VisitForm
							index={index}
							field={field}
							isLoading={isLoading}
							isResetting={isResetting}
							onReset={() => resetVisit(index)}
							onClose={() => onCloseAccordionItem(field.id)}
							onDateTimeChange={handleSeriesDateTimeChange}
							onTherapistChange={handleSeriesTherapistChange}
						/>
					</AccordionContent>
				</AccordionItem>
			</Accordion>
		);
	});
}

// * form component
interface VisitFormProps {
	index: number;
	isLoading: boolean;
	isResetting: boolean;
	field: FieldArrayWithId<
		AppointmentBookingSchema,
		"appointmentScheduling.seriesVisits",
		"id"
	>;
	onClose: () => void;
	onReset: () => void;
	onDateTimeChange: () => Promise<void>;
	onTherapistChange: () => Promise<void>;
}
const VisitForm = ({
	index,
	isLoading: externalIsLoading,
	isResetting,
	field: _,
	onClose,
	onReset,
	onDateTimeChange,
	onTherapistChange,
}: VisitFormProps) => {
	const form = useFormContext<AppointmentBookingSchema>();
	const { props: globalProps } = usePage<AppointmentNewGlobalPageProps>();
	const useNewTherapistSelection = getUseNewTherapistSelection(globalProps);

	// Use the custom hook for this series visit
	const {
		isLoading: hookIsLoading,
		fieldPath,
		watchSelectedTimeSlotValue,
		watchAllOfDayValue,
		watchAppointmentDateTimeValue,
		watchPatientDetailsValue,
		watchMainServiceValue,
		mapRef,
		therapistsOptions,
		isMapLoading,
		onSelectTherapist,
		onFindTherapists,
		onSelectTimeSlot,
		onPersistTherapist,
		onSelectAllOfDay: _onSelectAllOfDay,
		onResetAllTherapistState,
		formSelections,
		feasibilityReport,
	} = useSeriesVisitForm(index);

	// Wrapper to save draft when therapist is selected
	const handleSelectTherapist = useCallback(
		async (
			value: AppointmentBookingSchema["appointmentScheduling"]["therapist"],
		) => {
			onSelectTherapist(value);
			// Auto-save draft after therapist selection
			await onTherapistChange();
		},
		[onSelectTherapist, onTherapistChange],
	);

	// reset the therapist selected and isoline map while reset the visit
	useEffect(() => {
		if (isResetting) {
			onResetAllTherapistState();
		}
	}, [isResetting, onResetAllTherapistState]);

	// Disabled min and max date restrictions for series visits
	// Users can select any date without limitations
	const { minDate, maxDate } = useMemo(() => {
		return { minDate: undefined, maxDate: undefined };
	}, []);

	const isAllOfDay = useWatch({
		control: form.control,
		name: `${fieldPath}.findTherapistsAllOfDay`,
	});

	// Combine loading states
	const isLoading = useMemo(() => {
		return {
			parent: externalIsLoading,
			therapists: hookIsLoading.therapists,
			map: isMapLoading,
		};
	}, [externalIsLoading, hookIsLoading.therapists, isMapLoading]);

	const coordinate = useMemo(() => {
		return MAP_DEFAULT_COORDINATE;
	}, []);
	const mapAddress = useMemo(() => {
		return {
			country: "",
			state: "",
			city: "",
			postalCode: "",
			address: "",
		};
	}, []);

	return (
		<div className="p-4 px-0 pb-0 border-t bg-muted/5">
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<FormField
					control={form.control}
					name={`${fieldPath}.appointmentDateTime`}
					render={({ field }) => (
						<FormItem className="col-span-full">
							<FormLabel className="flex items-center justify-between">
								<span>Date & Time</span>

								{/* ? because we dont use the therapist availability logic we disabled this */}
								{/* <FormField
									control={form.control}
									name={`appointmentScheduling.seriesVisits.${index}.findTherapistsAllOfDay`}
									render={({ field: allDayField }) => (
										<FormItem className="flex items-center gap-1.5">
											<FormLabel>All of day</FormLabel>
											<FormControl>
												<Switch
													className="!mt-0"
													checked={allDayField.value}
													disabled={isLoading.parent}
													onCheckedChange={(value) => {
														onSelectAllOfDay(value);
														onResetAllTherapistState();
													}}
												/>
											</FormControl>
										</FormItem>
									)}
								/> */}
							</FormLabel>
							<FormControl>
								{isLoading.parent || isResetting ? (
									<div className="flex justify-center">
										<Spinner variant="ellipsis" size={24} />
									</div>
								) : (
									<DateTimePicker
										value={field.value}
										isAllOfDay={isAllOfDay}
										autoScroll={false}
										min={minDate}
										max={maxDate}
										onChangeValue={field.onChange}
										callbackOnChange={async () => {
											// Therapist reset is now handled by useEffect in useTherapistAvailability
											// when date becomes null - no manual reset needed here
											// Auto-save draft with updated values
											await onDateTimeChange();
										}}
									/>
								)}
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{useNewTherapistSelection ? (
					<TherapistSearchField
						formHooks={{
							form,
							watchAllOfDayValue: watchAllOfDayValue ?? false,
							onSelectTherapist: handleSelectTherapist,
							onSelectTimeSlot,
						}}
						mode="series"
						locationId={watchPatientDetailsValue?.location?.id?.toString()}
						serviceId={watchMainServiceValue?.toString()}
						appointmentDateTime={watchAppointmentDateTimeValue}
						fieldPath={fieldPath}
					/>
				) : (
					<>
						<FormField
							control={form.control}
							name={`${fieldPath}.therapist.name`}
							render={({ field }) => (
								<FormItem className="col-span-full">
									<FormControl>
										<TherapistSelection
											items={therapistsOptions.feasible}
											config={{
												isLoading: isLoading.therapists,
												selectedTherapistName: field.value,
												selectedTherapist:
													formSelections?.seriesTherapists?.[index] ||
													undefined,
												isAllOfDay: !!watchAllOfDayValue,
												selectedTimeSlot: watchSelectedTimeSlotValue,
											}}
											find={{
												isDisabled: !watchAppointmentDateTimeValue,
												handler: onFindTherapists,
											}}
											unfeasibleTherapists={feasibilityReport}
											onSelectTherapist={handleSelectTherapist}
											onPersist={onPersistTherapist}
											onSelectTimeSlot={onSelectTimeSlot}
										/>
									</FormControl>
								</FormItem>
							)}
						/>

						<HereMap
							ref={mapRef}
							coordinate={coordinate}
							address={mapAddress}
							options={{ disabledEvent: false }}
							className="col-span-full"
						/>
					</>
				)}
			</div>

			<div className="mt-4 flex items-center gap-2">
				<Button type="button" variant="ghost" size="sm" onClick={onClose}>
					Close
				</Button>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={onReset}
					className="text-destructive hover:text-destructive bg-sidebar border border-destructive"
				>
					<RefreshCcwIcon className="h-4 w-4 mr-1" />
					Reset
				</Button>
			</div>
		</div>
	);
};
