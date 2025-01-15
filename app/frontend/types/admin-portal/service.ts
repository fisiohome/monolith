import type { Timestamp } from "../globals";
import type { Package, PackageTotalPrice } from "../package";
import type { Location } from "./location";

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
