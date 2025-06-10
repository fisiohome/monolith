import type { FormMode } from "@/components/admin-portal/appointment/new-appointment-form";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import type {
	Appointment,
	AppointmentPayload,
} from "@/types/admin-portal/appointment";
import type { Auth } from "@/types/globals";
import { isValidPhoneNumber } from "react-phone-number-input";
import { z } from "zod";
import {
	FISIOHOME_PARTNER,
	GENDERS,
	PATIENT_CONDITIONS,
	PATIENT_REFERRAL_OPTIONS,
	PREFERRED_THERAPIST_GENDER,
} from "../constants";
import { boolSchema, idSchema } from "../validation";

export const DEFAULT_VALUES_LOCATION = {
	id: "",
	city: "",
} satisfies AppointmentBookingSchema["patientDetails"]["location"];
export const DEFAULT_VALUES_SERVICE = {
	id: "",
	name: "",
} satisfies AppointmentBookingSchema["appointmentScheduling"]["service"];
export const DEFAULT_VALUES_PACKAGE = {
	id: "",
	name: "",
	numberOfVisit: 0,
} satisfies AppointmentBookingSchema["appointmentScheduling"]["package"];
export const DEFAULT_VALUES_THERAPIST = {
	id: "",
	name: "",
} satisfies NonNullable<
	AppointmentBookingSchema["appointmentScheduling"]["therapist"]
>;
export const DEFAULT_VALUES_PATIENT_ADDRESS = {
	address: "",
	postalCode: "",
	latitude: 0,
	longitude: 0,
	addressNotes: undefined,
} satisfies Pick<
	AppointmentBookingSchema["patientDetails"],
	"latitude" | "longitude" | "postalCode" | "addressNotes" | "address"
>;
export const DEFAULT_VALUES_PATIENT_CONTACT = {
	contactName: "",
	contactPhone: "",
	email: undefined,
	miitelLink: undefined,
} satisfies AppointmentBookingSchema["contactInformation"];

/**
 * * new appointment booking form schema
 */

// contact information schema
export const CONTACT_INFORMATION_SCHEMA = z.object({
	contactName: z
		.string()
		.min(3, "Contact name is required with minimum 3 characters"),
	contactPhone: z
		.string()
		.min(1, { message: "Contact phone number is required" })
		.refine(isValidPhoneNumber, { message: "Invalid phone number" }),
	email: z.string().email("Format email tidak valid").optional(),
	miitelLink: z.string().url("MiiTel link must be a valid URL").optional(),
});
export type ContactInformationSchema = z.infer<
	typeof CONTACT_INFORMATION_SCHEMA
>;

// patient details schema
export const PATIENT_DETAILS_SCHEMA = z.object({
	fullName: z
		.string()
		.min(3, "Patient full name is required with minimum 3 characters"),
	dateOfBirth: z.coerce
		.date()
		// Ensure the date is in the past
		.refine((date) => date < new Date(), {
			message: "Date of birth must be in the past",
		}),
	age: z.coerce.number().int().positive(),
	gender: z.enum(GENDERS, {
		required_error: "Need to select a patient gender",
	}),
	illnessOnsetDate: z.string().optional(),
	complaintDescription: z.string().min(1, "Complaint description is required"),
	condition: z.enum(PATIENT_CONDITIONS, {
		required_error: "Need to select a patient condition",
	}),
	medicalHistory: z.string().optional(),
	location: z
		.object({
			id: idSchema,
			city: z.string(),
		})
		.refine((value) => !!value?.city, {
			path: ["city"],
			message: "Please select a location",
		}),
	postalCode: z.string().optional(),
	latitude: z.coerce
		.number({ message: "Latitude must be a numerical value" })
		.refine((value) => value !== 0, {
			message: "Latitude is required",
		}),
	longitude: z.coerce
		.number({ message: "Longitude must be a numerical value" })
		.refine((value) => value !== 0, {
			message: "Longitude is required",
		}),
	address: z.string().min(1, "Address is required"),
	addressNotes: z.string().optional(),
});
export type PatientDetailsSchema = z.infer<typeof PATIENT_DETAILS_SCHEMA>;

