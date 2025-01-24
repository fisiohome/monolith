import {
	type GeocodingResponse,
	type GeocodingResult,
	filterGeocodeByQueryScore,
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

interface MarkerData {
	position: { lat: number; lng: number };
	address: string;
}

interface HereMaphandler {
	setCenter: (lat: number, lng: number) => void;
	setZoom: (zoomLevel: number) => void;
	addMarkers: (locations: GeocodingResponse["items"]) => void;
	geocodeAddress: () => Promise<GeocodingResult | null>;
	getMapCenterPositon: () => H.geo.Point | null;
	getMapZoom: () => number | null;
}

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
 * HereMap: A reusable HERE Maps component that supports external control via refs.
 *
 * Props:
 * - `address`: An object containing address details (country, state, city, postalCode, street).
 * - `coordinate`: An array containing the initial map center coordinates [latitude, longitude].
 *
 * Exposed Methods (via ref):
 * - `setCenter(lat, lng)`: Sets the center of the map to the given latitude and longitude.
 * - `setZoom(zoomLevel)`: Adjusts the zoom level of the map.
 * - `addMarkers(locations)`: Adds custom markers to the map.
 * - `geocodeAddress()`: Geocodes the given address and adds markers to the map.
 */
const HereMap = forwardRef<HereMaphandler, HereMapProps>(
	(
		{
			address,
			coordinate = [-6.2, 106.81], // this is the default JAKARTA coordinate,
			width = "100%",
			height = "375px",
			className,
			children: _children,
		},
		ref,
	) => {
		const { props: globalProps } = usePage<GlobalPageProps>();

		// Refs for HERE Maps components
		const mapContainerRef = useRef<HTMLDivElement>(null);
		const mapRef = useRef<H.Map | null>(null); // Map instance
		const mapPlatform = useRef<H.service.Platform | null>(null); // Platform instance
		// const mapBehavior = useRef<H.mapevents.Behavior | null>(null); // Map behavior (e.g., zoom, pan)
		const mapUI = useRef<H.ui.UI | null>(null); // Map UI components
		const trafficInterval = useRef<Timer | null>(null);

		const [centerMapData, setCenterMapData] = useState<{
			lat: number;
			lng: number;
		}>({ lat: 0, lng: 0 });
		/**
		 * Initializes the map instance and associated HERE Maps components.
		 */
		const initializeMap = useCallback(() => {
			console.log("Start process to initializing the HERE Map...");
			const API_KEY =
				import.meta.env?.VITE_RUBY_HERE_MAPS_API_KEY ||
				globalProps.adminPortal.protect.hereMapApiKey;

			// Check if map is already initialized
			if (!mapRef.current && mapContainerRef.current) {
				console.log("Proceed the initialization...");
				const [lat, lng] = coordinate;
				const platform = new H.service.Platform({ apikey: API_KEY });
				const defaultLayers = platform.createDefaultLayers({ pois: true });

				// Create the map instance
				const map = new H.Map(
					mapContainerRef.current,
					(defaultLayers as any).vector.normal.map,
					{
						zoom: 14,
						center: { lat: lat || -6.2, lng: lng || 106.81 },
						pixelRatio: window.devicePixelRatio || 1,
						padding: { top: 16, right: 16, bottom: 16, left: 16 },
					},
				);

				// Add traffic layer to the map
				map.addLayer((defaultLayers as any).vector.traffic.map);

				// Add event behavior for map interactions
				// const mapEvents = new H.mapevents.MapEvents(map);
				// const behavior = new H.mapevents.Behavior(mapEvents);

				// Add UI controls to the map
				const ui = H.ui.UI.createDefault(map, defaultLayers);
				ui.getControl("mapsettings")?.setVisibility(false); // Hide map settings control
				ui.getControl("zoom")?.setAlignment("bottom-left" as any); // Position zoom control

				// Save references to the created components
				mapRef.current = map;
				mapPlatform.current = platform;
				// mapBehavior.current = behavior;
				mapUI.current = ui;

				// remove the map copyrights
				removeCopyrights();

				// set the default markers and the additional map center data state
				if (lat && lng) {
					console.log("Add the default markers...");
					addMarkers([{ position: { lat, lng }, address: address.address }]);
					setCenterMapData((prev) => ({
						...prev,
						lat: lat,
						lng: lng,
					}));
				}
			}
		}, [
			coordinate,
			address.address,
			globalProps.adminPortal.protect.hereMapApiKey,
		]);
		// Create svg icon once and reuse
		const svgIcon = useMemo(() => {
			const svg = `<svg width="48" height="48" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path fill="#8b5cf6" d="M12 2C8.13 2 5 5.13 5 9c0 4.97 7 13 7 13s7-8.03 7-13c0-3.87-3.13-7-7-7z"/>
      <circle cx="12" cy="9" r="4" fill="#FFFFFF"/>
    </svg>`;
			return new H.map.Icon(svg);
		}, []);
		// remove the copyrights
		const removeCopyrights = () => {
			if (document) {
				const copyrightElement = document.querySelector(".H_copyright");
				copyrightElement?.remove();
			}
		};
		// define the "tap" listener for object markers
		const tapMarkersListener = useCallback(
			debounce((evt: any) => {
				const marker = evt?.target;
				const point = marker?.getData() as MarkerData | null;

				console.log("Locations: ", point?.address);
				console.log(
					"lat, lng: ",
					`${point?.position.lat}, ${point?.position.lng}`,
				);
				mapRef.current?.setCenter(marker?.getGeometry(), true);
			}, 250),
			[],
		);
		/**
		 * Adds markers to the map for the provided locations.
		 * @param {Array} locations - Array of location objects containing position and address details.
		 */
		const addMarkers = useCallback(
			(locations: MarkerData[]) => {
				// Create a group to manage markers
				const group = new H.map.Group();

				for (const location of locations) {
					if (!location.position || !location?.address) {
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

				// Add group to the map and fit map bounds
				if (mapRef.current) {
					// Add the marker group to the map
					mapRef.current.addObject(group);

					const bounds = group.getBoundingBox();
					if (bounds) {
						// apply the animation
						/* *
						 * Note:
						 * animation just applied on the zoom level because to prevent the unnecesarry maps loaded, while "getViewModel().setLookAtData()"
						 * this way saves Maps API for JavaScript quota
						 * */
						mapRef.current.getViewModel().setLookAtData({
							bounds,
							// zoom: 18,
						});
						mapRef.current?.setZoom(18, true);
					}

					// set the center map data state
					setCenterMapData((prev) => ({
						...prev,
						lat: locations[0].position.lat,
						lng: locations[0].position.lng,
					}));
				}
			},
			[svgIcon, tapMarkersListener],
		);
		const geocodeAddress = useCallback(async () => {
			let data: GeocodingResponse["items"][number] | null = null;

			try {
				// Construct the query parameters
				const params: H.service.ServiceParameters = {
					// q: address.address,
					qq: `country=${address.country};state=${address.state};city=${address.city};street=${address.address};postalCode=${address.postalCode}`,
				};
				const geocoder = mapPlatform.current?.getSearchService();

				if (!geocoder) {
					console.error("Geocoder service is not available.");
					return data;
				}

				// Wrap geocode call in a Promise to handle asynchronous flow
				data = await new Promise<GeocodingResponse["items"][number] | null>(
					(resolve, reject) => {
						geocoder.geocode(
							params,
							(result: GlobalObject) => {
								const locations = (result as GeocodingResponse).items;
								if (!locations?.length) {
									console.warn("No results found for the provided address.");
									resolve(null);
									return;
								}

								// Filter and pick the best location based on custom logic
								const filteredData = locations.reduce(
									filterGeocodeByQueryScore,
								);
								// if (filteredData?.address) {
								// 	// Add markers for valid results
								// 	addMarkers([filteredData]);
								// }
								resolve(filteredData);
							},
							(error: Error) => {
								reject(error);
							},
						);
					},
				);
			} catch (error) {
				console.error(
					"Error while calculating coordinates:",
					(error as Error).message,
				);
				data = null;
			}

			console.debug("Geocoding result:", data);
			return data;
		}, [address]);

		/**
		 * Expose map methods to the parent component via ref.
		 */
		useImperativeHandle(ref, () => ({
			setCenter: (lat: number, lng: number) => {
				mapRef.current?.setCenter({ lat, lng }, true);
			},
			setZoom: (zoomLevel: number) => {
				mapRef.current?.setZoom(zoomLevel, true);
			},
			addMarkers: (locations: GeocodingResponse["items"]) => {
				const formattedLocations = locations.map(({ position, address }) => ({
					position: { lat: position.lat, lng: position.lng },
					address: address.label,
				}));

				addMarkers(formattedLocations);
			},
			geocodeAddress: async () => await geocodeAddress(),
			getMapCenterPositon: () => {
				return mapRef?.current?.getCenter() || null;
			},
			getMapZoom: () => {
				return mapRef?.current?.getZoom() || null;
			},
		}));

		useEffect(() => {
			const updateTrafficLayer = () => {
				console.log("traffic update");
				const provider = mapPlatform.current
					?.createDefaultLayers()
					// @ts-ignore
					.vector.traffic.map.getProvider();
				provider?.reload(true);
			};

			// for initiate the map
			initializeMap();
			// for update traffic map layer every one-minute
			trafficInterval.current = setInterval(updateTrafficLayer, 60000);
			return () => {
				if (trafficInterval.current) {
					clearInterval(trafficInterval.current);
				}
			};
		}, [initializeMap]);

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
					{`lat: ${centerMapData?.lat?.toFixed(2)}, lng: ${centerMapData?.lng?.toFixed(2)}`}
				</div>
			</div>
		);
	},
);

export type { HereMapProps, HereMaphandler };
export default HereMap;
