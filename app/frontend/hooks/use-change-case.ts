/**
 * Primitive types that should remain untouched during transformation
 */
type Primitive = string | number | boolean | symbol | bigint;

/**
 * Type utility to convert string literals to snake_case format
 * @example
 * SnakeCase<'userName'> → 'user_name'
 * SnakeCase<'HTTPRequest'> → 'http_request'
 */
type SnakeCase<S extends string> = S extends `${infer First}${infer Rest}`
	? First extends Lowercase<First>
		? `${First}${SnakeCase<Rest>}` // Continue processing rest
		: `_${Lowercase<First>}${SnakeCase<Rest>}` // Convert uppercase to _lowercase
	: S extends Uppercase<S>
		? Lowercase<S> // Handle all-caps strings
		: S;

/**
 * Deep transformation type that recursively converts object keys to snake_case
 * - Preserves Date objects and primitive values
 * - Maintains array structure while converting contents
 */
type DeepSnakeCaseKeys<T> = T extends Date
	? T // Preserve Date instances
	: T extends Primitive
		? T // Preserve primitive values
		: T extends Array<infer U>
			? Array<DeepSnakeCaseKeys<U>> // Process array items
			: T extends object
				? {
						// Convert keys and process nested values
						[K in keyof T as K extends string
							? SnakeCase<K>
							: K]: DeepSnakeCaseKeys<T[K]>;
					}
				: T;

/**
 * Recursively converts object keys to snake_case while preserving:
 * - Primitive values
 * - Date instances
 * - Array structure
 * @param input The value to transform (object/array/primitive)
 * @returns New structure with snake_case keys
 */
export function deepTransformKeysToSnakeCase<T>(
	input: T,
): DeepSnakeCaseKeys<T> {
	// Handle non-object types immediately
	if (input === null || input === undefined)
		return input as DeepSnakeCaseKeys<T>;
	if (input instanceof Date) return input as DeepSnakeCaseKeys<T>;
	if (typeof input !== "object") return input as DeepSnakeCaseKeys<T>;

	// Process arrays
	if (Array.isArray(input)) {
		return input.map((item) =>
			deepTransformKeysToSnakeCase(item),
		) as DeepSnakeCaseKeys<T>;
	}

	// Convert object keys
	return Object.entries(input).reduce(
		(acc, [key, value]) => {
			acc[toSnakeCase(key)] = deepTransformKeysToSnakeCase(value);
			return acc;
		},
		{} as Record<string, unknown>,
	) as DeepSnakeCaseKeys<T>;
}

/**
 * Converts camelCase/PascalCase strings to snake_case
 * @example
 * toSnakeCase('camelCase') → 'camel_case'
 * toSnakeCase('HTTPRequest') → 'http_request'
 * toSnakeCase('API_KEY') → 'api_key'
 */
export function toSnakeCase(str: string): string {
	return str
		.replace(/([a-z0-9])([A-Z])/g, "$1_$2") // Handle camelCase
		.replace(/([A-Z])([A-Z][a-z])/g, "$1_$2") // Handle consecutive capitals
		.toLowerCase();
}
