import type { GENDERS } from "@/lib/constants";

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
}

export interface Patient {
	id: string;
	name: string;
	dateOfBirth: string;
	age: number;
	gender: (typeof GENDERS)[number];
	contact?: PatientContact;
	activeAddress?: PatientActiveAddress;
	createdAt: string;
	updatedAt: string;
}
