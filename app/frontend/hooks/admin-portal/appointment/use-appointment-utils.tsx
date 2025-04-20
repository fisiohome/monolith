import type { HereMaphandler } from "@/components/shared/here-map";
import type { CalendarProps } from "@/components/ui/calendar";
import type { MarkerData } from "@/hooks/here-maps";
import {
	type AppointmentBookingSchema,
	DEFAULT_VALUES_PACKAGE,
	DEFAULT_VALUES_SERVICE,
	DEFAULT_VALUES_THERAPIST,
	checkIsCustomFisiohomePartner,
	checkIsCustomReferral,
} from "@/lib/appointments";
import { groupLocationsByCountry } from "@/lib/locations";
import { calculateAge } from "@/lib/utils";
import { boolSchema } from "@/lib/validation";
import type {
	AppointmentNewGlobalPageProps,
	LocationOption,
} from "@/pages/AdminPortal/Appointment/New";
import type { Location } from "@/types/admin-portal/location";
import { router, usePage } from "@inertiajs/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";

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
		const { address, postalCode } = watchPatientDetailsValue;

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
