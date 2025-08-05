import { useFormProvider } from "@/components/admin-portal/appointment/new-appointment-form";
import { useDateContext } from "@/components/providers/date-provider";
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
import { cn, goBackHandler, populateQueryParams } from "@/lib/utils";
import type { AppointmentNewGlobalPageProps } from "@/pages/AdminPortal/Appointment/New";
import { router, usePage } from "@inertiajs/react";
import { useMediaQuery } from "@uidotdev/usehooks";
import { format, startOfDay } from "date-fns";
import { MapPin } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
	usePreferredTherapistGender,
	useTherapistAvailability,
} from "./use-appointment-utils";

export const SESSION_STORAGE_FORM_KEY = "appointment-form";
export const SESSION_STORAGE_FORM_SELECTIONS_KEY =
	"appointment-form-selections";

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
	const { t: taf } = useTranslation("appointments-form");
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
		() => currentStep?.label === taf("stepper.patient_profile.label"),
		[currentStep?.label, taf],
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

		if (currentStep.label === taf("stepper.patient_profile.label")) {
			const isValidPatientDetails = await form.trigger("patientDetails");
			const isValidContactInformation =
				await form.trigger("contactInformation");

			if (!isValidPatientDetails || !isValidContactInformation) return;

			const values = form.getValues();
			setFormStorage({ ...values });
			nextStep();
		}

		if (currentStep.label === taf("stepper.appt_settings.label")) {
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

		if (currentStep.label === taf("stepper.additional_settings.label")) {
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
	const { locale, tzDate, timeFormatDateFns } = useDateContext();
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
				key: "contact",
				title: "Contact" as const,
				stepValue: 0,
				subs: [
					{
						key: "contact-name",
						title: "Name",
						value: contactInformation.contactName,
					},
					{
						key: "contact-phone",
						title: "Phone Number",
						value: contactInformation.contactPhone,
					},
					{
						key: "contact-email",
						title: "Email",
						value: contactInformation?.email || "N/A",
					},
					{
						key: "contact-miitel-link",
						title: "MiiTel Link",
						value: contactInformation?.miitelLink || "N/A",
					},
				],
			},
			{
				key: "patient-profile",
				title: "Patient Profile" as const,
				stepValue: 0,
				subs: [
					{
						key: "patient-full-name",
						title: "Full Name",
						value: patientDetails.fullName,
					},
					{
						key: "patient-date-of-birth",
						title: "Date of Birth",
						value: format(patientDetails.dateOfBirth, "PPP", {}),
					},
					{
						key: "patient-age",
						title: "Age",
						value: `${patientDetails.age} years`,
					},
					{
						key: "patient-gender",
						title: "Gender",
						value: patientDetails.gender ? (
							<Badge variant="outline">
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
						key: "patient-current-condition",
						title: "Current Condition",
						value: <Badge variant="outline">{patientDetails?.condition}</Badge>,
					},
					{
						key: "patient-illness-onset-date",
						title: "Illness Onset Date",
						value: patientDetails?.illnessOnsetDate || "N/A",
					},
					{
						key: "patient-medical-history",
						title: "Medical History",
						value: patientDetails?.medicalHistory || "N/A",
					},
					{
						key: "patient-region",
						title: "Region",
						value: patientDetails.location.city,
					},
					{
						key: "patient-postal-code",
						title: "Postal Code",
						value: patientDetails?.postalCode || "N/A",
					},
					{
						key: "patient-address",
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
						key: "patient-address-note",
						title: "Address Note",
						value: patientDetails?.addressNotes || "N/A",
					},
				],
			},
			{
				key: "bookings",
				title: "Bookings" as const,
				stepValue: 1,
				subs: [
					{
						key: "service",
						title: "Service",
						value: appointmentScheduling.service.name.replaceAll("_", " "),
					},
					{
						key: "package",
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
						key: "visit-1",
						title: <p className="font-bold">Visit 1</p>,
						value: (
							<Badge
								key="status-1"
								variant="outline"
								className={cn(
									"uppercase",
									!appointmentScheduling.appointmentDateTime
										? "border-gray-300 text-gray-700"
										: appointmentScheduling.therapist?.id
											? "border-green-300 text-green-700"
											: "border-yellow-300 text-yellow-700",
								)}
							>
								{!appointmentScheduling.appointmentDateTime
									? "Unscheduled"
									: appointmentScheduling.therapist?.id
										? "Scheduled"
										: "Pending Therapist"}
							</Badge>
						),
					},
					{
						key: "preferred-therapist-gender-1",
						title: "Preferred Therapist Gender",
						value: (
							<Badge variant="outline">
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
						key: "appointment-date-time-1",
						title: "Appointment Date & Time",
						value: format(
							appointmentScheduling.appointmentDateTime,
							`PPP, ${timeFormatDateFns}`,
							{ locale, in: tzDate },
						),
					},
					{
						key: "assigned-therapist-1",
						title: "Assigned Therapist",
						value:
							appointmentScheduling.therapist?.name?.toUpperCase() || "N/A",
					},
					// All visits display
					...(review.appointmentScheduling.seriesVisits?.flatMap((visit) => {
						const visitStatus = !visit.appointmentDateTime
							? "Unscheduled"
							: visit.therapist?.id
								? "Scheduled"
								: "Pending Therapist";

						const statusBadge = (
							<Badge
								key={`status-${visit.visitNumber}`}
								variant="outline"
								className={cn(
									"uppercase",
									visitStatus === "Scheduled"
										? "border-green-300 text-green-700"
										: visitStatus === "Pending Therapist"
											? "border-yellow-300 text-yellow-700"
											: "border-gray-300 text-gray-700",
								)}
							>
								{visitStatus}
							</Badge>
						);

						return [
							{
								key: `visit-${visit.visitNumber}-header`,
								title: <p className="font-bold">Visit {visit.visitNumber}</p>,
								value: statusBadge,
							},
							{
								key: `visit-${visit.visitNumber}-gender`,
								title: "Preferred Therapist Gender",
								value: (
									<Badge variant="outline">
										<span className="flex items-center justify-end gap-1">
											{getGenderIcon(
												visit.preferredTherapistGender.toLowerCase(),
											)}
											{visit.preferredTherapistGender}
										</span>
									</Badge>
								),
							},
							{
								key: `visit-${visit.visitNumber}-datetime`,
								title: "Appointment Date & Time",
								value: visit.appointmentDateTime
									? format(
											visit.appointmentDateTime,
											`PPP, ${timeFormatDateFns}`,
											{ locale, in: tzDate },
										)
									: "Not scheduled yet",
							},
							{
								key: `visit-${visit.visitNumber}-therapist`,
								title: "Assigned Therapist",
								value: visit.therapist?.name?.toUpperCase() || "N/A",
							},
						];
					}) || []),
				],
			},
			{
				key: "additionals",
				title: "Additionals" as const,
				stepValue: 2,
				subs: [
					{
						key: "referral-source",
						title: "Referral Source",
						value: additionalSettings?.referralSource
							? `${additionalSettings?.referralSource} - ${additionalSettings?.customReferralSource}`
							: "N/A",
					},
					{
						key: "fisiohome-partner-booking",
						title: "Fisiohome Partner Booking",
						value: additionalSettings?.fisiohomePartnerName
							? `${additionalSettings?.fisiohomePartnerName} - ${additionalSettings?.customFisiohomePartnerName}`
							: "N/A",
					},
					{
						title: "Fisiohome Partner Booking",
						value: additionalSettings?.fisiohomePartnerName
							? `${additionalSettings?.fisiohomePartnerName} - ${additionalSettings?.customFisiohomePartnerName}`
							: "N/A",
					},
					{
						key: "voucher-code",
						title: "Voucher Code",
						value: additionalSettings?.voucherCode || "N/A",
					},
					{
						key: "notes",
						title: "Notes",
						value: additionalSettings?.notes || "N/A",
					},
				],
			},
		];
	}, [review, locale, tzDate, timeFormatDateFns]);
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
	const { tzDate } = useDateContext();
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
	const watchAllOfDayValue = useWatch({
		control: form.control,
		name: "formOptions.findTherapistsAllOfDay",
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
		isAllOfDayValue: !!watchAllOfDayValue,
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
		() => globalProps?.services,
		[globalProps?.services],
	);
	const [alertService, setAlertService] = useState<{
		title: string;
		description: string;
	} | null>(null);
	const onCheckServiceError = useCallback(() => {
		setAlertService(null);

		if (
			!watchAppointmentSchedulingValue?.service?.id ||
			!watchAppointmentSchedulingValue?.package?.id
		) {
			// * trigger the validation of the service and package (needs to select first)
			form.trigger("appointmentScheduling.service.name");
			form.trigger("appointmentScheduling.package.name");
			setAlertService({
				title: "Service & Package Required",
				description:
					"Please select a service and package before searching for a therapist and being able to schedule an appointment.",
			});
			return true;
		}

		return false;
	}, [
		watchAppointmentSchedulingValue?.service,
		watchAppointmentSchedulingValue?.package,
		form.trigger,
	]);
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
	const serviceHooks = {
		servicesOption,
		alertService,
		onFocusServiceField,
		onSelectService,
		onCheckServiceError,
	};

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

	// * appointment date time
	const watchSelectedTimeSlotValue = useMemo(() => {
		return format(watchAppointmentDateTimeValue, "HH:mm");
	}, [watchAppointmentDateTimeValue]);
	const onSelectAllOfDay = useCallback(
		(value: boolean) => {
			const selectedDate = form.getValues(
				"appointmentScheduling.appointmentDateTime",
			);
			form.setValue("formOptions.findTherapistsAllOfDay", value);

			if (value) {
				form.setValue(
					"appointmentScheduling.appointmentDateTime",
					startOfDay(selectedDate, { in: tzDate }),
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
				const selectedDateObj = new Date(selectedDate);
				const nextHalfHour = new Date(
					selectedDateObj.getFullYear(),
					selectedDateObj.getMonth(),
					selectedDateObj.getDate(),
					hours,
					roundedMinutes,
					0, // seconds
					0, // milliseconds
				);

				form.setValue(
					"appointmentScheduling.appointmentDateTime",
					nextHalfHour,
					{ shouldValidate: false },
				);
			}
		},
		[form.setValue, form.getValues, tzDate],
	);
	const onSelectTimeSlot = useCallback(
		(value: string) => {
			const date = form.getValues("appointmentScheduling.appointmentDateTime");
			if (date) {
				const [hours, minutes] = value.split(":");
				const newDate = new Date(date);
				newDate.setHours(Number.parseInt(hours), Number.parseInt(minutes));
				form.setValue("appointmentScheduling.appointmentDateTime", newDate);
			}
		},
		[form.getValues, form.setValue],
	);
	const dateTimeHooks = {
		watchSelectedTimeSlotValue,
		onSelectAllOfDay,
		onSelectTimeSlot,
	};

	return {
		...prefGenderHooks,
		...therapistAvailabilityHooks,
		...serviceHooks,
		...packageHooks,
		...dateTimeHooks,
		form,
		isLoading,
		watchAppointmentSchedulingValue,
		watchAllOfDayValue,
	};
};
