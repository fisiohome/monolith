import type { GroupByLocation, Location } from "@/types/admin-portal/location";

export function groupLocationsByCountry(
	locations: Location[],
): GroupByLocation[] {
	if (!locations || !locations?.length) return [];

	const groupedByCountry = locations.reduce(
		(acc, location) => {
			if (!acc[location.countryCode]) {
				acc[location.countryCode] = [];
			}
			acc[location.countryCode].push(location);
			return acc;
		},
		{} as Record<string, Location[]>,
	);

	return Object.entries(groupedByCountry).map(([countryCode, states]) => {
		const countryName = states[0].country;
		const groupedByState = states.reduce(
			(acc, state) => {
				if (!acc[state.state]) {
					acc[state.state] = [];
				}
				acc[state.state].push(state);
				return acc;
			},
			{} as Record<string, Location[]>,
		);

		const stateList: GroupByLocation["states"] = Object.entries(
			groupedByState,
		).map(([state, cities]) => {
			const cityList: GroupByLocation["states"][number]["cities"] = cities.map(
				(city) => ({
					id: city.id,
					name: city.city,
				}),
			);
			return {
				name: state,
				cities: cityList,
			};
		});

		return {
			country: countryName,
			countryCode: countryCode,
			states: stateList,
		};
	});
}
