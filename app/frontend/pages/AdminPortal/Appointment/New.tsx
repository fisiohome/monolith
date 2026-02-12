import { zodResolver } from "@hookform/resolvers/zod";
import { Deferred, Head, router, usePage } from "@inertiajs/react";
import { Info } from "lucide-react";
import { type ReactElement, useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import AdminPicMultiSelector from "@/components/admin-portal/appointment/form/admin-pic-multi-selector";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppointmentDraft } from "@/hooks/admin-portal/appointment/use-appointment-draft";
import { useFormReset } from "@/hooks/admin-portal/appointment/use-appointment-form";
import type {
	LocationOption,
	TherapistOption,
} from "@/hooks/admin-portal/appointment/use-appointment-utils";
import { useNavigationGuard } from "@/hooks/admin-portal/appointment/use-navigation-guard";
import { useIsMobile } from "@/hooks/use-mobile";
import {
	APPOINTMENT_BOOKING_SCHEMA,
	type AppointmentBookingSchema,
	buildAppointmentPayload,
} from "@/lib/appointments/form";
import type {
	FISIOHOME_PARTNER,
	GENDERS,
	PATIENT_CONDITIONS_WITH_DESCRIPTION,
	PATIENT_REFERRAL_OPTIONS,
	PREFERRED_THERAPIST_GENDER,
} from "@/lib/constants";
import type { Appointment } from "@/types/admin-portal/appointment";
import type { Package } from "@/types/admin-portal/package";
import type { Patient } from "@/types/admin-portal/patient";
import type { Service } from "@/types/admin-portal/service";
import type { GlobalPageProps as BaseGlobalPageProps } from "@/types/globals";

type ServiceOption = Pick<
	Service,
	"id" | "name" | "code" | "active" | "description"
> & { packages: Pick<Package, "id" | "name" | "active" | "numberOfVisit"> };

type AdminOption = {
	id: string;
	name: string;
	email?: string;
};

interface StepperProps extends StepItem {
	component: ReactElement;
}

export interface AppointmentNewProps {
	services?: ServiceOption[];
	locations?: LocationOption[];
	therapists?: TherapistOption[];
	admins?: AdminOption[];
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
	const { isSuccessBooked, mode, formStorage, setFormStorage } =
		useFormProvider();
	const [isLoading, setIsLoading] = useState(false);
	const [draftLoaded, setDraftLoaded] = useState(false);

	// Get draftId from URL for use in loadDraft callback
	const draftIdFromUrl = useMemo(() => {
		return new URLSearchParams(window.location.search).get("draftId");
	}, []);

	// Load draft if draftId is in URL - Now integrated into useAppointmentDraft
	useAppointmentDraft({
		draftIdFromUrl,
		setFormStorage,
		setDraftLoaded,
		onError: (error) => {
			console.error("Failed to load draft:", error);
		},
	});

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

	// Reset form when draft is loaded - Extracted to custom hook
	useFormReset({
		form,
		formStorage,
		draftLoaded,
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
	 * Navigation guard - Extracted to custom hook
	 * Handles route change confirmation and storage cleanup
	 */
	const [isNavigateConfirm, setIsNavigateConfirm] = useState(false);
	useNavigationGuard({
		globalProps,
		pageURL,
		isSuccessBooked,
		isNavigateConfirm,
		setIsNavigateConfirm,
	});

	return (
		<section className="flex flex-col justify-center gap-4 mx-auto md:gap-6 w-12/12 xl:w-8/12">
			<FormPageHeaderGridPattern {...pageHeader} />

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)}>
					<Alert className="mb-4">
						<Info className="h-4 w-4 -mt-0.5 !text-primary" />
						<AlertDescription className="flex items-center justify-between text-primary">
							<span>
								{taf("draft.auto_save_info", {
									defaultValue:
										"Your progress will be automatically saved as a draft when you move to the next step. The draft will be removed once the appointment is successfully created.",
								})}
							</span>
						</AlertDescription>
					</Alert>

					<div className="grid gap-4 p-4 border shadow-inner md:p-6 border-border rounded-xl bg-background mb-4">
						{/* Admin PIC Selector for draft feature */}
						<Deferred
							data={["admins"]}
							fallback={
								<Skeleton className="w-full rounded-md col-span-full h-20" />
							}
						>
							<div className="col-span-full">
								<AdminPicMultiSelector showDescription={true} />
							</div>
						</Deferred>
					</div>

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
