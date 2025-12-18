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
	const safePage = Number(meta?.page ?? 1) || 1;
	const safeLimit = Number(meta?.pageSize ?? 10) || 10;
	const safeCount = Number(meta?.totalItems ?? 0) || 0;
	const safePages = Number(meta?.totalPages ?? 1) || 1;

	const headers: Headers = {
		page: "1",
		limit: safeLimit.toString(),
		count: safeCount.toString(),
		pages: safePages.toString(),
	};

	const vars: Vars = {
		countArgs: [],
		ends: false,
		limit: safeLimit,
		outset: 0,
		page: safePage,
		pageParam: "page",
		size: safeLimit,
		countlessMinimal: false,
		headers,
		metadata: [],
		steps: false,
		limitParam: "limit",
		limitMax: safeLimit,
		limitExtra: false,
		items: safeCount,
		count: safeCount,
	};

	// Generate pagination URLs if baseUrl is provided
	const generateUrl = (page: number) => {
		if (!baseUrl) return "";
		const url = new URL(baseUrl, typeof window !== "undefined" ? window.location.origin : "http://localhost");
		url.searchParams.set("page", String(page));
		return `${url.pathname}${url.search}`;
	};

	return {
		scaffoldUrl: baseUrl,
		firstUrl: generateUrl(1),
		prevUrl: safePage > 1 ? generateUrl(safePage - 1) : "",
		pageUrl: generateUrl(safePage),
		nextUrl: safePage < safePages ? generateUrl(safePage + 1) : "",
		lastUrl: generateUrl(safePages),
		count: safeCount,
		page: safePage,
		limit: safeLimit,
		vars,
		pages: safePages,
		last: safePages,
		in: Math.min(
			safeLimit,
			safeCount - (safePage - 1) * safeLimit,
		),
		from: (safePage - 1) * safeLimit + 1,
		to: Math.min(safePage * safeLimit, safeCount),
		prev: safePage > 1 ? { page: safePage - 1 } : null,
		next: safePage < safePages ? { page: safePage + 1 } : null,
		series: Array.from({ length: safePages }, (_, i) =>
			(i + 1).toString(),
		),
	};
}
