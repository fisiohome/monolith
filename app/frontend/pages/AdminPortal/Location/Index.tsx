import ToolbarTable from "@/components/admin-portal/location/data-table-toolbar";
import PaginationTable from "@/components/admin-portal/shared/data-table-pagination";
import { PageContainer } from "@/components/admin-portal/shared/page-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table/column-header";
import type { Location } from "@/types/admin-portal/location";
import type { GlobalPageProps } from "@/types/globals";
import type { Metadata } from "@/types/pagy";
import { Head, usePage } from "@inertiajs/react";
import type { ColumnDef, Table as TableTanstack } from "@tanstack/react-table";
import { Plus } from "lucide-react";

export interface PageProps {
	locations: {
		data: Location[];
		metadata: Metadata;
	};
}
export type TableToolbarDataProps = TableTanstack<
	PageProps["locations"]["data"][number]
>;

export default function Index({ locations }: PageProps) {
	const { props: globalProps } = usePage<GlobalPageProps>();

	// table management
	const columns: ColumnDef<PageProps["locations"]["data"][number]>[] = [
		{
			accessorKey: "country",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Country" />
			),
			enableSorting: false,
			enableHiding: false,
			cell: ({ row }) => {
				return (
					<div className="flex items-start space-x-4">
						<img
							src={`https://flagcdn.com/h24/${row.original.countryCode.toLowerCase()}.png`}
							height="24"
							alt={row.original.country}
							className="border"
						/>

						<div className="flex gap-2">
							<Badge variant="default">{row.original.countryCode}</Badge>
							<p className="font-semibold">{row.original.country}</p>
						</div>
					</div>
				);
			},
		},
		{
			accessorKey: "state",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="State/Province" />
			),
			enableSorting: false,
			enableHiding: false,
		},
		{
			accessorKey: "city",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="City" />
			),
			enableSorting: false,
			enableHiding: false,
		},
	];

	return (
		<>
			<Head title="Location Availability" />

			<PageContainer className="flex items-center justify-between">
				<h1 className="text-2xl font-bold tracking-tight">Locations</h1>
				{/* {globalProps.auth.currentUser?.["isSuperAdmin?"] && (
					<Button
						onClick={(event) => {
							event.preventDefault();
							// routeTo.newService();
						}}
					>
						<Plus />
						Add Location
					</Button>
				)} */}
			</PageContainer>

			<PageContainer className="min-h-[100vh] flex-1 md:min-h-min space-y-4">
				<DataTable
					columns={columns}
					data={locations.data}
					toolbar={(table) => <ToolbarTable table={table} />}
					customPagination={(table) => (
						<PaginationTable table={table} metadata={locations.metadata} />
					)}
				/>
			</PageContainer>
		</>
	);
}
