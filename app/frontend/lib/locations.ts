import type {
	CityID,
	GroupByLocation,
	Location,
	StateID,
} from "@/types/admin-portal/location";

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

export const getStatesID = async () => {
	try {
		const response = await fetch("https://api.cahyadsn.com/provinces");

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = (await response.json()) as { data: StateID[] };
		return data.data || [];
	} catch (error) {
		console.error("Error fetching states:", error);
		return [];
	}
};

export const getCitiesID = async ({ stateId }: { stateId: string }) => {
	try {
		const response = await fetch(
			`https://api.cahyadsn.com/regencies/${stateId}`,
		);

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = (await response.json()) as { data: CityID[] };
		return data.data || [];
	} catch (error) {
		console.error("Error fetching states:", error);
		return [];
	}
};
