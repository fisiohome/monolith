import { add, format } from "date-fns";
import { isValidPhoneNumber } from "react-phone-number-input";
import { z } from "zod";
import {
	FISIOHOME_PARTNER,
	GENDERS,
	PATIENT_CONDITIONS,
	PATIENT_REFERRAL_OPTIONS,
	PREFERRED_THERAPIST_GENDER,
} from "./constants";
import { boolSchema, idSchema } from "./validation";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import type { AppointmentPayload } from "@/types/admin-portal/appointment";
import type { Auth } from "@/types/globals";

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
export const APPOINTMENTS = [
	{
		date: add(new Date(), {}),
		status: "upcoming",
		schedules: [
			{
				id: 1,
				brand: {
					name: "Fisiohome",
					code: "FH",
					package: {
						name: "Paket Executive",
						visit: 4,
					},
				},
				timezone: "Asia/Jakarta",
				startTime: format(add(new Date(), { hours: 1 }), "HH:mm"),
				endTime: format(add(new Date(), { hours: 2.5 }), "HH:mm"),
				patient: {
					name: "Patient 1",
					phoneNumber: "+62123456",
					email: "patient1@mail.com",
					age: 28,
					gender: "male",
					address:
						"Jl. Tridarma Utama Raya No.60, RT.2/RW.8, Pd. Labu, Kec. Cilandak, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12450",
				},
				therapist: {
					name: "Therapist 1",
					phoneNumber: "+62123456",
					email: "therapist1@mail.com",
					registrationNumber: "FH-0001",
					gender: "male",
					employmentType: "KARPIS",
				},
				admins: [
					{
						name: "Admin 1",
						email: "admin1@mail.com",
						adminType: "ADMIN_L1",
					},
					{
						name: "Admin 2",
						email: "admin2@mail.com",
						adminType: "ADMIN_L2",
					},
					{
						name: "Admin 3",
						email: "admin3@mail.com",
						adminType: "ADMIN_L3",
					},
				],
			},
			{
				id: 2,
				brand: {
					name: "Fisiohome",
					code: "FH",
					package: {
						name: "Paket Executive",
						visit: 4,
					},
				},
				timezone: "Asia/Jakarta",
				startTime: format(add(new Date(), { hours: 3 }), "HH:mm"),
				endTime: format(add(new Date(), { hours: 4.5 }), "HH:mm"),
				patient: {
					name: "Patient 1",
					phoneNumber: "+62123456",
					email: "patient1@mail.com",
					age: 28,
					gender: "male",
					address:
						"Jl. Tridarma Utama Raya No.60, RT.2/RW.8, Pd. Labu, Kec. Cilandak, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12450",
				},
				therapist: {
					name: "Therapist 1",
					phoneNumber: "+62123456",
					email: "therapist1@mail.com",
					registrationNumber: "FH-0001",
					gender: "male",
					employmentType: "KARPIS",
				},
				admins: [
					{
						name: "Admin 1",
						email: "admin1@mail.com",
						adminType: "ADMIN_L1",
					},
				],
			},
		],
	},
	{
		date: add(new Date(), { days: 1 }),
		status: "upcoming",
		schedules: [
			{
				id: 1,
				brand: {
					name: "Fisiohome",
					code: "FH",
					package: {
						name: "Paket Executive",
						visit: 4,
					},
				},
				timezone: "Asia/Jakarta",
				startTime: format(add(new Date(), { days: 1, hours: -10 }), "HH:mm"),
				endTime: format(add(new Date(), { days: 1, hours: -8.5 }), "HH:mm"),
				patient: {
					name: "Patient 1",
					phoneNumber: "+62123456",
					email: "patient1@mail.com",
					age: 28,
					gender: "male",
					address:
						"Jl. Tridarma Utama Raya No.60, RT.2/RW.8, Pd. Labu, Kec. Cilandak, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12450",
				},
				therapist: {
					name: "Therapist 1",
					phoneNumber: "+62123456",
					email: "therapist1@mail.com",
					registrationNumber: "FH-0001",
					gender: "male",
					employmentType: "KARPIS",
				},
				admins: [
					{
						name: "Admin 1",
						email: "admin1@mail.com",
						adminType: "ADMIN_L1",
					},
				],
			},
		],
	},
	{
		date: add(new Date(), { days: 1 }),
		status: "pending",
		schedules: [
			{
				id: 1,
				brand: {
					name: "Fisiohome",
					code: "FH",
					package: {
						name: "Paket Executive",
						visit: 4,
					},
				},
				timezone: "Asia/Jakarta",
				startTime: format(add(new Date(), { hours: 3 }), "HH:mm"),
				endTime: format(add(new Date(), { hours: 4.5 }), "HH:mm"),
				patient: {
					name: "Patient 1",
					phoneNumber: "+62123456",
					email: "patient1@mail.com",
					age: 28,
					gender: "male",
					address:
						"Jl. Tridarma Utama Raya No.60, RT.2/RW.8, Pd. Labu, Kec. Cilandak, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12450",
				},
				therapist: {
					name: "Therapist 1",
					phoneNumber: "+62123456",
					email: "therapist1@mail.com",
					registrationNumber: "FH-0001",
					gender: "male",
					employmentType: "KARPIS",
				},
				admins: [
					{
						name: "Admin 1",
						email: "admin1@mail.com",
						adminType: "ADMIN_L1",
					},
				],
			},
		],
	},
	{
		date: add(new Date(), { days: -1 }),
		status: "past",
		schedules: [
			{
				id: 1,
				brand: {
					name: "Fisiohome",
					code: "FH",
					package: {
						name: "Paket Executive",
						visit: 4,
					},
				},
				timezone: "Asia/Jakarta",
				startTime: format(add(new Date(), { days: -1, hours: -10 }), "HH:mm"),
				endTime: format(add(new Date(), { days: -1, hours: -8.5 }), "HH:mm"),
				patient: {
					name: "Patient 1",
					phoneNumber: "+62123456",
					email: "patient1@mail.com",
					age: 28,
					gender: "male",
					address:
						"Jl. Tridarma Utama Raya No.60, RT.2/RW.8, Pd. Labu, Kec. Cilandak, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12450",
				},
				therapist: {
					name: "Therapist 1",
					phoneNumber: "+62123456",
					email: "therapist1@mail.com",
					registrationNumber: "FH-0001",
					gender: "male",
					employmentType: "KARPIS",
				},
				admins: [
					{
						name: "Admin 1",
						email: "admin1@mail.com",
						adminType: "ADMIN_L1",
					},
				],
			},
		],
	},
	{
		date: add(new Date(), { days: 1 }),
		status: "cancel",
		schedules: [
			{
				id: 1,
				brand: {
					name: "Fisiohome",
					code: "FH",
					package: {
						name: "Paket Executive",
						visit: 4,
					},
				},
				timezone: "Asia/Jakarta",
				startTime: format(add(new Date(), { days: 1, hours: -10 }), "HH:mm"),
				endTime: format(add(new Date(), { days: 1, hours: -8.5 }), "HH:mm"),
				patient: {
					name: "Patient 1",
					phoneNumber: "+62123456",
					email: "patient1@mail.com",
					age: 28,
					gender: "male",
					address:
						"Jl. Tridarma Utama Raya No.60, RT.2/RW.8, Pd. Labu, Kec. Cilandak, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12450",
				},
				therapist: {
					name: "Therapist 1",
					phoneNumber: "+62123456",
					email: "therapist1@mail.com",
					registrationNumber: "FH-0001",
					gender: "male",
					employmentType: "KARPIS",
				},
				admins: [
					{
						name: "Admin 1",
						email: "admin1@mail.com",
						adminType: "ADMIN_L1",
					},
				],
			},
		],
	},
];

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
	postalCode: z.string().min(1, { message: "Postal code is required" }),
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

