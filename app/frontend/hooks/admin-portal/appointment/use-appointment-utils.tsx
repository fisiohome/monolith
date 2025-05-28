import { useDateContext } from "@/components/providers/date-provider";
import type { HereMaphandler } from "@/components/shared/here-map";
import type { CalendarProps } from "@/components/ui/calendar";
import type { MarkerData } from "@/hooks/here-maps";
import { useTherapistMarker } from "@/hooks/here-maps/use-markers";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import {
	type AppointmentBookingSchema,
	DEFAULT_VALUES_PACKAGE,
	DEFAULT_VALUES_SERVICE,
	DEFAULT_VALUES_THERAPIST,
	checkIsCustomFisiohomePartner,
	checkIsCustomReferral,
} from "@/lib/appointments/form";
import type { PREFERRED_THERAPIST_GENDER } from "@/lib/constants";
import {
	ISOLINE_CONSTRAINTS,
	SESSION_ISOLINE_KEY,
	SESSION_MARKERS_KEY,
} from "@/lib/here-maps";
import { groupLocationsByCountry } from "@/lib/locations";
import { calculateAge, populateQueryParams } from "@/lib/utils";
import { boolSchema } from "@/lib/validation";
import type { AppointmentNewGlobalPageProps } from "@/pages/AdminPortal/Appointment/New";
import type { Location } from "@/types/admin-portal/location";
import type { Therapist } from "@/types/admin-portal/therapist";
import type { Coordinate, IsolineResult } from "@/types/here-maps";
import { router, usePage } from "@inertiajs/react";
import { useSessionStorage } from "@uidotdev/usehooks";
import { format } from "date-fns";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";

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

		// remove the map markers
		mapRef.current?.marker.onRemove();
	}, [form.setValue]);
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
					"The address cannot be found. Ensure the region, and address line are entered correctly.";
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

	return {
		mapRef,
		isMapButtonsDisabled,
		onCalculateCoordinate,
		onClickGMaps,
		onResetCoordinate,
	};
};

// * hooks about date of birth patient form value
export const usePatientDateOfBirth = () => {
	const form = useFormContext<AppointmentBookingSchema>();
	const watchPatientDetailsValue = useWatch({
		control: form.control,
		name: "patientDetails",
	});
	const dateOfBirthCalendarProps = useMemo<CalendarProps>(() => {
		return {
			// Show 100 years range
			fromYear: new Date().getFullYear() - 100,
			toYear: new Date().getFullYear(),
			// Disable future dates
			disabled: (date) => date >= new Date(),
		};
	}, []);
	// automatically calculate the age from date of birth changes
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

		return () => {};
	}, [watchPatientDetailsValue.dateOfBirth, form.setValue, form.trigger]);

	return { dateOfBirthCalendarProps };
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
}: { sourceOptions?: typeof PREFERRED_THERAPIST_GENDER }) => {
	const preferredTherapistGenderOption = useMemo(
		() => sourceOptions || [],
		[sourceOptions],
	);

	return { preferredTherapistGenderOption };
};

