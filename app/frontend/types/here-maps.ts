// * for isoline api
export interface Coordinate {
	lat: number;
	lng: number;
}

export type RangeType = "distance" | "time" | "consumption";

type RoutingMode = "short" | "fast";

type TransportMode =
	| "car"
	| "truck"
	| "pedestrian"
	| "taxi"
	| "bus"
	| "privateBus"
	| "scooter"
	| "bicycle";

type ConsumptionType = "electric" | "diesel" | "petrol" | "lpg" | "cng";

type NoticesSeverity = "critical" | "info";

export interface IsolineResult {
	departure: {
		time: Date;
		place: {
			type: string;
			location: Coordinate;
			originalLocation: Coordinate;
		};
	};
	isolines: {
		polygons: Array<{
			outer: string;
		}>;
		range: {
			type: RangeType;
			value: number;
			consumptionType?: ConsumptionType;
		};
	}[];
	notices: {
		title: string;
		code: string;
		severity: NoticesSeverity;
	}[];
}

export interface IsolineRequestParams {
	origin?: { lat: number; lng: number };
	destination?: { lat: number; lng: number };
	rangeType: RangeType;
	rangeValues: number;
	transportMode: TransportMode;
	routingMode: RoutingMode;
	avoid?: {
		// "seasonalClosure" | "tollRoad" | "controlledAccessHighway" | "ferry" | "carShuttleTrain" | "tunnel" | "dirtRoad" | "difficultTurns" | "uTurns"
		features: string;
	};
	evParams?: {
		freeFlowSpeedTable?: string;
		trafficSpeedTable?: string;
		ascent?: number;
		descent?: number;
		auxiliaryConsumption?: number;
	};
}

// * for geocoding api
export interface GeocodingResult {
	title: string;
	id: string;
	resultType: string;
	houseNumberType: string;
	address: {
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
	};
	position: Coordinate;
	access: Coordinate[];
	mapView: {
		west: number;
		south: number;
		east: number;
		north: number;
	};
	houseNumberFallback: boolean;
	scoring: {
		queryScore: number;
		fieldScore: {
			country: number;
			county: number;
			city: number;
			district: number;
			streets: number[];
			houseNumber: number;
			postalCode: number;
			block?: number;
		};
	};
}

export interface GeocodingError {
	status: number;
	title: string;
	correlationId: string;
	requestId: string;
}

export type GeocodingResponse = { items: GeocodingResult[] };
