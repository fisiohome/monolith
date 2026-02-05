import { Head, Link, router, usePage } from "@inertiajs/react";
import type {
	ColumnDef,
	ExpandedState,
	Row,
	Table as TableTanstack,
} from "@tanstack/react-table";
import { useMediaQuery } from "@uidotdev/usehooks";
import { formatDistanceToNow } from "date-fns";
import { format } from "date-fns/format";
import {
	ChevronDown,
	ChevronUp,
	InfinityIcon,
	LoaderIcon,
	PlusCircle,
	RefreshCcw,
	X,
} from "lucide-react";
import { Fragment, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import DataTableActions from "@/components/admin-portal/admin/data-table-actions";
import ExpandSubTable from "@/components/admin-portal/admin/data-table-expand";
import ToolbarTable from "@/components/admin-portal/admin/data-table-toolbar";
import {
	ChangePasswordContent,
	EditAdminDialogContent,
	SuspendAdminContent,
} from "@/components/admin-portal/admin/feature-actions";
import PaginationTable from "@/components/admin-portal/shared/data-table-pagination";
import { PageContainer } from "@/components/admin-portal/shared/page-layout";
import DotBadgeWithLabel from "@/components/shared/dot-badge";
import {
	ResponsiveDialog,
	type ResponsiveDialogProps,
} from "@/components/shared/responsive-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table/column-header";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMasterDataSync } from "@/hooks/admin-portal/use-master-data-sync";
import {
	cn,
	generateInitials,
	humanize,
	populateQueryParams,
	removeWhiteSpaces,
} from "@/lib/utils";
import type { Admin, AdminTypes } from "@/types/admin-portal/admin";
import type { User } from "@/types/auth";
import type { GlobalPageProps } from "@/types/globals";
import type { Metadata } from "@/types/pagy";

export type SelectedAdmin = Pick<Admin, "id" | "adminType" | "name"> & {
	user: Pick<User, "id" | "email" | "suspendAt" | "suspendEnd" | "suspended?">;
};
export interface PageProps {
	admins: {
		data: Admin[];
		metadata: Metadata;
	};
	adminTypeList: AdminTypes;
	selectedAdmin: SelectedAdmin | null;
}
export type TableRowDataProps = Row<PageProps["admins"]["data"][number]>;
export type TableToolbarDataProps = TableTanstack<
	PageProps["admins"]["data"][number]
>;

