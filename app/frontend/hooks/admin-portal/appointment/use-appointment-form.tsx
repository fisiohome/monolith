import { useStepper } from "@/components/shared/stepper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import { getGenderIcon } from "@/hooks/use-gender";
import {
	type AppointmentBookingSchema,
	DEFAULT_VALUES_PACKAGE,
	DEFAULT_VALUES_THERAPIST,
} from "@/lib/appointments/form";
import { IS_DEKSTOP_MEDIA_QUERY } from "@/lib/constants";
import { goBackHandler, populateQueryParams } from "@/lib/utils";
import type { AppointmentNewGlobalPageProps } from "@/pages/AdminPortal/Appointment/New";
import { router, usePage } from "@inertiajs/react";
import { useMediaQuery } from "@uidotdev/usehooks";
import { format } from "date-fns";
import { MapPin } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import {
	useAppointmentDateTime,
	usePreferredTherapistGender,
	useTherapistAvailability,
} from "./use-appointment-utils";
import { useFormProvider } from "@/components/admin-portal/appointment/new-appointment-form";

export const SESSION_STORAGE_FORM_KEY = "appointment-form";

export const useFinalStep = () => {
	const { props: globalProps } = usePage<AppointmentNewGlobalPageProps>();
	const { hasCompletedAllSteps } = useStepper();
	const [count, setCount] = useState(3);
	const redirectURL = useMemo(
		() => globalProps.adminPortal.router.adminPortal.appointment.index,
		[globalProps.adminPortal.router.adminPortal.appointment.index],
	);
	useEffect(() => {
		if (count > 0) {
			const timer = setTimeout(() => {
				setCount((prev) => prev - 1);
			}, 1000);
			return () => clearTimeout(timer);
		}

		if (count === 0) {
			setTimeout(() => {
				router.get(
					globalProps.adminPortal.router.adminPortal.appointment.index,
				);
			}, 1000);
		}
	}, [count, globalProps.adminPortal.router.adminPortal.appointment.index]);

	return { hasCompletedAllSteps, count, redirectURL };
};

