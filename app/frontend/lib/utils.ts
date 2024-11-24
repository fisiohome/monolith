import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function generateInitials(input: string): string {
	// Convert the input to lowercase and split it into individual words
	const wordArray = input.toLowerCase().split(" ");

	// Check specific cases first
	if (
		input.toLowerCase() === "super admin special" ||
		input.toLowerCase() === "super admin"
	) {
		return "SA";
	}

	// If the string is 'super', return 'SU'
	if (input.toLowerCase() === "super") {
		return "SU";
	}

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

export function debounce(fn: (...args: any[]) => void, delay: number) {
	let timer: ReturnType<typeof setTimeout>;

	return (...args: any[]) => {
		clearTimeout(timer);
		timer = setTimeout(() => fn(...args), delay);
	};
}

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

export const removeWhiteSpaces = (data: string) => data.replace(/\s/g, "");
