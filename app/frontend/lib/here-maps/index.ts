// * default constants for map coordinates
export const MAP_DEFAULT_COORDINATE = [-6.2, 106.81]; // Default to Jakarta coordinates.
export function isDefaultCoordinate(arrValue: number[]): boolean {
	return (
		arrValue.length === MAP_DEFAULT_COORDINATE.length &&
		arrValue.every((value, index) => value === MAP_DEFAULT_COORDINATE[index])
	);
}
