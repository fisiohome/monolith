import type { Timestamp } from "../globals";

export type Package = {
	id: number;
	serviceId: number;
	name: string;
	active: boolean;
	currency: string;
	numberOfVisit: number;
	pricePerVisit: string;
	discount: string;
	totalPrice: string;
	feePerVisit: string;
	totalFee: string;
	formattedDiscount?: string;
	formattedFeePerVisit?: string;
	formattedPricePerVisit?: string;
	formattedTotalFee?: string;
	formattedTotalPrice?: string;
} & Timestamp;

export type PackageTotalPrice = {
	currency: Package["currency"];
	totalPrice: string;
	formattedTotalPrice: string;
	totalFee: string;
	formattedTotalFee: string;
};
