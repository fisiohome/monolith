import {
	AdditionalSettings,
	AppointmentSchedulingForm,
	ContactInformationForm,
	FinalStep,
	FormContainer,
	PatientDetailsForm,
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
	checkIsCustomFisiohomePartner,
	checkIsCustomReferral,
} from "@/lib/appointments";
import { calculateAge } from "@/lib/utils";
import type { Location } from "@/types/admin-portal/location";
import type { Package } from "@/types/admin-portal/package";
import type { Service } from "@/types/admin-portal/service";
import type { Therapist } from "@/types/admin-portal/therapist";
import type { GlobalPageProps as BaseGlobalPageProps } from "@/types/globals";
import { zodResolver } from "@hookform/resolvers/zod";
import { Head, router, usePage } from "@inertiajs/react";
import { useSessionStorage } from "@uidotdev/usehooks";
import { add } from "date-fns";
import { type ReactElement, useCallback, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";

type ServiceOption = Pick<
	Service,
	"id" | "name" | "code" | "active" | "description"
> & { packages: Pick<Package, "id" | "name" | "active" | "numberOfVisit"> };

type LocationOption = Pick<
	Location,
	"id" | "city" | "country" | "countryCode" | "state"
>;

type TherapistOption = Pick<
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
					component: <AdditionalSettings />,
				},
			] satisfies StepperProps[],
		[],
	);

	// form management state
	const formDefaultvalues = useMemo(() => {
		// for date of birth
		const dateOfBirth = new Date(1952, 5, 21);
		const age = calculateAge(dateOfBirth);

		// for referral
		const referralSource = "Other";
		const isCustomReferral = checkIsCustomReferral(referralSource);
		const customReferralSource = isCustomReferral ? "Linkedin" : undefined;

		// for fisiohome partner name
		const fisiohomePartnerName = "Other";
		const isCustomFisiohomePartner =
			checkIsCustomFisiohomePartner(fisiohomePartnerName);
		const customFisiohomePartnerName = isCustomFisiohomePartner
			? "Tokopedia"
			: undefined;

		// for appointment date
		const appointmentDateTime = add(new Date(), {
			days: 13,
			hours: 5,
			minutes: 15 - (new Date().getMinutes() % 15),
		});

		return {
			contactInformation: {
				contactName: "Farida Sagala",
				contactPhone: "+62 821 6714 6343",
			},
			patientDetails: {
				fullName: "Farida Sagala",
				dateOfBirth,
				age,
				gender: "FEMALE",
				condition: "Normal",
				medicalHistory: "Hipertensi",
				complaintDescription: "Sakit pinggang",
				illnessOnsetDate: "2 minggu lalu",
				addressNotes:
					"masuk gang bidan solikah rumah jejer 4 google link: https://maps.app.goo.gl/EzniW78FrYkBVF1w8",
				address:
					"jl jati baru 1 nomor 9 gerbang hitam, kelurahan kampung bali kec tanah abang kota  jakarta pusat",
				postalCode: "10250",
				latitude: -6.18655,
				longitude: 106.81299,
				location: {
					id: "5",
					city: "KOTA ADM. JAKARTA PUSAT",
				},
				// address:
				// 	"Wang Plaza, Jl. Panjang No.kav 17, RT.14/RW.7, Kedoya Utara, Kec. Kb. Jeruk, jakarta, Daerah Khusus Ibukota Jakarta 11520",
				// postalCode: "11520",
				// latitude: -6.17381,
				// longitude: 106.76558,
				// location: {
				// 	id: "2",
				// 	city: "KOTA ADM. JAKARTA BARAT",
				// },
			},
			appointmentScheduling: {
				service: { id: "7", name: "FISIOHOME_SPECIAL_TIER" },
				package: { id: "1", name: "Order Visit", numberOfVisit: 1 },
				preferredTherapistGender: "NO PREFERENCE",
				appointmentDateTime,
			},
			additionalSettings: {
				referralSource,
				customReferralSource,
				fisiohomePartnerBooking: true,
				fisiohomePartnerName,
				customFisiohomePartnerName,
				voucherCode: "TEBUSMURAH",
				notes: "This is the patient notes",
			},
		} satisfies AppointmentBookingSchema;
	}, []);
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
	});
	const onSubmit = useCallback((values: AppointmentBookingSchema) => {
		console.log(values);
	}, []);
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

			// If the path is not root, parent root, or current root, do nothing
			if (!isRoot && !isParentRoot && isCurrentRoot) return;

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
	}, [globalProps.adminPortal.router.adminPortal.appointment.index, pageURL]);

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
								scrollTracking
								variant={isMobile ? "line" : "circle-alt"}
								size="sm"
								orientation="vertical"
								initialStep={2}
								steps={steps}
							>
								{steps.map((stepProps) => (
									<Step key={stepProps.label} {...stepProps}>
										<FormContainer>
											{stepProps.component}

											<StepButtons setFormStorage={setFormStorage} />
										</FormContainer>
									</Step>
								))}

								<FinalStep />
							</Stepper>
						</form>
					</Form>
				</section>
			</FormPageContainer>
		</>
	);
}
