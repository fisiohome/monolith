import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateInitials(input: string): string {
  // Convert the input to lowercase and split it into individual words
  const wordArray = input.toLowerCase().split(' ');

  // Check specific cases first
  if (input.toLowerCase() === 'super admin special' || input.toLowerCase() === 'super admin') {
    return 'SA';
  }

  // If the string is 'super', return 'SU'
  if (input.toLowerCase() === 'super') {
    return 'SU';
  }

  // Extract the first letter of each word and combine them
  const initials = wordArray.map(word => word.charAt(0).toUpperCase()).join('');

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
  const formattedStr = str.replace(/[_-]/g, ' ');
  // Capitalize the first letter of each sentence and make the rest lowercase
  return formattedStr.charAt(0).toUpperCase() + formattedStr.slice(1).toLowerCase();
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
  let baseUrl = url.split('?')[0];
  let existingParams = new URLSearchParams(url.split('?')[1] || '');

  // Add additional parameters from args
  args.forEach((params) => {
    Object.entries(params).forEach(([key, value]) => {
      if (value === '' || value === null || value === undefined) {
        existingParams.delete(key); // Remove the parameter if the value is empty, null, or undefined
      } else {
        existingParams.set(key, value);
      }
    });
  });

  // Convert updated parameters to an object
  const queryParams = Object.fromEntries(existingParams.entries());

  // Build the full URL with updated query parameters
  const fullUrl = `${baseUrl}?${existingParams.toString()}`;

  return { baseUrl, fullUrl, queryParams };
}