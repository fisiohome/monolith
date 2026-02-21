import { Deferred, Head, router, usePage } from "@inertiajs/react";
import type {
	ColumnDef,
	ExpandedState,
	Row,
	Table as TableTanstack,
} from "@tanstack/react-table";
import { useMediaQuery } from "@uidotdev/usehooks";
import {
	ChevronDown,
	ChevronUp,
	Ellipsis,
	Info,
	LoaderIcon,
	PlusCircle,
	RefreshCcw,
	X,
} from "lucide-react";
import { Fragment, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import ExpandSubTable from "@/components/admin-portal/service/data-table-expand";
import ToolbarTable from "@/components/admin-portal/service/data-table-toolbar";
import {
	ActivateServiceDialog,
	DeleteServiceAlertDialog,
	type DeleteServiceAlertDialogProps,
	FormServiceDialogContent,
} from "@/components/admin-portal/service/form-service-dialog";
import { PageContainer } from "@/components/admin-portal/shared/page-layout";
import DotBadgeWithLabel from "@/components/shared/dot-badge";
import {
	ResponsiveDialog,
	type ResponsiveDialogProps,
} from "@/components/shared/responsive-dialog";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMasterDataSync } from "@/hooks/admin-portal/use-master-data-sync";
import { getBrandBadgeVariant } from "@/lib/services";
import { cn, populateQueryParams, removeWhiteSpaces } from "@/lib/utils";
import type { Service } from "@/types/admin-portal/service";
import type { GlobalPageProps } from "@/types/globals";

export interface PageProps {
	services: Service[];
	selectedService: Service | null;
}
export type TableToolbarDataProps = TableTanstack<
	PageProps["services"][number]
>;
export type TableRowDataProps = Row<PageProps["services"][number]>;

