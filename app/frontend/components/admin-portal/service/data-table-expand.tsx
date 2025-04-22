import { memo, useMemo } from "react";
import type { TableRowDataProps } from "@/pages/AdminPortal/Service/Index";
import PackageTable from "./package-table";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { humanize } from "@/lib/utils";

export interface ExpandSubTableProps {
	row: TableRowDataProps;
}

const ExpandSubTable = memo(function Component({ row }: ExpandSubTableProps) {
	const packages = useMemo(
		() => row.original?.packages?.list || [],
		[row.original.packages],
	);
	const totalPrices = useMemo(
		() => row.original?.packages?.totalPrices || [],
		[row.original?.packages?.totalPrices],
	);

	return (
		<div className="grid w-full grid-cols-12 gap-2 text-sm motion-preset-bounce">
			<Card className="col-span-full ">
				<CardHeader>
					<CardTitle>{`Our ${humanize(row.original.name)} Packages`}</CardTitle>
					<CardDescription>
						Shows active and inactive packages of the brand.
					</CardDescription>
				</CardHeader>

				<CardContent>
					<PackageTable
						packages={packages}
						totalPrices={totalPrices}
						className="rounded-lg shadow bg-background"
					/>
				</CardContent>
			</Card>
		</div>
	);
});

export default ExpandSubTable;
