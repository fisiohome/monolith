import { usePage } from "@inertiajs/react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { useSessionStorage } from "@uidotdev/usehooks";
import { addDays, type ContextFn, format, isAfter, startOfDay } from "date-fns";
import { ChevronDownIcon, RefreshCcwIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	type FieldArrayWithId,
	useFieldArray,
	useFormContext,
	useWatch,
} from "react-hook-form";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import type { TherapistOption } from "@/hooks/admin-portal/appointment/use-appointment-utils";
import type { IsolineConstraint, MarkerData } from "@/hooks/here-maps";
import { useTherapistMarker } from "@/hooks/here-maps/use-markers";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import { getGenderIcon } from "@/hooks/use-gender";
import type { AppointmentBookingSchema } from "@/lib/appointments/form";
import { getBadgeVariantStatus } from "@/lib/appointments/utils";
import { ISOLINE_CONSTRAINTS, MAP_DEFAULT_COORDINATE } from "@/lib/here-maps";
import { populateQueryParams } from "@/lib/utils";
import type { AppointmentNewGlobalPageProps } from "@/pages/AdminPortal/Appointment/New";
import type { Coordinate, IsolineResult } from "@/types/here-maps";
import DateTimePicker from "./date-time";

const VISIT_STATUSES = {
	PENDING_THERAPIST_ASSIGNMENT: "pending_therapist_assignment",
	UNSCHEDULED: "unscheduled",
	SCHEDULED: "scheduled",
} as const;

const generateInitialSeriesVisits = (
	{
		prefTherapistGender,
		isAllOfDay,
		apptDate,
		therapist,
	}: {
		prefTherapistGender: AppointmentBookingSchema["appointmentScheduling"]["preferredTherapistGender"];
		isAllOfDay: AppointmentBookingSchema["appointmentScheduling"]["findTherapistsAllOfDay"];
		apptDate: AppointmentBookingSchema["appointmentScheduling"]["appointmentDateTime"];
		therapist: AppointmentBookingSchema["appointmentScheduling"]["therapist"];
	},
	visitNumber: number,
	tzDate: ContextFn<Date>,
) => ({
	visitNumber,
	preferredTherapistGender: prefTherapistGender,
	appointmentDateTime: apptDate
		? addDays(apptDate, (visitNumber - 1) * 7, { in: tzDate })
		: new Date(),
	findTherapistsAllOfDay: !!isAllOfDay,
	therapist,
});

