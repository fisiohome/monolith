import ToolbarTable from "@/components/admin-portal/location/data-table-toolbar";
import {
	DeleteLocationAlert,
	FormUpsertLocation,
} from "@/components/admin-portal/location/form-dialog-content";
import PaginationTable from "@/components/admin-portal/shared/data-table-pagination";
import { PageContainer } from "@/components/admin-portal/shared/page-layout";
import {
	ResponsiveDialog,
	type ResponsiveDialogProps,
} from "@/components/shared/responsive-dialog";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table/column-header";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { populateQueryParams } from "@/lib/utils";
import type { Location } from "@/types/admin-portal/location";
import type { GlobalPageProps } from "@/types/globals";
import type { Metadata } from "@/types/pagy";
import { Head, router, usePage } from "@inertiajs/react";
import type { ColumnDef, Table as TableTanstack } from "@tanstack/react-table";
import { Ellipsis, Plus } from "lucide-react";
import { useMemo } from "react";

export interface PageProps {
	locations: {
		data: Location[];
		metadata: Metadata;
	};
	selectedLocations: Location[] | null;
}
export type TableToolbarDataProps = TableTanstack<
	PageProps["locations"]["data"][number]
>;

export default function Index({ locations, selectedLocations }: PageProps) {
	const { props: globalProps, url: pageURL } = usePage<GlobalPageProps>();

	// table management
	const routeTo = {
		newLocations: () => {
			router.get(
				pageURL,
				{ new: "location" },
				{
					only: ["selectedLocations", "flash", "adminPortal"],
					preserveScroll: true,
				},
			);
		},
		editLocation: (ids: number[]) => {
			router.get(
				pageURL,
				{ edit: ids.join(",") },
				{
					only: ["selectedLocations", "flash", "adminPortal"],
					preserveScroll: true,
				},
			);
		},
		deleteLocation: (ids: number[]) => {
			router.get(
				pageURL,
				{ delete: ids.join(",") },
				{
					only: ["selectedLocations", "flash", "adminPortal"],
					preserveScroll: true,
				},
			);
		},
	};
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
					<div className="flex items-center space-x-3">
						<img
							src={`https://flagcdn.com/h20/${row.original.countryCode.toLowerCase()}.webp`}
							alt={row.original.country}
							className="h-4 border"
						/>

						<div className="flex flex-row items-center space-x-1.5">
							<span className="text-xs font-light">
								{row.original.countryCode}
							</span>
							<Separator orientation="vertical" className="h-4" />
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
		{
			id: "actions",
			cell: ({ row }) => {
				if (globalProps.auth.currentUserType === "THERAPIST") return;

				return (
					<div className="flex items-center justify-end space-x-2">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline" size="icon">
									<Ellipsis />
								</Button>
							</DropdownMenuTrigger>

							<DropdownMenuContent align="end">
								<DropdownMenuLabel>Actions</DropdownMenuLabel>
								<DropdownMenuSeparator />

								<DropdownMenuGroup>
									<DropdownMenuItem
										onSelect={() => routeTo.editLocation([row.original.id])}
									>
										Edit
									</DropdownMenuItem>
								</DropdownMenuGroup>

								<DropdownMenuSeparator />
								<DropdownMenuItem
									onSelect={() => routeTo.deleteLocation([row.original.id])}
								>
									Delete
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				);
			},
		},
	];

	// for add location
	const formDialogMode = useMemo(() => {
		const isCreateMode =
			globalProps.adminPortal?.currentQuery?.new === "location";
		const isEditMode = !!globalProps.adminPortal?.currentQuery?.edit;
		const isDeleteMode = !!globalProps.adminPortal?.currentQuery?.delete;

		return { isCreateMode, isEditMode, isDeleteMode };
	}, [globalProps.adminPortal?.currentQuery]);
	const formDialog = useMemo<ResponsiveDialogProps>(() => {
		const isOpen = formDialogMode.isCreateMode || formDialogMode.isEditMode;
		let title = "New Location";
		let description = "Add new locations available for service.";

		if (formDialogMode.isEditMode) {
			title = "Update Location";
			description = "Update the details of available location data.";
		}

		return {
			title,
			description,
			isOpen,
			forceMode: formDialogMode.isCreateMode ? "dialog" : undefined,
			onOpenChange: () => {
				const objQueryParams = formDialogMode.isEditMode
					? { edit: null }
					: { new: null };
				const { fullUrl, queryParams } = populateQueryParams(
					pageURL,
					objQueryParams,
				);

				router.get(
					fullUrl,
					{ ...queryParams },
					{
						only: ["selectedLocations", "flash", "adminPortal"],
						preserveScroll: true,
					},
				);
			},
		};
	}, [pageURL, formDialogMode]);
	const alertFormDialog = useMemo(() => {
		const isOpen = formDialogMode.isDeleteMode;

		return {
			isOpen,
			onOpenChange: (_value: boolean) => {
				const { fullUrl, queryParams } = populateQueryParams(pageURL, {
					delete: null,
				});

				router.get(
					fullUrl,
					{ ...queryParams },
					{
						only: ["selectedLocations", "flash", "adminPortal"],
						preserveScroll: true,
					},
				);
			},
		};
	}, [pageURL, formDialogMode.isDeleteMode]);

	return (
		<>
			<Head title="Location Availability" />

			<PageContainer className="flex items-center justify-between">
				<h1 className="text-2xl font-bold tracking-tight">Our Locations</h1>
				{globalProps.auth.currentUserType === "ADMIN" && (
					<Button
						onClick={(event) => {
							event.preventDefault();
							routeTo.newLocations();
						}}
					>
						<Plus />
						Add Location
					</Button>
				)}
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

				{formDialog.isOpen && (
					<ResponsiveDialog {...formDialog}>
						<FormUpsertLocation
							{...{
								selectedLocations,
								forceMode: formDialog.forceMode,
								handleOpenChange: formDialog.onOpenChange,
							}}
						/>
					</ResponsiveDialog>
				)}

				{alertFormDialog.isOpen && (
					<DeleteLocationAlert
						{...alertFormDialog}
						selectedLocations={selectedLocations || []}
					/>
				)}
			</PageContainer>
		</>
	);
}
