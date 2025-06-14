import type { GENDERS, PATIENT_CONDITIONS } from "@/lib/constants";
import type { Location } from "./location";

interface PatientContact {
	id: number;
	contactName: string;
	contactPhone: string;
	email: string | null;
	miitelLink: string | null;
	patientId: string;
	createdAt: string;
	updatedAt: string;
}

interface PatientActiveAddress {
	id: number;
	locationId: number;
	latitude: number;
	longitude: number;
	address: string;
	postalCode: string;
	coordinates: number[];
	createdAt: string;
	updatedAt: string;
	notes: string | null;
	location: Location;
}

export interface PatientMedicalRecord {
	illnessOnsetDate: string | null;
	complaintDescription: string;
	condition: (typeof PATIENT_CONDITIONS)[number];
	medicalHistory: string | null;
}

export interface Patient {
	id: string;
	name: string;
	dateOfBirth: string;
	age: number;
	gender: (typeof GENDERS)[number];
	contact?: PatientContact;
	activeAddress?: PatientActiveAddress;
	patientAddresses?: {
		active: boolean;
		address: PatientActiveAddress;
		addressId: number;
		id: number;
		patientId: number;
		updatedAt: string;
	}[];
	createdAt: string;
	updatedAt: string;
}
