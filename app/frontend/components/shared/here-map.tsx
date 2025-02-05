import {
	type GeocodingResponse,
	type GeocodingResult,
	MAP_DEFAULT_COORDINATE,
	filterGeocodeByQueryScore,
	isDefaultCoordinate,
} from "@/lib/here-maps";
import { cn, debounce } from "@/lib/utils";
import type { GlobalPageProps } from "@/types/globals";
import H from "@here/maps-api-for-javascript";
import { usePage } from "@inertiajs/react";
import {
	type ComponentProps,
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from "react";

/**
 * Alignment:
 * Represent the value of indicating the new alignment of the given control within the map view port
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
 * MarkerData:
 * Represents the data for a map marker, including the geographic
 * position and address information.
 */
interface MarkerData {
	position: { lat: number; lng: number };
	address: string;
}

/**
 * useHereMap:
 * A custom hook that encapsulates all the logic related to the HERE Map.
 *
 * @param containerRef - A ref to the map container DOM element.
 * @param coordinate - Initial coordinates [lat, lng] for the map center.
 * @param address - The address details used for the default marker and geocoding.
 * @param apiKey - API key for accessing HERE Maps services.
 *
 * @returns An object containing methods to control the map, such as initialization,
 *          adding markers, geocoding addresses, and updating traffic layers.
 */
const useHereMap = (
	containerRef: React.RefObject<HTMLDivElement>,
	coordinate: number[],
	address: HereMapProps["address"],
	apiKey: string,
) => {
	// Refs to store map instances and platform
	const mapRef = useRef<H.Map | null>(null); // Map instance
	const platformRef = useRef<H.service.Platform | null>(null); // Platform instance
	const behaviorRef = useRef<H.mapevents.Behavior | null>(null); // Map behavior (e.g., zoom, pan)
	const uiRef = useRef<H.ui.UI | null>(null); // Map UI components

	// Local state to display current center (for debugging/UI purposes)
	const [centerMap, setCenterMap] = useState<{ lat: number; lng: number }>({
		lat: 0,
		lng: 0,
	});

	// Memoize the SVG icon used for markers
	const svgIcon = useMemo(() => {
		const svg = `<svg width="48" height="48" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path fill="#8b5cf6" d="M12 2C8.13 2 5 5.13 5 9c0 4.97 7 13 7 13s7-8.03 7-13c0-3.87-3.13-7-7-7z"/>
      <circle cx="12" cy="9" r="4" fill="#FFFFFF"/>
    </svg>`;
		return new H.map.Icon(svg);
	}, []);

	/**
	 * tapMarkersListener:
	 * A debounced event listener for marker taps.
	 * Centers the map on the tapped marker and logs the marker data.
	 */
	const tapMarkersListener = useCallback(
		debounce((evt: any) => {
			const marker = evt?.target;
			const markerData = marker?.getData() as MarkerData | null;
			// For example, log marker info (you could show a popup or similar)
			console.debug("Marker tapped:", markerData);
			mapRef.current?.setCenter(marker?.getGeometry(), true);
		}, 250),
		[],
	);

	/**
	 * addMarkers:
	 * Adds a set of markers to the map based on the provided locations.
	 *
	 * @param locations - An array of MarkerData objects containing position and address.
	 */
	const addMarkers = useCallback(
		(locations: MarkerData[]) => {
			if (!mapRef.current) return;

			// Create a group to manage markers
			const group = new H.map.Group();

			for (const location of locations) {
				if (!location.position || !location.address) {
					console.warn("Invalid location:", location);
					continue;
				}
				const marker = new H.map.Marker(location.position, {
					icon: svgIcon,
					data: location,
					volatility: true,
				});

				// Add marker to the group
				group.addObject(marker);
			}

			// Add event listener for marker tap
			group.addEventListener("tap", tapMarkersListener);

			// Add the marker group to the map
			mapRef.current.addObject(group);

			// Adjust the map view to fit the markers.
			const bounds = group.getBoundingBox();
			if (bounds) {
				/* *
				 * Update the map view with bounds (and adjust zoom if needed)
				 *
				 * Note:
				 * animation just applied on the zoom level because to prevent the unnecesarry maps loaded, while "getViewModel().setLookAtData()"
				 * this way saves Maps API for JavaScript quota
				 * */
				mapRef.current.getViewModel().setLookAtData({ bounds });
				mapRef.current.setZoom(18, true);
			}

			// Update the center state based on the first marker
			if (locations[0]) {
				setCenterMap((prev) => ({
					...prev,
					lat: locations[0].position.lat,
					lng: locations[0].position.lng,
				}));
			}
		},
		[svgIcon, tapMarkersListener],
	);

	/**
	 * removeCopyrights:
	 * Removes the default HERE Map copyrights from the DOM.
	 */
	const removeCopyrights = useCallback(() => {
		document?.querySelector(".H_copyright")?.remove();
	}, []);

	/**
	 * initializeMap:
	 * Initializes the HERE Map instance and its components.
	 * Sets up the map layers, UI, event behavior, and adds the default marker.
	 */
	const initializeMap = useCallback(() => {
		console.group();
		console.info("=== Start process to initializing the HERE Map ===");

		// Check if map is already initialized
		if (mapRef.current || !containerRef.current) return;
		console.info("Proceed the initialization");

		const [lat, lng] = coordinate;
		platformRef.current = new H.service.Platform({ apikey: apiKey });
		const defaultLayers = platformRef.current.createDefaultLayers({
			pois: true,
		});

		// Create the map instance
		const map = new H.Map(
			containerRef.current,
			(defaultLayers as any).vector.normal.map,
			{
				zoom: 14,
				center: { lat, lng },
				pixelRatio: window.devicePixelRatio || 1,
				padding: { top: 16, right: 16, bottom: 16, left: 16 },
			},
		);

		// Add the traffic layer
		map.addLayer((defaultLayers as any).vector.traffic.map);

		// Set up map events and behavior for map interactions (disable panning/zooming if needed)
		const mapEvents = new H.mapevents.MapEvents(map);
		behaviorRef.current = new H.mapevents.Behavior(mapEvents);
		behaviorRef.current.disable();

		// Add default UI components (UI zooming control, and another UI map settings)
		uiRef.current = H.ui.UI.createDefault(map, defaultLayers);
		uiRef.current.getControl("mapsettings")?.setVisibility(false);
		uiRef.current.getControl("zoom")?.setAlignment("bottom-left" as Alignment);

		// Save the map instance and remove copyrights
		mapRef.current = map;
		removeCopyrights();

		// Add a default marker based on the initial coordinate
		if (lat && lng && !isDefaultCoordinate(coordinate)) {
			console.info("Add the default markers");
			addMarkers([{ position: { lat, lng }, address: address.address }]);
			setCenterMap({ lat, lng });
		}

		console.info("=== Process to initializing the HERE Map Finished ===");
		console.groupEnd();
	}, [
		containerRef,
		coordinate,
		apiKey,
		address.address,
		addMarkers,
		removeCopyrights,
	]);

	/**
	 * geocodeAddress:
	 * Geocodes the provided address using the HERE Maps search service.
	 *
	 * @returns A Promise resolving to the best GeocodingResult or null.
	 */
	const geocodeAddress =
		useCallback(async (): Promise<GeocodingResult | null> => {
			if (!platformRef.current) return null;

			// Construct the query parameters
			const params: H.service.ServiceParameters = {
				// q: address.address,
				qq: `country=${address.country};state=${address.state};city=${address.city};street=${address.address};postalCode=${address.postalCode}`,
			};

			const searchService = platformRef.current.getSearchService();
			if (!searchService) {
				console.error("Geocoder service is not available.");
				return null;
			}

			return new Promise((resolve, reject) => {
				searchService.geocode(
					params,
					(result: any) => {
						const locations = (result as GeocodingResponse).items;
						if (!locations?.length) {
							console.warn(
								"No geocoding results found for the provided address.",
							);
							resolve(null);
							return;
						}

						// Filter and pick the best location based on custom logic
						const filteredData = locations.reduce(filterGeocodeByQueryScore);
						resolve(filteredData);
					},
					(error: Error) => {
						console.error("Error during geocoding:", error.message);
						reject(error);
					},
				);
			});
		}, [address]);

	/**
	 * setCenterFn:
	 * Centers the map at the specified latitude and longitude.
	 */
	const setCenter = useCallback((lat: number, lng: number) => {
		mapRef.current?.setCenter({ lat, lng }, true);
	}, []);

	/**
	 * setZoomFn:
	 * Sets the map's zoom level.
	 */
	const setZoom = useCallback((zoom: number) => {
		mapRef.current?.setZoom(zoom, true);
	}, []);

	/**
	 * getMapCenterPosition:
	 * Retrieves the current center point of the map.
	 *
	 * @returns The current center as an H.geo.Point or null.
	 */
	const getMapCenterPosition = useCallback((): H.geo.Point | null => {
		return mapRef.current?.getCenter() || null;
	}, []);

	/**
	 * getMapZoom:
	 * Retrieves the current zoom level of the map.
	 *
	 * @returns The current zoom level or null.
	 */
	const getMapZoom = useCallback((): number | null => {
		return mapRef.current?.getZoom() || null;
	}, []);

	// Refreshes the traffic layer to update its data.
	const updateTrafficLayer = useCallback(() => {
		if (!platformRef.current || !mapRef.current) return;

		console.log("traffic update");
		const provider = platformRef.current
			.createDefaultLayers()
			// @ts-ignore
			.vector.traffic.map.getProvider();
		provider?.reload(true);
	}, []);

	// Return all the functions and state that the HereMap component will use.
	return {
		initializeMap,
		addMarkers,
		geocodeAddress,
		setCenter,
		setZoom,
		getMapCenterPosition,
		getMapZoom,
		updateTrafficLayer,
		center: centerMap,
	};
};

/**
 * HereMaphandler:
 * Defines the methods that the HereMap component will expose via ref.
 */
interface HereMaphandler {
	setCenter: (lat: number, lng: number) => void;
	setZoom: (zoomLevel: number) => void;
	addMarkers: (locations: GeocodingResponse["items"]) => void;
	geocodeAddress: () => Promise<GeocodingResult | null>;
	getMapCenterPosition: () => H.geo.Point | null;
	getMapZoom: () => number | null;
}

/**
 * HereMapProps:
 * Properties that the HereMap component accepts.
 */
interface HereMapProps extends ComponentProps<"div"> {
	address: {
		country: string;
		state: string;
		city: string;
		postalCode: string;
		address: string;
	};
	coordinate: number[];
	width?: string;
	height?: string;
}

/**
 * HereMap Component:
 * A reusable HERE Maps component that exposes imperative methods via ref.
 *
 * Props:
 * - address: Contains the address details for geocoding and marker placement.
 * - coordinate: The initial center of the map in [lat, lng] format.
 * - width/height: Dimensions of the map container.
 *
 * Exposes methods such as setCenter, setZoom, addMarkers, and geocodeAddress.
 */
const HereMap = forwardRef<HereMaphandler, HereMapProps>(
	(
		{
			address,
			coordinate = MAP_DEFAULT_COORDINATE,
			width = "100%",
			height = "375px",
			className,
			children: _children,
		},
		ref,
	) => {
		const { props: globalProps } = usePage<GlobalPageProps>();
		const mapContainerRef = useRef<HTMLDivElement>(null);
		const coordinateMemo = useMemo(
			() =>
				coordinate?.[0] === 0 && coordinate?.[1] === 0
					? MAP_DEFAULT_COORDINATE
					: coordinate,
			[coordinate],
		);

		// Determine the API key from env or global props.
		const apiKey =
			import.meta.env?.VITE_RUBY_HERE_MAPS_API_KEY ||
			globalProps.adminPortal.protect.hereMapApiKey;

		// Use the custom hook to encapsulate all map-related logic.
		const {
			initializeMap,
			addMarkers,
			geocodeAddress,
			setCenter,
			setZoom,
			getMapCenterPosition,
			getMapZoom,
			updateTrafficLayer,
			center,
		} = useHereMap(mapContainerRef, coordinateMemo, address, apiKey);

		// Expose map methods to parent components via ref.
		useImperativeHandle(ref, () => ({
			setCenter,
			setZoom,
			addMarkers: (locations: GeocodingResponse["items"]) => {
				const formattedLocations = locations.map(({ position, address }) => ({
					position: { lat: position.lat, lng: position.lng },
					address: address.label,
				}));
				addMarkers(formattedLocations);
			},
			geocodeAddress,
			getMapCenterPosition,
			getMapZoom,
		}));

		// Initialize the map and set up the traffic update interval.
		useEffect(() => {
			initializeMap();

			// for update traffic map layer every one-minute
			const trafficInterval = setInterval(updateTrafficLayer, 60000);
			return () => {
				clearInterval(trafficInterval);
			};
		}, [initializeMap, updateTrafficLayer]);

		return (
			<div
				ref={mapContainerRef}
				style={{ width, height }}
				className={cn(
					"relative rounded-lg shadow motion-blur-in-[10px] motion-delay-[0.75s]/blur",
					className,
				)}
			>
				<div className="absolute top-0 left-0 z-10 text-white rounded-md bg-emerald-600 py-0.5 px-1.5 text-xs">
					{`lat: ${center.lat.toFixed(2)}, lng: ${center.lng.toFixed(2)}`}
				</div>
			</div>
		);
	},
);

export type { HereMapProps, HereMaphandler };
export default HereMap;
