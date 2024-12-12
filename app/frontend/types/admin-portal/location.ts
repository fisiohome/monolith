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
