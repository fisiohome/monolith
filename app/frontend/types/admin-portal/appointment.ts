import type {
	PREFERRED_THERAPIST_GENDER,
	PATIENT_CONDITIONS,
	GENDERS,
} from "@/lib/constants";

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
		age: number;
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
	registrationNumber: string;
	appointmentDateTime: string;
	preferredTherapistGender: string;
	patientIllnessOnsetDate: string;
	patientComplaintDescription: string;
	patientCondition: string;
	patientMedicalHistory: string;
	referralSource: string;
	otherReferralSource: string;
	fisiohomePartnerBooking: boolean;
	fisiohomePartnerName: string;
	otherFisiohomePartnerName: string;
	voucherCode: string;
	notes: string;
	createdAt: string;
	updatedAt: string;
}
