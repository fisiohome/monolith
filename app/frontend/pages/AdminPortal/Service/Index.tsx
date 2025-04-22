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
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { getBrandBadgeVariant } from "@/lib/services";
import { cn, populateQueryParams, removeWhiteSpaces } from "@/lib/utils";
import type { Service } from "@/types/admin-portal/service";
import type { GlobalPageProps } from "@/types/globals";
import { Deferred, Head, router, usePage } from "@inertiajs/react";
import type {
	ExpandedState,
	Row,
	Table as TableTanstack,
} from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { useMediaQuery } from "@uidotdev/usehooks";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, Ellipsis, Info, Plus } from "lucide-react";
import { Fragment, useCallback, useMemo } from "react";

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

	// tabs management
	const tabActive = useMemo(
		() => globalProps?.adminPortal?.currentQuery?.filterByStatus || "all",
		[globalProps?.adminPortal?.currentQuery?.filterByStatus],
	);
	const tabList = useMemo(() => {
		return [
			{
				text: "All",
				value: "all",
			},
			{
				text: "Active",
				value: "active",
			},
			{
				text: "Inactive",
				value: "inactive",
			},
		] as const;
	}, []);
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
				const brandName = useMemo(
					() => row.original.name.replaceAll("_", " ").toLowerCase(),
					[row.original.name],
				);
				const brandCode = useMemo(
					() => row.original.code.toUpperCase(),
					[row.original.code],
				);
				const brandBadgeVariant = useMemo(
					() => getBrandBadgeVariant(brandCode),
					[brandCode],
				);

				return (
					<div className="flex items-center space-x-2">
						<p className="font-medium uppercase text-nowrap">{brandName}</p>
						<Badge
							variant="outline"
							className={cn("text-[10px]", brandBadgeVariant)}
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
				const packages = useMemo(
					() => row.original?.packages?.list || [],
					[row.original.packages],
				);
				const packagesActive = useMemo(
					() => packages.filter((item) => item.active) || [],
					[packages],
				);
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
				const locations = useMemo(
					() => row.original.locations || [],
					[row.original.locations],
				);
				const locationsActive = useMemo(
					() => locations.filter((location) => location.active) || [],
					[locations],
				);
				const locationInactive = useMemo(
					() => locations.filter((location) => !location.active) || [],
					[locations],
				);

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

						{globalProps.auth.currentUserType === "ADMIN" && (
							<Popover>
								<PopoverTrigger asChild>
									<Button variant="link" className="p-0">
										<Info />
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-full">
									<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
										<div className="space-y-2 col-span-full">
											<div className="space-y-0.5">
												<h4 className="font-medium leading-none">
													Show Locations
												</h4>
												<p className="font-light">
													Monitor active and inactive locations.
												</p>
											</div>

											<div className="flex items-center h-5 space-x-2 text-sm text-muted-foreground">
												<div className="flex items-baseline space-x-1">
													<div className="bg-green-700 rounded-full size-2" />
													<span>{`${locationsActive?.length || 0} Locations`}</span>
												</div>
												<Separator
													orientation="vertical"
													className="bg-muted-foreground/25"
												/>
												<div className="flex items-baseline space-x-1">
													<div className="rounded-full bg-destructive size-2" />
													<span>{`${locationInactive?.length || 0} Locations`}</span>
												</div>
												<Separator
													orientation="vertical"
													className="bg-muted-foreground/25"
												/>
												<p>{`${locations?.length || 0} Total Locations`}</p>
											</div>
										</div>

										<ScrollArea className="w-full max-h-52 lg:max-h-32">
											<AnimatePresence>
												{locationsActive?.length ? (
													locationsActive.map((action, index) => (
														<motion.div
															key={action.id}
															initial={{ opacity: 0, y: -10 }}
															animate={{ opacity: 1, y: 0 }}
															exit={{ opacity: 0, y: 10 }}
															transition={{ delay: index * 0.1 }}
															className="flex items-center px-1 space-x-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground"
														>
															<div
																className={cn(
																	"rounded-full size-2",
																	action.active
																		? "bg-green-700"
																		: "bg-destructive",
																)}
															/>
															<span>{action.city}</span>
														</motion.div>
													))
												) : (
													<p className="text-sm text-muted-foreground">
														There's no active locations
													</p>
												)}
											</AnimatePresence>
										</ScrollArea>

										<ScrollArea className="w-full max-h-52 lg:max-h-32">
											<AnimatePresence>
												{locationInactive.map((action, index) => (
													<motion.div
														key={action.id}
														initial={{ opacity: 0, y: -10 }}
														animate={{ opacity: 1, y: 0 }}
														exit={{ opacity: 0, y: 10 }}
														transition={{ delay: index * 0.1 }}
														className="flex items-center px-1 space-x-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground"
													>
														<div
															className={cn(
																"rounded-full size-2",
																action.active
																	? "bg-green-700"
																	: "bg-destructive",
															)}
														/>
														<span>{action.city}</span>
													</motion.div>
												))}
											</AnimatePresence>
										</ScrollArea>
									</div>
								</PopoverContent>
							</Popover>
						)}
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
			<Head title="Brand Availability" />

			<PageContainer className="flex items-center justify-between">
				<h1 className="text-2xl font-bold tracking-tight">Our Brands</h1>
				{globalProps.auth.currentUser?.["isSuperAdmin?"] && (
					<Button
						onClick={(event) => {
							event.preventDefault();
							routeTo.newService();
						}}
					>
						<Plus />
						Add Brand
					</Button>
				)}
			</PageContainer>

			<PageContainer className="min-h-[100vh] flex-1 md:min-h-min space-y-4">
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
