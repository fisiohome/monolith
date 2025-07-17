import type { HereMapProps } from "@/components/shared/here-map";
import { isDefaultCoordinate } from "@/lib/here-maps";
import { filterGeocodeByQueryScore } from "@/lib/here-maps/api";
import routingLib from "@/lib/here-maps/routing";
import { debounce } from "@/lib/utils";
import type {
	Coordinate,
	GeocodingResponse,
	GeocodingResult,
	IsolineRequestParams,
	IsolineResult,
} from "@/types/here-maps";
import H from "@here/maps-api-for-javascript";
import { useCallback, useRef, useState } from "react";
import isolineLib from "../../lib/here-maps/isoline";
import { UIConfig } from "../../lib/here-maps/ui";
import useMarkers from "./use-markers";

/**
 * @interface Alignment
 * @description Defines alignment options for HERE UI controls on the map view.
 *
 * The alignment within the map view port can be:
 * <pre>
 * +--------------------------------------------------------------------------------+
 * |  "top-left"  > >           &lt; &lt;  "top-center"  > >            &lt; &lt;  "top-right"  |
 * |  "left-top"                                                       "right-top"  |
 * |  v                                                                          v  |
 * |  v                                                                          v  |
 * |                                                                                |
 * |                                                                                |
 * |  ^                                                                          ^  |
 * |  ^                                                                          ^  |
 * |  "left-middle"                                                 "right-middle"  |
 * |  v                                                                          v  |
 * |  v                                                                          v  |
 * |                                                                                |
 * |                                                                                |
 * |  ^                                                                          ^  |
 * |  ^                                                                          ^  |
 * |  "left-bottom"                                                 "right-bottom"  |
 * |  "bottom-left"  > >       &lt; &lt;  "bottom-center"  > >       &lt; &lt;  "bottom-right"  |
 * +--------------------------------------------------------------------------------+
 * </pre>
 */
type Alignment =
	(typeof H.ui.LayoutAlignment)[keyof typeof H.ui.LayoutAlignment];

/**
 * @interface MarkerData
 * @description Represents a data structure for a map marker:
 * @param position (lat, lng)
 * @param address (string)
 * @param bubbleContent optional for info pop-ups
 * @param additional optional for any additional data
 */
export interface MarkerData {
	position: Coordinate;
	address: string;
	bubbleContent?: string | Node | undefined;
	customIcon?: H.map.Icon | null;
	additional?: any;
}

/**
 * @interface FeasibleResult
 */
export interface FeasibleResult
	extends Pick<MarkerData, "position" | "address" | "additional"> {
	isFeasible: boolean;
}

/**
 * @interface IsolineConstraint:
 * @description Define how large that range is (e.g., time in seconds, distance in meters).
 */
export type IsolineConstraint = {
	type: IsolineRequestParams["rangeType"];
	value: number;
};

/**
 * @interface HereMapHooksProps
 * @description Defines the structure of the props required by the useHereMap hook.
 * @param containerRef  reference to the HTML container for the map
 * @param address structured address information
 * @param coordinate initial map center coordinates [latitude, longitude]
 * @param apiKey HERE Maps API key for authentication
 */
export interface HereMapHooksProps {
	containerRef: React.RefObject<HTMLDivElement>;
	address: HereMapProps["address"];
	coordinate: HereMapProps["coordinate"];
	apiKey: string;
}

/**
 * @interface useHereMap:
 * @description A custom hook encapsulating the main HERE Map logic:
 * - Map initialization
 * - Marker management
 * - Isoline calculation and rendering
 * - Geocoding
 * - Traffic updates
 */
