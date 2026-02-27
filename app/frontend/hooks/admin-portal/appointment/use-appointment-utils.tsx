import H from "@here/maps-api-for-javascript";
import { router, usePage } from "@inertiajs/react";
import { useSessionStorage } from "@uidotdev/usehooks";
import { format, isBefore, startOfDay, sub, subDays } from "date-fns";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useDateContext } from "@/components/providers/date-provider";
import type { HereMaphandler } from "@/components/shared/here-map";
import type { CalendarProps } from "@/components/ui/calendar";
import type { IsolineConstraint, MarkerData } from "@/hooks/here-maps";
import { useTherapistMarker } from "@/hooks/here-maps/use-markers";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import {
	type AppointmentBookingSchema,
	checkIsCustomFisiohomePartner,
	checkIsCustomReferral,
	DEFAULT_VALUES_PACKAGE,
	DEFAULT_VALUES_SERVICE,
	DEFAULT_VALUES_THERAPIST,
} from "@/lib/appointments/form";
import type { PREFERRED_THERAPIST_GENDER } from "@/lib/constants";
import { SESSION_ISOLINE_KEY, SESSION_MARKERS_KEY } from "@/lib/here-maps";
import { groupLocationsByCountry } from "@/lib/locations";
import { calculateAge, populateQueryParams } from "@/lib/utils";
import { boolSchema } from "@/lib/validation";
import type { AppointmentNewGlobalPageProps } from "@/pages/AdminPortal/Appointment/New";
import type { Location } from "@/types/admin-portal/location";
import type { Therapist } from "@/types/admin-portal/therapist";
import type { Coordinate, IsolineResult } from "@/types/here-maps";