// all merge schema
export const APPOINTMENT_BOOKING_SCHEMA = z.object({
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
	} = values;
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
		patientContact: { ...contactInformation },
		patientAddress: {
			...restPatientDetails,
			locationId: String(location.id),
			notes: addressNotes,
		},
		patient: { name: fullName, age, dateOfBirth, gender },
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
export const defineAppointmentFormDefaultValues = ({
	user,
}: {
	user: Auth["currentUser"];
}) => {
	// // for date of birth
	// const dateOfBirth = new Date(1952, 5, 21);
	// const age = calculateAge(dateOfBirth);

	// // for referral
	// const referralSource = "Other";
	// const isCustomReferral = checkIsCustomReferral(referralSource);
	// const customReferralSource = isCustomReferral ? "Linkedin" : undefined;

	// // for fisiohome partner name
	// const fisiohomePartnerName = "Other";
	// const isCustomFisiohomePartner =
	// 	checkIsCustomFisiohomePartner(fisiohomePartnerName);
	// const customFisiohomePartnerName = isCustomFisiohomePartner
	// 	? "Tokopedia"
	// 	: undefined;

	// // for appointment date
	// const appointmentDateTime = add(new Date(), {
	// 	days: 13,
	// 	hours: 5,
	// 	minutes: 15 - (new Date().getMinutes() % 15),
	// });

	// for admin pics
	const admins = [
		{
			id: user?.id || "",
			name: user?.name || "",
			email: user?.user?.email || "",
		},
	];

	return {
		contactInformation: {
			contactName: "",
			contactPhone: "",
			// contactName: "Farida Sagala",
			// contactPhone: "+62 821 6714 6343",
		},
		patientDetails: {
			// fullName: "Farida Sagala",
			// dateOfBirth,
			// age,
			// gender: "FEMALE",
			// condition: "NORMAL",
			// medicalHistory: "Hipertensi",
			// complaintDescription: "Sakit pinggang",
			// illnessOnsetDate: "2 minggu lalu",
			// addressNotes:
			// 	"masuk gang bidan solikah rumah jejer 4 google link: https://maps.app.goo.gl/EzniW78FrYkBVF1w8",
			// address:
			// 	"jl jati baru 1 nomor 9 gerbang hitam, kelurahan kampung bali kec tanah abang kota  jakarta pusat",
			// postalCode: "10250",
			// latitude: -6.18655,
			// longitude: 106.81299,
			// location: {
			// 	id: "5",
			// 	city: "KOTA ADM. JAKARTA PUSAT",
			// },
			// address:
			// 	"Wang Plaza, Jl. Panjang No.kav 17, RT.14/RW.7, Kedoya Utara, Kec. Kb. Jeruk, jakarta, Daerah Khusus Ibukota Jakarta 11520",
			// postalCode: "11520",
			// latitude: -6.17381,
			// longitude: 106.76558,
			// location: {
			// 	id: "2",
			// 	city: "KOTA ADM. JAKARTA BARAT",
			// },

			fullName: "",
			dateOfBirth: null,
			age: null,
			gender: "MALE",
			condition: "NORMAL",
			medicalHistory: "",
			complaintDescription: "",
			illnessOnsetDate: "",
			addressNotes: "",
			address: "",
			postalCode: "",
			latitude: 0,
			longitude: 0,
			location: {
				id: "",
				city: "",
			},
		},
		appointmentScheduling: {
			// service: { id: "7", name: "FISIOHOME_SPECIAL_TIER" },
			// package: { id: "1", name: "Order Visit", numberOfVisit: 1 },
			// preferredTherapistGender: "NO PREFERENCE",
			// appointmentDateTime,

			service: { id: "", name: "" },
			package: { id: "", name: "", numberOfVisit: 0 },
			preferredTherapistGender: "NO PREFERENCE",
			appointmentDateTime: null,
		},
		additionalSettings: {
			// referralSource,
			// customReferralSource,
			// fisiohomePartnerBooking: true,
			// fisiohomePartnerName,
			// customFisiohomePartnerName,
			// voucherCode: "TEBUSMURAH",
			// notes: "This is the patient notes",
			// admins,

			referralSource: "",
			customReferralSource: "",
			fisiohomePartnerBooking: false,
			fisiohomePartnerName: "",
			customFisiohomePartnerName: "",
			voucherCode: "",
			notes: "",
			admins,
		},
	} as unknown as AppointmentBookingSchema;
};
