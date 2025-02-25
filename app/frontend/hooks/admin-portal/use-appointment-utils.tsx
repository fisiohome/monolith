import type { AppointmentBookingSchema } from "@/lib/appointments";
import { groupLocationsByCountry } from "@/lib/locations";
import type { AppointmentNewGlobalPageProps } from "@/pages/AdminPortal/Appointment/New";
import type { Location } from "@/types/admin-portal/location";
import { usePage } from "@inertiajs/react";
import { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";

export const usePatientRegion = () => {
	const { props: globalProps } = usePage<AppointmentNewGlobalPageProps>();
	const form = useFormContext<AppointmentBookingSchema>();
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

	return {
		form,
		globalProps,
		watchPatientDetailsValue,
		locationsOption,
		groupedLocationsOption,
		selectedLocation,
		coordinate,
		mapAddress,
		coordinateError,
	};
};
