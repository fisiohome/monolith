import {
	AdditionalSettingsForm,
	AppointmentSchedulingForm,
	FinalStep,
	FormContainer,
	FormProvider,
	PatientDetailsForm,
	ReviewForm,
	StepButtons,
	useFormProvider,
} from "@/components/admin-portal/appointment/new-appointment-form";
import {
	FormPageContainer,
	FormPageHeaderGridPattern,
} from "@/components/admin-portal/shared/page-layout";
import { Step, type StepItem, Stepper } from "@/components/shared/stepper";
import { Form } from "@/components/ui/form";
import {
	SESSION_STORAGE_FORM_KEY,
	SESSION_STORAGE_FORM_SELECTIONS_KEY,
} from "@/hooks/admin-portal/appointment/use-appointment-form";
import type {
	LocationOption,
	TherapistOption,
} from "@/hooks/admin-portal/appointment/use-appointment-utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
	APPOINTMENT_BOOKING_SCHEMA,
	type AppointmentBookingSchema,
} from "@/lib/appointments/form";
import { buildAppointmentPayload } from "@/lib/appointments/form";
import type {
	FISIOHOME_PARTNER,
	GENDERS,
	PATIENT_CONDITIONS_WITH_DESCRIPTION,
	PATIENT_REFERRAL_OPTIONS,
	PREFERRED_THERAPIST_GENDER,
} from "@/lib/constants";
import { SESSION_ISOLINE_KEY, SESSION_MARKERS_KEY } from "@/lib/here-maps";
import type { Appointment } from "@/types/admin-portal/appointment";
import type { Package } from "@/types/admin-portal/package";
import type { Patient } from "@/types/admin-portal/patient";
import type { Service } from "@/types/admin-portal/service";
import type { GlobalPageProps as BaseGlobalPageProps } from "@/types/globals";
import { zodResolver } from "@hookform/resolvers/zod";
import { Head, router, usePage } from "@inertiajs/react";
import {
	type ReactElement,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export type ServiceOption = Pick<
	Service,
	"id" | "name" | "code" | "active" | "description"
> & { packages: Pick<Package, "id" | "name" | "active" | "numberOfVisit"> };

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
	patientList?: Patient[];
	patientContactList?: NonNullable<Patient["contact"]>[];
	appointment: Appointment;
	appointmentReference: Appointment | null;
}

export interface AppointmentNewGlobalPageProps
	extends BaseGlobalPageProps,
		AppointmentNewProps {
	[key: string]: any;
}

function FormComponent() {
	const { url: pageURL, props: globalProps } =
		usePage<AppointmentNewGlobalPageProps>();
	const isMobile = useIsMobile();
	const { t: taf } = useTranslation("appointments-form");
	const { isSuccessBooked, mode, formStorage } = useFormProvider();
	const [isLoading, setIsLoading] = useState(false);

	// stepper management state - reordered to prioritize scheduling first
	const steps = useMemo(
		() =>
			[
				{
					label: taf("stepper.patient_profile.label"),
					description: taf("stepper.patient_profile.description"),
					component: <PatientDetailsForm />,
				},
				{
					label: taf("stepper.appt_settings.label"),
					description: taf("stepper.appt_settings.description"),
					component: <AppointmentSchedulingForm />,
				},
				{
					label: taf("stepper.additional_settings.label"),
					description: taf("stepper.additional_settings.description"),
					component: <AdditionalSettingsForm />,
				},
				{
					label: taf("stepper.review.label"),
					description: taf("stepper.review.description"),
					component: <ReviewForm />,
				},
			] satisfies StepperProps[],
		[taf],
	);

	// form management state
	const pageHeader = useMemo(() => {
		const appRef = globalProps?.appointmentReference;
		const regNumber = appRef?.registrationNumber;
		const currentVisit = appRef?.seriesAppointments?.length
			? Math.max(...appRef.seriesAppointments.map((a) => a.visitNumber)) + 1
			: 1;
		const maxVisit = appRef?.totalPackageVisits;

		return {
			title: mode === "new" ? taf("page_title.new") : taf("page_title.series"),
			description:
				mode === "new"
					? taf("page_description.new")
					: taf("page_description.series"),
			regNumber,
			series:
				mode === "series" ? `Visit ${currentVisit}/${maxVisit}` : undefined,
		};
	}, [mode, globalProps?.appointmentReference, taf]);
	const form = useForm<AppointmentBookingSchema>({
		resolver: zodResolver(APPOINTMENT_BOOKING_SCHEMA),
		defaultValues: {
			formOptions: { ...formStorage?.formOptions },
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
				replace: false,
				only: ["adminPortal", "flash", "errors", "appointment"],
				onStart: () => setIsLoading(true),
				onFinish: () => {
					setTimeout(() => setIsLoading(false), 250);
				},
			} satisfies Parameters<typeof router.put>["2"];
			const payload = buildAppointmentPayload(values);

			router.post(submitURL, { appointment: payload }, submitConfig);

			console.log("Appointment booking successfully saved...");
			console.groupEnd();
		},
		[globalProps.adminPortal.router.adminPortal.appointment.book],
	);

	/**
	 * * watching the changed of the route
	 * * then show the dialog for the confirmation to user if user want to navigate away from the page
	 * * if navigated then we remove the stored form data in session storage
	 *
	 * ? isNavigateConfirm is required to prevent the confirmation modal from appearing twice.
	 */
	const [isNavigateConfirm, setIsNavigateConfirm] = useState(false);
	const removeStorage = useCallback(() => {
		window.sessionStorage.removeItem(SESSION_STORAGE_FORM_KEY);
		window.sessionStorage.removeItem(SESSION_STORAGE_FORM_SELECTIONS_KEY);
		window.sessionStorage.removeItem(SESSION_ISOLINE_KEY);
		window.sessionStorage.removeItem(SESSION_MARKERS_KEY);
	}, []);
	useEffect(() => {
		// Add a listener for route changes
		return router.on("before", (event) => {
			if (isNavigateConfirm) return;

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
				(!isParentRoot || isSuccessBooked) &&
				(isCurrentRoot || isBookPath)
			)
				return;

			// Log the URL being visited
			console.log(`Starting a visit to ${url}`);
			if (confirm(taf("navigate_away"))) {
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
		isSuccessBooked,
		isNavigateConfirm,
		taf,
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
			const isCurrentRoot = event.detail.page.url.includes("new");
			const isBookPath = event.detail.page.url.includes("book");

			// If the path is current root (user on reload), or is the book path (book path mean to POST to save the appointment) do nothing
			if (isCurrentRoot || isBookPath) return;

			// Remove the appointment form data from session storage
			removeStorage();

			console.log(`Navigated to ${event.detail.page.url}`);
		});
	}, [removeStorage]);

	return (
		<section className="flex flex-col justify-center gap-4 mx-auto md:gap-6 w-12/12 xl:w-8/12">
			<FormPageHeaderGridPattern {...pageHeader} />

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

									<StepButtons isFormLoading={isLoading} />
								</FormContainer>
							</Step>
						))}

						{isSuccessBooked && <FinalStep />}
					</Stepper>
				</form>
			</Form>
		</section>
	);
}

export default function AppointmentNew(_props: AppointmentNewProps) {
	const { t: taf } = useTranslation("appointments-form");

	return (
		<FormProvider>
			<Head title={taf("head_title")}>
				<link
					rel="stylesheet"
					type="text/css"
					href="https://js.api.here.com/v3/3.1/mapsjs-ui.css"
				/>
			</Head>

			<FormPageContainer>
				<FormComponent />
			</FormPageContainer>
		</FormProvider>
	);
}
