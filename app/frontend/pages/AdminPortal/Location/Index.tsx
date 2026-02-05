import { Head, router, usePage } from "@inertiajs/react";
import type { ColumnDef, Table as TableTanstack } from "@tanstack/react-table";
import { Ellipsis, LoaderIcon, PlusCircle, RefreshCcw, X } from "lucide-react";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
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
import { useMasterDataSync } from "@/hooks/admin-portal/use-master-data-sync";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn, populateQueryParams } from "@/lib/utils";
import type { Location, StateID } from "@/types/admin-portal/location";
import type { GlobalPageProps } from "@/types/globals";
import type { Metadata } from "@/types/pagy";

export interface PageProps {
	locations: {
		data: Location[];
		metadata: Metadata;
	};
	selectedLocations: Location[] | null;
	optionsData?: {
		provinces: StateID[];
		cities: StateID[];
	};
}
export type LocationGlobalPageProps = GlobalPageProps &
	PageProps & {
		[key: string]: unknown;
		errors: {
			locations: Array<{
				index: number;
				messages: Partial<Record<keyof Location, string[]>>;
			}>;
		};
	};
export type TableToolbarDataProps = TableTanstack<
	PageProps["locations"]["data"][number]
>;

export default function Index({ locations, selectedLocations }: PageProps) {
	const { props: globalProps, url: pageURL } = usePage<GlobalPageProps>();
	const isMobile = useIsMobile();
	const { t } = useTranslation("translation");
	const { t: tl } = useTranslation("locations");

	// Handle sync completion
	const onSyncComplete = useCallback(() => {
		// Refresh location data when sync completes
		router.reload({ only: ["adminPortal", "locations"] });
	}, []);

	const { isLoading, syncStatus, triggerSync, clearStatus } = useMasterDataSync(
		{
			syncEndpoint: `${globalProps.adminPortal.router.adminPortal.locationManagement.index}/sync-data-master`,
			statusEndpoint: `${globalProps.adminPortal.router.adminPortal.locationManagement.index}/sync-status`,
			onSyncComplete,
			autoCheckOnMount: true,
		},
	);
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
	const columns = useMemo<
		ColumnDef<PageProps["locations"]["data"][number]>[]
	>(() => {
		const items: ColumnDef<PageProps["locations"]["data"][number]>[] = [
			{
				accessorKey: "state",
				header: ({ column }) => (
					<DataTableColumnHeader
						column={column}
						title={tl("table.header.state")}
					/>
				),
				enableSorting: false,
				enableHiding: false,
			},
			{
				accessorKey: "city",
				header: ({ column }) => (
					<DataTableColumnHeader
						column={column}
						title={tl("table.header.city")}
					/>
				),
				enableSorting: false,
				enableHiding: false,
			},
		];

		if (!isMobile) {
			items.unshift({
				accessorKey: "country",
				header: ({ column }) => (
					<DataTableColumnHeader
						column={column}
						title={tl("table.header.country")}
					/>
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
			});
		}

		items.push({
			id: "actions",
			cell: ({ row }) => {
				if (!globalProps.auth.currentUser?.["isSuperAdmin?"]) return;

				return (
					<div className="flex items-center justify-end space-x-2">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline" size="icon">
									<Ellipsis />
								</Button>
							</DropdownMenuTrigger>

							<DropdownMenuContent align="end">
								<DropdownMenuLabel>{tl("button.actions")}</DropdownMenuLabel>
								<DropdownMenuSeparator />

								<DropdownMenuGroup>
									<DropdownMenuItem
										onSelect={() => routeTo.editLocation([row.original.id])}
									>
										{tl("button.edit")}
									</DropdownMenuItem>
								</DropdownMenuGroup>

								<DropdownMenuSeparator />
								<DropdownMenuItem
									onSelect={() => routeTo.deleteLocation([row.original.id])}
								>
									{tl("button.delete")}
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				);
			},
		});

		return items;
	}, [
		globalProps.auth.currentUser,
		isMobile,
		routeTo.editLocation,
		routeTo.deleteLocation,
		tl,
	]);

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
		let title = tl("modal.add.title");
		let description = tl("modal.add.description");

		if (formDialogMode.isEditMode) {
			title = tl("modal.update.title");
			description = tl("modal.update.title");
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
	}, [pageURL, formDialogMode, tl]);
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
			<Head title={tl("head_title")} />

			<PageContainer className="min-h-[100vh] flex-1 md:min-h-min space-y-4">
				{syncStatus.message && (
					<div
						className={cn(
							"p-4 rounded-md border relative",
							syncStatus.type === "success" &&
								"bg-green-50 border-green-200 text-green-800",
							syncStatus.type === "error" &&
								"bg-red-50 border-red-200 text-red-800",
							syncStatus.type === "info" &&
								"bg-blue-50 border-blue-200 text-blue-800",
						)}
					>
						<button
							onClick={clearStatus}
							type="button"
							className="absolute top-2 right-2 p-1 rounded-md hover:bg-black/10 transition-colors"
							aria-label="Close notification"
						>
							<X className="h-4 w-4" />
						</button>
						<div className="flex items-center gap-2 pr-8">
							{syncStatus.type === "info" && (
								<LoaderIcon className="animate-spin h-4 w-4" />
							)}
							{syncStatus.type === "success" && (
								<RefreshCcw className="h-4 w-4" />
							)}
							<span className="text-sm font-medium">{syncStatus.message}</span>
						</div>
					</div>
				)}
				<div className="flex flex-col justify-between gap-4 md:flex-row">
					<div>
						<h1 className="text-lg font-bold tracking-tight uppercase">
							{tl("page_title")}
						</h1>

						<p className="text-sm text-muted-foreground">
							{tl("page_description")}
						</p>
					</div>

					{globalProps.auth.currentUser?.["isSuperAdmin?"] && (
						<div className="flex flex-col gap-2 md:flex-row">
							<Button
								variant="primary-outline"
								disabled={isLoading}
								onClick={(event) => {
									event.preventDefault();
									triggerSync();
								}}
							>
								{isLoading ? (
									<>
										<LoaderIcon className="animate-spin" />
										<span>{`${t("components.modal.wait")}...`}</span>
									</>
								) : (
									<>
										<RefreshCcw />
										{tl("button.sync")}
									</>
								)}
							</Button>

							<Button
								onClick={(event) => {
									event.preventDefault();
									routeTo.newLocations();
								}}
							>
								<PlusCircle />
								{tl("button.add")}
							</Button>
						</div>
					)}
				</div>

				<Separator className="bg-border" />

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
