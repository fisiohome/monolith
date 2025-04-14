import type {
	GENDERS,
	PATIENT_CONDITIONS,
	PREFERRED_THERAPIST_GENDER,
} from "@/lib/constants";
import type { Admin } from "./admin";
import type { Location } from "./location";
import type { Package } from "./package";
import type { Patient } from "./patient";
import type { Service } from "./service";
import type { Therapist } from "./therapist";

export enum AppointmentStatuses {
	pending_therapist_assignment = "PENDING THERAPIST ASSIGNMENT",
	pending_patient_approval = "PENDING PATIENT APPROVAL",
	pending_payment = "PENDING PAYMENT",
	cancelled = "CANCELLED",
	paid = "PAID",
}

export interface AppointmentPayload {
	serviceId: string;
	packageId: string;
	locationId: string;
	therapistId: string | null;
	adminIds: string;
	patientContact: {
		contactName: string;
		contactPhone: string;
		email?: string;
		miitelLink?: string;
	};
	patientAddress: {
		locationId: string;
		latitude: number;
		longitude: number;
		postalCode: string;
		address: string;
		notes?: string;
	};
	patient: {
		name: string;
		gender: (typeof GENDERS)[number];
		dateOfBirth: Date;
		age?: number;
	};
	appointment: {
		patientIllnessOnsetDate?: string;
		patientComplaintDescription: string;
		patientCondition: (typeof PATIENT_CONDITIONS)[number];
		patientMedicalHistory?: string;

		// appointment scheduling
		appointmentDateTime: Date;
		preferredTherapistGender: (typeof PREFERRED_THERAPIST_GENDER)[number];

		//  additional settings
		referralSource?: string;
		otherReferralSource?: string;
		fisiohomePartnerBooking: boolean;
		fisiohomePartnerName?: string;
		otherFisiohomePartnerName?: string;
		voucherCode?: string;
		notes?: string;
	};
}

export interface Appointment {
	id: string;
	therapistId: string | null;
	patientId: string;
	serviceId: number;
	packageId: number;
	locationId: number;
	admins?: Admin[];
	therapist?: Therapist;
	patient?: Patient;
	service?: Service;
	package?: Package;
	location?: Location;
	registrationNumber: string;
	status: keyof typeof AppointmentStatuses;
	appointmentDateTime: string;
	preferredTherapistGender: (typeof PREFERRED_THERAPIST_GENDER)[number];
	patientIllnessOnsetDate: string | null;
	patientComplaintDescription: string;
	patientCondition: (typeof PATIENT_CONDITIONS)[number];
	patientMedicalHistory: string | null;
	referralSource: string | null;
	otherReferralSource: string | null;
	fisiohomePartnerBooking: boolean;
	fisiohomePartnerName: string | null;
	otherFisiohomePartnerName: string | null;
	voucherCode: string | null;
	notes: string | null;
	voucherDiscount: string;
	formattedDiscount: string;
	totalPrice: string;
	formattedTotalPrice: string;
	startTime?: string;
	endTime?: string;
	createdAt: string;
	updatedAt: string;
}