export default function useHereMap(
	containerRef: HereMapHooksProps["containerRef"],
	coordinate: HereMapHooksProps["coordinate"],
	address: HereMapHooksProps["address"],
	apiKey: HereMapHooksProps["apiKey"],
) {
	// * These refs store various HERE Map instances and configuration.
	const mapRef = useRef<H.Map | null>(null);
	const platformRef = useRef<H.service.Platform | null>(null);
	const behaviorRef = useRef<H.mapevents.Behavior | null>(null);
	const uiRef = useRef<H.ui.UI | null>(null);

	// * Loading state
	const [isLoading, setIsLoading] = useState(false);
	const [isLoadingType, setIsLoadingType] = useState<
		null | "geocode" | "isoline" | "routing"
	>(null);

	// * marker group
	/**
	 * @constant primaryMarkerGroupRef
	 * @description for the main markers
	 */
	const primaryMarkerGroupRef = useRef<H.map.Group | null>(null);
	/**
	 * @constant secondaryMarkerGroupRef
	 * @description for secondary markers
	 */
	const secondaryMarkerGroupRef = useRef<H.map.Group | null>(null);

	// * isoline group
	/**
	 * @constant timeIsolineGroupRef
	 * @description for time-based isolines
	 */
	const timeIsolineGroupRef = useRef<H.map.Group | null>(null);
	/**
	 * @constant distanceIsolineGroupRef
	 * @description for distance-based isolines
	 */
	const distanceIsolineGroupRef = useRef<H.map.Group | null>(null);
	/**
	 * @constant allIsolineGroupRef
	 * @description for all isoline groups
	 */
	const allIsolineGroupRef = useRef<H.map.Group | null>(null);
	/**
	 * @constant isolineCoordinatesRef
	 * @description Stores the polygon coordinates returned by the isoline calculations.
	 */
	const isolineCoordinatesRef = useRef<{
		time: H.geo.Point[][];
		distance: H.geo.Point[][];
		consumption: H.geo.Point[][];
	}>({ time: [], distance: [], consumption: [] });
	/**
	 * @constant routeLineRef
	 * @description Stores the polyline object representing the route on the map.
	 */
	const routeLineRef = useRef<H.map.Polyline | null>(null);
	/**
	 * @constant routeTooltipRef
	 * @description Stores the tooltip (info bubble) object for displaying route information.
	 */
	const routeTooltipRef = useRef<H.ui.InfoBubble | null>(null);

	/** Center of the map for display or debug. */
	const [centerMap, setCenterMap] = useState<Coordinate>({
		lat: 0,
		lng: 0,
	});

	// * icons group, Predefine SVG icons to be reused for markers.
	const { primaryIcon, secondaryIcon } = useMarkers();

	// * map initialization function group
	/**
	 * @function removeCopyrights
	 * @description Removes the default HERE Map copyrights from the DOM.
	 */
	const removeCopyrights = useCallback(() => {
		document?.querySelector(".H_copyright")?.remove();
	}, []);
	/**
	 * @function initialize
	 * @description Sets up the HERE map with platform, events, UI, etc.
	 */
	const initialize = (options?: { disabledEvent?: boolean }) => {
		try {
			if (!mapRef.current && containerRef.current) {
				console.group();
				console.info("=== Start process to initializing the HERE Map ===");
				console.info("Proceed the initialization");
				const { disabledEvent = false } = options || {};
				const [lat, lng] = coordinate;

				// Create platform, default layers, and the map instance
				platformRef.current = new H.service.Platform({ apikey: apiKey });
				const defaultLayers = platformRef.current.createDefaultLayers({
					pois: true,
				}) as any;

				const map = new H.Map(
					containerRef.current,
					defaultLayers.vector.normal.map,
					{
						zoom: 14,
						center: { lat, lng },
						pixelRatio: window.devicePixelRatio || 1,
						padding: { top: 16, right: 16, bottom: 16, left: 16 },
					},
				);

				mapRef.current = map;
				removeCopyrights();

				// Add traffic layer
				map.addLayer(defaultLayers.vector.traffic.map);

				// Set up map behavior (pan, zoom, etc.)
				const mapEvents = new H.mapevents.MapEvents(map);
				behaviorRef.current = new H.mapevents.Behavior(mapEvents);
				// disabled the map behaviour
				if (disabledEvent) {
					behaviorRef.current.disable();
				}

				// Add default UI components (UI zooming control, and another UI map settings)
				uiRef.current = H.ui.UI.createDefault(map, defaultLayers);
				uiRef.current.getControl("mapsettings")?.setVisibility(false);
				uiRef.current
					.getControl("zoom")
					?.setAlignment("bottom-left" as Alignment);

				// If the coordinate is valid (not 0,0), add a default marker
				if (lat && lng && !isDefaultCoordinate(coordinate)) {
					console.info("Add the default markers");
					marker.onAdd(
						[
							{
								position: { lat, lng },
								address: address.address,
							},
						],
						{ isSecondary: false, changeMapView: true },
					);
					setCenterMap({ lat, lng });
				}
				console.info("=== Process to initializing the HERE Map Finished ===");
				console.groupEnd();
			}
		} catch (err) {
			console.error("initialize", err);
		}
	};

	// * marker function group
	const onAddMarker = (
		locations: MarkerData[],
		options?: {
			isSecondary?: boolean;
			changeMapView?: boolean;
			useRouting?: boolean;
		},
	) => {
		try {
			if (!mapRef.current) return;

			const {
				isSecondary = false,
				changeMapView = false,
				useRouting = false,
			} = options || {};

			const groupRef = isSecondary
				? secondaryMarkerGroupRef
				: primaryMarkerGroupRef;
			// Remove existing group if it exists
			onRemoveMarker({ isSecondary });

			// Create a new group for the markers and save it in the ref.
			const group = new H.map.Group();
			groupRef.current = group;

			// Add each marker to the group
			const defaultIcon = isSecondary ? secondaryIcon : primaryIcon;
			for (const location of locations) {
				const marker = new H.map.Marker(location.position, {
					icon: location?.customIcon || defaultIcon,
					data: location,
					volatility: true,
				});

				// Event listener example: show bubble on tap
				marker.addEventListener(
					"tap",
					debounce(async (evt: any) => {
						const tappedMarker = evt?.target;
						const markerData = tappedMarker?.getData() as MarkerData | null;
						if (!markerData) return;

						// If secondary marker, handle route calculation
						if (isSecondary && useRouting) {
							// Get primary marker position as destination
							const primaryMarkers =
								primaryMarkerGroupRef.current?.getObjects();
							if (!primaryMarkers || primaryMarkers.length === 0) return;
							const primaryMarker = primaryMarkers[0] as H.map.Marker;
							// const primaryPosition = primaryMarker.getGeometry();

							await calculateRouting({
								origin: markerData,
								destination: primaryMarker.getData(),
							});
							return;
						}

						// handling the bubble UI
						if (markerData.bubbleContent) {
							const bubble = new H.ui.InfoBubble(location.position, {
								content: markerData.bubbleContent,
							});
							uiRef.current?.addBubble(bubble);

							UIConfig.customizeBubbleUI();
						}

						// Optionally re-center the map on the tapped marker
						mapRef.current?.setCenter(tappedMarker?.getGeometry(), true);
					}, 200),
				);

				// Add marker to the group
				group.addObject(marker);
			}

			// Add the marker group to the map
			mapRef.current.addObject(group);

			// Optionally adjust map bounds to include these markers
			const bounds = group.getBoundingBox();
			if (changeMapView && bounds) {
				/* *
				 * Update the map view with bounds (and adjust zoom if needed)
				 *
				 * Note:
				 * animation just applied on the zoom level because to prevent the unnecesarry maps loaded, while "getViewModel().setLookAtData()"
				 * this way saves Maps API for JavaScript quota
				 * */
				mapRef.current.getViewModel().setLookAtData({ bounds });
				mapRef.current.setZoom(18, true);

				// Update center based on the first marker
				if (locations[0]) {
					setCenterMap({
						lat: locations[0].position.lat,
						lng: locations[0].position.lng,
					});
				}
			}
		} catch (err) {
			console.error("marker.onAdd", err);
		}
	};
	const onRemoveMarker = useCallback((options?: { isSecondary?: boolean }) => {
		try {
			if (!mapRef.current) return;

			// remove mark bubble ui
			const bubbles = uiRef.current?.getBubbles();
			if (bubbles) {
				for (const bubble of bubbles) {
					uiRef.current?.removeBubble(bubble);
				}
			}

			// remove the marker
			const { isSecondary = false } = options || {};
			const groupRef = isSecondary
				? secondaryMarkerGroupRef
				: primaryMarkerGroupRef;
			if (groupRef.current) {
				mapRef.current.removeObject(groupRef.current);
				groupRef.current = null;
			}

			// reset the center of map data
			setCenterMap({ lat: 0, lng: 0 });
		} catch (err) {
			console.error("marker.onRemove", err);
		}
	}, []);
	const marker = {
		/**
		 * @function onAdd
		 * @description flexible for primary or secondary markers,
		 * to adds a set of markers to the map based on the provided locations.
		 */
		onAdd: onAddMarker,
		/**
		 * @function onRemove
		 * @description Removes the  markers from the map by removing the marker group object.
		 * This function uses the `useCallback` hook to memoize the callback, ensuring
		 * that the function is not recreated on every render.
		 */
		onRemove: onRemoveMarker,
	};

	// * geocoding function group
	const geocode = {
		/**
		 * @function onCalculate
		 * @description uses HERE geocoding to convert an address to coordinates
		 */
		onCalculate: useCallback(async (): Promise<GeocodingResult | null> => {
			if (!platformRef.current) return null;

			setIsLoading(true);
			setIsLoadingType("geocode");
			try {
				/**
				 * We combine all address parts into a `qq` query param to improve
				 * geocoding accuracy (works better than just `q` in some cases).
				 */
				const qqParts = [
					`country=${address.country}`,
					`state=${address.state}`,
					`city=${address.city}`,
					`street=${address.address}`,
				];

				if (address?.postalCode) {
					qqParts.push(`postalCode=${address.postalCode}`);
				}
				const params: H.service.ServiceParameters = !address?.postalCode
					? { q: address.address }
					: { qq: qqParts.join(";") };

				const searchService = platformRef.current.getSearchService();
				if (!searchService) {
					console.error("Geocoder service is not available.");
					return null;
				}

				return new Promise((resolve, reject) => {
					searchService.geocode(
						params,
						(promiseResult) => {
							const result = promiseResult as GeocodingResponse;
							const locations = result?.items;
							if (!locations?.length) {
								console.warn(
									"No geocoding results found for the provided address.",
								);
								resolve(null);
								return;
							}

							// Filter and pick the best location based on custom logic
							const bestMatch = locations.reduce(filterGeocodeByQueryScore);
							resolve(bestMatch);
						},
						(error: Error) => {
							console.error("Error during geocoding:", error.message);
							reject(error);
						},
					);
				});
			} catch (err) {
				console.error("geocode.onCalculate", err);
				return null;
			} finally {
				setTimeout(() => {
					setIsLoading(false);
					setIsLoadingType(null);
				}, 250);
			}
		}, [address]),
	};

	/**
	 * * isoline function group
	 * the purposes isoline function is to calculates an isoline route based on the provided parameters.
	 *
	 * * docs: https://www.here.com/docs/bundle/isoline-routing-api-developer-guide-v8/page/README.html
	 * * docs: https://www.here.com/docs/bundle/isoline-routing-api-developer-guide-v8/page/topics/use-cases/distance-isoline.html
	 *
	 * ? when using the origin or destination param? refer to this docs:
	 * ? https://www.here.com/docs/bundle/isoline-routing-api-developer-guide-v8/page/topics/use-cases/reverse-time-isoline.html
	 */
	/**
	 * @function addIsolineToMap
	 * @description Adds an isoline polygon to the map based on the provided isoline data.
	 */
	const addIsolineToMap = (
		isoline: IsolineResult["isolines"][number],
		constraint: IsolineConstraint,
		autoZoom = true,
	) => {
		try {
			if (!mapRef.current) return;
			const rangeType = constraint.type;

			// clear the calculated routes
			removeRouting();

			// Clear previous isolines of the same type
			const prevGroup =
				constraint.type === "time"
					? timeIsolineGroupRef.current
					: distanceIsolineGroupRef.current;
			if (prevGroup) {
				mapRef.current.removeObject(prevGroup);
			}

			// Create new group with appropriate styling
			const group = new H.map.Group();

			// Store coordinates and build the polygons
			const style = isolineLib.LABEL_UI_STYLE[rangeType];
			let firstSectionCoordinates: H.geo.Point[] | null = null;
			isolineCoordinatesRef.current[rangeType] = [];
			for (const section of isoline.polygons) {
				const lineString = H.geo.LineString.fromFlexiblePolyline(section.outer);
				const points = lineString.getLatLngAltArray();
				const coordinates: H.geo.Point[] = [];

				for (let i = 0; i < points.length; i += 3) {
					coordinates.push(new H.geo.Point(points[i], points[i + 1]));
				}

				isolineCoordinatesRef.current[rangeType].push(coordinates);

				const polygon = new H.map.Polygon(lineString, {
					style: { lineWidth: 2, ...style },
					data: section,
				});
				group.addObject(polygon);

				// Store first section's coordinates for label placement
				if (!firstSectionCoordinates) {
					firstSectionCoordinates = coordinates;
				}
			}

			if (firstSectionCoordinates && firstSectionCoordinates.length > 0) {
				// Add label to the first polygon section
				const { labelElement, labelLat, labelLng, labelText } =
					isolineLib.computedLabelElement({
						firstSectionCoordinates,
						constraint,
					});

				// Create and add the DomMarker
				const domIcon = new H.map.DomIcon(labelElement);
				const labelMarker = new H.map.DomMarker(
					{ lat: labelLat, lng: labelLng },
					{
						icon: domIcon,
						data: { lat: labelLat, lng: labelLng, label: labelText },
					},
				);
				group.addObject(labelMarker);
			}

			if (rangeType === "time")
				// Save group reference
				timeIsolineGroupRef.current = group;
			else distanceIsolineGroupRef.current = group;

			// show the polygons to the map
			mapRef.current.addObject(group);

			if (autoZoom) {
				// zoom the map to the bounding reactangle
				mapRef.current.getViewModel().setLookAtData({
					bounds: group.getBoundingBox(),
				});
			}

			return group;
		} catch (err) {
			console.error("isoline.addIsolineToMap", err);
		}
	};
	const addAllIsolineToMap = (values: IsolineResult["isolines"]) => {
		try {
			if (!mapRef.current) return;

			// Remove previous master group if it exists
			if (allIsolineGroupRef.current) {
				mapRef.current.removeObject(allIsolineGroupRef.current);
				allIsolineGroupRef.current = null;
			}

			const masterGroup = new H.map.Group();
			const boundingBoxes: H.geo.Rect[] = [];
			const seenKeys = new Set<string>();
			for (const isoline of values) {
				const key = `${isoline.range.type}-${isoline.range.value}`;
				if (seenKeys.has(key)) continue; // Skip duplicate
				seenKeys.add(key);
				// Build the polygon(s) for this isoline
				const rangeType = isoline.range.type;
				const style = isolineLib.LABEL_UI_STYLE[rangeType];
				let firstSectionCoordinates: H.geo.Point[] | null = null;
				for (const section of isoline.polygons) {
					const lineString = H.geo.LineString.fromFlexiblePolyline(
						section.outer,
					);
					const points = lineString.getLatLngAltArray();
					const coordinates: H.geo.Point[] = [];
					for (let i = 0; i < points.length; i += 3) {
						coordinates.push(new H.geo.Point(points[i], points[i + 1]));
					}
					const polygon = new H.map.Polygon(lineString, {
						style: { lineWidth: 2, ...style },
						data: section,
					});
					masterGroup.addObject(polygon);
					if (!firstSectionCoordinates) {
						firstSectionCoordinates = coordinates;
					}
				}
				if (firstSectionCoordinates && firstSectionCoordinates.length > 0) {
					const { labelElement, labelLat, labelLng, labelText } =
						isolineLib.computedLabelElement({
							firstSectionCoordinates,
							constraint: isoline.range,
						});
					const domIcon = new H.map.DomIcon(labelElement);
					const labelMarker = new H.map.DomMarker(
						{ lat: labelLat, lng: labelLng },
						{
							icon: domIcon,
							data: { lat: labelLat, lng: labelLng, label: labelText },
						},
					);
					masterGroup.addObject(labelMarker);
				}
				if (masterGroup.getBoundingBox()) {
					boundingBoxes.push(masterGroup.getBoundingBox());
				}
			}
			mapRef.current.addObject(masterGroup);
			allIsolineGroupRef.current = masterGroup;

			if (boundingBoxes.length > 0 && mapRef?.current) {
				const mergedBox = mergeAllRectangles(boundingBoxes);
				if (mergedBox) {
					mapRef?.current?.getViewModel()?.setLookAtData({ bounds: mergedBox });
				}
			} else {
				console.error("No bounding boxes found for constraints.");
				return null;
			}

			return boundingBoxes;
		} catch (err) {
			console.error("isoline.addAllIsolineToMap", err);
		}
	};
	const removeIsolines = useCallback(() => {
		try {
			if (!mapRef.current) return;

			// Remove time isoline
			if (timeIsolineGroupRef.current) {
				mapRef.current.removeObject(timeIsolineGroupRef.current);
				timeIsolineGroupRef.current = null;
			}

			// Remove distance isoline
			if (distanceIsolineGroupRef.current) {
				mapRef.current.removeObject(distanceIsolineGroupRef.current);
				distanceIsolineGroupRef.current = null;
			}

			// Clear stored coordinates
			isolineCoordinatesRef.current.time = [];
			isolineCoordinatesRef.current.distance = [];
		} catch (err) {
			console.error("isoline.removeIsolines", err);
		}
	}, []);
	/**
	 * @function calculateIsolineSingleContrainst
	 * @description single constraint isoline
	 */
	const calculateIsolineSingleContrainst = async (
		params: IsolineRequestParams,
		shouldZoom = true,
	): Promise<IsolineResult["isolines"][number] | null> => {
		if (!platformRef.current) {
			console.error("Platform is not available");
			return null;
		}

		setIsLoading(true);
		setIsLoadingType("isoline");
		try {
			// Validate parameters for therapist availability use case
			if (!params.origin && !params.destination) {
				console.error(
					"Isoline calculation requires either origin or destination parameter",
				);
				return null;
			}

			if (params.origin && params.destination) {
				console.warn(
					"Both origin and destination provided. For therapist availability, prefer origin (patient location)",
				);
			}

			// Get the routing service from the platform
			const router = platformRef.current.getRoutingService(undefined, 8);

			// Construct the request parameters for the isoline calculation
			// For therapist availability: use origin (patient location) as the center point
			// The isoline shows where therapists can reach the patient from within the range
			const requestParams = {
				...(params.origin && {
					origin: `${params.origin.lat},${params.origin.lng}`,
				}),
				...(params.destination && {
					destination: `${params.destination.lat},${params.destination.lng}`,
				}),
				"range[type]": params.rangeType,
				"range[values]": params.rangeValues,
				transportMode: params.transportMode,
				...(params.routingMode && {
					routingMode: params.routingMode,
				}),
				...(params.traffic?.mode && {
					"traffic[mode]": params.traffic.mode,
				}),
				optimizeFor: params.optimizeFor || "balanced",
				departureTime: params.departureTime || new Date().toISOString(),
				...(params.avoid && {
					"avoid[features]": params.avoid.features,
				}),
			};

			return new Promise<IsolineResult["isolines"][number] | null>(
				(resolve, reject) => {
					router.calculateIsoline(
						requestParams,
						(result) => {
							const isolines = (result as IsolineResult).isolines;
							if (!isolines?.length) {
								resolve(null);
								return;
							}

							// Add the isoline to the map
							const [isoline] = isolines;
							addIsolineToMap(
								isoline,
								{ type: params.rangeType, value: params.rangeValues },
								shouldZoom,
							);
							resolve(isoline);
						},
						(error) => {
							console.error("Isoline calculation error:", error);
							reject(error);
						},
					);
				},
			);
		} catch (err) {
			console.error("isoline.calculateIsolineSingleContrainst", err);
			return null;
		} finally {
			setTimeout(() => {
				setIsLoading(false);
				setIsLoadingType(null);
			}, 250);
		}
	};
	/**
	 * @function calculateIsolineBothConstraints
	 * @description multiple constraint isoline
	 */
	const calculateIsolineBothConstraints = async ({
		coord,
		constraints,
	}: {
		coord: Coordinate;
		constraints: IsolineConstraint[];
	}): Promise<IsolineResult["isolines"] | null> => {
		if (!platformRef.current) {
			console.error("Platform is not available");
			return null;
		}
		setIsLoading(true);
		setIsLoadingType("isoline");

		try {
			// Create promises for each constraint isoline calculation
			const promises = constraints.map((constraint) => {
				// Use constraint-specific optimized parameters
				const params = getConstraintSpecificParams(coord, constraint);

				return calculateIsolineSingleContrainst(params, false);
			});

			const boundingBoxes: H.geo.Rect[] = [];
			const allIsolines: IsolineResult["isolines"][number][] = [];
			const results = await Promise.allSettled(promises);

			// Process each settled result
			for (let i = 0; i < results.length; i++) {
				const res = results[i];
				if (res.status === "rejected" || !res.value) {
					console.error(
						`Failed or no isoline for constraint ${constraints[i].type}`,
					);
					return null;
				}

				// Valid isoline found
				const isoline = res.value;
				allIsolines.push(isoline);

				// Add isoline to the map without zooming
				const constraint = constraints[i];
				const group = addIsolineToMap(isoline, constraint, false);
				if (group) boundingBoxes.push(group.getBoundingBox());
			}

			// Merge bounding boxes and adjust map view
			if (boundingBoxes.length > 0 && mapRef.current) {
				const mergedBox = mergeAllRectangles(boundingBoxes);
				if (mergedBox) {
					mapRef.current.getViewModel().setLookAtData({ bounds: mergedBox });
				}
			} else {
				console.error("No bounding boxes found for constraints.");
				return null;
			}

			// Return the array of successful isolines
			return allIsolines;
		} catch (err) {
			console.error("isoline.calculateIsolineBothConstraints", err);
			return null;
		} finally {
			setTimeout(() => {
				setIsLoading(false);
				setIsLoadingType(null);
			}, 250);
		}
	};
	/**
	 * @function getConstraintSpecificParams
	 * @description Generates optimized parameters specific to each constraint type
	 *
	 * @param coord - The coordinate (patient location)
	 * @param constraint - The isoline constraint (time or distance only for therapist availability)
	 * @returns Optimized IsolineRequestParams for the specific constraint type
	 *
	 * @example
	 * Constraint-specific optimized parameters (RECOMMENDED)
	 * const constraints = [
	 *   { type: "time", value: 50 * 60 },    // 50 minutes
	 *   { type: "distance", value: 25000 },  // 25km
	 * ];
	 *
	 * Each constraint gets optimized parameters automatically:
	 * - Time: high quality, real-time traffic, fine resolution
	 * - Distance: performance optimized, no traffic, coarser resolution
	 * const results = await isoline.onCalculate.both({
	 *   coord: patientCoords,
	 *   constraints,
	 * });
	 *
	 * Or manually for single constraint:
	 * const timeParams = isoline.getConstraintSpecificParams(patientCoords, {
	 *   type: "time",
	 *   value: 50 * 60,
	 * });
	 *
	 * Constraint-specific avoid features:
	 *
	 * Time-based isoline (optimized for travel time):
	 * - tollRoad: Avoid toll booths (delays)
	 * - ferry: Avoid ferry crossings (waiting times)
	 * - carShuttleTrain: Avoid car shuttle trains (delays)
	 * - tunnel: Avoid tunnels (potential congestion)
	 * - dirtRoad: Avoid unpaved roads (slower speeds)
	 *
	 * Distance-based isoline (optimized for coverage area):
	 * - tollRoad: Avoid toll roads (may force longer routes)
	 * - ferry: Avoid ferries (adds distance to reach ferry)
	 * - controlledAccessHighway: Avoid highways (limited access)
	 * - carShuttleTrain: Avoid car shuttle trains (limited access points)
	 */
	const getConstraintSpecificParams = useCallback(
		(
			coord: Coordinate,
			constraint: IsolineConstraint,
		): IsolineRequestParams => {
			const baseParams = {
				origin: coord,
				rangeType: constraint.type,
				rangeValues: constraint.value,
				transportMode: "car" as const,
			};

			switch (constraint.type) {
				case "time":
					return {
						...baseParams,
						routingMode: "short", // Optimize for shortest route for time accuracy
						departureTime: new Date().toISOString(),
						traffic: {
							mode: "default",
						},
						optimizeFor: "quality",
						// Time-based isoline: Avoid features that slow down travel time
						avoid: {
							features: "tollRoad,ferry,carShuttleTrain,tunnel,dirtRoad",
							// Avoid toll roads (delays at toll booths)
							// Avoid ferries (long waiting times)
							// Avoid car shuttle trains (delays)
							// Avoid tunnels (potential congestion)
							// Avoid dirt roads (slower speeds)
						},
					};

				case "distance":
					return {
						...baseParams,
						routingMode: "fast", // Optimize for fastest route for distance efficiency
						departureTime: new Date().toISOString(),
						traffic: {
							mode: "default",
						},
						optimizeFor: "quality",
						// Distance-based isoline: Avoid features that increase distance
						avoid: {
							features:
								"tollRoad,ferry,controlledAccessHighway,carShuttleTrain",
							// Avoid toll roads (may force longer routes)
							// Avoid ferries (adds distance to reach ferry)
							// Avoid controlled access highways (may not be accessible from all areas)
							// Avoid car shuttle trains (limited access points)
						},
					};

				default:
					// Fallback to balanced approach for any other constraint types
					console.warn(
						`Unsupported constraint type: ${constraint.type}. Using balanced approach.`,
					);
					return {
						...baseParams,
						routingMode: "fast",
						departureTime: new Date().toISOString(),
						traffic: {
							mode: "default",
						},
						shape: {
							maxPoints: 1000,
							maxResolution: 200,
						},
						optimizeFor: "balanced",
						// Balanced approach: Standard avoid features
						avoid: {
							features: "tollRoad,ferry,controlledAccessHighway",
						},
					};
			}
		},
		[],
	);

	const mergeAllRectangles = (rects: H.geo.Rect[]): H.geo.Rect | null => {
		if (!rects || rects.length === 0) {
			return null;
		}

		// Initialize min/max values
		let top = Number.NEGATIVE_INFINITY; // "top" in HERE means the higher latitude value
		let bottom = Number.POSITIVE_INFINITY; // lower latitude value
		let left = Number.POSITIVE_INFINITY; // smaller longitude
		let right = Number.NEGATIVE_INFINITY; // bigger longitude

		for (const r of rects) {
			// HERE's Lat/Lng bounding box:
			//   top (max lat), left (min lng), bottom (min lat), right (max lng)
			top = Math.max(top, r.getTop());
			bottom = Math.min(bottom, r.getBottom());
			left = Math.min(left, r.getLeft());
			right = Math.max(right, r.getRight());
		}

		// Construct the merged rectangle
		// new H.geo.Rect(top, left, bottom, right)
		return new H.geo.Rect(top, left, bottom, right);
	};

	const isoline = {
		onCalculate: {
			single: calculateIsolineSingleContrainst,
			both: calculateIsolineBothConstraints,
		},
		onRemove: removeIsolines,
		onAdd: addIsolineToMap,
		onAddAll: addAllIsolineToMap,
	};

	// * routing
	const removeRouting = useCallback(() => {
		try {
			// Remove route line from map
			if (routeLineRef.current) {
				mapRef.current?.removeObject(routeLineRef.current);
				routeLineRef.current = null;
			}

			// Remove tooltip bubble from UI
			if (routeTooltipRef.current) {
				uiRef.current?.removeBubble(routeTooltipRef.current);
				routeTooltipRef.current = null;
			}
		} catch (err) {
			console.error("routing.removeRouting", err);
		}
	}, []);
	const calculateRouting = useCallback(
		async ({
			destination,
			origin,
		}: {
			destination: MarkerData;
			origin: MarkerData;
		}) => {
			// Remove previous route and tooltip
			removeRouting();

			setIsLoading(true);
			setIsLoadingType("routing");
			// Calculate route
			try {
				const router = platformRef.current?.getRoutingService(undefined, 8);
				if (!router) return;

				const params: H.service.ServiceParameters = {
					transportMode: "car",
					return:
						"polyline,actions,instructions,summary,travelSummary,mlDuration,typicalDuration,turnByTurnActions,elevation,routeHandle,passthrough,incidents,routingZones,truckRoadTypes,tolls,routeLabels,potentialTimeDependentViolations,noThroughRestrictions",
					destination: `${destination.position.lat},${destination.position.lng}`,
					origin: `${origin.position.lat},${origin.position.lng}`,
					routingMode: "short",
					avoid: { features: "tollRoad,ferry,controlledAccessHighway" },
				};
				const routeResult = await new Promise<H.service.ServiceResult>(
					(resolve, reject) => {
						router.calculateRoute(params, resolve, reject);
					},
				);

				// Handle v8 response format
				const route = (routeResult as any).routes[0];
				const section = (route as any).sections[0];

				// Extract summary data
				const distance = (section.summary.length / 1000).toFixed(1); // km
				const time = Math.round(section.summary.duration / 60); // mins

				// Create route line
				const lineString = H.geo.LineString.fromFlexiblePolyline(
					section.polyline,
				);
				const routeLine = new H.map.Polyline(lineString, {
					style: routingLib.LINE_UI_STYLE,
					data: "",
				});
				mapRef?.current?.addObject(routeLine);
				routeLineRef.current = routeLine;

				// Create array of points to include in bounding box
				const points: H.geo.IPoint[] = [
					// Primary marker position
					new H.geo.Point(destination.position.lat, destination.position.lng),
					// Secondary marker position
					new H.geo.Point(origin.position.lat, origin.position.lng),
				];

				// Add all points from the route polyline
				const routeCoords = lineString.getLatLngAltArray();
				for (let i = 0; i < routeCoords.length; i += 3) {
					points.push(new H.geo.Point(routeCoords[i], routeCoords[i + 1]));
				}

				// Calculate bounding box
				const boundingBox = H.geo.Rect.coverPoints(points);

				// Zoom to show entire route and markers with padding
				mapRef?.current?.getViewModel().setLookAtData({
					bounds: boundingBox || undefined,
				});

				// Create tooltip
				const therapistAdditionalData = origin?.additional?.therapist;
				if (therapistAdditionalData) {
					const tooltipContent = document.createElement("div");
					tooltipContent.innerHTML = `
						<div class="w-[180px] text-xs flex flex-col">
							<div class="flex flex-col">
								<span class="font-bold">${therapistAdditionalData.name}</span>
								<span class="font-light text-[10px]">#${therapistAdditionalData.registrationNumber} &#x2022; ${therapistAdditionalData.gender} &#x2022; ${therapistAdditionalData.employmentType} </span>
							</div>
	
							<div class="mt-2 flex flex-col">
								<span class="flex gap-1 items-center">
									<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-route"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>
									<span>${distance} km in ${time} mins</span>
								</span>
							</div>
						</div>
					`;
					const tooltip = new H.ui.InfoBubble(origin.position, {
						content: tooltipContent,
					});
					uiRef.current?.addBubble(tooltip);
					UIConfig.customizeBubbleUI();
					routeTooltipRef.current = tooltip;
				}

				return { routeLine };
			} catch (error) {
				console.error("Route calculation error:", error);
			} finally {
				setTimeout(() => {
					setIsLoading(false);
					setIsLoadingType(null);
				}, 250);
			}
		},
		[removeRouting],
	);

	// * geometry utils group
	/**
	 * @function isInPolygon
	 * @description to checks if a point is inside a polygon
	 */
	const isInPolygon = useCallback(
		(point: Coordinate, polygon: H.geo.Point[]) => {
			if (!polygon.length) return false;

			let inside = false;
			const { lat, lng } = point;

			for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
				const xi = polygon[i].lng;
				const yi = polygon[i].lat;
				const xj = polygon[j].lng;
				const yj = polygon[j].lat;

				/**
				 * Standard "ray-casting" algorithm: we check if the point intersects
				 * the edges of the polygon an odd or even number of times.
				 */
				const intersect =
					yi > lat !== yj > lat &&
					lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

				if (intersect) inside = !inside;
			}

			return inside;
		},
		[],
	);
	/**
	 * @function isLocationFeasible
	 * @description checks if markers are inside both time/distance isolines
	 */
	const isLocationFeasible = useCallback(
		(markers: MarkerData[]): FeasibleResult[] => {
			const { time, distance } = isolineCoordinatesRef.current;

			return markers.map(({ position, address, additional }) => {
				// to check the previous of the appointment location feasibility
				const prevLocation =
					additional?.therapist?.availabilityDetails?.locations
						?.prevAppointment;
				const prevLocationPosition = {
					lat: prevLocation?.latitude,
					lng: prevLocation?.longitude,
				};
				const isFeasiblePrevAddress =
					prevLocation === null
						? true
						: isInPolygon(prevLocationPosition, time.flat()) &&
							isInPolygon(prevLocationPosition, distance.flat());

				// to check the next of the appointment location feasibility
				const nextLocation =
					additional?.therapist?.availabilityDetails?.locations
						?.nextAppointment;
				const nextLocationPosition = {
					lat: nextLocation?.latitude,
					lng: nextLocation?.longitude,
				};
				const isFeasibleNextAddress =
					nextLocation === null
						? true
						: isInPolygon(nextLocationPosition, time.flat()) &&
							isInPolygon(nextLocationPosition, distance.flat());

				// to check current appointment location feasibility
				const isFeasibleCurrentAddress =
					isInPolygon(position, time.flat()) &&
					isInPolygon(position, distance.flat());

				return {
					address,
					isFeasible:
						isFeasibleCurrentAddress &&
						isFeasiblePrevAddress &&
						isFeasibleNextAddress,
					additional,
					position,
				};
			});
		},
		[isInPolygon],
	);

	// * map control group to expose
	const mapControl = {
		updateLayer: {
			/**
			 * @function traffic
			 * @description Reload traffic data every so often to keep map up to date.
			 */
			traffic: useCallback(() => {
				if (!platformRef.current || !mapRef.current) return;

				console.log("traffic update");
				const provider = platformRef.current
					.createDefaultLayers()
					// @ts-ignore
					.vector.traffic.map.getProvider();

				provider?.reload(true);
			}, []),
		},
		setCenter: useCallback((lat: number, lng: number) => {
			mapRef.current?.setCenter({ lat, lng }, true);
		}, []),
		setZoom: useCallback((zoom: number) => {
			mapRef.current?.setZoom(zoom, true);
		}, []),
		getCenterPosition: useCallback((): H.geo.Point | null => {
			return mapRef.current?.getCenter() || null;
		}, []),
		getZoom: useCallback((): number | null => {
			return mapRef.current?.getZoom() || null;
		}, []),
		centerMap,
		getCameraBound: useCallback(
			({
				// default 0.1 means 10% expand bounds for padding effect
				expandCount = 0.1,
			}: {
				expandCount?: number;
			} = {}) => {
				if (!mapRef.current) return;

				const groups = [
					primaryMarkerGroupRef.current,
					secondaryMarkerGroupRef.current,
				].filter((group): group is H.map.Group => !!group);

				if (groups.length === 0) return;

				let boundingBox = groups.reduce<H.geo.Rect | null>(
					(mergedBounds, group) => {
						const groupBounds = group.getBoundingBox();
						return mergedBounds
							? mergedBounds.mergeRect(groupBounds)
							: groupBounds;
					},
					null,
				);

				if (boundingBox) {
					// Manually expand bounds by the specified padding percentage
					const latPadding =
						(boundingBox.getTop() - boundingBox.getBottom()) * expandCount;
					const lngPadding =
						(boundingBox.getRight() - boundingBox.getLeft()) * expandCount;
					boundingBox = new H.geo.Rect(
						boundingBox.getTop() + latPadding, // top
						boundingBox.getLeft() - lngPadding, // left
						boundingBox.getBottom() - latPadding, // bottom
						boundingBox.getRight() + lngPadding, // right
					);

					mapRef.current
						.getViewModel()
						.setLookAtData({ bounds: boundingBox }, true);
				}
			},
			[],
		),
	};

	return {
		initialize,
		marker,
		geocode,
		isoline,
		isLocationFeasible,
		mapControl,
		isLoading,
		isLoadingType,
	};
}

export type HereMapHooks = ReturnType<typeof useHereMap>;
