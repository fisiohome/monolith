import type { HereMaphandler } from "@/components/shared/here-map";
import { useStepper } from "@/components/shared/stepper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CalendarProps } from "@/components/ui/calendar";
import type { MarkerData } from "@/hooks/here-maps";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import { getGenderIcon } from "@/hooks/use-gender";
import {
	type AppointmentBookingSchema,
	DEFAULT_VALUES_PACKAGE,
	DEFAULT_VALUES_THERAPIST,
} from "@/lib/appointments";
import { IS_DEKSTOP_MEDIA_QUERY } from "@/lib/constants";
import { populateQueryParams } from "@/lib/utils";
import type {
	AppointmentNewGlobalPageProps,
	AppointmentNewProps,
} from "@/pages/AdminPortal/Appointment/New";
import { router, usePage } from "@inertiajs/react";
import { useMediaQuery } from "@uidotdev/usehooks";
import { format } from "date-fns";
import { MapPin } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";

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
	isCreated,
	setFormStorage,
}: {
	isCreated: boolean;
	setFormStorage: React.Dispatch<
		React.SetStateAction<AppointmentBookingSchema | null>
	>;
}) => {
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
	const onSubmit = async (options: { skipTherapist?: boolean } = {}) => {
		const { skipTherapist = false } = options;

		if (currentStep.label === "Contact Information") {
			const isValid = await form.trigger("contactInformation");

			if (!isValid) return;

			const values = form.getValues();
			setFormStorage({ ...values });
			nextStep();
		}

		if (currentStep.label === "Patient Profile") {
			const isValid = await form.trigger("patientDetails");

			if (!isValid) return;

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
		if (isCreated) {
			setStep(steps?.length);
		}
	}, [isCreated, steps, setStep]);

	return {
		isDekstop,
		onSubmit,
		isDisabledStep,
		isLoading,
		onPrevStep,
		isFirstStep,
		isLastStep,
		isOptionalStep,
		isOpenTherapistAlert,
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
						value: contactInformation?.email || "-",
					},
					{
						title: "MiiTel Link",
						value: contactInformation?.miitelLink || "-",
					},
				],
			},
			{
				title: "Patient Profile" as const,
				stepValue: 1,
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
							"-"
						),
					},
					{
						title: "Current Condition",
						value: <Badge variant="outline">{patientDetails?.condition}</Badge>,
					},
					{
						title: "Illness Onset Date",
						value: patientDetails?.illnessOnsetDate || "-",
					},
					{
						title: "Medical History",
						value: patientDetails?.medicalHistory || "-",
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
						value: patientDetails?.addressNotes || "-",
					},
				],
			},
			{
				title: "Schedule and Settings" as const,
				stepValue: 2,
				subs: [
					{
						title: "Service",
						value: appointmentScheduling.service.name,
					},
					{
						title: "Package",
						value: `${appointmentScheduling.package.name} (${appointmentScheduling.package.numberOfVisit} visit(s))`,
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
						value: appointmentScheduling.therapist?.name || "-",
					},
				],
			},
			{
				title: "Additionals" as const,
				stepValue: 3,
				subs: [
					{
						title: "Referral Source",
						value: additionalSettings?.referralSource
							? `${additionalSettings?.referralSource} - ${additionalSettings?.customReferralSource}`
							: "-",
					},
					{
						title: "Fisiohome Partner Booking",
						value: additionalSettings?.fisiohomePartnerName
							? `${additionalSettings?.fisiohomePartnerName} - ${additionalSettings?.customFisiohomePartnerName}`
							: "-",
					},
					{
						title: "Voucher Code",
						value: additionalSettings?.voucherCode || "-",
					},
					{
						title: "Notes",
						value: additionalSettings?.notes || "-",
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
	const additionalFormOptions = useMemo(() => {
		const referralSources = globalProps.optionsData?.referralSources || [];
		const fisiohomePartnerNames =
			globalProps.optionsData?.fisiohomePartnerNames || [];

		return { referralSources, fisiohomePartnerNames };
	}, [
		globalProps.optionsData?.referralSources,
		globalProps.optionsData?.fisiohomePartnerNames,
	]);

	// * Watching changes to the patient referral source and handling custom referral sources

	return {
		form,
		additionalFormOptions,
	};
};

export const usePatientDetailsForm = () => {
	const { props: globalProps } = usePage<AppointmentNewGlobalPageProps>();
	const form = useFormContext<AppointmentBookingSchema>();
	const isDekstop = useMediaQuery(IS_DEKSTOP_MEDIA_QUERY);
	const patientFormOptions = useMemo(() => {
		const genders = globalProps.optionsData?.patientGenders || [];
		const patientConditions = globalProps.optionsData?.patientConditions || [];

		return { genders, patientConditions };
	}, [
		globalProps.optionsData?.patientGenders,
		globalProps.optionsData?.patientConditions,
	]);

	return {
		form,
		patientFormOptions,
		isDekstop,
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

	// * for preferred therapist gender field
	const preferredTherapistGenderOption = useMemo(
		() => globalProps.optionsData?.preferredTherapistGender || [],
		[globalProps.optionsData?.preferredTherapistGender],
	);

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
			only: ["services"],
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
			form.resetField("appointmentScheduling.therapist", {
				defaultValue: DEFAULT_VALUES_THERAPIST,
			});
			onResetTherapistOptions();
			onResetIsoline();

			// set the service selected value
			form.setValue("appointmentScheduling.service", service, {
				shouldValidate: true,
			});
		},
		[form.setValue, form.resetField],
	);

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
		},
		[form.setValue],
	);

	// * for appointment date field
	const [isOpenAppointmentDate, setIsOpenAppointmentDate] = useState(false);
	const [appointmentDate, setAppointmentDate] = useState<Date | null>(
		watchAppointmentSchedulingValue?.appointmentDateTime
			? new Date(watchAppointmentSchedulingValue.appointmentDateTime.toString())
			: null,
	);
	const [appointmentTime, setAppointmentTime] = useState<string>(
		watchAppointmentSchedulingValue?.appointmentDateTime
			? format(
					watchAppointmentSchedulingValue.appointmentDateTime.toString(),
					"HH:mm",
				)
			: "",
	);
	// Memoized calendar properties for the appointment date field
	const appointmentDateCalendarProps = useMemo<CalendarProps>(() => {
		// Define the range of years to be displayed in the calendar
		const currentYear = new Date().getFullYear();
		const sixMonthsFromToday = new Date();
		sixMonthsFromToday.setMonth(sixMonthsFromToday.getMonth() + 6);

		return {
			// Close the calendar popover when a day is clicked
			onDayClick: () => setIsOpenAppointmentDate(false),
			// Set the range of years to be displayed
			fromYear: currentYear,
			toYear: currentYear,
			// Disable dates that are in the past or more than 6 months in the future
			disabled: (date) => {
				const today = new Date();
				return date <= today || date > sixMonthsFromToday;
			},
		};
	}, []);

	// * for assigning the therapist
	const mapRef = useRef<(H.Map & HereMaphandler) | null>(null);
	const [isTherapistFound, setIsTherapistFound] = useState(false);
	const [therapistsOptions, setTherapistsOptions] = useState({
		available: [] as AppointmentNewProps["therapists"],
		unavailable: [] as AppointmentNewProps["therapists"],
		feasible: [] as AppointmentNewProps["therapists"],
		notFeasible: [] as AppointmentNewProps["therapists"],
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
	const onFindTherapists = useCallback(() => {
		// fetch the services options data
		const { queryParams } = populateQueryParams(
			pageURL,
			deepTransformKeysToSnakeCase({
				locationId: watchPatientDetailsValue?.location?.id,
				serviceId: watchAppointmentSchedulingValue?.service?.id,
				preferredTherapistGender:
					watchAppointmentSchedulingValue.preferredTherapistGender,
				appointmentDateTime:
					watchAppointmentSchedulingValue.appointmentDateTime,
			}),
		);
		router.get(pageURL, queryParams, {
			only: ["therapists"],
			preserveScroll: true,
			preserveState: true,
			replace: false,
			onStart: () => {
				setIsLoading((prev) => ({ ...prev, therapists: true }));
				onResetTherapistOptions();
				onResetIsoline();
				// reset the therapist form values
				form.resetField("appointmentScheduling.therapist", {
					defaultValue: DEFAULT_VALUES_THERAPIST,
				});
			},
			onFinish: () => {
				setTimeout(() => {
					setIsLoading((prev) => ({
						...prev,
						therapists: false,
					}));
				}, 250);
			},
			onSuccess: ({ props }) => {
				// map the available and unavailable therapists
				const result = (props as unknown as AppointmentNewGlobalPageProps)
					.therapists;
				const therapistsAvailable =
					result?.filter((t) => t.availabilityDetails?.available) || [];
				const therapistsUnavailable =
					result?.filter((t) => !t.availabilityDetails?.available) || [];

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
		});
	}, [
		pageURL,
		watchPatientDetailsValue,
		watchAppointmentSchedulingValue,
		form.resetField,
		onResetTherapistOptions,
	]);
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

	// * state group for isolane therapist
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
		async (therapists: NonNullable<AppointmentNewProps["therapists"]>) => {
			if (!mapRef.current) return;

			// calculate the isoline
			const {
				latitude,
				longitude,
				address: patientAddress,
			} = watchPatientDetailsValue;
			const patientCoords = { lat: latitude, lng: longitude };
			await mapRef.current.isoline.onCalculate.both({
				coord: patientCoords,
				constraints: [
					{ type: "distance", value: 1000 * 25 }, // 25 km
					{ type: "time", value: 60 * 50 }, // 50 minutes
				],
			});

			// Map therapists to MarkerData
			const therapistCoords: MarkerData[] =
				therapists
					.map((therapist) => {
						// Safely handle missing activeAddress
						if (!therapist?.activeAddress) return null;

						return {
							position: {
								lat: therapist.activeAddress.latitude,
								lng: therapist.activeAddress.longitude,
							},
							address: therapist.activeAddress.address,
							bubbleContent: `
            <div class="w-[180px] text-xs flex flex-col">
              <span class="font-bold text-sm">${therapist.name}</span>
              <span class="font-light text-[10px]">#${therapist.registrationNumber}</span>
            </div>
          `,
							additional: { therapist },
						} satisfies MarkerData;
					})
					.filter((coord) => coord !== null) || [];

			// Get feasibility therapists result
			const feasibleResult = mapRef.current.isLocationFeasible(therapistCoords);
			const therapistList = {
				feasible: [] as AppointmentNewProps["therapists"],
				notFeasible: [] as AppointmentNewProps["therapists"],
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

			// Add markers for the patient position
			const markerPatientData: MarkerData = {
				address: patientAddress,
				position: patientCoords,
				bubbleContent: `
            <div class="w-[180px] text-xs flex flex-col">
              <span class="font-bold text-sm">${watchPatientDetailsValue.fullName}</span>
              <span class="font-light text-[10px]">${watchPatientDetailsValue.address}</span>
            </div>
          `,
				additional: {
					patient: { fullName: watchPatientDetailsValue.fullName },
				},
			};
			mapRef.current.marker.onAdd([markerPatientData]);

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
		[watchPatientDetailsValue],
	);

	// * side effect for reset the therapist selected and isoline map while service, therapist preferred gender, and appointment date changes
	useEffect(() => {
		if (
			watchServiceValue ||
			watchAppointmentDateTimeValue ||
			watchPreferredTherapistGenderValue
		) {
			onResetTherapistOptions();
			onResetIsoline();
		}
	}, [
		watchServiceValue,
		watchAppointmentDateTimeValue,
		watchPreferredTherapistGenderValue,
		onResetIsoline,
		onResetTherapistOptions,
	]);

	return {
		form,
		isLoading,
		preferredTherapistGenderOption,
		packagesOption,
		isOpenAppointmentDate,
		appointmentDate,
		appointmentTime,
		appointmentDateCalendarProps,
		isTherapistFound,
		isIsolineCalculated,
		therapistsOptions,
		mapRef,
		servicesOption,
		onFocusServiceField,
		onSelectService,
		onSelectPackage,
		setAppointmentDate,
		setAppointmentTime,
		onFindTherapists,
		onSelectTherapist,
		setIsOpenAppointmentDate,
	};
};
