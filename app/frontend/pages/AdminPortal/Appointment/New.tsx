import {
	AdditionalSettingsForm,
	AppointmentSchedulingForm,
	ContactInformationForm,
	FinalStep,
	FormContainer,
	PatientDetailsForm,
	ReviewForm,
	StepButtons,
} from "@/components/admin-portal/appointment/new-appointment-form";
import {
	FormPageContainer,
	FormPageHeaderGridPattern,
} from "@/components/admin-portal/shared/page-layout";
import { Step, type StepItem, Stepper } from "@/components/shared/stepper";
import { Form } from "@/components/ui/form";
import { useIsMobile } from "@/hooks/use-mobile";
import {
	APPOINTMENT_BOOKING_SCHEMA,
	type AppointmentBookingSchema,
	defineAppointmentFormDefaultValues,
} from "@/lib/appointments";
import { buildAppointmentPayload } from "@/lib/appointments";
import type {
	FISIOHOME_PARTNER,
	GENDERS,
	PATIENT_CONDITIONS_WITH_DESCRIPTION,
	PATIENT_REFERRAL_OPTIONS,
	PREFERRED_THERAPIST_GENDER,
} from "@/lib/constants";
import { populateQueryParams } from "@/lib/utils";
import type { Appointment } from "@/types/admin-portal/appointment";
import type { Location } from "@/types/admin-portal/location";
import type { Package } from "@/types/admin-portal/package";
import type { Service } from "@/types/admin-portal/service";
import type { Therapist } from "@/types/admin-portal/therapist";
import type { GlobalPageProps as BaseGlobalPageProps } from "@/types/globals";
import { zodResolver } from "@hookform/resolvers/zod";
import { Head, router, usePage } from "@inertiajs/react";
import { useSessionStorage } from "@uidotdev/usehooks";
import {
	type ReactElement,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { useForm } from "react-hook-form";

export type ServiceOption = Pick<
	Service,
	"id" | "name" | "code" | "active" | "description"
> & { packages: Pick<Package, "id" | "name" | "active" | "numberOfVisit"> };

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
>;

interface StepperProps extends StepItem {
	component: ReactElement;
}

export interface AppointmentNewProps {
	services?: ServiceOption[];
	locations?: LocationOption[];
	therapists?: TherapistOption[];
	optionsData?: {
		patientGenders: typeof GENDERS;
		preferredTherapistGender: typeof PREFERRED_THERAPIST_GENDER;
		referralSources: typeof PATIENT_REFERRAL_OPTIONS;
		patientConditions: typeof PATIENT_CONDITIONS_WITH_DESCRIPTION;
		fisiohomePartnerNames: typeof FISIOHOME_PARTNER;
	};
	appointment: Appointment;
}

export interface AppointmentNewGlobalPageProps
	extends BaseGlobalPageProps,
		AppointmentNewProps {
	[key: string]: any;
}

export default function AppointmentNew(_props: AppointmentNewProps) {
	const { url: pageURL, props: globalProps } =
		usePage<AppointmentNewGlobalPageProps>();
	const isMobile = useIsMobile();
	const [isLoading, setIsLoading] = useState(false);
	const isCreated = useMemo(() => {
		const appointmentId = globalProps?.appointment?.id;
		const { queryParams } = populateQueryParams(pageURL);

		return !!queryParams?.created && !!appointmentId;
	}, [globalProps?.appointment?.id, pageURL]);

	// stepper management state
	const steps = useMemo(
		() =>
			[
				{
					label: "Contact Information",
					description:
						"Patient contact information to streamline follow-up and communication.",
					component: <ContactInformationForm />,
				},
				{
					label: "Patient Profile",
					description:
						"Patient medical and personal information to ensure proper care.",
					component: <PatientDetailsForm />,
				},
				{
					label: "Appointment Settings and Scheduling",
					description:
						"Configure the appointment details, appropriate time, location, and service preferences for the appointment.",
					component: <AppointmentSchedulingForm />,
				},
				{
					label: "Additional Settings",
					description:
						"Specify any additional preferences or details for the appointment.",
					component: <AdditionalSettingsForm />,
				},
				{
					label: "Review",
					description:
						"Review the appointment details before initiating the booking.",
					component: <ReviewForm />,
				},
			] satisfies StepperProps[],
		[],
	);

	// form management state
	const formDefaultvalues = useMemo(
		() =>
			defineAppointmentFormDefaultValues({
				user: globalProps.auth.currentUser,
			}),
		[globalProps.auth.currentUser],
	);
	const [formStorage, setFormStorage] =
		useSessionStorage<null | AppointmentBookingSchema>("appointment-form", {
			...formDefaultvalues,
		});
	const form = useForm<AppointmentBookingSchema>({
		resolver: zodResolver(APPOINTMENT_BOOKING_SCHEMA),
		defaultValues: {
			contactInformation: { ...formStorage?.contactInformation },
			patientDetails: { ...formStorage?.patientDetails },
			appointmentScheduling: { ...formStorage?.appointmentScheduling },
			additionalSettings: { ...formStorage?.additionalSettings },
		},
		mode: "onChange",
	});
	const onSubmit = useCallback(
		(values: AppointmentBookingSchema) => {
			console.group();
			console.log("Starting process to saving the appointment booking...");

			// prepare the payload
			const submitURL =
				globalProps.adminPortal.router.adminPortal.appointment.book;
			const submitConfig = {
				preserveScroll: true,
				preserveState: true,
				only: ["adminPortal", "flash", "errors", "appointment"],
				onStart: () => setIsLoading(true),
				onFinish: () => setTimeout(() => setIsLoading(false), 250),
			} satisfies Parameters<typeof router.put>["2"];
			const payload = buildAppointmentPayload(values);

			router.post(submitURL, { appointment: payload }, submitConfig);

			console.log("Appointment booking successfully saved...");
			console.groupEnd();
		},
		[globalProps.adminPortal.router.adminPortal.appointment.book],
	);

	// * for showing the dialog confirmation if user want to navigate away from the page
	useEffect(() => {
		// Add a listener for route changes
		return router.on("before", (event) => {
			const url = event.detail.visit.url;
			const path = url.pathname;

			// Determine if the path is the root, a parent root, or the current root
			const isRoot = path === "/";
			const isParentRoot =
				globalProps.adminPortal.router.adminPortal.appointment.index.includes(
					path,
				);
			const isCurrentRoot = pageURL.includes(path);
			const isBookPath = path.includes("book");

			// If the path is not root, or parent root, or current root, or is the book path (book path mean to POST to save the appointment) do nothing
			if (
				!isRoot &&
				(!isParentRoot || isCreated) &&
				(isCurrentRoot || isBookPath)
			)
				return;

			// Log the URL being visited
			console.log(`Starting a visit to ${url}`);

			// Confirm navigation away from the current page
			const isNavigateAway = confirm("Are you sure you want to navigate away?");
			if (isNavigateAway) {
				// Remove the appointment form data from session storage
				window.sessionStorage.removeItem("appointment-form");
			}

			return isNavigateAway;
		});
	}, [
		globalProps.adminPortal.router.adminPortal.appointment.index,
		pageURL,
		isCreated,
	]);

	return (
		<>
			<Head title="Appointment Booking">
				<link
					rel="stylesheet"
					type="text/css"
					href="https://js.api.here.com/v3/3.1/mapsjs-ui.css"
				/>
			</Head>

			<FormPageContainer>
				<section className="flex flex-col justify-center gap-4 mx-auto md:gap-6 w-12/12 xl:w-8/12">
					<FormPageHeaderGridPattern
						title="Book a New Appointment"
						description="Schedule a appointment session between a therapist and a patient."
					/>

					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)}>
							<Stepper
								// scrollTracking
								variant={isMobile ? "line" : "circle-alt"}
								size="sm"
								orientation="vertical"
								initialStep={0}
								steps={steps}
							>
								{steps.map((stepProps) => (
									<Step key={stepProps.label} {...stepProps}>
										<FormContainer>
											{stepProps.component}

											<StepButtons
												setFormStorage={setFormStorage}
												isFormLoading={isLoading}
												isCreated={isCreated}
											/>
										</FormContainer>
									</Step>
								))}

								{isCreated && <FinalStep />}
							</Stepper>
						</form>
					</Form>
				</section>
			</FormPageContainer>
		</>
	);
}
