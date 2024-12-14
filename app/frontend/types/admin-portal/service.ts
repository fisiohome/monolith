import type { Timestamp } from "../globals";
import type { Location } from "./location";

type LocationService = Location & { active: boolean };

export type Service = {
	id: number;
	active: boolean;
	code: string;
	name: string;
	locations: LocationService[];
} & Timestamp;
