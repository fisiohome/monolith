// * Docs: https://timeapi.io/swagger/index.html

import { useLocalStorage } from "@uidotdev/usehooks";
import { add, isPast } from "date-fns";
import { useCallback, useEffect, useState } from "react";

/**
 * Asynchronously fetches the list of available timezones from the API.
 *
 * @returns A promise that resolves to an array of timezone strings, or null if an error occurs.
 */
export const getTimezonesFn = async (): Promise<string[] | null> => {
	try {
		// Request the available timezones from the API endpoint.
		const response = await fetch(
			"https://timeapi.io/api/timezone/availabletimezones",
		);

		// If the response is not OK, throw an error to be caught below.
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		// Parse the JSON response. Return data or null if data is falsy.
		const data = await response.json();
		return data || null;
	} catch (error) {
		// Log any error that occurs during the fetch.
		console.error("Error while fetching timezones:", (error as Error)?.message);
		return null;
	}
};

/**
 * Custom hook to manage timezone data with automatic refresh based on an expiration time.
 *
 * It uses a local storage hook to cache the timezones along with an expiry timestamp.
 * When the stored data has expired (after 10 seconds), the hook re-fetches new data.
 *
 * @returns An object containing:
 *   - timezones: the list of timezone strings.
 *   - isLoading: a boolean indicating whether a fetch is in progress.
 *   - getTimezones: a function to manually trigger a refresh.
 */
export const useTimeAPI = () => {
	// Local state to track if the API is currently loading data.
	const [isLoading, setIsLoading] = useState(false);
	// Generate a new expiration date (10 minutes from now).
	// Wrapped in useCallback so that the function reference remains stable.
	const expiredDate = useCallback(() => add(new Date(), { minutes: 10 }), []);
	// Use a custom localStorage hook to persist both the timezone data and its expiry.
	// The initial stored value contains an empty data array and an expiration date.
	const [timezonesStorage, saveTimezones] = useLocalStorage<{
		data: string[];
		expired: Date;
	}>("timezones", { data: [], expired: expiredDate() });
	/**
	 * Fetch new timezone data if the stored expiration time has passed.
	 */
	const getTimezones = useCallback(async () => {
		// If the cached expiration date is still in the future, do not fetch new data.
		if (!isPast(timezonesStorage.expired)) {
			return;
		}

		setIsLoading(true);
		try {
			// Fetch the new timezones (getTimezonesFn returns null on failure).
			const data = (await getTimezonesFn()) || [];

			// Save the fetched timezones and set a new expiration date.
			saveTimezones({ data, expired: expiredDate() });
		} finally {
			// Introduce a short delay (250ms) before turning off the loading indicator,
			// which can help create a smoother user experience.
			setTimeout(() => {
				setIsLoading(false);
			}, 250);
		}
	}, [saveTimezones, timezonesStorage.expired, expiredDate]);

	// Trigger the timezone fetch once when the component mounts.
	// (The empty dependency array ensures this effect runs only once.)
	// biome-ignore lint/correctness/useExhaustiveDependencies: <->
	useEffect(() => {
		getTimezones();

		return () => {};
	}, []);

	// Return the current timezone data, loading status, and the refresh function.
	return { timezones: timezonesStorage.data, isLoading, getTimezones };
};
