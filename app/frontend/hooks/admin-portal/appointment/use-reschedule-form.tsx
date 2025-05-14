import { DEFAULT_VALUES_THERAPIST } from "@/lib/appointments/form";
import {
	type AppointmentRescheduleSchema,
	RESCHEDULE_APPOINTMENT_FORM_SCHEMA,
	buildPayload,
	defineFormDefaultValues,
} from "@/lib/appointments/form-reschedule";
import { IS_DEKSTOP_MEDIA_QUERY } from "@/lib/constants";
import { goBackHandler, populateQueryParams } from "@/lib/utils";
import type { AppointmentRescheduleGlobalPageProps } from "@/pages/AdminPortal/Appointment/Reschedule";
import { zodResolver } from "@hookform/resolvers/zod";
import { router, usePage } from "@inertiajs/react";
import { useMediaQuery } from "@uidotdev/usehooks";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm, useFormContext, useWatch } from "react-hook-form";
import {
	usePreferredTherapistGender,
	useTherapistAvailability,
} from "./use-appointment-utils";

export const useRescheduleForm = () => {
	const { url: pageURL, props: globalProps } =
		usePage<AppointmentRescheduleGlobalPageProps>();

	// * define the state management for form
	const [isLoading, setIsLoading] = useState(false);
	const formDefaultvalues = useMemo(
		() => defineFormDefaultValues(globalProps.appointment),
		[globalProps.appointment],
	);
	const form = useForm<AppointmentRescheduleSchema>({
		resolver: zodResolver(RESCHEDULE_APPOINTMENT_FORM_SCHEMA),
		defaultValues: { ...formDefaultvalues },
		mode: "onChange",
	});
	const onSubmit = useCallback(
		(values: AppointmentRescheduleSchema) => {
			console.group();
			console.log("Starting process to reschedule the appointment...");

			const baseURL =
				globalProps.adminPortal.router.adminPortal.appointment.index;
			const id = globalProps.appointment.id;
			const submitURL = `${baseURL}/${id}/reschedule`;
			const submitConfig = {
				preserveScroll: true,
				preserveState: true,
				replace: false,
				only: ["adminPortal", "flash", "errors", "appointment"],
				onStart: () => setIsLoading(true),
				onFinish: () => {
					setTimeout(() => setIsLoading(false), 250);
				},
			} satisfies Parameters<typeof router.put>["2"];
			const payload = buildPayload(values);

			router.put(submitURL, { appointment: payload }, submitConfig);

			console.log("Appointment successfully rescheduled...");
			console.groupEnd();
		},
		[globalProps],
	);

	// * side-effect for server validation
	useEffect(() => {
		if (!globalProps?.errors) return;

		for (const [key, value] of Object.entries(globalProps?.errors)) {
			form.setError(key === "therapistId" ? "therapist.name" : (key as any), {
				type: "custom",
				message: (value as string[]).join(", "),
			});
		}
	}, [globalProps.errors, form.setError]);

	/**
	 * * watching the changed of the route
	 * * then show the dialog for the confirmation to user if user want to navigate away from the page
	 * * if navigated then we remove the stored form data in session storage
	 *
	 * ? isNavigateConfirm is required to prevent the confirmation modal from appearing twice.
	 */
	const [isNavigateConfirm, setIsNavigateConfirm] = useState(false);
	useEffect(() => {
		// Add a listener for route changes
		return router.on("before", (event) => {
			if (isNavigateConfirm) return;

			const url = event.detail.visit.url;
			const path = url.pathname;
			const { queryParams } = populateQueryParams(url.href);
			const isRescheduled = queryParams?.rescheduled;

			// Determine if the path is the root, a parent root, or the current root
			const isRoot = path === "/";
			const isParentRoot =
				globalProps.adminPortal.router.adminPortal.appointment.index.includes(
					path,
				);
			const isCurrentRoot = pageURL.includes(path);
			const isReschedulePath = path.includes("reschedule");

			// If the path is not root, or parent root, or current root, or is the reschedule path (reschedule path mean to POST to save the appointment) do nothing
			if (
				!isRoot &&
				(!isParentRoot || isRescheduled) &&
				(isCurrentRoot || isReschedulePath)
			)
				return;

			// Log the URL being visited
			console.log(`Starting a visit to ${url}`);

			// Confirm navigation away from the current page
			if (confirm("Are you sure you want to navigate away?")) {
				setIsNavigateConfirm(true);
			} else {
				event?.preventDefault();
			}
		});
	}, [
		globalProps.adminPortal.router.adminPortal.appointment.index,
		pageURL,
		isNavigateConfirm,
	]);

	return { form, isLoading, onSubmit };
};

