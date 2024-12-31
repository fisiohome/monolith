import type {
	EMPLOYMENT_STATUSES,
	EMPLOYMENT_TYPES,
	GENDERS,
} from "../../lib/constants";
import type { User } from "../auth";

export type TherapistGender = typeof GENDERS;
export type TherapistEmploymentStatus = typeof EMPLOYMENT_STATUSES;
export type TherapistEmploymentType = typeof EMPLOYMENT_TYPES;
export type TherapistUser = Pick<
	User,
	| "id"
	| "email"
	| "isOnline?"
	| "lastOnlineAt"
	| "lastSignInAt"
	| "currentSignInIp"
	| "lastSignInIp"
	| "suspendAt"
	| "suspendEnd"
	| "suspended?"
>;
export interface TherapistService {
	id: number;
	name: string;
	code: string;
}
export interface TherapistBankDetail {
	id: number;
	bankName: string;
	accountNumber: string;
	accountHolderName: string;
	createdAt: string;
	updatedAt: string;
	active: boolean;
}
export interface TherapistAddress {
	id: number;
	locationId: number;
	latitude: number;
	longitude: number;
	address: string;
	postalCode: string;
	coordinates: number[];
	createdAt: string;
	updatedAt: string;
	active: boolean;
}
export interface Therapist {
	id: string;
	name: string;
	batch: number;
	phoneNumber: string;
	registrationNumber: string;
	modalities: string[];
	specializations: string[];
	employmentStatus: TherapistEmploymentStatus[number];
	employmentType: TherapistEmploymentType[number];
	gender: TherapistGender[number];
	user: User;
	service: TherapistService;
	bankDetails: TherapistBankDetail[];
	addresses: TherapistAddress[];
}
