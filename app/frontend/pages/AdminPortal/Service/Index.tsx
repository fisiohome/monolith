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
import {
	Table,
	TableBody,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getBrandBadgeVariant } from "@/lib/services";
import { cn, humanize, populateQueryParams } from "@/lib/utils";
import type { Service } from "@/types/admin-portal/service";
import type { GlobalPageProps } from "@/types/globals";
import { Deferred, Head, router, usePage } from "@inertiajs/react";
import type { Table as TableTanstack } from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { useMediaQuery } from "@uidotdev/usehooks";
import { AnimatePresence, motion } from "framer-motion";
import { Ellipsis, Info, Plus } from "lucide-react";
import { Fragment, useMemo, useState } from "react";

export interface PageProps {
	services: Service[];
	selectedService: Service | null;
}

export type TableToolbarDataProps = TableTanstack<
	PageProps["services"][number]
>;

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
			router.get(`${pageURL}/${id}/edit`);
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

				// dialog state management
				const [isOpenPackage, setIsOpenPackage] = useState(false);
				const formDialogPackage = useMemo<ResponsiveDialogProps>(() => {
					return {
						title: `Our ${humanize(row.original.name)} Packages`,
						description: "Shows active and inactive packages of the brand.",
						isOpen: isOpenPackage,
						forceMode: "dialog",
						dialogWidth: "1000px",
						onOpenChange: (value: boolean) => {
							setIsOpenPackage(value);
						},
					};
				}, [row.original.name, isOpenPackage]);

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
							<>
								<Button
									variant="link"
									className="p-0"
									onClick={() => {
										setIsOpenPackage(!isOpenPackage);
									}}
								>
									<Info />
								</Button>

								{formDialogPackage.isOpen && (
									<ResponsiveDialog {...formDialogPackage}>
										<div className="grid border rounded-xl">
											<Table>
												<TableHeader>
													<TableRow>
														<TableHead>Package</TableHead>
														<TableHead>Status</TableHead>
														<TableHead className="text-right">
															Discount
														</TableHead>
														<TableHead className="text-right">
															Price/Visit
														</TableHead>
														<TableHead className="text-right">
															Total Price
														</TableHead>
														<TableHead className="text-right">
															Fee/Visit
														</TableHead>
														<TableHead className="text-right">
															Total Fee
														</TableHead>
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
																		variant={
																			packageItem.active
																				? "success"
																				: "destructive"
																		}
																	>
																		<span>
																			{packageItem.active
																				? "Active"
																				: "Inactive"}
																		</span>
																	</DotBadgeWithLabel>
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
														<TableCell colSpan={2}>Total</TableCell>
														<TableCell colSpan={3} className="text-right">
															<div className="flex flex-col space-y-0.5">
																{row.original.packages?.totalPrices.map(
																	(price) => (
																		<span key={price.currency}>
																			{price.formattedTotalPrice}
																		</span>
																	),
																)}
															</div>
														</TableCell>
														<TableCell colSpan={2} className="text-right">
															<div className="flex flex-col space-y-0.5">
																{row.original.packages?.totalPrices.map(
																	(price) => (
																		<span key={price.currency}>
																			{price.formattedTotalFee}
																		</span>
																	),
																)}
															</div>
														</TableCell>
													</TableRow>
												</TableFooter>
											</Table>
										</div>
									</ResponsiveDialog>
								)}
							</>
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
				{globalProps.auth.currentUserType === "ADMIN" && (
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
										toolbar={(table) => <ToolbarTable table={table} />}
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