// * hooks about appointment date time field
export const useAppointmentDateTime = ({
	sourceValue,
}: { sourceValue?: Date }) => {
	const { locale, tzDate } = useDateContext();
	const [isOpenAppointmentDate, setIsOpenAppointmentDate] = useState(false);
	const [appointmentDate, setAppointmentDate] = useState<Date | null>(
		sourceValue ? new Date(sourceValue.toString()) : null,
	);
	const [appointmentTime, setAppointmentTime] = useState<string>(
		sourceValue
			? format(sourceValue.toString(), "HH:mm", {
					locale,
					in: tzDate,
				})
			: "",
	);
	// Memoized calendar properties for the appointment date field
	const appointmentDateCalendarProps = useMemo<CalendarProps>(() => {
		// Define the range of years to be displayed in the calendar
		const currentYear = new Date().getFullYear();
		const twoMonthsFromToday = new Date();
		twoMonthsFromToday.setMonth(twoMonthsFromToday.getMonth() + 2);

		return {
			// Close the calendar popover when a day is clicked
			onDayClick: () => setIsOpenAppointmentDate(false),
			// Set the range of years to be displayed
			fromYear: currentYear,
			toYear: currentYear,
			// Disable dates that are in the past or more than 3 months in the future
			disabled: (date) => {
				const today = new Date();
				return date <= today || date > twoMonthsFromToday;
			},
		};
	}, []);
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
	patientValues,
	fetchURL,
	formType = "create",
	onChangeTherapistLoading,
	onResetTherapistFormValue,
}: {
	serviceIdValue: string | number;
	preferredTherapistGenderValue: (typeof PREFERRED_THERAPIST_GENDER)[number];
	appointmentDateTImeValue: Date | null;
	patientValues: PatientValues;
	fetchURL: string;
	formType?: "create" | "reschedule";
	onChangeTherapistLoading: (value: boolean) => void;
	onResetTherapistFormValue: () => void;
}) => {
	// * for assigning the therapist
	const [isTherapistFound, setIsTherapistFound] = useState(false);
	const [therapistsOptions, setTherapistsOptions] = useState({
		available: [] as TherapistOption[],
		unavailable: [] as TherapistOption[],
		feasible: [] as TherapistOption[],
		notFeasible: [] as TherapistOption[],
	});
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
		[],
	);
	const onFindTherapists = useCallback(() => {
		// fetch the services options data
		const { queryParams } = populateQueryParams(
			fetchURL,
			deepTransformKeysToSnakeCase(
				formType === "create"
					? {
							locationId: patientValues.locationId,
							serviceId: serviceIdValue,
							preferredTherapistGender: preferredTherapistGenderValue,
							appointmentDateTime: appointmentDateTImeValue,
						}
					: {
							preferredTherapistGender: preferredTherapistGenderValue,
							appointmentDateTime: appointmentDateTImeValue,
						},
			),
		);
		router.get(fetchURL, queryParams, {
			preserveScroll: true,
			preserveState: true,
			replace: false,
			/**
			 * ? This is a bug that has been fixed but is very tricky, it looks simple to solve but it takes a long way to debug it in the troubleshooting process.
			 * ? it's related to onSuccess callback error
			 * ? see: https://fisiohome.atlassian.net/browse/PE-63?atlOrigin=eyJpIjoiN2RhNjVlYThmMjMwNDQ4MTk2NjIxN2NhZGRmMWIyMGYiLCJwIjoiaiJ9
			 **/
			// only:
			// 	formType === "create"
			// 		? []
			// 		: ["adminPortal", "flash", "errors", "therapists"],
			only: [],
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
				mappingTherapists(result);
			},
		});
	}, [
		fetchURL,
		formType,
		serviceIdValue,
		preferredTherapistGenderValue,
		appointmentDateTImeValue,
		patientValues.locationId,
		onResetTherapistOptions,
		mappingTherapists,
		onChangeTherapistLoading,
		onResetTherapistFormValue,
	]);

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
	const [isIsolineCalculated, setIsIsolineCalculated] = useState(false);
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
	const onCalculateIsoline = useCallback(
		async (therapists: NonNullable<TherapistOption[]>) => {
			if (!mapRef.current) return;

			// calculate the isoline and store the result to the session storage
			const { latitude, longitude, address: patientAddress } = patientValues;
			const patientCoords = { lat: latitude, lng: longitude };
			const result = await mapRef.current.isoline.onCalculate.both({
				coord: patientCoords,
				constraints: ISOLINE_CONSTRAINTS,
			});
			setIsolineStorage(result);

			// Map therapists to MarkerData
			const therapistCoords: MarkerData[] =
				therapists
					.map((therapist) => {
						// Safely handle missing activeAddress
						if (!therapist?.activeAddress) return null;

						// grab prevAppointment if present
						const prev =
							therapist.availabilityDetails?.locations?.prevAppointment;

						// determine which coords to use
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
							// no valid location—skip this therapist
							return null;
						}

						return generateMarkerDataTherapist({
							address,
							position: { lat, lng },
							therapist,
						});
					})
					.filter((coord) => coord !== null) || [];

			// Get feasibility therapists result
			const feasibleResult = mapRef.current.isLocationFeasible(therapistCoords);
			const therapistList = {
				feasible: [] as TherapistOption[],
				notFeasible: [] as TherapistOption[],
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
			setIsTherapistFound(true);

			// Add markers for the patient position and store to the storage
			const markerPatientData: MarkerData = generateMarkerDataPatient({
				address: patientAddress,
				position: patientCoords,
				patient: patientValues,
			});
			mapRef.current.marker.onAdd([markerPatientData]);
			setMarkerStorage({ patient: [markerPatientData] });

			// Add markers for feasible therapists
			const markerTherapistFeasibleData: MarkerData[] =
				therapistList.feasible
					?.map(
						(feasibleTherapist) =>
							therapistCoords?.find(
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
			patientValues,
			setIsolineStorage,
			setMarkerStorage,
			generateMarkerDataPatient,
			generateMarkerDataTherapist,
		],
	);

	// * side effect for reset the therapist selected and isoline map while service, therapist preferred gender, and appointment date changes
	useEffect(() => {
		if (
			serviceIdValue ||
			appointmentDateTImeValue ||
			preferredTherapistGenderValue
		) {
			onResetTherapistOptions();
			onResetIsoline();
		}

		return () => {};
	}, [
		serviceIdValue,
		appointmentDateTImeValue,
		preferredTherapistGenderValue,
		onResetIsoline,
		onResetTherapistOptions,
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
	};
};