export default function Index({ services, selectedService }: PageProps) {
	const { props: globalProps, url: pageURL } = usePage<GlobalPageProps>();
	const isDekstop = useMediaQuery("(min-width: 768px)");
	const { t } = useTranslation("translation");
	const { t: tb } = useTranslation("brands");

	// Background sync hook
	const onSyncComplete = useCallback(() => {
		// Refresh service data when sync completes
		router.reload({ only: ["services"] });
	}, []);

	const {
		isLoading: isSyncLoading,
		syncStatus,
		triggerSync,
		clearStatus,
	} = useMasterDataSync({
		syncEndpoint: `${globalProps.adminPortal.router.adminPortal.serviceManagement.index}/sync-data-master`,
		statusEndpoint: `${globalProps.adminPortal.router.adminPortal.serviceManagement.index}/sync-status`,
		onSyncComplete,
	});

	// tabs management
	const tabActive = useMemo(
		() => globalProps?.adminPortal?.currentQuery?.filterByStatus || "all",
		[globalProps?.adminPortal?.currentQuery?.filterByStatus],
	);
	const tabList = useMemo(() => {
		return [
			{
				text: tb("tab.all"),
				value: "all",
			},
			{
				text: tb("tab.active"),
				value: "active",
			},
			{
				text: tb("tab.inactive"),
				value: "inactive",
			},
		] as const;
	}, [tb]);
	const handleTabClick = (value: (typeof tabList)[number]["value"]) => {
		const baseUrl = pageURL.split("?")[0];
		const { fullUrl, queryParams } = populateQueryParams(baseUrl, {
			filter_by_status: value,
		});

		router.get(
			fullUrl,
			{ ...queryParams },
			{
				replace: true,
				preserveState: true,
				only: ["services", "adminPortal", "flash"],
			},
		);
	};

	// table management
	const currentExpanded = useMemo<ExpandedState>(() => {
		const { queryParams } = populateQueryParams(pageURL);
		const expandedList = queryParams?.expanded
			? removeWhiteSpaces(queryParams?.expanded)?.split(",")
			: [];
		const serviceIndex = services?.reduce(
			(obj, item, index) => {
				if (expandedList.includes(String(item.id))) {
					obj[index] = true;
				}
				return obj;
			},
			{} as Record<number, boolean>,
		);

		return serviceIndex;
	}, [pageURL, services]);
	const onHandleTableExpand = useCallback(
		(ids: string[]) => {
			const { fullUrl, queryParams } = populateQueryParams(pageURL, {
				expanded: ids.join(","),
			});

			router.get(fullUrl, queryParams, {
				only: ["adminPortal", "flash", "errors"],
				preserveScroll: true,
				preserveState: true,
				replace: true,
			});
		},
		[pageURL],
	);
	const routeTo = {
		newService: () => {
			router.get(
				pageURL,
				{ new: "service" },
				{
					only: ["selectedService", "flash", "adminPortal"],
					preserveScroll: true,
				},
			);
		},
		editService: (id: number) => {
			router.get(
				`${globalProps.adminPortal.router.adminPortal.serviceManagement.index}/${id}/edit`,
			);
		},
		deleteService: (id: number) => {
			router.get(
				pageURL,
				{ delete: id },
				{
					only: ["selectedService", "flash", "adminPortal", "locations"],
					preserveScroll: true,
				},
			);
		},
		activateService: (id: number) => {
			router.get(
				pageURL,
				{ update_status: id },
				{
					only: ["selectedService", "flash", "adminPortal", "locations"],
					preserveScroll: true,
				},
			);
		},
	};
	const columns: ColumnDef<PageProps["services"][number]>[] = [
		{
			id: "select",
			header: ({ table }) => {
				// const isChecked = table.getIsAllPageRowsSelected() ||
				//   (table.getIsSomePageRowsSelected() && "indeterminate")

				return (
					<div className="flex items-start space-x-2">
						{/* <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Select all"
                    className="translate-y-[2px]"
                  />
                </TooltipTrigger>
                <TooltipContent side='top'>
                  <span>{isChecked ? 'Un-select all' : 'Select all'}</span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider> */}

						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="ghost"
										size="icon"
										className="border shadow size-8 lg:size-5 border-primary/25"
										onClick={() => table.toggleAllRowsExpanded()}
									>
										{table.getIsAllRowsExpanded() ? (
											<ChevronUp />
										) : (
											<ChevronDown />
										)}
									</Button>
								</TooltipTrigger>
								<TooltipContent side="top">
									<span>
										{table.getIsAllRowsExpanded()
											? "Collapse all"
											: "Expand all"}
									</span>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>
				);
			},
			cell: ({ row }) => {
				const toggleExpand = () => {
					row.toggleExpanded();

					const { queryParams: currentQuery } = populateQueryParams(pageURL);
					const expandedList = removeWhiteSpaces(currentQuery?.expanded || "")
						.split(",")
						.filter(Boolean);
					const id = String(row.original.id);
					const updatedList = row.getIsExpanded()
						? expandedList.filter((item) => item !== id)
						: [...expandedList, id];

					onHandleTableExpand(updatedList);
				};

				return (
					<div className="flex items-start space-x-2">
						{/* <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Checkbox
                  checked={row.getIsSelected()}
                  onCheckedChange={(value) => row.toggleSelected(!!value)}
                  aria-label="Select row"
                  className="translate-y-[2px]"
                />
              </TooltipTrigger>
              <TooltipContent side='top'>
                <span>{row.getIsSelected() ? 'Un-select' : 'Select'}</span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider> */}

						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="ghost"
										size="icon"
										className="border shadow size-8 lg:size-5 border-primary/25"
										onClick={toggleExpand}
									>
										{row.getIsExpanded() ? <ChevronUp /> : <ChevronDown />}
									</Button>
								</TooltipTrigger>
								<TooltipContent side="top">
									<span>{row.getIsExpanded() ? "Collapse" : "Expand"}</span>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>
				);
			},
			enableSorting: false,
			enableHiding: false,
		},
		{
			accessorKey: "name",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Brand" />
			),
			enableHiding: false,
			cell: ({ row }) => {
				const brandName = row.original.name.replaceAll("_", " ").toLowerCase();
				const brandCode = row.original.code.toUpperCase();
				const brandBadgeVariant = getBrandBadgeVariant(brandCode);

				return (
					<div className="flex items-center space-x-2">
						<p className="font-medium uppercase text-nowrap">{brandName}</p>
						<Badge
							variant="outline"
							className={cn("text-[10px] p-0 px-1", brandBadgeVariant)}
						>
							{brandCode}
						</Badge>
					</div>
				);
			},
		},
		{
			accessorKey: "active",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Status" />
			),
			enableHiding: false,
			cell: ({ row }) => {
				const isActive = row.original.active;

				return (
					<DotBadgeWithLabel variant={isActive ? "success" : "destructive"}>
						<span>{isActive ? "Active" : "Inactive"}</span>
					</DotBadgeWithLabel>
				);
			},
		},
		{
			accessorKey: "packages",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Packages" />
			),
			enableHiding: false,
			cell: ({ row }) => {
				const packages = row.original?.packages?.list || [];
				const packagesActive = packages.filter((item) => item.active);
				const toggleExpand = () => {
					row.toggleExpanded();

					const { queryParams: currentQuery } = populateQueryParams(pageURL);
					const expandedList = removeWhiteSpaces(currentQuery?.expanded || "")
						.split(",")
						.filter(Boolean);
					const id = String(row.original.id);
					const updatedList = row.getIsExpanded()
						? expandedList.filter((item) => item !== id)
						: [...expandedList, id];

					onHandleTableExpand(updatedList);
				};

				if (!packages?.length) {
					return <span>No packages listed yet</span>;
				}

				return (
					<div className="flex items-center space-x-2 whitespace-nowrap">
						<span className="leading-none">
							{packagesActive.length === packages.length
								? "All packages have been activated"
								: packagesActive.length
									? `Only  ${packagesActive.length} out of ${packages.length} packages are active`
									: "All packages are inactive"}
						</span>

						{globalProps.auth.currentUserType === "ADMIN" && (
							<Button
								type="button"
								variant="link"
								className="p-0"
								onClick={(event) => {
									event.preventDefault();

									toggleExpand();
								}}
							>
								<Info />
							</Button>
						)}
					</div>
				);
			},
		},
		{
			accessorKey: "locations",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Locations" />
			),
			enableHiding: false,
			cell: ({ row }) => {
				const locations = row.original.locations || [];
				const locationsActive = locations.filter((location) => location.active);
				const toggleExpand = () => {
					row.toggleExpanded();

					const { queryParams: currentQuery } = populateQueryParams(pageURL);
					const expandedList = removeWhiteSpaces(currentQuery?.expanded || "")
						.split(",")
						.filter(Boolean);
					const id = String(row.original.id);
					const updatedList = row.getIsExpanded()
						? expandedList.filter((item) => item !== id)
						: [...expandedList, id];

					onHandleTableExpand(updatedList);
				};

				if (!locations?.length) {
					return <span>No locations listed yet</span>;
				}

				return (
					<div className="flex items-center space-x-2 whitespace-nowrap">
						<span className="leading-none">
							{locationsActive.length === locations.length
								? "Active in all locations"
								: locationsActive.length
									? `Active in ${locationsActive.length} of ${locations.length} locations`
									: `Inactive in all of  ${locations.length} locations`}
						</span>

						<Button
							type="button"
							variant="link"
							className="p-0"
							onClick={(event) => {
								event.preventDefault();

								toggleExpand();
							}}
						>
							<Info />
						</Button>
					</div>
				);
			},
		},
		{
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
								<DropdownMenuLabel>Actions</DropdownMenuLabel>
								<DropdownMenuSeparator />

								<DropdownMenuGroup>
									<DropdownMenuItem
										onSelect={() => routeTo.editService(row.original.id)}
									>
										Edit
									</DropdownMenuItem>
									<DropdownMenuItem
										onSelect={() => routeTo.activateService(row.original.id)}
									>
										{row.original.active ? "Inactive" : "Activate"}
									</DropdownMenuItem>
								</DropdownMenuGroup>

								<DropdownMenuSeparator />
								<DropdownMenuItem
									onSelect={() => routeTo.deleteService(row.original.id)}
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

	// for add, activate service
	const formServiceDialogMode = useMemo(() => {
		const isCreateMode =
			globalProps.adminPortal?.currentQuery?.new === "service";
		const isActivateMode =
			!!globalProps.adminPortal?.currentQuery?.updateStatus;

		return { isCreateMode, isActivateMode };
	}, [globalProps.adminPortal?.currentQuery]);
	const formServiceDialog = useMemo<ResponsiveDialogProps>(() => {
		const isOpen =
			formServiceDialogMode.isCreateMode ||
			formServiceDialogMode.isActivateMode;
		let title = "New Brand";
		let description = "Add a new brand to be available on the system.";

		if (formServiceDialogMode.isActivateMode) {
			title = selectedService?.active ? "Inactive Brand" : "Activate Brand";
			description = selectedService?.active
				? "Inactivate the brand available on the system."
				: "Re-activate the brand available on the system.";
		}

		return {
			title,
			description,
			isOpen,
			// forceMode: formServiceDialogMode.isEditMode ? "dialog" : undefined,
			// dialogWidth:
			// 	formServiceDialogMode.isEditMode && isDekstopLG ? "700px" : undefined,
			onOpenChange: (_value: boolean) => {
				const objQueryParams = formServiceDialogMode.isActivateMode
					? { update_status: null }
					: { new: null };
				const { fullUrl, queryParams } = populateQueryParams(
					pageURL,
					objQueryParams,
				);

				router.get(
					fullUrl,
					{ ...queryParams },
					{
						only: ["selectedService", "flash", "adminPortal", "locations"],
						preserveScroll: true,
					},
				);
			},
		};
	}, [pageURL, formServiceDialogMode, selectedService]);
	const removeFormServiceDialog = useMemo<DeleteServiceAlertDialogProps>(() => {
		const isRemoveMode = !!globalProps.adminPortal?.currentQuery?.delete;

		return {
			selectedService,
			isOpen: isRemoveMode,
			onOpenChange: (_value: boolean) => {
				const { fullUrl } = populateQueryParams(pageURL, { delete: null });
				router.get(
					fullUrl,
					{},
					{
						only: ["selectedService", "flash", "adminPortal", "locations"],
						preserveScroll: true,
					},
				);
			},
		};
	}, [pageURL, selectedService, globalProps.adminPortal?.currentQuery?.delete]);

	return (
		<>
			<Head title={tb("head_title")} />

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
							{tb("page_title")}
						</h1>

						<p className="w-full text-sm md:w-10/12 text-muted-foreground text-pretty">
							{tb("page_description")}
						</p>
					</div>

					{globalProps.auth.currentUser?.["isSuperAdmin?"] && (
						<div className="flex flex-col gap-2 md:flex-row">
							<Button
								variant="primary-outline"
								disabled={isSyncLoading}
								onClick={(event) => {
									event.preventDefault();
									triggerSync();
								}}
							>
								{isSyncLoading ? (
									<>
										<LoaderIcon className="animate-spin" />
										<span>{`${t("components.modal.wait")}...`}</span>
									</>
								) : (
									<>
										<RefreshCcw />
										{tb("button.sync")}
									</>
								)}
							</Button>

							<Button
								onClick={(event) => {
									event.preventDefault();
									routeTo.newService();
								}}
							>
								<PlusCircle />
								{tb("button.add")}
							</Button>
						</div>
					)}
				</div>

				<Separator className="bg-border" />

				<Tabs defaultValue={tabActive}>
					<TabsList
						className={cn("", isDekstop ? "" : "grid grid-cols-3 w-full")}
					>
						{tabList.map((tab) => (
							<Fragment key={tab.value}>
								<TabsTrigger
									value={tab.value}
									onClick={() => handleTabClick(tab.value)}
								>
									{tab.text}
								</TabsTrigger>
							</Fragment>
						))}
					</TabsList>

					{tabList.map((tab) => (
						<Fragment key={tab.value}>
							<TabsContent value={tab.value}>
								<Deferred
									data="services"
									fallback={
										<Skeleton className="col-span-full xl:col-span-2 h-[360px] rounded-md" />
									}
								>
									<DataTable
										columns={columns}
										data={services}
										currentExpanded={currentExpanded}
										toolbar={(table) => <ToolbarTable table={table} />}
										subComponent={(row) => <ExpandSubTable row={row} />}
									/>
								</Deferred>
							</TabsContent>
						</Fragment>
					))}
				</Tabs>

				{formServiceDialog.isOpen && (
					<ResponsiveDialog {...formServiceDialog}>
						{formServiceDialogMode.isCreateMode && (
							<FormServiceDialogContent
								{...{
									forceMode: formServiceDialog.forceMode,
									handleOpenChange: formServiceDialog.onOpenChange,
								}}
							/>
						)}

						{formServiceDialogMode.isActivateMode && (
							<ActivateServiceDialog
								{...{
									selectedService,
									forceMode: formServiceDialog.forceMode,
									handleOpenChange: formServiceDialog.onOpenChange,
								}}
							/>
						)}
					</ResponsiveDialog>
				)}

				{removeFormServiceDialog.isOpen && (
					<DeleteServiceAlertDialog {...removeFormServiceDialog} />
				)}
			</PageContainer>
		</>
	);
}