// appointment scheduling schema
export const APPOINTMENT_SCHEDULING_SCHEMA = z.object({
	service: z
		.object({
			id: idSchema,
			name: z.string(),
		})
		.refine((value) => !!value?.name, {
			path: ["name"],
			message: "Please select a service",
		}),
	package: z
		.object({
			id: idSchema,
			name: z.string(),
			numberOfVisit: z.coerce.number().int().positive(),
		})
		.refine((value) => !!value?.name, {
			path: ["name"],
			message: "Please select a package",
		}),
	preferredTherapistGender: z.enum(PREFERRED_THERAPIST_GENDER, {
		required_error: "Please select a preferred therapist gender",
	}),
	appointmentDateTime: z.coerce.date().refine((date) => date > new Date(), {
		message: "Appointment date must be in the future",
	}),
	therapist: z
		.object({
			id: idSchema.optional(),
			name: z.string().optional(),
		})
		.optional(),
});
export type AppointmentSchedulingSchema = z.infer<
	typeof APPOINTMENT_SCHEDULING_SCHEMA
>;

/**
 * Checks if the given value is a custom referral.
 *
 * This function determines whether the provided value is not included in the predefined
 * list of patient referral options (`PATIENT_REFERRAL_OPTIONS`). If the value is not found
 * in the list, it is considered a custom referral.
 *
 * @param value - The referral value to check.
 * @returns `true` if the value is a custom referral, `false` otherwise.
 */
export const checkIsCustomReferral = (value: string) => {
	const options = PATIENT_REFERRAL_OPTIONS.filter(
		(i) => i.toLowerCase() !== "Other".toLowerCase(),
	) as unknown as string[];

	return !!value && !options.includes(value);
};

/**
 * Checks if the given value is not included in the PATIENT_REFERRAL_OPTIONS array.
 *
 * @param value - The string value to check against the PATIENT_REFERRAL_OPTIONS array.
 * @returns A boolean indicating whether the value is not a custom Fisiohome partner.
 */
export const checkIsCustomFisiohomePartner = (value: string) => {
	const options = FISIOHOME_PARTNER.filter(
		(i) => i.toLowerCase() !== "Other".toLowerCase(),
	) as unknown as string[];

	return value && !options.includes(value);
};

// additional settings schema
export const ADDITIONAL_SETTINGS_SCHEMA = z
	.object({
		referralSource: z.string().optional(),
		customReferralSource: z.string().optional(),
		fisiohomePartnerBooking: boolSchema.default(false),
		fisiohomePartnerName: z.string().optional(),
		customFisiohomePartnerName: z.string().optional(),
		voucherCode: z.string().optional(),
		notes: z.string().optional(),
		admins: z
			.array(z.object({ id: idSchema, name: z.string(), email: z.string() }))
			.optional(),
	})
	.superRefine((data, ctx) => {
		// Only perform the check if booking from partner is selected.
		if (data.fisiohomePartnerBooking && !data.fisiohomePartnerName) {
			// If booking is not selected, no need to check the name.
			// Otherwise, check that the partner name exists and is not just whitespace.
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message:
					"Please select the fisiohome partner's name to complete the partner booking",
				path: ["fisiohomePartnerName"],
			});
		}

		// checking if the custom referral source filled correctly
		if (
			checkIsCustomReferral(data.referralSource || "") &&
			!data.customReferralSource
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message:
					"Please input the patient referral source to complete the partner booking",
				path: ["customReferralSource"],
			});
		}

		// checking if the custom fisiohome partner filled correctly
		if (
			checkIsCustomFisiohomePartner(data.fisiohomePartnerName || "") &&
			!data.customFisiohomePartnerName
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message:
					"Please input the fisiohome partner to complete the partner booking.",
				path: ["customFisiohomePartnerName"],
			});
		}
	});
export type AdditionalSettingsSchema = z.infer<
	typeof ADDITIONAL_SETTINGS_SCHEMA