export default function Index({
	admins,
	adminTypeList,
	selectedAdmin,
}: PageProps) {
	const { props: globalProps, url: pageURL } = usePage<GlobalPageProps>();
	const isDekstop = useMediaQuery("(min-width: 768px)");
	const { t } = useTranslation("translation");
	const { t: ta } = useTranslation("admins");

	// Handle sync completion
	const onSyncComplete = useCallback(() => {
		// Refresh admin data when sync completes
		router.reload({ only: ["adminPortal", "admins"] });
	}, []);

	const { isLoading, syncStatus, triggerSync, clearStatus } = useMasterDataSync(
		{
			syncEndpoint: `${globalProps.adminPortal.router.adminPortal.adminManagement.index}/sync-data-master`,
			statusEndpoint: `${globalProps.adminPortal.router.adminPortal.adminManagement.index}/sync-status`,
			onSyncComplete,
			autoCheckOnMount: true,
		},
	);

	// tabs management
	const tabActive = useMemo(
		() =>
			globalProps?.adminPortal?.currentQuery?.filterByAccountStatus || "all",
		[globalProps?.adminPortal?.currentQuery?.filterByAccountStatus],
	);
	const tabList = useMemo(() => {
		return [
			{
				text: ta("tab.all"),
				value: "all",
			},
			{
				text: ta("tab.active"),
				value: "active",
			},
			{
				text: ta("tab.suspended"),
				value: "suspended",
			},
		] as const;
	}, [ta]);
	const handleTabClick = (value: (typeof tabList)[number]["value"]) => {
		const baseUrl = pageURL.split("?")[0];
		const { fullUrl, queryParams } = populateQueryParams(baseUrl, {
			filter_by_account_status: value,
		});

		router.get(
			fullUrl,
			{ ...queryParams },
			{
				replace: true,
				preserveState: true,
				only: ["admins", "adminPortal", "flash"],
			},
		);
	};

	// data table management
	const currentExpanded = useMemo<ExpandedState>(() => {
		const { queryParams } = populateQueryParams(pageURL);
		const expandedList = queryParams?.expanded
			? removeWhiteSpaces(queryParams?.expanded)?.split(",")
			: [];
		const adminsIndex = admins.data.reduce(
			(obj, item, index) => {
				if (expandedList.includes(String(item.id))) {
					obj[index] = true;
				}
				return obj;
			},
			{} as Record<number, boolean>,
		);

		return adminsIndex;
	}, [pageURL, admins.data]);
	const routeTo = {
		editAdmin: (id: number) => {
			router.get(
				pageURL,
				{ edit: id },
				{ only: ["selectedAdmin", "flash"], preserveScroll: true },
			);
		},
		changePassword: (id: number) => {
			router.get(
				pageURL,
				{ change_password: id },
				{ only: ["selectedAdmin", "flash"], preserveScroll: true },
			);
		},
		suspendAdmin: (id: number) => {
			router.get(
				pageURL,
				{ suspend: id },
				{ only: ["selectedAdmin", "flash"], preserveScroll: true },
			);
		},
	};
	// for edit admin profile
	const editAdminDialog = useMemo<ResponsiveDialogProps>(() => {
		const { queryParams } = populateQueryParams(pageURL, {});

		return {
			title: ta("modal.edit.title"),
			description: ta("modal.edit.description"),
			isOpen: !!queryParams?.edit || false,
			onOpenChange: (value: boolean) => {
				if (!value) {
					const { fullUrl } = populateQueryParams(pageURL, { edit: null });
					router.get(
						fullUrl,
						{},
						{ only: ["selectedAdmin", "flash"], preserveScroll: true },
					);
				}
			},
		};
	}, [pageURL, ta]);
	// for change password
	const [linkGenerated, setLinkGenerated] = useState("");
	const changePasswordDialog = useMemo<ResponsiveDialogProps>(() => {
		const { queryParams } = populateQueryParams(pageURL, {});

		return {
			title: "Change Password",
			description:
				"Make password changes using the generate the form link or via form.",
			isOpen: !!queryParams?.change_password || false,
			onOpenChange: (value: boolean) => {
				if (!value) {
					const { fullUrl } = populateQueryParams(pageURL, {
						change_password: null,
					});
					router.get(
						fullUrl,
						{},
						{ only: ["selectedAdmin", "flash"], preserveScroll: true },
					);

					// reseting the link generated state
					if (linkGenerated) {
						setLinkGenerated("");
					}
				}
			},
		};
	}, [pageURL, linkGenerated]);
	// for suspend admin
	const suspendAdminDialog = useMemo<ResponsiveDialogProps>(() => {
		const { queryParams } = populateQueryParams(pageURL, {});

		return {
			title: selectedAdmin?.user["suspended?"]
				? "Activate Admin"
				: "Suspend Admin",
			description: selectedAdmin?.user["suspended?"]
				? "Re-activate the admin accounts. "
				: "Suspend admin accounts immediately or schedule suspension for a specific date.",
			isOpen: !!queryParams?.suspend || false,
			onOpenChange: (value: boolean) => {
				if (!value) {
					const { fullUrl } = populateQueryParams(pageURL, {
						suspend: null,
					});
					router.get(
						fullUrl,
						{},
						{ only: ["selectedAdmin", "flash"], preserveScroll: true },
					);
				}
			},
		};
	}, [pageURL, selectedAdmin?.user["suspended?"]]);
	const columns: ColumnDef<PageProps["admins"]["data"][number]>[] = [
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

					const { fullUrl, queryParams } = populateQueryParams(pageURL, {
						expanded: updatedList.join(","),
					});

					router.get(fullUrl, queryParams, {
						only: ["flash"],
						preserveScroll: true,
						preserveState: true,
						replace: true,
					});
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
			accessorKey: "adminProfile",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Profile" />
			),
			enableSorting: false,
			enableHiding: false,
			cell: ({ row }) => {
				const name = row.original.name;
				const initials = generateInitials(name);
				const email = row.original.user.email;
				const isOnline = row.original.user["isOnline?"];
				const isCurrent =
					row.original.user.email === globalProps.auth.currentUser?.user.email;
				const isSuspended = row.original.user["suspended?"];

				return (
					<div className="flex items-center gap-2 text-sm text-left">
						<Avatar className="w-8 h-8 border rounded-lg">
							<AvatarImage src="#" alt={name} />
							<AvatarFallback
								className={cn(
									"text-xs rounded-lg",
									isSuspended
										? "bg-destructive text-destructive-foreground"
										: isCurrent
											? "bg-primary text-primary-foreground"
											: isOnline
												? "bg-emerald-700 text-white"
												: "",
								)}
							>
								{initials}
							</AvatarFallback>
						</Avatar>
						<div className="flex-1 space-y-1 text-sm leading-tight text-left">
							<div>
								<p className="font-bold uppercase truncate">{name}</p>
								<p className="text-xs truncate">{email}</p>
							</div>
						</div>
					</div>
				);
			},
		},
		{
			accessorKey: "adminType",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Type" />
			),
			enableSorting: false,
			enableHiding: false,
			cell: ({ row }) => {
				return (
					<Badge variant="accent" className="text-nowrap">
						{humanize(row.original.adminType).toUpperCase()}
					</Badge>
				);
			},
		},
		{
			accessorKey: "status",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Status" />
			),
			enableSorting: false,
			enableHiding: false,
			cell: ({ row }) => {
				const isOnline = row.original.user["isOnline?"];
				const currentIP = row.original.user.currentSignInIp;
				const lastIP = row.original.user.lastSignInIp;
				const lastOnlineAt = row.original.user.lastOnlineAt;
				const isSuspended = row.original.user["suspended?"];
				const suspendedAt = row.original.user.suspendAt;
				const suspendEnd = row.original.user.suspendEnd;

				if (isSuspended) {
					return (
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger>
									<DotBadgeWithLabel variant="destructive">
										<span>Suspended</span>
									</DotBadgeWithLabel>
								</TooltipTrigger>
								<TooltipContent side="bottom">
									<div className="flex flex-col">
										{suspendedAt && (
											<span>
												Suspend on: <b>{format(suspendedAt, "PP")}</b>
											</span>
										)}
										<span className="flex items-center">
											Suspend until:{" "}
											<b>
												{suspendEnd ? (
													format(suspendEnd, "PP")
												) : (
													<InfinityIcon className="ml-1 size-4" />
												)}
											</b>
										</span>
									</div>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					);
				}

				if (globalProps.auth.currentUser?.["isSuperAdmin?"]) {
					return (
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger className="space-x-1">
									<DotBadgeWithLabel variant={isOnline ? "success" : "outline"}>
										<span>{isOnline ? "Online" : "Offline"}</span>
									</DotBadgeWithLabel>
								</TooltipTrigger>
								<TooltipContent>
									{isOnline ? (
										<span>
											Current IP: <b>{currentIP}</b>
										</span>
									) : (
										<div className="flex flex-col">
											<span>
												Last IP: <b>{lastIP}</b>
											</span>
											{lastOnlineAt && (
												<span>
													Last Online Session:{" "}
													<b>
														{formatDistanceToNow(lastOnlineAt, {
															includeSeconds: true,
															addSuffix: true,
														})}
													</b>
												</span>
											)}
										</div>
									)}
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					);
				}

				return (
					<DotBadgeWithLabel variant={isOnline ? "success" : "outline"}>
						<span>{isOnline ? "Online" : "Offline"}</span>
					</DotBadgeWithLabel>
				);
			},
		},
		{
			id: "actions",
			cell: (props) => <DataTableActions {...props} routeTo={routeTo} />,
		},
	];

	return (
		<>
			<Head title={ta("head_title")} />

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
							{ta("page_title")}
						</h1>

						<p className="text-sm text-muted-foreground">
							{ta("page_description")}
						</p>
					</div>

					<div className="flex flex-col gap-2 md:flex-row">
						{globalProps?.auth?.currentUser?.["isSuperAdmin?"] && (
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
										{ta("button.sync")}
									</>
								)}
							</Button>
						)}

						{(globalProps?.auth?.currentUser?.["isSuperAdmin?"] ||
							globalProps?.auth?.currentUser?.["isAdminSupervisor?"]) && (
							<Button asChild>
								<Link
									href={
										globalProps.adminPortal.router.adminPortal.adminManagement
											.new
									}
								>
									<PlusCircle />
									{ta("button.add")}
								</Link>
							</Button>
						)}
					</div>
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
								<DataTable
									columns={columns}
									data={admins.data}
									toolbar={(table) => (
										<ToolbarTable table={table} adminTypeList={adminTypeList} />
									)}
									subComponent={(row) => (
										<ExpandSubTable row={row} routeTo={routeTo} />
									)}
									customPagination={(table) => (
										<PaginationTable table={table} metadata={admins.metadata} />
									)}
									currentExpanded={currentExpanded}
								/>
							</TabsContent>
						</Fragment>
					))}
				</Tabs>

				{selectedAdmin && editAdminDialog.isOpen && (
					<ResponsiveDialog {...editAdminDialog}>
						<EditAdminDialogContent
							{...{
								selectedAdmin,
								adminTypeList,
								forceMode: editAdminDialog.forceMode,
								handleOpenChange: editAdminDialog.onOpenChange,
							}}
						/>
					</ResponsiveDialog>
				)}

				{selectedAdmin && changePasswordDialog.isOpen && (
					<ResponsiveDialog {...changePasswordDialog}>
						<ChangePasswordContent
							{...{
								selectedAdmin,
								linkGenerated,
								setLinkGenerated,
								forceMode: changePasswordDialog.forceMode,
								handleOpenChange: changePasswordDialog.onOpenChange,
							}}
						/>
					</ResponsiveDialog>
				)}

				{selectedAdmin && suspendAdminDialog.isOpen && (
					<ResponsiveDialog {...suspendAdminDialog}>
						<SuspendAdminContent
							{...{
								selectedAdmin,
								forceMode: suspendAdminDialog.forceMode,
								handleOpenChange: suspendAdminDialog.onOpenChange,
							}}
						/>
					</ResponsiveDialog>
				)}
			</PageContainer>
		</>
	);
}
