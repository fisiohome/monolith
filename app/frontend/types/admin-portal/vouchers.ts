export type VouchersMeta = {
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
};

export interface Voucher {
	id: string;
	code: string;
	name: string | null;
	description: string | null;
	discountType: "PERCENTAGE" | "FIXED";
	discountValue: number;
	maxDiscountAmount: number | null;
	minOrderAmount: number | null;
	quota: number;
	usedCount: number;
	validFrom: string | null;
	validUntil: string | null;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
	packages: {
		id: string;
		voucherId: string;
		packageId: string;
		createdAt: string;
	}[];
}