// Helper function to calculate distance between two coordinates (Haversine formula)
const calculateDistance = (
	lat1: number,
	lon1: number,
	lat2: number,
	lon2: number,
): number => {
	const R = 6371; // Earth's radius in kilometers
	const dLat = ((lat2 - lat1) * Math.PI) / 180;
	const dLon = ((lon2 - lon1) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos((lat1 * Math.PI) / 180) *
			Math.cos((lat2 * Math.PI) / 180) *
			Math.sin(dLon / 2) *
			Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
};

// Type for feasibility report items
export type FeasibilityReportItem = {
	name: string;
	regNumber: string;
	reason: string;
	type?: "unavailable" | "not_feasible";
	straightLineDistance?: { value: number; unit: string };
	routeDistance?: { value: number; unit: string };
	duration?: { value: number; unit: string };
};

// Type for feasibility details
type FeasibilityDetails = {
	straightLineDistance?: { value: number; unit: string };
	routeDistance?: { value: number; unit: string };
	duration?: { value: number; unit: string };
};

// Helper to calculate route distance using HERE Maps Routing API
const calculateRouteDistance = async (
	apiKey: string,
	origin: Coordinate,
	destination: Coordinate,
): Promise<{ distance: number; duration: number } | null> => {
	try {
		const platform = new H.service.Platform({ apikey: apiKey });
		const router = platform.getRoutingService(undefined, 8);
		const params = {
			origin: `${origin.lat},${origin.lng}`,
			destination: `${destination.lat},${destination.lng}`,
			transportMode: "car",
			return: "summary",
			routingMode: "short",
		};

		const result = await new Promise((resolve, reject) => {
			router.calculateRoute(params, resolve, reject);
		});

		const route = (result as any)?.routes?.[0];
		const section = route?.sections?.[0];

		if (!section?.summary) {
			return null;
		}

		return {
			distance: section.summary.length / 1000, // Convert to km
			duration: section.summary.duration / 60, // Convert to minutes
		};
	} catch (error) {
		console.error("Error calculating route:", error);
		return null;
	}
};

// Helper to build not feasible reason and details
const buildNotFeasibleDetails = async (
	apiKey: string,
	patientCoords: Coordinate,
	therapistCoord: MarkerData,
	constraints: IsolineConstraint[],
): Promise<{ reason: string; details: FeasibilityDetails }> => {
	const details: FeasibilityDetails = {};
	let reason = "Outside isoline coverage area";

	const straightLineDistance = calculateDistance(
		patientCoords.lat,
		patientCoords.lng,
		therapistCoord.position.lat,
		therapistCoord.position.lng,
	);
	details.straightLineDistance = { value: straightLineDistance, unit: "km" };

	const distanceConstraint = constraints.find((c) => c.type === "distance");
	const timeConstraint = constraints.find((c) => c.type === "time");

	const constraintDetails: string[] = [];
	if (distanceConstraint) {
		constraintDetails.push(
			`max ${(distanceConstraint.value / 1000).toFixed(1)}km`,
		);
	}
	if (timeConstraint) {
		constraintDetails.push(`max ${(timeConstraint.value / 60).toFixed(0)}min`);
	}

	// Calculate actual route distance
	const routeInfo = await calculateRouteDistance(
		apiKey,
		patientCoords,
		therapistCoord.position,
	);

	if (routeInfo) {
		details.routeDistance = { value: routeInfo.distance, unit: "km" };
		details.duration = { value: routeInfo.duration, unit: "min" };

		if (
			distanceConstraint &&
			routeInfo.distance > distanceConstraint.value / 1000
		) {
			reason = `Route distance exceeded: ${routeInfo.distance.toFixed(1)}km > ${(distanceConstraint.value / 1000).toFixed(1)}km (straight-line: ${straightLineDistance.toFixed(1)}km)`;
		} else if (
			timeConstraint &&
			routeInfo.duration > timeConstraint.value / 60
		) {
			reason = `Route duration exceeded: ${Math.round(routeInfo.duration)}min > ${(timeConstraint.value / 60).toFixed(0)}min (straight-line: ${Math.round((straightLineDistance / 30) * 60)}min)`;
		} else {
			reason = `Outside isoline polygon (straight-line: ${straightLineDistance.toFixed(1)}km, route: ${routeInfo.distance.toFixed(1)}km, constraints: ${constraintDetails.join(", ")})`;
		}
	} else {
		// Fallback to straight-line based reason
		if (
			distanceConstraint &&
			straightLineDistance > distanceConstraint.value / 1000
		) {
			reason = `Distance exceeded: ${straightLineDistance.toFixed(1)}km > ${(distanceConstraint.value / 1000).toFixed(1)}km max`;
		} else if (timeConstraint) {
			const estimatedTime = (straightLineDistance / 30) * 60;
			details.duration = { value: estimatedTime, unit: "min" };
			if (estimatedTime > timeConstraint.value / 60) {
				reason = `Duration exceeded: ~${Math.round(estimatedTime)}min > ${(timeConstraint.value / 60).toFixed(0)}min max`;
			} else {
				reason = `Outside reachable area (${straightLineDistance.toFixed(1)}km straight-line, ~${Math.round(estimatedTime)}min estimated)`;
			}
		} else if (distanceConstraint) {
			reason = `Outside reachable area (${straightLineDistance.toFixed(1)}km straight-line, max ${(distanceConstraint.value / 1000).toFixed(1)}km)`;
		} else {
			reason = "Outside reachable area";
		}
	}

	return { reason, details };
};

// Helper to map therapist to MarkerData
const mapTherapistToMarkerData = (
	therapist: TherapistOption,
	generateMarkerDataTherapist: (args: {
		address: string;
		position: Coordinate;
		therapist: TherapistOption;
	}) => MarkerData,
): MarkerData | null => {
	if (!therapist?.activeAddress) return null;

	const prev = therapist.availabilityDetails?.locations?.prevAppointment;
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
};

export type LocationOption = Pick<
	Location,
	"id" | "city" | "country" | "countryCode" | "state"
>;

export type TherapistOption = Pick<
	Therapist,
	| "id"
	| "name"
	| "batch"
	| "gender"
	| "phoneNumber"
	| "registrationNumber"
	| "modalities"
	| "specializations"
	| "employmentStatus"
	| "employmentType"
	| "availability"
	| "availabilityDetails"
	| "activeAddress"
	| "appointments"
>;

// * hook about patient region form value
export const usePatientRegion = () => {
	const { props: globalProps } = usePage<AppointmentNewGlobalPageProps>();
	const form = useFormContext<AppointmentBookingSchema>();
	const [isLoading, setIsLoading] = useState({
		locations: false,
	});
	const watchPatientDetailsValue = useWatch({
		control: form.control,
		name: "patientDetails",
	});
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
				String(location.id) === watchPatientDetailsValue?.location?.id,
		);
	}, [watchPatientDetailsValue?.location?.id, locationsOption]);
	const coordinate = useMemo(
		() => [
			watchPatientDetailsValue.latitude,
			watchPatientDetailsValue.longitude,
		],
		[watchPatientDetailsValue.latitude, watchPatientDetailsValue.longitude],
	);
	const coordinateText = useMemo(() => {
		const latitude = watchPatientDetailsValue.latitude;
		const longitude = watchPatientDetailsValue.longitude;
		if (!latitude || !longitude) return "";

		return [latitude, longitude].join(",");
	}, [watchPatientDetailsValue.latitude, watchPatientDetailsValue.longitude]);
	const mapAddress = useMemo(() => {
		const { address, postalCode = "" } = watchPatientDetailsValue;

		return {
			country: selectedLocation?.country || "",
			state: selectedLocation?.state || "",
			city: selectedLocation?.city || "",
			postalCode,
			address,
		};
	}, [selectedLocation, watchPatientDetailsValue]);
	const coordinateError = useMemo(() => {
		const latError = form.formState.errors.patientDetails?.latitude;
		const lngError = form.formState.errors.patientDetails?.longitude;

		return latError || lngError ? "Calculate the coordinate first." : null;
	}, [
		form.formState.errors.patientDetails?.latitude,
		form.formState.errors.patientDetails?.longitude,
	]);
	const onFocusLocationField = useCallback(() => {
		// fetch the locations options data
		router.reload({
			only: ["adminPortal", "flash", "errors", "locations"],
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
			form.resetField("appointmentScheduling.therapist", {
				defaultValue: DEFAULT_VALUES_THERAPIST,
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

	return {
		locationsOption,
		groupedLocationsOption,
		selectedLocation,
		coordinate,
		coordinateText,
		mapAddress,
		coordinateError,
		isLoading,
		onFocusLocationField,
		onSelectLocation,
	};
};

// * hook about here map for patient region form value
export const useMapRegion = ({
	selectedLocation,
	coordinate,
}: {
	selectedLocation: LocationOption | undefined;
	coordinate: number[];
}) => {
	const form = useFormContext<AppointmentBookingSchema>();
	const watchPatientDetailsValue = useWatch({
		control: form.control,
		name: "patientDetails",
	});
	const [coordinateInput, setCoordinateInput] = useState(() =>
		watchPatientDetailsValue.latitude || watchPatientDetailsValue.longitude
			? coordinate.join(",")
			: "",
	);
	const mapRef = useRef<(H.Map & HereMaphandler) | null>(null);
	const isMapButtonsDisabled = useMemo(() => {
		const { latitude, longitude, address } = watchPatientDetailsValue;
		const isValidCoordinate = !!latitude && !!longitude;
		const isValidAddress =
			!!selectedLocation?.country &&
			!!selectedLocation?.state &&
			!!selectedLocation?.city &&
			!!address &&
			!isValidCoordinate;

		return {
			calculate: !isValidAddress,
			reset: !isValidCoordinate,
			gmaps: !isValidCoordinate,
		};
	}, [watchPatientDetailsValue, selectedLocation]);
	const onResetCoordinate = useCallback(() => {
		// reset the lat, lng form values
		form.setValue("patientDetails.latitude", 0);
		form.setValue("patientDetails.longitude", 0);
		setCoordinateInput("");

		// remove the map markers
		mapRef.current?.marker.onRemove();
	}, [form.setValue]);
	const onClickGMaps = useCallback(() => {
		window.open(
			`https://www.google.com/maps/search/?api=1&query=${coordinate.join(",")}`,
		);
	}, [coordinate]);
	const setMapCoordinate = useCallback(
		(lat: number, lng: number, address: string) => {
			// Update form values with latitude and longitude
			form.setValue("patientDetails.latitude", lat, { shouldValidate: true });
			form.setValue("patientDetails.longitude", lng, { shouldValidate: true });

			// Add markers to the map
			mapRef.current?.marker.onAdd(
				[
					{
						position: { lat, lng },
						address,
					},
				] satisfies MarkerData[],
				{ changeMapView: true },
			);
		},
		[form.setValue],
	);
	const onCalculateCoordinate = useCallback(async () => {
		const coordinateSource = form.getValues("formOptions.coordinateSource");

		// Manually calculate the coordinate
		if (coordinateSource === "manual") {
			const [latitude, longitude] = coordinateInput.split(",");
			const latNumber = Number(latitude || 0);
			const lngNumber = Number(longitude || 0);
			const address = watchPatientDetailsValue.address;

			setMapCoordinate(latNumber, lngNumber, address);

			return;
		}

		// Automatically calculate the coordinate using geocoding
		try {
			// Fetch geocode result
			const geocodeResult = await mapRef.current?.geocode.onCalculate();
			const { lat, lng } = geocodeResult?.position || {};
			const label = geocodeResult?.address?.label || "";
			if (!lat || !lng) {
				// Validate geocode result
				console.error("Address cannot be found!");

				// Set error message for the form
				const errorMessage =
					"The address cannot be found. Ensure the region, and address line are entered correctly.";
				form.setError("patientDetails.address", {
					message: errorMessage,
					type: "custom",
				});
				return;
			}

			setMapCoordinate(lat, lng, label);
		} catch (error) {
			console.error("An unexpected error occurred:", error);

			// Handle unexpected errors
			form.setError("patientDetails.address", {
				message:
					"An unexpected error occurred while calculating the coordinates from the address.",
				type: "custom",
			});
		}
	}, [
		form,
		coordinateInput,
		watchPatientDetailsValue.address,
		setMapCoordinate,
	]);

	return {
		mapRef,
		isMapButtonsDisabled,
		coordinateInput,
		setCoordinateInput,
		onCalculateCoordinate,
		onClickGMaps,
		onResetCoordinate,
	};
};

// * hooks about date of birth patient form value
export const usePatientDateOfBirth = () => {
	const form = useFormContext<AppointmentBookingSchema>();
	const dateOfBirthCalendarProps = useMemo<CalendarProps>(() => {
		return {
			// Show 100 years range
			fromYear: new Date().getFullYear() - 100,
			toYear: new Date().getFullYear(),
			// Disable future dates
			disabled: (date) => date >= new Date(),
		};
	}, []);
	// * automatically calculate the age from date of birth changes
	const doUpdateAge = useCallback(
		(value: Date | null | undefined) => {
			if (value) {
				// Calculate age using your custom function
				const age = calculateAge(value);
				// Update the age field in the form
				form.setValue("patientDetails.age", age);
				form.trigger("patientDetails.age");
			} else {
				form.setValue("patientDetails.age", 0);
			}
		},
		[form.setValue, form.trigger],
	);

	return { dateOfBirthCalendarProps, doUpdateAge };
};

// * hooks about partner booking form value
export const usePartnerBookingSelection = () => {
	const form = useFormContext<AppointmentBookingSchema>();
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

		return () => {};
	}, [isPartnerBooking, form.setValue]);

	return { isPartnerBooking };
};

// * hooks abaout fisiohome partner name selection and handling custom partner name form values
export const usePartnerNameSelection = () => {
	const form = useFormContext<AppointmentBookingSchema>();
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

	// * Watching changes to the fisiohome partner name and handling custom partner name
	useEffect(() => {
		// If the fisiohome partner is custom, set the custom fisiohome partner name value
		if (isCustomFisiohomePartner) {
			form.setValue(
				"additionalSettings.customFisiohomePartnerName",
				watchCustomFisiohomePartnerName,
			);
			return () => {};
		}

		// If the fisiohome partner is not custom, clear the custom fisiohome partner name value
		form.setValue("additionalSettings.customFisiohomePartnerName", "");
		return () => {};
	}, [
		isCustomFisiohomePartner,
		watchCustomFisiohomePartnerName,
		form.setValue,
	]);

	return { isCustomFisiohomePartner };
};

// * hooks about patient referral source selection form value
export const usePatientReferralSource = () => {
	const form = useFormContext<AppointmentBookingSchema>();
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

	// * Watching changes to the patient referral source and handling custom referral sources
	useEffect(() => {
		// If the referral source is custom, set the custom referral source value
		if (isCustomReferral) {
			form.setValue(
				"additionalSettings.customReferralSource",
				watchCustomReferralSource,
			);
			return () => {};
		}

		// If the referral source is not custom, clear the custom referral source value
		form.setValue("additionalSettings.customReferralSource", "");
		return () => {};
	}, [isCustomReferral, watchCustomReferralSource, form.setValue]);

	return { isCustomReferral };
};

// * hooks about preferred therapist gender field
export const usePreferredTherapistGender = ({
	sourceOptions,
}: {
	sourceOptions?: typeof PREFERRED_THERAPIST_GENDER;
}) => {
	const preferredTherapistGenderOption = useMemo(
		() => sourceOptions || [],
		[sourceOptions],
	);

	return { preferredTherapistGenderOption };
};

// * hooks about appointment date time field
export interface DisabledVisit {
	date: string;
	startTime: string;
	endTime: string;
	visitNumber: number;
}

export interface useAppointmentDateTimeProps {
	sourceValue?: {
		date?: Date;
		isAllOfDay?: boolean;
	};
	min: Date | null;
	max: Date | null;
	disabledVisits?: DisabledVisit[];
}
export const useAppointmentDateTime = ({
	sourceValue,
	min,
	max,
	disabledVisits = [],
}: useAppointmentDateTimeProps) => {
	const { locale, tzDate } = useDateContext();
	const [isOpenAppointmentDate, setIsOpenAppointmentDate] = useState(false);
	const [appointmentDate, setAppointmentDate] = useState<Date | null>(
		sourceValue?.date ? new Date(sourceValue.date.toString()) : null,
	);
	const [appointmentTime, setAppointmentTime] = useState<string>(
		sourceValue?.date
			? format(sourceValue.date.toString(), "HH:mm", {
					locale,
					in: tzDate,
				})
			: "",
	);
	const [_isAllOfDay, _setisAllOfDay] = useState(!!sourceValue?.isAllOfDay);
	// Memoized calendar properties for the appointment date field
	const appointmentDateCalendarProps = useMemo<CalendarProps>(() => {
		// normalize "today" to midnight
		const today = startOfDay(new Date());

		// Define the range of years to be displayed in the calendar
		// For dynamic ordering: extend to 6 months when no max is set
		const sixMonthsFromToday = new Date();
		sixMonthsFromToday.setMonth(today.getMonth() + 6);

		// Effective min bound (past dates disabled)
		const minDate = min
			? isBefore(startOfDay(min), today)
				? subDays(today, 1)
				: min
			: subDays(today, 1);

		// For dynamic ordering: use max if provided, otherwise allow up to 6 months
		const maxDate = max
			? sub(startOfDay(max), { days: 1 })
			: sixMonthsFromToday;

		// Collect dates from disabledVisits for visual indication (booked dates)
		const bookedDates: Date[] = disabledVisits.map(
			(visit) => new Date(visit.date),
		);

		return {
			// Close the calendar popover when a day is clicked
			onDayClick: () => setIsOpenAppointmentDate(false),
			// Set the range of years to be displayed
			fromYear: minDate.getFullYear(),
			toYear: maxDate.getFullYear(),
			// Disable dates that are in the past
			// Note: dates with visits are NOT disabled, only their specific time slots are
			disabled: (date) => date <= minDate || date > maxDate,
			modifiers:
				bookedDates.length > 0
					? {
							booked: bookedDates,
						}
					: undefined,
			modifiersClassNames:
				bookedDates.length > 0
					? {
							booked: "ring-2 ring-orange-400 ring-inset",
						}
					: undefined,
		};
	}, [max, min, disabledVisits]);
	const onSelectAppointmentDate = useCallback(
		(date?: Date) => {
			if (appointmentTime) {
				// Set the selected time to the selected date
				const [hours, minutes] = appointmentTime.split(":");
				date?.setHours(Number.parseInt(hours), Number.parseInt(minutes));
			}

			// update state reference and form field value data
			setAppointmentDate(date || null);

			// update state for appointment time
			const time = date
				? format(date.toString(), "HH:mm", {
						locale,
						in: tzDate,
					})
				: "";
			setAppointmentTime(time);
		},
		[appointmentTime, locale, tzDate],
	);
	const onSelectAppointmentTime = useCallback(
		(time: string) => {
			setAppointmentTime(time);
			if (appointmentDate) {
				const [hours, minutes] = time.split(":");
				const newDate = new Date(appointmentDate.getTime());
				newDate.setHours(Number.parseInt(hours), Number.parseInt(minutes));
				setAppointmentDate(newDate);

				return newDate;
			}

			return null;
		},
		[appointmentDate],
	);

	return {
		isOpenAppointmentDate,
		appointmentTime,
		appointmentDate,
		appointmentDateCalendarProps,
		setAppointmentDate,
		setAppointmentTime,
		setIsOpenAppointmentDate,
		onSelectAppointmentDate,
		onSelectAppointmentTime,
	};
};

// * hooks about assigning the therapist field and the here map isoline
export interface PatientValues {
	fullName: string;
	latitude: number;
	longitude: number;
	address: string;
	locationId: string | number;
}
export const useTherapistAvailability = ({
	serviceIdValue,
	preferredTherapistGenderValue,
	appointmentDateTImeValue,
	isAllOfDayValue,
	patientValues,
	fetchURL,
	formType = "create",
	onChangeTherapistLoading,
	onResetTherapistFormValue,
}: {
	serviceIdValue: string | number;
	preferredTherapistGenderValue: (typeof PREFERRED_THERAPIST_GENDER)[number];
	appointmentDateTImeValue: Date | null;
	isAllOfDayValue: boolean;
	patientValues: PatientValues;
	fetchURL: string;
	formType?: "create" | "reschedule";
	onChangeTherapistLoading: (value: boolean) => void;
	onResetTherapistFormValue: () => void;
}) => {
	// Get API key from global props at the top level
	const { props: globalProps } = usePage<AppointmentNewGlobalPageProps>();
	const apiKey = globalProps.adminPortal.protect.hereMapApiKey;

	// * state for feasibility report (to show in dialog)
	const [feasibilityReport, setFeasibilityReport] = useState<
		FeasibilityReportItem[]
	>([]);

	// * state group for isolane therapist
	const [markerStorage, setMarkerStorage] = useSessionStorage<null | {
		patient: MarkerData[];
	}>(SESSION_MARKERS_KEY, null);
	const [isolineStorage, setIsolineStorage] = useSessionStorage<
		null | IsolineResult["isolines"]
	>(SESSION_ISOLINE_KEY, null);
	const mapRef = useRef<(H.Map & HereMaphandler) | null>(null);
	const isMapLoading = useMemo(
		() => mapRef.current?.isLoading.value || false,
		[],
	);
	const markerIcon = useTherapistMarker();
	const [isIsolineCalculated, setIsIsolineCalculated] = useState(false);

	// * for assigning the therapist
	const [isTherapistFound, setIsTherapistFound] = useState(false);
	const [therapistsOptions, setTherapistsOptions] = useState({
		available: [] as TherapistOption[],
		unavailable: [] as TherapistOption[],
		feasible: [] as TherapistOption[],
		notFeasible: [] as TherapistOption[],
	});
	const generateMarkerDataPatient = useCallback(
		({
			address,
			position,
			patient,
		}: {
			address: string;
			position: Coordinate;
			patient: PatientValues;
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
		(therapists: TherapistOption[]): IsolineConstraint[] | null => {
			// Get the first therapist's rules (they should all be the same in a group)
			const firstTherapist = therapists[0];
			const rules = firstTherapist?.availability?.availabilityRules || [];

			// If no rules, return empty array instead of default constraints
			if (!rules.length) {
				return [];
			}

			// Extract constraints from the rules
			// A value of 0 means the constraint is disabled
			const constraints: IsolineConstraint[] = [];
			let hasExplicitDistance = false;
			let hasExplicitDuration = false;

			rules.forEach((rule) => {
				// Check if distance rule exists (including 0)
				if (rule?.distanceInMeters !== undefined) {
					hasExplicitDistance = true;
					// Only add constraint if value > 0
					if (
						rule.distanceInMeters > 0 &&
						Number.isFinite(rule.distanceInMeters)
					) {
						constraints.push({
							type: "distance",
							value: rule.distanceInMeters,
						});
					}
				}
				// Check if duration rule exists (including 0)
				if (rule?.durationInMinutes !== undefined) {
					hasExplicitDuration = true;
					// Only add constraint if value > 0
					if (
						rule.durationInMinutes > 0 &&
						Number.isFinite(rule.durationInMinutes)
					) {
						constraints.push({
							type: "time",
							value: rule.durationInMinutes * 60,
						}); // convert minutes to seconds
					}
				}
			});

			// If explicit rules exist but both are 0 (disabled), return null to skip feasibility check
			if (
				hasExplicitDistance &&
				hasExplicitDuration &&
				constraints.length === 0
			) {
				return null;
			}

			// If no valid constraints found but rules exist, just return empty
			if (constraints.length === 0) {
				return [];
			}

			return constraints;
		},
		[],
	);

	// reset the isoline calculated and marker printed
	const onResetIsoline = useCallback(() => {
		// remove the markers
		mapRef.current?.marker.onRemove();
		mapRef.current?.marker.onRemove({ isSecondary: true });

		// remove the isoline polygon
		mapRef.current?.isoline.onRemove();

		// reset the state calculated marker
		setIsIsolineCalculated(false);
	}, []);

	// Helper function to create feasibility report for unavailable therapists
	const createUnavailableTherapistReports = useCallback(
		(unavailableTherapists: TherapistOption[]): FeasibilityReportItem[] => {
			return unavailableTherapists.map((t) => ({
				name: t.name,
				regNumber: t.registrationNumber,
				reason: t.availabilityDetails?.reasons?.join(", ") || "Unavailable",
				type: "unavailable" as const,
			}));
		},
		[],
	);

	// Helper function to add markers to map
	const addMarkersToMap = useCallback(
		(
			patientCoords: Coordinate,
			patientAddress: string,
			therapists: TherapistOption[],
			options?: { isSecondary?: boolean; useRouting?: boolean },
		) => {
			// Add patient marker
			const markerPatientData: MarkerData = generateMarkerDataPatient({
				address: patientAddress,
				position: patientCoords,
				patient: patientValues,
			});
			mapRef.current?.marker.onAdd([markerPatientData]);
			setMarkerStorage({ patient: [markerPatientData] });

			// Add therapist markers
			const markerTherapistData: MarkerData[] = therapists
				.map((t) => mapTherapistToMarkerData(t, generateMarkerDataTherapist))
				.filter((coord): coord is NonNullable<typeof coord> => coord !== null);
			mapRef.current?.marker.onAdd(markerTherapistData, options);

			return { markerPatientData, markerTherapistData };
		},
		[
			patientValues,
			generateMarkerDataPatient,
			generateMarkerDataTherapist,
			setMarkerStorage,
		],
	);

	// Helper function to handle bypass constraints mode
	const handleBypassConstraintsMode = useCallback(
		async (
			therapists: TherapistOption[],
			unavailableTherapists: TherapistOption[],
			patientCoords: Coordinate,
			patientAddress: string,
		) => {
			const therapistList = {
				feasible: therapists,
				notFeasible: [] as TherapistOption[],
			};
			const allNotFeasibleReports = createUnavailableTherapistReports(
				unavailableTherapists,
			);

			// Update state
			setFeasibilityReport(allNotFeasibleReports);
			setTherapistsOptions((prev) => ({ ...prev, ...therapistList }));
			setIsTherapistFound(true);

			// Add markers to map
			addMarkersToMap(patientCoords, patientAddress, therapists, {
				isSecondary: true,
				useRouting: true,
			});

			setIsIsolineCalculated(true);
		},
		[createUnavailableTherapistReports, addMarkersToMap],
	);

	// Helper function to process therapist constraints and feasibility
	const processTherapistConstraints = useCallback(
		async (
			therapists: TherapistOption[],
			patientCoords: Coordinate,
			initialReports: FeasibilityReportItem[],
		) => {
			const therapistGroups = groupTherapistsByConstraints(therapists);
			const allIsolineResults: IsolineResult["isolines"] = [];
			const allTherapistCoords: MarkerData[] = [];
			const therapistList = {
				feasible: [] as TherapistOption[],
				notFeasible: [] as TherapistOption[],
			};
			const allNotFeasibleReports = [...initialReports];

			// Process each constraint group
			for (const [_constraintKey, groupTherapists] of therapistGroups) {
				const constraints = getIsolineConstraintsForGroup(groupTherapists);

				// Map therapists to MarkerData
				const groupTherapistCoords: MarkerData[] = groupTherapists
					.map((t) => mapTherapistToMarkerData(t, generateMarkerDataTherapist))
					.filter(
						(coord): coord is NonNullable<typeof coord> => coord !== null,
					);
				allTherapistCoords.push(...groupTherapistCoords);

				// If constraints is null, all therapists are feasible
				if (constraints === null || constraints.length === 0) {
					therapistList.feasible.push(...groupTherapists);
					continue;
				}

				// Calculate isoline for this group
				const result = await mapRef.current?.isoline.onCalculate.both({
					coord: patientCoords,
					constraints,
				});
				if (result) {
					allIsolineResults.push(...result);
				}

				// Check feasibility for each therapist
				if (!mapRef.current) continue;
				const feasibleResult =
					mapRef.current.isLocationFeasible(groupTherapistCoords);

				// Process feasibility results
				for (const item of feasibleResult) {
					const therapist = item?.additional?.therapist;
					if (!therapist) continue;

					if (item.isFeasible) {
						therapistList.feasible.push(therapist);
					} else {
						const therapistCoord = groupTherapistCoords.find(
							(coord) => coord?.additional?.therapist?.id === therapist.id,
						);

						if (therapistCoord) {
							const { reason, details } = await buildNotFeasibleDetails(
								apiKey,
								patientCoords,
								therapistCoord,
								constraints,
							);
							allNotFeasibleReports.push({
								name: therapist.name,
								regNumber: therapist.registrationNumber,
								reason,
								type: "not_feasible",
								...details,
							});
						} else {
							allNotFeasibleReports.push({
								name: therapist.name,
								regNumber: therapist.registrationNumber,
								reason: "Outside reachable area",
								type: "not_feasible",
							});
						}
						therapistList.notFeasible.push(therapist);
					}
				}
			}

			return {
				allIsolineResults,
				allTherapistCoords,
				therapistList,
				allNotFeasibleReports,
			};
		},
		[
			groupTherapistsByConstraints,
			getIsolineConstraintsForGroup,
			generateMarkerDataTherapist,
			apiKey,
		],
	);

	// Helper function to finalize and render results
	const finalizeAndRenderResults = useCallback(
		(
			allIsolineResults: IsolineResult["isolines"],
			allTherapistCoords: MarkerData[],
			therapistList: {
				feasible: TherapistOption[];
				notFeasible: TherapistOption[];
			},
			allNotFeasibleReports: FeasibilityReportItem[],
			patientCoords: Coordinate,
			patientAddress: string,
		) => {
			// Update state
			setIsolineStorage(allIsolineResults);
			setFeasibilityReport(allNotFeasibleReports);
			setTherapistsOptions((prev) => ({ ...prev, ...therapistList }));
			setIsTherapistFound(true);

			// Render isolines on map
			if (mapRef.current?.isoline?.onAddAll) {
				mapRef.current.isoline.onAddAll(allIsolineResults);
			}

			// Add patient marker
			const markerPatientData: MarkerData = generateMarkerDataPatient({
				address: patientAddress,
				position: patientCoords,
				patient: patientValues,
			});
			mapRef.current?.marker.onAdd([markerPatientData]);
			setMarkerStorage({ patient: [markerPatientData] });

			// Add feasible therapist markers
			const markerTherapistFeasibleData: MarkerData[] = therapistList.feasible
				.map((t) =>
					allTherapistCoords.find((c) => c?.additional?.therapist?.id === t.id),
				)
				.filter((coord): coord is NonNullable<typeof coord> => coord !== null);
			mapRef.current?.marker.onAdd(markerTherapistFeasibleData, {
				isSecondary: true,
				useRouting: true,
			});

			setIsIsolineCalculated(true);
		},
		[
			setIsolineStorage,
			generateMarkerDataPatient,
			patientValues,
			setMarkerStorage,
		],
	);

	const onCalculateIsoline = useCallback(
		async (
			therapists: NonNullable<TherapistOption[]>,
			unavailableTherapists: TherapistOption[] = [],
			options?: { bypassConstraints?: boolean },
		) => {
			const { bypassConstraints = false } = options ?? {};
			if (!mapRef.current) return;

			const { latitude, longitude, address: patientAddress } = patientValues;
			const patientCoords = { lat: latitude, lng: longitude };

			// Handle bypass constraints mode
			if (bypassConstraints) {
				await handleBypassConstraintsMode(
					therapists,
					unavailableTherapists,
					patientCoords,
					patientAddress,
				);
				return;
			}

			// Initialize with unavailable therapists reports
			const initialReports = createUnavailableTherapistReports(
				unavailableTherapists,
			);

			// Process therapist constraints and feasibility
			const results = await processTherapistConstraints(
				therapists,
				patientCoords,
				initialReports,
			);

			// Finalize and render results
			finalizeAndRenderResults(
				results.allIsolineResults,
				results.allTherapistCoords,
				results.therapistList,
				results.allNotFeasibleReports,
				patientCoords,
				patientAddress,
			);
		},
		[
			patientValues,
			handleBypassConstraintsMode,
			createUnavailableTherapistReports,
			processTherapistConstraints,
			finalizeAndRenderResults,
		],
	);

	// reset the therapist all options
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
	// map the available and unavailable therapists, then also calculate the isoline
	const mappingTherapists = useCallback(
		(
			therapists: TherapistOption[] | undefined,
			options?: { bypassConstraints?: boolean },
		) => {
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
				onCalculateIsoline(therapistsAvailable, therapistsUnavailable, {
					bypassConstraints: options?.bypassConstraints,
				});
			} else {
				setIsTherapistFound(true);
			}
		},
		[onCalculateIsoline],
	);
	const onFindTherapists = useCallback(
		(options?: {
			bypassConstraints?: boolean;
			employmentType?: "KARPIS" | "FLAT" | "ALL";
		}) => {
			const { bypassConstraints = false, employmentType = "ALL" } =
				options ?? {};

			const basePayload = {
				preferredTherapistGender: preferredTherapistGenderValue,
				appointmentDateTime: appointmentDateTImeValue,
				isAllOfDay: isAllOfDayValue,
				bypassConstraints: bypassConstraints,
				employmentType: employmentType,
			};

			const payload =
				formType === "create"
					? {
							locationId: patientValues.locationId,
							serviceId: serviceIdValue,
							...basePayload,
						}
					: basePayload;

			const { queryParams } = populateQueryParams(
				fetchURL,
				deepTransformKeysToSnakeCase(payload),
			);

			router.get(fetchURL, queryParams, {
				preserveScroll: true,
				preserveState: true,
				replace: false,
				only: ["adminPortal", "flash", "errors", "therapists"],
				onStart: () => {
					onChangeTherapistLoading(true);
					onResetTherapistOptions();
					onResetIsoline();
					// reset the therapist form values
					onResetTherapistFormValue();
				},
				onFinish: () => {
					setTimeout(() => {
						onChangeTherapistLoading(false);
					}, 250);
				},
				/**
				 * ? This is a bug that has been fixed but is very tricky, it looks simple to solve but it takes a long way to debug it in the troubleshooting process.
				 * ? This callback will not be called if there is a server error for example on the validation server.
				 * ? And instead of calling the onSuccess callback it will call the onError callback. but this has been solved.
				 * ? That is by not using the only option (for example only: [“props”]),
				 * ? And also instead of using InertiaRails.defer use `->` or lazy data evaluation (https://inertia-rails.dev/guide/partial-reloads#lazy-data-evaluation).
				 * ? see: https://fisiohome.atlassian.net/browse/PE-63?atlOrigin=eyJpIjoiN2RhNjVlYThmMjMwNDQ4MTk2NjIxN2NhZGRmMWIyMGYiLCJwIjoiaiJ9
				 *
				 **/
				onSuccess: ({ props }) => {
					const result = (props as unknown as AppointmentNewGlobalPageProps)
						.therapists;
					mappingTherapists(result, { bypassConstraints });
				},
			});
		},
		[
			fetchURL,
			formType,
			serviceIdValue,
			preferredTherapistGenderValue,
			appointmentDateTImeValue,
			patientValues.locationId,
			isAllOfDayValue,
			onResetTherapistOptions,
			mappingTherapists,
			onChangeTherapistLoading,
			onResetTherapistFormValue,
			onResetIsoline,
		],
	);

	// * side effect for reset the therapist selected and isoline map while service, therapist preferred gender, and appointment date changes
	useEffect(() => {
		if (
			(serviceIdValue ||
				appointmentDateTImeValue ||
				preferredTherapistGenderValue) &&
			!isAllOfDayValue
		) {
			onResetTherapistFormValue();
			onResetTherapistOptions();
			onResetIsoline();
		}

		return () => {};
	}, [
		serviceIdValue,
		appointmentDateTImeValue,
		preferredTherapistGenderValue,
		isAllOfDayValue,
		onResetIsoline,
		onResetTherapistOptions,
		onResetTherapistFormValue,
	]);

	return {
		isTherapistFound,
		therapistsOptions,
		mapRef,
		isMapLoading,
		isIsolineCalculated,
		onResetTherapistOptions,
		onResetIsoline,
		onFindTherapists,
		markerStorage,
		isolineStorage,
		generateMarkerDataPatient,
		generateMarkerDataTherapist,
		feasibilityReport,
		setFeasibilityReport,
	};
};
