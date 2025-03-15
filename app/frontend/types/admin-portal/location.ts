import type { Timestamp } from "../globals";

export type Location = {
	id: number;
	city: string;
	country: string;
	countryCode: string;
	state: string;
} & Timestamp;

export type GroupByLocation = {
	country: string;
	countryCode: string;
	states: {
		name: string;
		cities: {
			id: number;
			name: string;
		}[];
	}[];
};

// from get indonesian province external API: https://api.cahyadsn.com/ or https://github.com/alifbint/indonesia-38-provinsi/tree/main
export type StateID = {
	id: number;
	code: string;
	name: string;
	areaType: string;
} & Timestamp;
