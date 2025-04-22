import { type ComponentProps, Fragment } from "react";
import {
	Table,
	TableBody,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import DotBadgeWithLabel from "@/components/shared/dot-badge";
import type { Package, PackageTotalPrice } from "@/types/admin-portal/package";
import { cn } from "@/lib/utils";
import { useDateContext } from "@/components/providers/date-provider";
import { format } from "date-fns";

export interface PackageTableProps extends ComponentProps<"table"> {
	packages: Package[];
	totalPrices: PackageTotalPrice[];
}

export default function PackageTable({
	className,
	packages,
	totalPrices,
}: PackageTableProps) {
	const { locale, tzDate } = useDateContext();

	return (
		<Table className={cn(className)}>
			<TableHeader>
				<TableRow>
					<TableHead>Package</TableHead>
					<TableHead>Status</TableHead>
					<TableHead>Created At</TableHead>
					<TableHead className="text-right">Discount</TableHead>
					<TableHead className="text-right">Price/Visit</TableHead>
					<TableHead className="text-right">Total Price</TableHead>
					<TableHead className="text-right">Fee/Visit</TableHead>
					<TableHead className="text-right">Total Fee</TableHead>
				</TableRow>
			</TableHeader>

			<TableBody className="text-nowrap">
				{packages.map((packageItem) => (
					<Fragment key={packageItem.id}>
						<TableRow>
							<TableCell className="font-medium">
								<div className="flex flex-col items-start">
									<p>{packageItem.name}</p>
									<p className="font-light">
										{packageItem.numberOfVisit} Visit(s)
									</p>
								</div>
							</TableCell>
							<TableCell>
								<DotBadgeWithLabel
									variant={packageItem.active ? "success" : "destructive"}
								>
									<span>{packageItem.active ? "Active" : "Inactive"}</span>
								</DotBadgeWithLabel>
							</TableCell>
							<TableCell>
								{format(packageItem.createdAt, "PP", { locale, in: tzDate })}
							</TableCell>
							<TableCell className="text-right">
								{packageItem.formattedDiscount}
							</TableCell>
							<TableCell className="text-right">
								{packageItem.formattedPricePerVisit}
							</TableCell>
							<TableCell className="font-medium text-right">
								{packageItem.formattedTotalPrice}
							</TableCell>
							<TableCell className="text-right">
								{packageItem.formattedFeePerVisit}
							</TableCell>
							<TableCell className="font-medium text-right">
								{packageItem.formattedTotalFee}
							</TableCell>
						</TableRow>
					</Fragment>
				))}
			</TableBody>

			<TableFooter>
				<TableRow>
					<TableCell colSpan={3}>Total</TableCell>
					<TableCell colSpan={3} className="text-right">
						<div className="flex flex-col space-y-0.5">
							{totalPrices.map((price) => (
								<span key={price.currency}>{price.formattedTotalPrice}</span>
							))}
						</div>
					</TableCell>
					<TableCell colSpan={2} className="text-right">
						<div className="flex flex-col space-y-0.5">
							{totalPrices.map((price) => (
								<span key={price.currency}>{price.formattedTotalFee}</span>
							))}
						</div>
					</TableCell>
				</TableRow>
			</TableFooter>
		</Table>
	);
}
