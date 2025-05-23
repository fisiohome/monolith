import type { IsolineConstraint } from "@/hooks/here-maps";

// * default constants for map coordinates
export const MAP_DEFAULT_COORDINATE = [-6.2, 106.81]; // Default to Jakarta coordinates.
export function isDefaultCoordinate(arrValue: number[]): boolean {
	return (
		arrValue.length === MAP_DEFAULT_COORDINATE.length &&
		arrValue.every((value, index) => value === MAP_DEFAULT_COORDINATE[index])
	);
}

export const TRAFFIC_INTERVAL = 60000 * 10; //ten-miuntes interval
export const SESSION_ISOLINE_KEY = "find-therapist-map-isoline";
export const SESSION_MARKERS_KEY = "find-therapist-map-markers";
export const ISOLINE_CONSTRAINTS = [
	{ type: "distance", value: 1000 * 25 } satisfies IsolineConstraint, // 25 km
	{ type: "time", value: 60 * 50 } satisfies IsolineConstraint, // 50 minutes
];
