// * for bubble or label UI configuration
const customizeBubbleUI = () => {
	// customize the bubble container
	const bubbleContentContainer = document.querySelector(".H_ib_content");
	if (bubbleContentContainer) {
		(bubbleContentContainer as HTMLElement).style.margin = "8px";
		(bubbleContentContainer as HTMLElement).style.marginRight = "24px";
	}

	// customize the bubble close icon
	const bubbleContentClose = document.querySelector(".H_ib_close");
	if (bubbleContentClose) {
		(bubbleContentClose as HTMLElement).style.width = "8px";
		(bubbleContentClose as HTMLElement).style.height = "8px";
		(bubbleContentClose as HTMLElement).style.right = "8px";
		(bubbleContentClose as HTMLElement).style.top = "8px";
	}
};
export const computedLabelbubblePosition = (
	firstSectionCoordinates: H.geo.Point[],
) => {
	// Compute centroid of the first section
	// let sumLat = 0;
	// let sumLng = 0;
	// for (const point of firstSectionCoordinates) {
	// 	sumLat += point.lat;
	// 	sumLng += point.lng;
	// }
	// const labelLat = sumLat / firstSectionCoordinates.length;
	// const labelLng = sumLng / firstSectionCoordinates.length;
	// Find northernmost point
	// let maxLat = Number.NEGATIVE_INFINITY;
	// let labelLng = 0;
	// for (const point of firstSectionCoordinates) {
	// 	if (point.lat > maxLat) {
	// 		maxLat = point.lat;
	// 		labelLng = point.lng;
	// 	}
	// }
	// // Add offset (0.01° ~1km)
	// const labelLat = maxLat + 0.01;
	// Dynamic Placement Based on Map Orientation
	// const mapCenter = mapRef.current.getCenter();
	// const position = firstSectionCoordinates.reduce(
	// 	(nearest, point) => {
	// 		const dist = mapCenter.distance(point);
	// 		return dist < nearest.dist ? { point, dist } : nearest;
	// 	},
	// 	{ point: new H.geo.Point(0, 0), dist: Number.POSITIVE_INFINITY },
	// ).point;
	// // Place label at nearest point to map center
	// const labelLat = position.lat;
	// const labelLng = position.lng;
	// First Polygon Vertex
	const firstPoint = firstSectionCoordinates[0];
	const labelLat = firstPoint.lat;
	const labelLng = firstPoint.lng;

	// Bounding Box Top Center
	// const bbox = group.getBoundingBox();
	// const labelLat = bbox.getTop() + 0.005; // Half the offset
	// const labelLng = (bbox.getLeft() + bbox.getRight()) / 2;
	// Easternmost Point with Offset
	// let maxLng = Number.NEGATIVE_INFINITY;
	// let labelLat = 0;
	// for (const point of firstSectionCoordinates) {
	// 	if (point.lng > maxLng) {
	// 		maxLng = point.lng;
	// 		labelLat = point.lat;
	// 	}
	// }
	// // Add 0.01° offset to east
	// const labelLng = maxLng + 0.01;
	return { labelLat, labelLng };
};

export const UIConfig = {
	customizeBubbleUI,
	computedLabelbubblePosition,
};