>;
// form options schema
export const FORM_OPTIONS_SCHEMA = z.object({
	patientRecordSource: z.enum(["existing", "add"]),
	patientContactSource: z.enum(["existing", "new"]),
	referenceAppointmentId: idSchema.optional(),
});
export type FormOptionsSchema = z.infer<typeof FORM_OPTIONS_SCHEMA>;

// all merge schema
export const APPOINTMENT_BOOKING_SCHEMA = z.object({
	formOptions: FORM_OPTIONS_SCHEMA,
	contactInformation: CONTACT_INFORMATION_SCHEMA,
	patientDetails: PATIENT_DETAILS_SCHEMA,
	appointmentScheduling: APPOINTMENT_SCHEDULING_SCHEMA,
	additionalSettings: ADDITIONAL_SETTINGS_SCHEMA,
});
export type AppointmentBookingSchema = z.infer<
	typeof APPOINTMENT_BOOKING_SCHEMA
>;

// for prepare the payload appointment form
export const buildAppointmentPayload = (values: AppointmentBookingSchema) => {
	const {
		contactInformation,
		additionalSettings,
		appointmentScheduling,
		patientDetails,
		formOptions,
	} = values;
	const { referenceAppointmentId } = formOptions;
	const {
		admins,
		customFisiohomePartnerName,
		customReferralSource,
		...restAdditionalSettings
	} = additionalSettings;
	const {
		package: appointmentPackage,
		service,
		therapist,
		...restAppointmentScheduling
	} = appointmentScheduling;
	const {
		location,
		illnessOnsetDate,
		complaintDescription,
		condition,
		medicalHistory,
		fullName,
		age,
		dateOfBirth,
		gender,
		addressNotes,
		...restPatientDetails
	} = patientDetails;

	const payload = deepTransformKeysToSnakeCase({
		serviceId: String(service.id),
		packageId: String(appointmentPackage.id),
		locationId: String(location.id),
		therapistId: String(therapist?.id || "") || null,
		adminIds: admins?.map((admin) => String(admin.id)).join(",") || "",
		referenceAppointmentId: String(referenceAppointmentId || "") || null,
		patientContact: { ...contactInformation },
		patientAddress: {
			...restPatientDetails,
			postalCode: restPatientDetails?.postalCode || "",
			locationId: String(location.id),
			notes: addressNotes,
		},
		patient: {
			name: fullName,
			dateOfBirth,
			// dateOfBirth: add(dateOfBirth, { hours: 7 }),
			gender,
		},
		appointment: {
			...restAdditionalSettings,
			...restAppointmentScheduling,
			otherReferralSource: customReferralSource,
			otherFisiohomePartnerName: customFisiohomePartnerName,
			patientIllnessOnsetDate: illnessOnsetDate,
			patientComplaintDescription: complaintDescription,
			patientCondition: condition,
			patientMedicalHistory: medicalHistory,
		},
	} satisfies AppointmentPayload);

	return payload;
};

// define the form default values
interface FormDefaultProps {
	mode?: FormMode;
	user?: Auth["currentUser"];
	apptRef?: Appointment | null;
}