export const useFormActionButtons = () => {
	const isDekstop = useMediaQuery(IS_DEKSTOP_MEDIA_QUERY);
	const onBackRoute = useCallback(() => {
		goBackHandler();
	}, []);

	return { isDekstop, onBackRoute };
};

export const useRescheduleFields = () => {
	const { props: globalProps, url: pageURL } =
		usePage<AppointmentRescheduleGlobalPageProps>();
	const form = useFormContext<AppointmentRescheduleSchema>();
	const appointment = useMemo(
		() => globalProps.appointment,
		[globalProps.appointment],
	);
	const serviceId = useMemo(
		() => appointment.service?.id || "",
		[appointment.service?.id],
	);
	const brandPackagesSource = useMemo(() => {
		return {
			brandName: appointment.service?.name.replaceAll("_", " "),
			packageName: appointment.package?.name,
			packageVisit: `${appointment.package?.numberOfVisit || "N/A"} visit(s)`,
		};
	}, [appointment]);
	const patientDetails = useMemo(() => {
		const patient = appointment?.patient;
		const visitAddress = appointment?.visitAddress;

		return {
			fullName: patient?.name || "",
			address: visitAddress?.addressLine || "",
			latitude: visitAddress?.latitude || 0,
			longitude: visitAddress?.longitude || 0,
			locationId: visitAddress?.locationId || "",
		};
	}, [appointment?.patient, appointment?.visitAddress]);
	const watchPreferredTherapistGenderValue = useWatch({
		control: form.control,
		name: "preferredTherapistGender",
	});
	const watchAppointmentDateTimeValue = useWatch({
		control: form.control,
		name: "appointmentDateTime",
	});
	const [isLoading, setIsLoading] = useState({ therapists: false });
	const errorsServerValidation = useMemo(
		() => (globalProps?.errors?.fullMessages as unknown as string[]) || null,
		[globalProps?.errors?.fullMessages],
	);

	// * for therapist availability and isoline maps
	const coordinate = useMemo(
		() => [patientDetails.latitude, patientDetails.longitude],
		[patientDetails.latitude, patientDetails.longitude],
	);
	const mapAddress = useMemo(() => {
		const location = appointment?.location;
		const visitAddress = appointment?.visitAddress;

		return {
			country: location?.country || "",
			state: location?.state || "",
			city: location?.city || "",
			postalCode: visitAddress?.postalCode || "",
			address: visitAddress?.addressLine || "",
		};
	}, [appointment?.visitAddress, appointment?.location]);
	const onChangeTherapistLoading = useCallback((value: boolean) => {
		setIsLoading((prev) => ({ ...prev, therapists: value }));
	}, []);
	const onResetTherapistFormValue = useCallback(() => {
		form.resetField("therapist", {
			defaultValue: DEFAULT_VALUES_THERAPIST,
		});
	}, [form.resetField]);
	const onSelectTherapist = useCallback(
		(value: NonNullable<AppointmentRescheduleSchema["therapist"]>) => {
			form.setValue("therapist", value, {
				shouldValidate: true,
			});
		},
		[form.setValue],
	);
	const {
		onResetIsoline,
		onResetTherapistOptions,
		...therapistAndIsolineValues
	} = useTherapistAvailability({
		serviceIdValue: serviceId,
		appointmentDateTImeValue: watchAppointmentDateTimeValue,
		preferredTherapistGenderValue: watchPreferredTherapistGenderValue,
		patientValues: {
			fullName: patientDetails.fullName,
			address: patientDetails.address,
			latitude: patientDetails.latitude,
			longitude: patientDetails.longitude,
			locationId: patientDetails.locationId,
		},
		fetchURL: pageURL,
		formType: "reschedule",
		onChangeTherapistLoading,
		onResetTherapistFormValue,
	});
	// reset the therapist availability field value, options values from server fetch data and isoline map
	const onResetAllTherapistState = useCallback(() => {
		onResetTherapistFormValue();
		onResetTherapistOptions();
		onResetIsoline();
	}, [onResetTherapistFormValue, onResetTherapistOptions, onResetIsoline]);
	const therapistAvailabilityHooks = {
		...therapistAndIsolineValues,
		coordinate,
		mapAddress,
		onSelectTherapist,
		onResetAllTherapistState,
	};

	// * for preferred therapist gender field
	const prefGenderHooks = usePreferredTherapistGender({
		sourceOptions: globalProps.optionsData?.preferredTherapistGender,
	});

	return {
		...prefGenderHooks,
		...therapistAvailabilityHooks,
		form,
		isLoading,
		appointment,
		watchAppointmentDateTimeValue,
		errorsServerValidation,
		brandPackagesSource,
	};
};
