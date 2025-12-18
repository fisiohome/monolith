import type { Headers, Metadata, Vars } from "@/types/pagy";

export type VouchersMeta = {
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
};

/**
 * Formats VouchersMeta to Metadata interface
 * @param meta - The vouchers meta object
 * @param baseUrl - Base URL for pagination links (optional)
 * @returns Formatted Metadata object
 */
export function formatVouchersMetaToMetadata(
	meta: VouchersMeta,
	baseUrl: string = "",
): Metadata {
	const headers: Headers = {
		page: "1",
		limit: meta.pageSize.toString(),
		count: meta.totalItems.toString(),
		pages: meta.totalPages.toString(),
	};

	const vars: Vars = {
		countArgs: [],
		ends: false,
		limit: meta.pageSize,
		outset: 0,
		page: meta.page,
		pageParam: "page",
		size: meta.pageSize,
		countlessMinimal: false,
		headers,
		metadata: [],
		steps: false,
		limitParam: "limit",
		limitMax: meta.pageSize,
		limitExtra: false,
		items: meta.totalItems,
		count: meta.totalItems,
	};

	// Generate pagination URLs if baseUrl is provided
	const generateUrl = (page: number) => {
		if (!baseUrl) return "";
		const separator = baseUrl.includes("?") ? "&" : "?";
		return `${baseUrl}${separator}page=${page}`;
	};

	return {
		scaffoldUrl: baseUrl,
		firstUrl: generateUrl(1),
		prevUrl: meta.page > 1 ? generateUrl(meta.page - 1) : "",
		pageUrl: generateUrl(meta.page),
		nextUrl: meta.page < meta.totalPages ? generateUrl(meta.page + 1) : "",
		lastUrl: generateUrl(meta.totalPages),
		count: meta.totalItems,
		page: meta.page,
		limit: meta.pageSize,
		vars,
		pages: meta.totalPages,
		last: meta.totalPages,
		in: Math.min(
			meta.pageSize,
			meta.totalItems - (meta.page - 1) * meta.pageSize,
		),
		from: (meta.page - 1) * meta.pageSize + 1,
		to: Math.min(meta.page * meta.pageSize, meta.totalItems),
		prev: meta.page > 1 ? { page: meta.page - 1 } : null,
		next: meta.page < meta.totalPages ? { page: meta.page + 1 } : null,
		series: Array.from({ length: meta.totalPages }, (_, i) =>
			(i + 1).toString(),
		),
	};
}
