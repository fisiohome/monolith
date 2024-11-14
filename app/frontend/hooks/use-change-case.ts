type Primitive = string | number | boolean | symbol | bigint;

type SnakeCase<S extends string> = S extends `${infer First}${infer Rest}`
	? First extends Lowercase<First>
		? `${First}${SnakeCase<Rest>}`
		: `_${Lowercase<First>}${SnakeCase<Rest>}`
	: S;

type DeepSnakeCase<T> = T extends Primitive
	? T
	: T extends Array<infer U>
		? DeepSnakeCaseArray<U>
		: T extends object
			? {
					[K in keyof T as K extends string ? SnakeCase<K> : K]: DeepSnakeCase<
						T[K]
					>;
				}
			: T;

interface DeepSnakeCaseArray<T> extends Array<DeepSnakeCase<T>> {}

export function deepTransformKeysToSnakeCase<T>(obj: T): DeepSnakeCase<T> {
	if (obj === null || obj === undefined) {
		return obj as DeepSnakeCase<T>;
	}

	if (Array.isArray(obj)) {
		return obj.map((item) =>
			deepTransformKeysToSnakeCase(item),
		) as DeepSnakeCase<T>;
	}

	if (typeof obj === "object") {
		const newObj: any = {};
		for (const key in obj) {
			if (Object.prototype.hasOwnProperty.call(obj, key)) {
				const newKey = camelToSnakeCase(key);
				newObj[newKey] = deepTransformKeysToSnakeCase((obj as any)[key]);
			}
		}
		return newObj as DeepSnakeCase<T>;
	}

	return obj as DeepSnakeCase<T>;
}

export function camelToSnakeCase(str: string): string {
	return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}
