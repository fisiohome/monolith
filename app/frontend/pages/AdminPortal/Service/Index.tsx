import {
	ActivateServiceDialog,
	DeleteServiceAlertDialog,
	type DeleteServiceAlertDialogProps,
	FormServiceDialogContent,
} from "@/components/admin-portal/service/form-service-dialog";
import { PageContainer } from "@/components/admin-portal/shared/page-layout";
import DotBadgeWithLabel from "@/components/shared/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, humanize, populateQueryParams } from "@/lib/utils";
import type { Location } from "@/types/admin-portal/location";
import type { Service } from "@/types/admin-portal/service";
import type { GlobalPageProps } from "@/types/globals";
import { Head, router, usePage } from "@inertiajs/react";
import type { ColumnDef } from "@tanstack/react-table";
import { useMediaQuery } from "@uidotdev/usehooks";
import { AnimatePresence, motion } from "framer-motion";
import { Ellipsis, Info, Plus } from "lucide-react";
import { Fragment, useMemo } from "react";

export interface PageProps {
	services: Service[];
	selectedService: Service | null;
	locations: Location[];
}

export default function Index({
	services,
	selectedService,
	locations,
}: PageProps) {
	const { props: globalProps, url: pageURL } = usePage<GlobalPageProps>();
	const isDekstop = useMediaQuery("(min-width: 768px)");
	const isDekstopLG = useMediaQuery("(min-width: 1024px)");

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
			router.get(
				pageURL,
				{ edit: id },
				{
					only: ["selectedService", "flash", "adminPortal", "locations"],
					preserveScroll: true,
				},
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
			accessorKey: "name",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Service Name" />
			),
			enableHiding: false,
			cell: ({ row }) => {
				return (
					<div className="flex items-center space-x-2">
						<p className="font-medium uppercase">
							{humanize(row.original.name)}
						</p>
						<Badge>{humanize(row.original.code).toUpperCase()}</Badge>
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
			accessorKey: "locations",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Locations" />
			),
			enableHiding: false,
			cell: ({ row }) => {
				const locations = useMemo(
					() => row.original.locations,
					[row.original.locations],
				);
				const locationsActive = useMemo(
					() => row.original.locations.filter((location) => location.active),
					[row.original.locations],
				);
				const locationInactive = useMemo(
					() => row.original.locations.filter((location) => !location.active),
					[row.original.locations],
				);

				if (!locations?.length) {
					return <span title="No locations listed yet">-</span>;
				}

				return (
					<div className="flex items-center space-x-2 whitespace-nowrap">
						<span className="leading-none">
							{locationsActive.length
								? `Active in ${locationsActive.length} of ${locations.length} locations`
								: `Inactive in all of  ${locations.length} locations`}
						</span>

						<Popover>
							<PopoverTrigger asChild>
								<Info className="cursor-pointer size-4 hover:text-accent" />
							</PopoverTrigger>
							<PopoverContent className="w-full">
								<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
									<div className="space-y-2 col-span-full">
										<h4 className="font-medium leading-none">Show Locations</h4>
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
															action.active ? "bg-green-700" : "bg-destructive",
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

	// for add, edit, activate service
	const formServiceDialogMode = useMemo(() => {
		const isCreateMode =
			globalProps.adminPortal?.currentQuery?.new === "service";
		const isEditMode = !!globalProps.adminPortal?.currentQuery?.edit;
		const isActivateMode =
			!!globalProps.adminPortal?.currentQuery?.updateStatus;

		return { isCreateMode, isEditMode, isActivateMode };
	}, [globalProps.adminPortal?.currentQuery]);
	const formServiceDialog = useMemo<ResponsiveDialogProps>(() => {
		const isOpen =
			formServiceDialogMode.isCreateMode ||
			formServiceDialogMode.isEditMode ||
			formServiceDialogMode.isActivateMode;
		let title = "New Service";
		let description = "Add a new service to be available on the system.";

		if (formServiceDialogMode.isEditMode) {
			title = "Update Service";
			description = "Update services that are available on the system.";
		}

		if (formServiceDialogMode.isActivateMode) {
			title = selectedService?.active ? "Inactive Service" : "Activate Service";
			description = selectedService?.active
				? "Inactivate the service available on the system."
				: "Re-activate the service available on the system.";
		}

		return {
			title,
			description,
			isOpen,
			forceMode: formServiceDialogMode.isEditMode ? "dialog" : undefined,
			dialogWidth:
				formServiceDialogMode.isEditMode && isDekstopLG ? "700px" : undefined,
			onOpenChange: (_value: boolean) => {
				const objQueryParams = formServiceDialogMode.isEditMode
					? { edit: null }
					: formServiceDialogMode.isActivateMode
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
	}, [pageURL, formServiceDialogMode, selectedService, isDekstopLG]);
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
			<Head title="Service Availability" />

			<PageContainer className="flex items-center justify-between">
				<h1 className="text-2xl font-bold tracking-tight">Services</h1>
				{globalProps.auth.currentUserType === "ADMIN" && (
					<Button
						onClick={(event) => {
							event.preventDefault();
							routeTo.newService();
						}}
					>
						<Plus />
						Add Service
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
								<DataTable columns={columns} data={services} />
							</TabsContent>
						</Fragment>
					))}
				</Tabs>

				{formServiceDialog.isOpen && (
					<ResponsiveDialog {...formServiceDialog}>
						{(formServiceDialogMode.isEditMode ||
							formServiceDialogMode.isCreateMode) && (
							<FormServiceDialogContent
								{...{
									selectedService,
									locations,
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
