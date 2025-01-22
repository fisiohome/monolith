import type { Timestamp } from "../globals";
import type { Location } from "./location";
import type { Package, PackageTotalPrice } from "./package";

type LocationService = Location & { active: boolean };

export type Service = {
	id: number;
	active: boolean;
	code: string;
	name: string;
	description: string | null;
	locations?: LocationService[];
	packages?: {
		list: Package[];
		totalPrices: PackageTotalPrice[];
	};
} & Timestamp;
