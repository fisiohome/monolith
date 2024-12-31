import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges multiple class names into a single string.
 *
 * This function takes any number of class name inputs, processes them using
 * `clsx` to handle conditional class names, and then merges them using
 * `twMerge` to ensure Tailwind CSS classes are combined correctly.
 *
 * @param inputs - An array of class values which can be strings, objects, arrays, etc.
 * @returns A single string containing the merged class names.
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/**
 * Navigates the browser to the previous page in the session history.
 *
 * This function uses the `window.history.back()` method to move the user
 * to the previous page they visited. It is typically used in navigation
 * components to provide a "back" button functionality.
 */
export function goBackHandler() {
	window.history.back();
}

/**
 * Generates initials from a given input string.
 *
 * This function takes a string input, converts it to lowercase, splits it into individual words,
 * extracts the first letter of each word, converts those letters to uppercase, and then combines them
 * to form the initials.
 *
 * @param input - The input string from which to generate initials.
 * @returns A string containing the initials of the input words.
 */
export function generateInitials(input: string): string {
	// Convert the input to lowercase and split it into individual words
	const wordArray = input.toLowerCase().split(" ");
	// Extract the first letter of each word and combine them
	const initials = wordArray
		.map((word) => word.charAt(0).toUpperCase())
		.join("");

	return initials;
}

/**
 * Converts a string to a human-readable format.
 * Replaces underscores and hyphens with spaces, and capitalizes the first letter.
 *
 * @param str - The input string to be humanized.
 * @returns The humanized string.
 */
export function humanize(str: string): string {
	// Replace underscores and hyphens with spaces
	const formattedStr = str.replace(/[_-]/g, " ");
	// Capitalize the first letter of each sentence and make the rest lowercase
	return (
		formattedStr.charAt(0).toUpperCase() + formattedStr.slice(1).toLowerCase()
	);
}

/**
 * Creates a debounced function that delays invoking the provided function until after the specified delay has elapsed
 * since the last time the debounced function was invoked.
 *
 * @param fn - The function to debounce.
 * @param delay - The number of milliseconds to delay.
 * @returns A new debounced function.
 */
export function debounce(fn: (...args: any[]) => void, delay: number) {
	let timer: ReturnType<typeof setTimeout>;

	return (...args: any[]) => {
		clearTimeout(timer);
		timer = setTimeout(() => fn(...args), delay);
	};
}

/**
 * Populates the query parameters of a given URL with additional parameters.
 *
 * @param url - The base URL to which query parameters will be added.
 * @param args - An array of objects containing key-value pairs to be added as query parameters.
 * @returns An object containing:
 *   - `baseUrl`: The base URL without any query parameters.
 *   - `fullUrl`: The full URL with the updated query parameters.
 *   - `queryParams`: An object representing the updated query parameters.
 *
 * @example
 * ```typescript
 * const result = populateQueryParams('https://example.com', { foo: 'bar' }, { baz: 'qux' });
 * console.log(result.fullUrl); // 'https://example.com?foo=bar&baz=qux'
 * ```
 */
export function populateQueryParams(
	url: string,
	...args: Record<string, any>[]
): { baseUrl: string; fullUrl: string; queryParams: Record<string, any> } {
	// Parse the existing query parameters from the URL
	const baseUrl = url.split("?")[0];
	const existingParams = new URLSearchParams(url.split("?")[1] || "");

	// Add additional parameters from args
	for (const params of args) {
		for (const [key, value] of Object.entries(params)) {
			if (value === "" || value === null || value === undefined) {
				existingParams.delete(key); // Remove the parameter if the value is empty, null, or undefined
			} else {
				existingParams.set(key, value);
			}
		}
	}

	// Convert updated parameters to an object
	const queryParams = Object.fromEntries(existingParams.entries());

	// Build the full URL with updated query parameters
	const fullUrl = `${baseUrl}?${existingParams.toString()}`;

	return { baseUrl, fullUrl, queryParams };
}

/**
 * Utility to copy text to the clipboard
 * @param text - The text to copy to the clipboard
 * @returns A Promise that resolves when the text is successfully copied
 */
export async function copyToClipboard(text: string): Promise<boolean> {
	if (
		navigator.clipboard &&
		typeof navigator.clipboard.writeText === "function"
	) {
		// Modern Clipboard API
		try {
			await navigator.clipboard.writeText(text);
			console.log("Text copied to clipboard successfully!");
			return true;
		} catch (error) {
			console.error(
				"Failed to copy text to clipboard using Clipboard API:",
				error,
			);
			return false;
		}
	} else {
		// Fallback approach
		const textarea = document.createElement("textarea");
		textarea.value = text;
		textarea.style.position = "fixed"; // Prevent scrolling to bottom of the page
		textarea.style.opacity = "0"; // Hide the textarea
		document.body.appendChild(textarea);
		textarea.select();

		try {
			const successful = document.execCommand("copy");
			if (successful) {
				console.log("Text copied to clipboard successfully (fallback)!");
				return true;
			}
			throw new Error("Fallback copy failed");
		} catch (error) {
			console.error("Failed to copy text to clipboard using fallback:", error);
			return false;
		} finally {
			document.body.removeChild(textarea);
		}
	}
}

/**
 * Removes all white spaces from the given string.
 *
 * @param data - The string from which white spaces will be removed.
 * @returns A new string with all white spaces removed.
 */
export const removeWhiteSpaces = (data: string) => data.replace(/\s/g, "");

/**
 * Formats a phone number string to the format: +62 xxx-xxxx-xxxx.
 *
 * @param phone - The phone number string to be formatted.
 * @returns The formatted phone number string.
 */
export function formatPhoneNumber(phone: string) {
	return phone.replace(/(\+\d{2})(\d{3})(\d{4})(\d{5})/, "$1 $2-$3-$4");
}
