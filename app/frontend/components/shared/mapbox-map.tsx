// import mapboxgl from "mapbox-gl";
// import "mapbox-gl/dist/mapbox-gl.css";

// * mapbox
// function MapBoxMap() {
// 	const mapRef = useRef<any>(null);
// 	const mapContainerRef = useRef<HTMLDivElement>(null);
// 	useEffect(() => {
// 		mapboxgl.accessToken =
// 			"pk.eyJ1IjoibGFicy1zYW5kYm94IiwiYSI6ImNrMTZuanRmZDA2eGQzYmxqZTlnd21qY3EifQ.Q7DM5HqE5QJzDEnCx8BGFw";

// 		if (mapContainerRef?.current) {
// 			mapRef.current = new mapboxgl.Map({
// 				container: mapContainerRef?.current,
// 				center: [-74.0242, 40.6941],
// 				zoom: 10.12,
// 			});
// 		}

// 		return () => {
// 			mapRef?.current?.remove();
// 		};
// 	}, []);

// 	return (
// 		<div
// 			id="map-container"
// 			ref={mapContainerRef}
// 			className="w-full col-span-full h-96"
// 		/>
// 	);
// }
