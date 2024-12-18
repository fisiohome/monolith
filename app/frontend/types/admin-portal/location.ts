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

// from get indonesian province external API: https://api.cahyadsn.com/
export type StateID = { kode: string; nama: string }
export type CityID = { kode: string; nama: string }