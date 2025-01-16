import type {
	EMPLOYMENT_STATUSES,
	EMPLOYMENT_TYPES,
	GENDERS,
} from "../../lib/constants";
import type { UserSerialize } from "../auth";
import type { Location } from "./location";

export type TherapistGender = typeof GENDERS;
export type TherapistEmploymentStatus = typeof EMPLOYMENT_STATUSES;
export type TherapistEmploymentType = typeof EMPLOYMENT_TYPES;
export type TherapistUser = UserSerialize;
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
	location: Location;
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
	user: TherapistUser;
	service: TherapistService;
	bankDetails: TherapistBankDetail[];
	addresses: TherapistAddress[];
}