// @ts-ignore
const devValues = () => {
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

	return {
		contactInformation: {
			contactName: "Dendy",
			contactPhone: "+62896272346",
			email: "dendy@yopmail.com",
		},
		patientDetails: {
			fullName: "Dendy Dandees",
			dateOfBirth: null,
			age: null,
			gender: "MALE",
			condition: "NORMAL",
			medicalHistory: "Hipertensi",
			complaintDescription: "Sakit pinggang",
			illnessOnsetDate: "2 minggu lalu",
			addressNotes: "Taman suropati",
			address:
				"Jl. Taman Suropati No.5, RT.5/RW.5, Menteng, Kec. Menteng, Kota Jakarta Pusat, Daerah Khusus Ibukota Jakarta 10310",
			postalCode: "10310",
			latitude: -6.19841,
			longitude: 106.83209,
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
			// service: { id: "1", name: "FISIOHOME_SPECIAL_TIER" },
			// package: { id: "3", name: "Paket Suite", numberOfVisit: 6 },
			service: { id: "", name: "" },
			package: { id: "", name: "", numberOfVisit: 0 },
			preferredTherapistGender: "NO PREFERENCE",
			appointmentDateTime: null,
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
	};
};

export const defineAppointmentFormDefaultValues = (
	props?: FormDefaultProps,
) => {
	// const { contactInformation } = devValues();

	// for the patient record source
	const patientRecordSource = "existing";

	// for the patient contact source
	const patientContactSource = "existing";

	// for appointment references (needed for create a appointment series)
	const referenceAppointmentId = props?.apptRef?.id;

	// for patient details
	const contactInformation = {
		contactName: props?.apptRef?.patient?.contact?.contactName || "",
		contactPhone: props?.apptRef?.patient?.contact?.contactPhone || "",
		email: props?.apptRef?.patient?.contact?.email || "",
	};
	const patientDetails = {
		fullName: props?.apptRef?.patient?.name || "",
		dateOfBirth: props?.apptRef?.patient?.dateOfBirth
			? new Date(props?.apptRef?.patient?.dateOfBirth)
			: null,
		age: props?.apptRef?.patient?.age || null,
		gender: props?.apptRef?.patient?.gender || "MALE",
		condition: "NORMAL",
		medicalHistory: "",
		complaintDescription: "",
		illnessOnsetDate: "",
		addressNotes: props?.apptRef?.visitAddress?.notes || "",
		address: props?.apptRef?.visitAddress?.addressLine || "",
		postalCode: props?.apptRef?.visitAddress?.postalCode || "",
		latitude: props?.apptRef?.visitAddress?.latitude || 0,
		longitude: props?.apptRef?.visitAddress?.longitude || 0,
		location: {
			id: props?.apptRef?.location?.id || "",
			city: props?.apptRef?.location?.city || "",
		},
	};

	// for appointment details
	const appointmentScheduling = {
		service: {
			id: props?.apptRef?.service?.id || "",
			name: props?.apptRef?.service?.name || "",
		},
		package: {
			id: props?.apptRef?.package?.id || "",
			name: props?.apptRef?.package?.name || "",
			numberOfVisit: props?.apptRef?.package?.numberOfVisit || 0,
		},
		preferredTherapistGender:
			props?.apptRef?.preferredTherapistGender || "NO PREFERENCE",
		appointmentDateTime: null,
	};

	// for additional settings
	const admins = [
		{
			id: props?.user?.id || "",
			name: props?.user?.name || "",
			email: props?.user?.user?.email || "",
		},
	];
	const referralSource = props?.apptRef?.otherReferralSource
		? "Other"
		: props?.apptRef?.referralSource || undefined;
	const customReferralSource =
		referralSource && checkIsCustomReferral(referralSource)
			? props?.apptRef?.otherReferralSource
			: undefined;
	const fisiohomePartnerBooking = !!props?.apptRef?.fisiohomePartnerBooking;
	const fisiohomePartnerName = props?.apptRef?.otherFisiohomePartnerName
		? "Other"
		: props?.apptRef?.fisiohomePartnerName || undefined;
	const customFisiohomePartnerName =
		fisiohomePartnerName && checkIsCustomFisiohomePartner(fisiohomePartnerName)
			? props?.apptRef?.otherFisiohomePartnerName
			: undefined;
	const additionalSettings = {
		referralSource,
		customReferralSource,
		fisiohomePartnerBooking,
		fisiohomePartnerName,
		customFisiohomePartnerName,
		voucherCode: props?.apptRef?.voucherCode || undefined,
		notes: props?.apptRef?.notes || undefined,
		admins,
	};

	return {
		formOptions: {
			patientRecordSource,
			referenceAppointmentId,
			patientContactSource,
		},
		contactInformation,
		patientDetails,
		appointmentScheduling,
		additionalSettings,
	} as unknown as AppointmentBookingSchema;
};
