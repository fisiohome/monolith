import useHereMap, {
	type MarkerData,
	type IsolineConstraint,
	type FeasibleResult,
} from "@/hooks/here-maps";
import { MAP_DEFAULT_COORDINATE } from "@/lib/here-maps";
import { cn } from "@/lib/utils";
import type { GlobalPageProps } from "@/types/globals";
import type {
	Coordinate,
	IsolineRequestParams,
	IsolineResult,
} from "@/types/here-maps";
import type { GeocodingResult } from "@/types/here-maps";
import type H from "@here/maps-api-for-javascript";
import { usePage } from "@inertiajs/react";
import {
	type ComponentProps,
	forwardRef,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
} from "react";

/**
 * HereMaphandler:
 * Defines the methods that the HereMap component will expose via ref.
 */
interface HereMaphandler {
	mapControl: {
		setCenter: (lat: number, lng: number) => void;
		setZoom: (zoom: number) => void;
		getCenterPosition: () => H.geo.Point | null;
		getZoom: () => number | null;
	};
	marker: {
		onAdd: (
			locations: MarkerData[],
			options?: {
				isSecondary?: boolean;
				changeMapView?: boolean;
				useRouting?: boolean;
			},
		) => void;
		onRemove: (options?: { isSecondary?: boolean }) => void;
	};
	geocode: {
		onCalculate: () => Promise<GeocodingResult | null>;
	};
	isoline: {
		onCalculate: {
			single: (
				params: IsolineRequestParams,
				shouldZoom?: boolean,
			) => Promise<IsolineResult["isolines"][number] | null>;
			both: ({
				coord,
				constraints,
			}: {
				coord: Coordinate;
				constraints: IsolineConstraint[];
			}) => Promise<IsolineResult["isolines"] | null>;
		};
		onRemove: () => void;
		onAdd: (
			isoline: IsolineResult["isolines"][number],
			constraint: IsolineConstraint,
			autoZoom?: boolean,
		) => H.map.Group | undefined;
	};
	isLocationFeasible: (markers: MarkerData[]) => FeasibleResult[];
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
	options?: { disabledEvent?: boolean; showCenterMap?: boolean };
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
			children: _children,
			address,
			coordinate = MAP_DEFAULT_COORDINATE,
			width = "100%",
			height = "375px",
			className,
			options,
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
			initialize,
			geocode,
			isoline,
			marker,
			mapControl,
			isLocationFeasible,
		} = useHereMap(mapContainerRef, coordinateMemo, address, apiKey);

		// Expose map methods to parent components via ref.
		useImperativeHandle(ref, () => ({
			mapControl: {
				setZoom: mapControl.setZoom,
				setCenter: mapControl.setCenter,
				getCenterPosition: mapControl.getCenterPosition,
				getZoom: mapControl.getZoom,
			},
			marker: {
				onAdd: marker.onAdd,
				onRemove: marker.onRemove,
			},
			geocode: {
				onCalculate: geocode.onCalculate,
			},
			isoline: {
				onCalculate: {
					single: isoline.onCalculate.single,
					both: isoline.onCalculate.both,
				},
				onRemove: isoline.onRemove,
				onAdd: isoline.onAdd,
			},
			isLocationFeasible,
		}));

		// Initialize the map and set up the traffic update interval.
		useEffect(() => {
			initialize(options);

			// for update traffic map layer every ten-minute
			const trafficInterval = setInterval(
				mapControl.updateLayer.traffic,
				60000 * 10,
			);
			return () => {
				clearInterval(trafficInterval);
			};
		}, [initialize, mapControl.updateLayer.traffic, options]);

		return (
			<div
				ref={mapContainerRef}
				style={{ width, height }}
				className={cn(
					"relative rounded-lg shadow motion-blur-in-[10px] motion-delay-[0.75s]/blur",
					className,
				)}
			>
				{options?.showCenterMap && (
					<div className="absolute top-0 left-0 z-10 text-white rounded-md bg-emerald-600 py-0.5 px-1.5 text-xs">
						{`lat: ${mapControl.centerMap.lat.toFixed(2)}, lng: ${mapControl.centerMap.lng.toFixed(2)}`}
					</div>
				)}
			</div>
		);
	},
);

export type { HereMapProps, HereMaphandler };
export default HereMap;