export const useStepButtons = ({
	setFormStorage,
}: {
	setFormStorage: React.Dispatch<
		React.SetStateAction<AppointmentBookingSchema | null>
	>;
}) => {
	const { isSuccessBooked } = useFormProvider();
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
		setStep,
		steps,
	} = useStepper();
	const isFirstStep = useMemo(
		() => currentStep?.label === "Contact Information",
		[currentStep?.label],
	);
	const onPrevStep = useCallback(() => {
		prevStep();
	}, [prevStep]);
	const onBack = useCallback(() => {
		// Remove the appointment form data from session storage
		window.sessionStorage.removeItem(SESSION_STORAGE_FORM_KEY);

		goBackHandler();
	}, []);
	const onSubmit = async (options: { skipTherapist?: boolean } = {}) => {
		const { skipTherapist = false } = options;

		if (currentStep.label === "Patient Profile") {
			const isValidPatientDetails = await form.trigger("patientDetails");
			const isValidContactInformation =
				await form.trigger("contactInformation");

			if (!isValidPatientDetails || !isValidContactInformation) return;

			const values = form.getValues();
			setFormStorage({ ...values });
			nextStep();
		}

		if (currentStep.label === "Appointment Settings and Scheduling") {
			const isValid = await form.trigger("appointmentScheduling");

			if (!isValid) return;

			// show the alert dialog for remembering the user to skip therapist or not
			if (!skipTherapist && !watchTherapistValue?.id) {
				setIsOpenTherapistAlert(true);
				return;
			}

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

	// * watching the therapist value
	const [isOpenTherapistAlert, setIsOpenTherapistAlert] = useState(false);
	const watchTherapistValue = useWatch({
		control: form.control,
		name: "appointmentScheduling.therapist",
	});

	// * redirect to the final step components
	useEffect(() => {
		if (isSuccessBooked) {
			setStep(steps?.length);
		}

		return () => {};
	}, [isSuccessBooked, steps, setStep]);

	return {
		isDekstop,
		isDisabledStep,
		isLoading,
		isFirstStep,
		isLastStep,
		isOptionalStep,
		isOpenTherapistAlert,
		onSubmit,
		onPrevStep,
		onBack,
		setIsOpenTherapistAlert,
	};
};

export const useReviewForm = () => {
	const { props: globalProps } = usePage<AppointmentNewGlobalPageProps>();
	const errorsServerValidation = useMemo(
		() => (globalProps?.errors?.fullMessages as unknown as string[]) || null,
		[globalProps?.errors?.fullMessages],
	);
	const form = useFormContext<AppointmentBookingSchema>();
	const { setStep } = useStepper();
	const review = useMemo(() => form.getValues(), [form.getValues]);
	const sections = useMemo(() => {
		const {
			contactInformation,
			patientDetails,
			appointmentScheduling,
			additionalSettings,
		} = review;
		const onClickGMaps = (coordinate: number[]) => {
			window.open(
				`https://www.google.com/maps/search/?api=1&query=${coordinate.join(",")}`,
			);
		};

		return [
			{
				title: "Contact" as const,
				stepValue: 0,
				subs: [
					{
						title: "Name",
						value: contactInformation.contactName,
					},
					{
						title: "Phone Number",
						value: contactInformation.contactPhone,
					},
					{
						title: "Email",
						value: contactInformation?.email || "N/A",
					},
					{
						title: "MiiTel Link",
						value: contactInformation?.miitelLink || "N/A",
					},
				],
			},
			{
				title: "Patient Profile" as const,
				stepValue: 0,
				subs: [
					{
						title: "Full Name",
						value: patientDetails.fullName,
					},
					{
						title: "Date of Birth",
						value: format(patientDetails.dateOfBirth, "PPP", {}),
					},
					{
						title: "Age",
						value: `${patientDetails.age} years`,
					},
					{
						title: "Gender",
						value: patientDetails.gender ? (
							<Badge variant="secondary">
								<span className="flex items-center justify-end gap-1">
									{getGenderIcon(patientDetails.gender.toLowerCase())}
									{patientDetails.gender}
								</span>
							</Badge>
						) : (
							"N/A"
						),
					},
					{
						title: "Current Condition",
						value: <Badge variant="outline">{patientDetails?.condition}</Badge>,
					},
					{
						title: "Illness Onset Date",
						value: patientDetails?.illnessOnsetDate || "N/A",
					},
					{
						title: "Medical History",
						value: patientDetails?.medicalHistory || "N/A",
					},
					{
						title: "Region",
						value: patientDetails.location.city,
					},
					{
						title: "Postal Code",
						value: patientDetails.postalCode,
					},
					{
						title: "Address",
						value: (
							<div className="space-y-2">
								<p>{patientDetails.address}</p>
								<Button
									type="button"
									variant="link"
									effect="hoverUnderline"
									iconPlacement="left"
									icon={MapPin}
									onClick={(event) => {
										event.preventDefault();
										onClickGMaps([
											patientDetails.latitude,
											patientDetails.longitude,
										]);
									}}
								>
									View on map
								</Button>
							</div>
						),
					},
					{
						title: "Address Note",
						value: patientDetails?.addressNotes || "N/A",
					},
				],
			},
			{
				title: "Schedule and Settings" as const,
				stepValue: 1,
				subs: [
					{
						title: "Service",
						value: appointmentScheduling.service.name.replaceAll("_", " "),
					},
					{
						title: "Package",
						value: (
							<p>
								<span className="uppercase">
									{appointmentScheduling.package.name}
								</span>
								<span className="mx-1">&bull;</span>
								<span className="italic font-light">
									{appointmentScheduling.package.numberOfVisit} visit(s)
								</span>
							</p>
						),
					},
					{
						title: "Preferred Therapist Gender",
						value: (
							<Badge variant="secondary">
								<span className="flex items-center justify-end gap-1">
									{getGenderIcon(
										appointmentScheduling.preferredTherapistGender.toLowerCase(),
									)}
									{appointmentScheduling.preferredTherapistGender}
								</span>
							</Badge>
						),
					},
					{
						title: "Appointment Date & Time",
						value: format(
							appointmentScheduling.appointmentDateTime,
							"PPP, hh:mm a",
						),
					},
					{
						title: "Assigned Therapist",
						value:
							appointmentScheduling.therapist?.name?.toUpperCase() || "N/A",
					},
				],
			},
			{
				title: "Additionals" as const,
				stepValue: 2,
				subs: [
					{
						title: "Referral Source",
						value: additionalSettings?.referralSource
							? `${additionalSettings?.referralSource} - ${additionalSettings?.customReferralSource}`
							: "N/A",
					},
					{
						title: "Fisiohome Partner Booking",
						value: additionalSettings?.fisiohomePartnerName
							? `${additionalSettings?.fisiohomePartnerName} - ${additionalSettings?.customFisiohomePartnerName}`
							: "N/A",
					},
					{
						title: "Voucher Code",
						value: additionalSettings?.voucherCode || "N/A",
					},
					{
						title: "Notes",
						value: additionalSettings?.notes || "N/A",
					},
				],
			},
		];
	}, [review]);
	const onEdit = useCallback(
		(value: (typeof sections)[number]["stepValue"]) => {
			setStep(value);
		},
		[setStep],
	);

	return { sections, onEdit, errorsServerValidation };
};

export const useAdditionalSettingsForm = () => {
	const { props: globalProps } = usePage<AppointmentNewGlobalPageProps>();
	const form = useFormContext<AppointmentBookingSchema>();
	const watchAdditionalSettingsValue = useWatch({
		control: form.control,
		name: "additionalSettings",
	});
	const additionalFormOptions = useMemo(() => {
		const referralSources = globalProps.optionsData?.referralSources || [];
		const fisiohomePartnerNames =
			globalProps.optionsData?.fisiohomePartnerNames || [];

		return { referralSources, fisiohomePartnerNames };
	}, [
		globalProps.optionsData?.referralSources,
		globalProps.optionsData?.fisiohomePartnerNames,
	]);

	return {
		form,
		additionalFormOptions,
		watchAdditionalSettingsValue,
	};
};

export const usePatientDetailsForm = () => {
	const form = useFormContext<AppointmentBookingSchema>();
	const watchPatientRecordSourceValue = useWatch({
		control: form.control,
		name: "formOptions.patientRecordSource",
	});
	const isExistingPatientSource = useMemo(
		() => watchPatientRecordSourceValue === "existing",
		[watchPatientRecordSourceValue],
	);

	return {
		isExistingPatientSource,
	};
};

export const useAppointmentSchedulingForm = () => {
	const { props: globalProps, url: pageURL } =
		usePage<AppointmentNewGlobalPageProps>();
	const form = useFormContext<AppointmentBookingSchema>();
	const watchPatientDetailsValue = useWatch({
		control: form.control,
		name: "patientDetails",
	});
	const watchAppointmentSchedulingValue = useWatch({
		control: form.control,
		name: "appointmentScheduling",
	});
	const watchServiceValue = useWatch({
		control: form.control,
		name: "appointmentScheduling.service.id",
	});
	const watchAppointmentDateTimeValue = useWatch({
		control: form.control,
		name: "appointmentScheduling.appointmentDateTime",
	});
	const watchPreferredTherapistGenderValue = useWatch({
		control: form.control,
		name: "appointmentScheduling.preferredTherapistGender",
	});
	const [isLoading, setIsLoading] = useState({
		services: false,
		therapists: false,
	});

	// * for therapist availability and the isoline map
	const onChangeTherapistLoading = useCallback((value: boolean) => {
		setIsLoading((prev) => ({ ...prev, therapists: value }));
	}, []);
	const onSelectTherapist = useCallback(
		(
			value: NonNullable<
				AppointmentBookingSchema["appointmentScheduling"]["therapist"]
			>,
		) => {
			form.setValue("appointmentScheduling.therapist", value, {
				shouldValidate: true,
			});
		},
		[form.setValue],
	);
	const onResetTherapistFormValue = useCallback(() => {
		form.resetField("appointmentScheduling.therapist", {
			defaultValue: DEFAULT_VALUES_THERAPIST,
		});
	}, [form.resetField]);
	const {
		onResetIsoline,
		onResetTherapistOptions,
		...therapistAndIsolineValues
	} = useTherapistAvailability({
		serviceIdValue: watchServiceValue,
		appointmentDateTImeValue: watchAppointmentDateTimeValue,
		preferredTherapistGenderValue: watchPreferredTherapistGenderValue,
		patientValues: {
			fullName: watchPatientDetailsValue.fullName,
			address: watchPatientDetailsValue.address,
			latitude: watchPatientDetailsValue.latitude,
			longitude: watchPatientDetailsValue.longitude,
			locationId: watchPatientDetailsValue.location.id,
		},
		fetchURL: pageURL,
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
		onSelectTherapist,
		onResetAllTherapistState,
	};

	// * for preferred therapist gender field
	const prefGenderHooks = usePreferredTherapistGender({
		sourceOptions: globalProps.optionsData?.preferredTherapistGender,
	});

	// * for service field
	const servicesOption = useMemo(
		() =>
			globalProps?.services?.filter(
				(service) => service.name !== "PERAWAT_HOMECARE",
			),
		[globalProps?.services],
	);
	const onFocusServiceField = useCallback(() => {
		// fetch the services options data
		const { queryParams } = populateQueryParams(
			pageURL,
			deepTransformKeysToSnakeCase({
				locationId: watchPatientDetailsValue?.location?.id,
			}),
		);
		router.get(pageURL, queryParams, {
			only: ["adminPortal", "flash", "errors", "services"],
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
	}, [pageURL, watchPatientDetailsValue?.location?.id]);
	const onSelectService = useCallback(
		(service: AppointmentBookingSchema["appointmentScheduling"]["service"]) => {
			// reset some values
			form.resetField("appointmentScheduling.package", {
				defaultValue: DEFAULT_VALUES_PACKAGE,
			});
			onResetAllTherapistState();

			// set the service selected value
			form.setValue("appointmentScheduling.service", service, {
				shouldValidate: true,
			});
		},
		[form.setValue, form.resetField, onResetAllTherapistState],
	);
	const serviceHooks = { servicesOption, onFocusServiceField, onSelectService };

	// * for package field
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
	const onSelectPackage = useCallback(
		(
			packageValue: AppointmentBookingSchema["appointmentScheduling"]["package"],
		) => {
			form.setValue("appointmentScheduling.package", packageValue, {
				shouldValidate: true,
			});
			onResetTherapistFormValue();
		},
		[form.setValue, onResetTherapistFormValue],
	);
	const packageHooks = { packagesOption, onSelectPackage };

	// * for appointment date field
	const appointmentDateTimeValues = useAppointmentDateTime({
		sourceValue: watchAppointmentDateTimeValue,
	});
	const onSelectAppointmentDate = useCallback(
		(date?: Date) => {
			const { appointmentTime, setAppointmentDate, setAppointmentTime } =
				appointmentDateTimeValues;
			if (appointmentTime) {
				// Set the selected time to the selected date
				const [hours, minutes] = appointmentTime.split(":");
				date?.setHours(Number.parseInt(hours), Number.parseInt(minutes));
			}

			// update state reference and form field value data
			setAppointmentDate(date || null);

			// update state for appointment time
			const time = date ? format(date.toString(), "HH:mm") : "";
			setAppointmentTime(time);

			// reset all therapist and isoline maps state
			onResetAllTherapistState();
		},
		[appointmentDateTimeValues, onResetAllTherapistState],
	);
	const onSelectAppointmentTime = useCallback(
		(time: string) => {
			const { appointmentDate, setAppointmentDate, setAppointmentTime } =
				appointmentDateTimeValues;
			setAppointmentTime(time);
			if (appointmentDate) {
				const [hours, minutes] = time.split(":");
				const newDate = new Date(appointmentDate.getTime());
				newDate.setHours(Number.parseInt(hours), Number.parseInt(minutes));
				setAppointmentDate(newDate);

				// reset all therapist and isoline maps state
				onResetAllTherapistState();

				return newDate;
			}

			return null;
		},
		[appointmentDateTimeValues, onResetAllTherapistState],
	);
	const appointmentDateTimeHooks = {
		...appointmentDateTimeValues,
		onSelectAppointmentDate,
		onSelectAppointmentTime,
	};

	return {
		...prefGenderHooks,
		...therapistAvailabilityHooks,
		...serviceHooks,
		...packageHooks,
		...appointmentDateTimeHooks,
		form,
		isLoading,
		watchAppointmentSchedulingValue,
	};
};