// Custom hook for individual series visit form logic
const useSeriesVisitForm = (index: number) => {
	const { tzDate, locale } = useDateContext();
	const { props: globalProps } = usePage<AppointmentNewGlobalPageProps>();
	const form = useFormContext<AppointmentBookingSchema>();
	const { formSelections, setFormSelections } = useFormProvider();
	const mapRef = useRef<any>(null);
	const fieldPath = `appointmentScheduling.seriesVisits.${index}` as const;

	// Watch values for this specific visit
	const watchVisitValue = useWatch({
		control: form.control,
		name: fieldPath,
	});
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
		name: `${fieldPath}.preferredTherapistGender`,
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
	const [isMapLoading, setIsMapLoading] = useState(false);

	// Therapist options for this specific visit
	const [therapistsOptions, setTherapistsOptions] = useState({
		available: [] as TherapistOption[],
		unavailable: [] as TherapistOption[],
		feasible: [] as TherapistOption[],
		notFeasible: [] as TherapistOption[],
	});

	// Session storage keys specific to this visit
	const SESSION_ISOLINE_KEY_VISIT = `appointment-series-isoline-${index}`;

	// Session storage for markers and isoline data (per visit)
	const [isolineStorage, setIsolineStorage] = useSessionStorage<null | any[]>(
		SESSION_ISOLINE_KEY_VISIT,
		null,
	);

	// Therapist marker icons
	const markerIcon = useTherapistMarker();

	// For assigning the therapist
	const [isTherapistFound, setIsTherapistFound] = useState(false);
	const [isIsolineCalculated, setIsIsolineCalculated] = useState(false);

	// Therapist selection handlers
	const onSelectTherapist = useCallback(
		(
			value: NonNullable<
				AppointmentBookingSchema["appointmentScheduling"]["therapist"]
			>,
		) => {
			form.setValue(`${fieldPath}.therapist`, value, {
				shouldValidate: true,
			});
		},
		[form, fieldPath],
	);

	const onResetTherapistFormValue = useCallback(() => {
		form.setValue(`${fieldPath}.therapist`, null);
	}, [form, fieldPath]);

	// Reset therapist options
	const onResetTherapistOptions = useCallback(() => {
		setTherapistsOptions((prev) => ({
			...prev,
			notFeasible: [],
			feasible: [],
			available: [],
			unavailable: [],
		}));
		setIsTherapistFound(false);
	}, []);

	// Reset isoline and markers
	const onResetIsoline = useCallback(() => {
		// remove the markers
		mapRef.current?.marker.onRemove();
		mapRef.current?.marker.onRemove({ isSecondary: true });

		// remove the isoline polygon
		mapRef.current?.isoline.onRemove();

		// reset the state calculated marker
		setIsIsolineCalculated(false);
	}, []);

	// Reset all therapist state
	const onResetAllTherapistState = useCallback(() => {
		onResetTherapistFormValue();
		onResetTherapistOptions();
		onResetIsoline();
	}, [onResetTherapistFormValue, onResetTherapistOptions, onResetIsoline]);

	// Generate marker data for patient
	const generateMarkerDataPatient = useCallback(
		({
			address,
			position,
			patient,
		}: {
			address: string;
			position: Coordinate;
			patient: any;
		}) => {
			return {
				address,
				position,
				bubbleContent: `
					<div class="w-[180px] text-xs flex flex-col">
						<span class="font-bold text-sm">${patient.fullName}</span>
						<span class="font-light text-[10px]">${patient.address}</span>
					</div>
				`,
				additional: {
					patient: patient,
				},
			};
		},
		[],
	);

	// Generate marker data for therapist
	const generateMarkerDataTherapist = useCallback(
		({
			address,
			position,
			therapist,
		}: {
			address: string;
			position: Coordinate;
			therapist: TherapistOption;
		}) => {
			return {
				position,
				address,
				bubbleContent: `
			<div class="w-[180px] text-xs flex flex-col">
				<span class="font-bold text-sm">${therapist.name}</span>
				<span class="font-light text-[10px]">#${therapist.registrationNumber}</span>
			</div>
		`,
				customIcon: markerIcon[therapist.employmentType],
				additional: { therapist },
			};
		},
		[markerIcon],
	);

	// Group therapists by their availability rules for efficient isoline calculations
	const groupTherapistsByConstraints = useCallback(
		(therapists: TherapistOption[]): Map<string, TherapistOption[]> => {
			const groups = new Map<string, TherapistOption[]>();

			therapists.forEach((therapist) => {
				// Get therapist's availability rules or use defaults
				const rules = therapist.availability?.availabilityRules || [];

				// Create a unique key for this constraint combination
				// Sort rules to ensure consistent grouping regardless of order
				const sortedRules = rules.filter(Boolean).sort((a, b) => {
					// Sort by distance first, then duration
					const aDist = a.distanceInMeters || 0;
					const bDist = b.distanceInMeters || 0;
					if (aDist !== bDist) return aDist - bDist;

					const aDur = a.durationInMinutes || 0;
					const bDur = b.durationInMinutes || 0;
					return aDur - bDur;
				});

				// Create a unique key for this constraint set
				const constraintKey =
					sortedRules.length > 0
						? sortedRules
								.map(
									(r) =>
										`${r.distanceInMeters || 0}-${r.durationInMinutes || 0}`,
								)
								.join("|")
						: "default";

				if (!groups.has(constraintKey)) {
					groups.set(constraintKey, []);
				}
				groups.get(constraintKey)?.push(therapist);
			});

			return groups;
		},
		[],
	);

	// Get isoline constraints for a specific group of therapists
	const getIsolineConstraintsForGroup = useCallback(
		(therapists: TherapistOption[]): IsolineConstraint[] => {
			// Get the first therapist's rules (they should all be the same in a group)
			const firstTherapist = therapists[0];
			const rules = firstTherapist?.availability?.availabilityRules || [];

			// If no rules, use default constraints
			if (!rules.length) {
				return ISOLINE_CONSTRAINTS;
			}

			// Extract constraints from the rules
			const constraints: IsolineConstraint[] = [];

			rules.forEach((rule) => {
				if (rule?.distanceInMeters && Number.isFinite(rule.distanceInMeters)) {
					constraints.push({ type: "distance", value: rule.distanceInMeters });
				}
				if (
					rule?.durationInMinutes &&
					Number.isFinite(rule.durationInMinutes)
				) {
					constraints.push({
						type: "time",
						value: rule.durationInMinutes * 60,
					}); // convert minutes to seconds
				}
			});

			// If no valid constraints found, use defaults
			return constraints.length > 0 ? constraints : ISOLINE_CONSTRAINTS;
		},
		[],
	);

	const onCalculateIsoline = useCallback(
		async (therapists: NonNullable<TherapistOption[]>) => {
			if (!mapRef.current) return;

			const {
				latitude,
				longitude,
				address: patientAddress,
			} = watchPatientDetailsValue;
			const patientCoords = { lat: latitude, lng: longitude };

			// Group therapists by their constraints
			const therapistGroups = groupTherapistsByConstraints(therapists);

			// Collect all isoline results and all marker data for map rendering
			const allIsolineResults: IsolineResult["isolines"] = [];
			const allTherapistCoords: MarkerData[] = [];

			// Collect feasibility results for all groups
			const therapistList = {
				feasible: [] as TherapistOption[],
				notFeasible: [] as TherapistOption[],
			};

			for (const [_constraintKey, groupTherapists] of therapistGroups) {
				// Get constraints for this group
				const constraints = getIsolineConstraintsForGroup(groupTherapists);

				// Calculate isoline for this group
				const result = await mapRef.current.isoline.onCalculate.both({
					coord: patientCoords,
					constraints,
				});

				// Store isoline results for map rendering
				if (result) {
					allIsolineResults.push(...result);
				}

				// Map therapists in this group to MarkerData
				const groupTherapistCoords: MarkerData[] =
					groupTherapists
						.map((therapist) => {
							if (!therapist?.activeAddress) return null;
							const prev =
								therapist.availabilityDetails?.locations?.prevAppointment;
							let lat: number;
							let lng: number;
							let address: string;
							if (prev) {
								lat = prev.latitude;
								lng = prev.longitude;
								address = prev.address;
							} else if (therapist.activeAddress) {
								lat = therapist.activeAddress.latitude;
								lng = therapist.activeAddress.longitude;
								address = therapist.activeAddress.address;
							} else {
								return null;
							}
							return generateMarkerDataTherapist({
								address,
								position: { lat, lng },
								therapist,
							});
						})
						.filter((coord) => coord !== null) || [];

				allTherapistCoords.push(...groupTherapistCoords);

				// --- FEASIBILITY CHECK PER GROUP ---
				const feasibleResult =
					mapRef.current.isLocationFeasible(groupTherapistCoords);
				for (const item of feasibleResult || []) {
					const therapist = item?.additional?.therapist;
					if (!therapist) continue;
					if (item.isFeasible) {
						therapistList.feasible.push(therapist);
					} else {
						therapistList.notFeasible.push(therapist);
					}
				}
			}

			// Store combined isoline results for map rendering
			setIsolineStorage(allIsolineResults);

			// Render all isoline polygons for all constraint groups on the map
			if (mapRef.current?.isoline?.onAddAll) {
				mapRef.current.isoline.onAddAll(allIsolineResults);
			}
			setTherapistsOptions((prev) => ({ ...prev, ...therapistList }));
			setIsTherapistFound(true);

			// Add markers for the patient position and store to the storage
			const markerPatientData: MarkerData = generateMarkerDataPatient({
				address: patientAddress,
				position: patientCoords,
				patient: watchPatientDetailsValue,
			});
			mapRef.current.marker.onAdd([markerPatientData]);

			// Add markers for feasible therapists
			const markerTherapistFeasibleData: MarkerData[] =
				therapistList.feasible
					?.map(
						(feasibleTherapist) =>
							allTherapistCoords?.find(
								(coord) =>
									coord?.additional?.therapist?.id === feasibleTherapist.id,
							) || null,
					)
					?.filter((coord) => coord !== null) || [];
			mapRef.current.marker.onAdd(markerTherapistFeasibleData, {
				isSecondary: true,
				useRouting: true,
			});

			// Mark isoline as calculated
			setIsIsolineCalculated(true);
		},
		[
			watchPatientDetailsValue,
			setIsolineStorage,
			generateMarkerDataPatient,
			generateMarkerDataTherapist,
			groupTherapistsByConstraints,
			getIsolineConstraintsForGroup,
		],
	);

	// Map available and unavailable therapists
	const mappingTherapists = useCallback(
		(therapists: TherapistOption[] | undefined) => {
			const therapistsAvailable =
				therapists?.filter((t) => t.availabilityDetails?.available) || [];
			const therapistsUnavailable =
				therapists?.filter((t) => !t.availabilityDetails?.available) || [];
			setTherapistsOptions((prev) => ({
				...prev,
				available: therapistsAvailable,
				unavailable: therapistsUnavailable,
			}));
			if (therapistsAvailable?.length) {
				onCalculateIsoline(therapistsAvailable);
			} else {
				setIsTherapistFound(true);
			}
		},
		[onCalculateIsoline],
	);

	// Find therapists handler (skip backend for now)
	const onFindTherapists = useCallback(async () => {
		try {
			setIsLoading((prev) => ({ ...prev, therapists: true }));
			onResetAllTherapistState();
			const url = globalProps.adminPortal.router.api.therapists.feasible;
			const params = deepTransformKeysToSnakeCase({
				locationId: watchPatientDetailsValue.location.id,
				serviceId: watchMainServiceValue,
				appointmentDateTime: watchAppointmentDateTimeValue,
				preferredGender: watchPreferredTherapistGenderValue,
				isAllOfDay: watchAllOfDayValue,
			});
			const { fullUrl } = populateQueryParams(url, params);
			const response = await fetch(fullUrl);
			const data = await response.json();

			mappingTherapists(data || []);
		} catch (error) {
			console.error("Error finding therapists:", error);
			mappingTherapists([]);
			setIsLoading((prev) => ({ ...prev, therapists: false }));
		} finally {
			setTimeout(() => {
				setIsLoading((prev) => ({ ...prev, therapists: false }));
			}, 250);
		}
	}, [
		globalProps,
		watchMainServiceValue,
		watchAppointmentDateTimeValue,
		watchPreferredTherapistGenderValue,
		watchAllOfDayValue,
		watchPatientDetailsValue,
		onResetAllTherapistState,
		mappingTherapists,
	]);

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
		// Ensure the map is initialized and isoline not calculated, therapist selected not changed
		if (
			!mapRef?.current ||
			isIsolineCalculated ||
			watchTherapistValue?.id !== formSelections?.seriesTherapists?.[index]?.id
		)
			return;

		// Add previously stored isolines to the map, if available
		if (isolineStorage) {
			mapRef.current.isoline.onAddAll(isolineStorage);
		}

		// Add patient marker (shared across all series visits)
		const markerPatientData = generateMarkerDataPatient({
			address: watchPatientDetailsValue.address,
			position: {
				lat: watchPatientDetailsValue.latitude,
				lng: watchPatientDetailsValue.longitude,
			},
			patient: watchPatientDetailsValue,
		});
		mapRef.current.marker.onAdd([markerPatientData]);

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
			mapRef.current.marker.onAdd([therapistMarkerData], {
				isSecondary: true,
				useRouting: true,
			});
		}
	}, [
		isolineStorage,
		isIsolineCalculated,
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
		setIsMapLoading,
		watchVisitValue,
		fieldPath,
		watchTherapistValue,
		watchSelectedTimeSlotValue,
		watchAllOfDayValue,
		watchAppointmentDateTimeValue,
		onSelectTherapist,
		onResetTherapistFormValue,
		onFindTherapists,
		onSelectTimeSlot,
		onPersistTherapist,
		onSelectAllOfDay,
		onResetAllTherapistState,
		mapRef,
		therapistsOptions,
		setTherapistsOptions,
		isTherapistFound,
		isIsolineCalculated,
		isolineStorage,
		generateMarkerDataPatient,
		generateMarkerDataTherapist,
		formSelections,
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

	// accordion state
	const [isOpenAccordion, setIsOpenAccordion] = useState<string[]>([]);
	const onCloseAccordionItem = useCallback((id: string) => {
		setIsOpenAccordion((prev) => prev.filter((item) => item !== id));
	}, []);

	// get the first visit data and then initialize for this
	const [isLoading, setIsLoading] = useState(false);
	const firstVisitPrefTherapistGender = getValues(
		"appointmentScheduling.preferredTherapistGender",
	);
	const firstVisitIsAllOfDay = getValues("formOptions.findTherapistsAllOfDay");
	const firstVisitApptDate = getValues(
		"appointmentScheduling.appointmentDateTime",
	);
	const firstVisitPackageVisits = getValues(
		"appointmentScheduling.package.numberOfVisit",
	);
	const firstVisitData = useMemo(
		() => ({
			prefTherapistGender: firstVisitPrefTherapistGender,
			isAllOfDay: firstVisitIsAllOfDay,
			apptDate: firstVisitApptDate,
			packageVisits: firstVisitPackageVisits,
		}),
		[
			firstVisitPrefTherapistGender,
			firstVisitIsAllOfDay,
			firstVisitApptDate,
			firstVisitPackageVisits,
		],
	);
	const initializeSeriesVisits = useCallback(() => {
		if (firstVisitData.packageVisits <= 1) {
			// remove all series visits
			remove();
			return;
		}

		const targetCount = Math.max(0, firstVisitData.packageVisits - 1);
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
			return generateInitialSeriesVisits(
				{ ...firstVisitData, therapist: null },
				visitNumber,
				tzDate,
			);
		});
		append(toAdd);
	}, [fields.length, append, remove, firstVisitData, tzDate]);
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
				<Badge variant="outline" className={selectedConfig.className}>
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
				generateInitialSeriesVisits(
					{
						prefTherapistGender: firstVisitData.prefTherapistGender,
						isAllOfDay: firstVisitData.isAllOfDay,
						apptDate: firstVisitData.apptDate,
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
		[firstVisitData, setValue, tzDate],
	);
	useEffect(() => {
		const secondVisitApptDate = getValues(
			"appointmentScheduling.seriesVisits.0.appointmentDateTime",
		);
		if (
			firstVisitApptDate &&
			secondVisitApptDate &&
			isAfter(new Date(firstVisitApptDate), new Date(secondVisitApptDate))
		) {
			fields.forEach((_, index) => {
				resetVisit(index);
			});
		}
	}, [fields, firstVisitApptDate, getValues, resetVisit]);

	if (firstVisitData.packageVisits <= 1) return null;

	return (
		<Accordion
			value={isOpenAccordion}
			onValueChange={setIsOpenAccordion}
			type="multiple"
			className="w-full space-y-2 col-span-full"
		>
			{fields.map((field, index) => {
				const visitNumber = getValues(
					`appointmentScheduling.seriesVisits.${index}.visitNumber`,
				);
				const appointmentDateTime = getValues(
					`appointmentScheduling.seriesVisits.${index}.appointmentDateTime`,
				);

				return (
					<AccordionItem
						value={field.id}
						key={field.id}
						className="bg-sidebar text-muted-foreground border border-border rounded-md has-focus-visible:border-ring has-focus-visible:ring-ring/50 px-4 py-1 outline-none last:border-b has-focus-visible:ring-[3px]"
					>
						<AccordionPrimitive.Header className="flex">
							<AccordionPrimitive.Trigger className="focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-center justify-between rounded-md py-2 text-left text-[15px] leading-6 font-semibold transition-all outline-none focus-visible:ring-[3px] [&[data-state=open]>svg]:rotate-180">
								<div className="flex items-center gap-3">
									<span
										className="flex size-10 shrink-0 items-center justify-center rounded-full border bg-primary/75 text-primary-foreground"
										aria-hidden="true"
									>
										{visitNumber}
									</span>
									<span className="flex flex-col space-y-1">
										<span>Visit {visitNumber}</span>
										{appointmentDateTime ? (
											<span className="text-sm font-normal">
												{format(appointmentDateTime, "MMM d, yyyy h:mm a", {
													locale,
													in: tzDate,
												})}
											</span>
										) : (
											<span className="text-sm font-normal">Unscheduled</span>
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
							/>
						</AccordionContent>
					</AccordionItem>
				);
			})}
		</Accordion>
	);
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
}
const VisitForm = ({
	index,
	isLoading: externalIsLoading,
	isResetting,
	field: _,
	onClose,
	onReset,
}: VisitFormProps) => {
	const { props: globalProps } = usePage<AppointmentNewGlobalPageProps>();
	const form = useFormContext<AppointmentBookingSchema>();
	const preferredTherapistGenderOption =
		globalProps?.optionsData?.preferredTherapistGender || [];

	// Use the custom hook for this series visit
	const {
		isLoading: hookIsLoading,
		fieldPath,
		watchSelectedTimeSlotValue,
		watchAllOfDayValue,
		watchAppointmentDateTimeValue,
		mapRef,
		therapistsOptions,
		isMapLoading,
		onSelectTherapist,
		onFindTherapists,
		onSelectTimeSlot,
		onPersistTherapist,
		onSelectAllOfDay,
		onResetAllTherapistState,
		formSelections,
	} = useSeriesVisitForm(index);

	// reset the therapist selected and isoline map while reset the visit
	useEffect(() => {
		if (isResetting) {
			onResetAllTherapistState();
		}
	}, [isResetting, onResetAllTherapistState]);

	// Get all series visits to calculate min/max dates
	const seriesFieldPath = useWatch({
		control: form.control,
		name: "appointmentScheduling.seriesVisits",
	});
	// Calculate min and max dates based on adjacent appointments
	const firstVisitDateTime = useWatch({
		control: form.control,
		name: "appointmentScheduling.appointmentDateTime",
	});

	// calculate min and max dates based on adjacent appointments
	const { minDate, maxDate } = useMemo(() => {
		try {
			if (!seriesFieldPath?.length)
				return { minDate: undefined, maxDate: undefined };

			// Find previous valid date (either from first visit or previous series visit)
			const findPreviousDate = () => {
				// For first visit in series, use the initial appointment date
				if (index === 0) return firstVisitDateTime;

				// Otherwise find the most recent previous visit with a date
				for (let i = index - 1; i >= 0; i--) {
					const prevDate = seriesFieldPath[i]?.appointmentDateTime;
					if (prevDate) return prevDate;
				}
				return firstVisitDateTime;
			};

			// Find next valid date from subsequent visits
			const findNextDate = () => {
				for (let i = index + 1; i < seriesFieldPath.length; i++) {
					const nextDate = seriesFieldPath[i]?.appointmentDateTime;
					if (nextDate) return nextDate;
				}
				return undefined;
			};

			const prevDate = findPreviousDate();
			const nextDate = findNextDate();

			return {
				minDate: prevDate ? new Date(prevDate) : undefined,
				maxDate: nextDate ? new Date(nextDate) : undefined,
			};
		} catch (error) {
			console.error("Error calculating min/max dates:", error);
			return { minDate: undefined, maxDate: undefined };
		}
	}, [seriesFieldPath, index, firstVisitDateTime]);

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
					name={`${fieldPath}.preferredTherapistGender`}
					render={({ field }) => (
						<FormItem className="space-y-3 col-span-full">
							<FormLabel>Preferred Therapist Gender</FormLabel>
							<FormControl>
								<RadioGroup
									onValueChange={(value) => {
										field.onChange(value);
										onResetAllTherapistState();
									}}
									value={field.value}
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
												{getGenderIcon?.(gender)}
												<span className="capitalize">{gender}</span>
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
					name={`${fieldPath}.appointmentDateTime`}
					render={({ field }) => (
						<FormItem className="col-span-full">
							<FormLabel className="flex items-center justify-between">
								<span>Date & Time</span>
								<FormField
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
								/>
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
										callbackOnChange={() => {
											onResetAllTherapistState();
										}}
									/>
								)}
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

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
											formSelections?.seriesTherapists?.[index] || undefined,
										isAllOfDay: !!watchAllOfDayValue,
										selectedTimeSlot: watchSelectedTimeSlotValue,
									}}
									find={{
										isDisabled: !watchAppointmentDateTimeValue,
										handler: onFindTherapists,
									}}
									onSelectTherapist={onSelectTherapist}
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
