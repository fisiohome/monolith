import { zodResolver } from "@hookform/resolvers/zod";
import { router, usePage } from "@inertiajs/react";
import { useMediaQuery, useSessionStorage } from "@uidotdev/usehooks";
import { format, startOfDay } from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm, useFormContext, useWatch } from "react-hook-form";
import { DEFAULT_VALUES_THERAPIST } from "@/lib/appointments/form";
import {
	type AppointmentRescheduleSchema,
	buildPayload,
	defineFormDefaultValues,
	RESCHEDULE_APPOINTMENT_FORM_SCHEMA,
} from "@/lib/appointments/form-reschedule";
import { IS_DEKSTOP_MEDIA_QUERY } from "@/lib/constants";
import { SESSION_ISOLINE_KEY, SESSION_MARKERS_KEY } from "@/lib/here-maps";
import { goBackHandler, populateQueryParams } from "@/lib/utils";
import type { AppointmentRescheduleGlobalPageProps } from "@/pages/AdminPortal/Appointment/Reschedule";
import { SESSION_STORAGE_FORM_SELECTIONS_KEY } from "./use-appointment-form";
import {
	type TherapistOption,
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
	const removeStorage = useCallback(() => {
		window.sessionStorage.removeItem(SESSION_ISOLINE_KEY);
		window.sessionStorage.removeItem(SESSION_MARKERS_KEY);
	}, []);
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
				// Confirm navigation away from the current page
				setIsNavigateConfirm(true);
				// Remove the appointment form data from session storage
				removeStorage();
			} else {
				event?.preventDefault();
			}
		});
	}, [
		globalProps.adminPortal.router.adminPortal.appointment.index,
		pageURL,
		isNavigateConfirm,
		removeStorage,
	]);
	/**
	 * * watching the success of route navigation
	 * * then we delete the form data stored in the session storage
	 * * this side effect is useful because after we book an appointment then the form will be calculated to redirect the user
	 * * also useful if the user clicks the redirect button now
	 */
	useEffect(() => {
		return router.on("navigate", (event) => {
			// Determine if the path is the current root (user on reload)
			const isCurrentRoot = event.detail.page.url.includes("reschedule_page");
			const isReschedulePath = event.detail.page.url.includes("reschedule");

			// If the path is current root (user on reload), or is the book path (book path mean to POST to save the appointment) do nothing
			if (isCurrentRoot || isReschedulePath) return;

			// Remove the appointment form data from session storage
			removeStorage();

			console.log(`Navigated to ${event.detail.page.url}`);
		});
	}, [removeStorage]);

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
	const watchAllOfDayValue = useWatch({
		control: form.control,
		name: "formOptions.findTherapistsAllOfDay",
	});
	const [isLoading, setIsLoading] = useState({ therapists: false });
	const errorsServerValidation = useMemo(
		() => (globalProps?.errors?.fullMessages as unknown as string[]) || null,
		[globalProps?.errors?.fullMessages],
	);

	// * for therapist availability and isoline maps
	const [formSelections, setFormSelections] = useSessionStorage<{
		therapist: null | TherapistOption;
	}>(SESSION_STORAGE_FORM_SELECTIONS_KEY, {
		therapist: null,
	});
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
		isAllOfDayValue: !!watchAllOfDayValue,
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
		formSelections,
		setFormSelections,
	};

	// * for preferred therapist gender field
	const prefGenderHooks = usePreferredTherapistGender({
		sourceOptions: globalProps.optionsData?.preferredTherapistGender,
	});

	// * for appointment date time min max values and disabled visits
	const apptDateTime = useMemo(() => {
		const {
			min: minIso,
			max: maxIso,
			message = null,
			disabledVisits = [],
		} = globalProps.optionsData?.apptDateTime ?? {};

		return {
			min: minIso ? new Date(minIso) : null,
			max: maxIso ? new Date(maxIso) : null,
			message,
			disabledVisits,
		};
	}, [globalProps.optionsData?.apptDateTime]);
	const selectedTimeSlot = useMemo(() => {
		if (!watchAppointmentDateTimeValue) return null;
		return format(watchAppointmentDateTimeValue, "HH:mm");
	}, [watchAppointmentDateTimeValue]);
	const onSelectAllOfDay = useCallback(
		(value: boolean) => {
			const selectedDate = form.getValues("appointmentDateTime");
			form.setValue("formOptions.findTherapistsAllOfDay", value);
			if (selectedDate) {
				form.setValue("appointmentDateTime", startOfDay(selectedDate), {
					shouldValidate: false,
				});
			}
		},
		[form.setValue, form.getValues],
	);
	const onSelectTimeSlot = useCallback(
		(value: string) => {
			const date = form.getValues("appointmentDateTime");
			if (date) {
				const [hours, minutes] = value.split(":");
				const newDate = new Date(date);
				newDate.setHours(Number.parseInt(hours), Number.parseInt(minutes));
				form.setValue("appointmentDateTime", newDate);
			}
		},
		[form.getValues, form.setValue],
	);
	const apptHooksValue = {
		apptDateTime,
		watchAppointmentDateTimeValue,
		watchAllOfDayValue,
		selectedTimeSlot,
		onSelectAllOfDay,
		onSelectTimeSlot,
	};

	return {
		...prefGenderHooks,
		...therapistAvailabilityHooks,
		...apptHooksValue,
		form,
		isLoading,
		appointment,
		errorsServerValidation,
		brandPackagesSource,
	};
};
