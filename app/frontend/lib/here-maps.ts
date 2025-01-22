import type { TherapistAddress } from "@/types/admin-portal/therapist";
import { populateQueryParams } from "./utils";

const BASE_URL = {
	GEOCODE: "https://geocode.search.hereapi.com/v1/geocode",
};

export const filterGeocodeByQueryScore = (
	bestResult: GeocodingResult,
	currentResult: GeocodingResult,
) =>
	currentResult.scoring.queryScore > bestResult.scoring.queryScore
		? currentResult
		: bestResult;

interface Address {
	label: string;
	countryCode: string;
	countryName: string;
	countyCode: string;
	county: string;
	city: string;
	district: string;
	subdistrict?: string;
	street: string;
	block?: string;
	postalCode: string;
	houseNumber: string;
}

interface Position {
	lat: number;
	lng: number;
}

interface MapView {
	west: number;
	south: number;
	east: number;
	north: number;
}

interface FieldScore {
	country: number;
	county: number;
	city: number;
	district: number;
	streets: number[];
	houseNumber: number;
	postalCode: number;
	block?: number;
}

export interface GeocodingResult {
	title: string;
	id: string;
	resultType: string;
	houseNumberType: string;
	address: Address;
	position: Position;
	access: Position[];
	mapView: MapView;
	houseNumberFallback: boolean;
	scoring: {
		queryScore: number;
		fieldScore: FieldScore;
	};
}

export interface GeocodingError {
	status: number;
	title: string;
	correlationId: string;
	requestId: string;
}

export type GeocodingResponse = { items: GeocodingResult[] };

export const getGeocoding = async ({
	country,
	state,
	city,
	address,
	postalCode,
}: {
	country: TherapistAddress["location"]["country"];
	state: TherapistAddress["location"]["state"];
	city: TherapistAddress["location"]["city"];
	address: TherapistAddress["address"];
	postalCode: TherapistAddress["postalCode"];
}) => {
	const apiKey = import.meta.env?.VITE_RUBY_HERE_MAPS_API_KEY;
	const query = `country=${country};state=${state};city=${city};postalCode=${postalCode};street=${address}`;
	const { fullUrl } = populateQueryParams(BASE_URL.GEOCODE, {
		apikey: apiKey,
		q: query,
	});

	try {
		const response = await fetch(fullUrl);
		if (!response.ok) {
			const error: GeocodingError = await response.json();
			throw new Error(
				error.title || "Unknown error occurred during geocoding.",
			);
		}

		const data: GeocodingResponse = await response.json();
		if (!data?.items?.length) {
			throw new Error("No results found for the provided address.");
		}

		// Find the result with the highest queryScore
		return data.items.reduce(filterGeocodeByQueryScore);
	} catch (error) {
		console.error(
			"Error while calculating the coordinates:",
			(error as Error).message,
		);
		return null;
	}
};
