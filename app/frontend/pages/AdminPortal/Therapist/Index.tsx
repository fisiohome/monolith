import { Head, Link, router, usePage } from "@inertiajs/react";
import type {
	ColumnDef,
	ExpandedState,
	Row,
	Table as TableTanstack,
} from "@tanstack/react-table";
import { format, formatDistanceToNow } from "date-fns";
import {
	Ellipsis,
	InfinityIcon,
	Info,
	LoaderIcon,
	LockIcon,
	PlusCircle,
	RefreshCcw,
	SquarePenIcon,
	Trash2Icon,
	X,
} from "lucide-react";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import PaginationTable from "@/components/admin-portal/shared/data-table-pagination";
import { PageContainer } from "@/components/admin-portal/shared/page-layout";
import ToolbarTable from "@/components/admin-portal/therapist/data-table-toolbar";
import {
	ChangePasswordContent,
	DeleteTherapistAlert,
	DetailsTherapistContent,
} from "@/components/admin-portal/therapist/feature-actions";
import DotBadgeWithLabel from "@/components/shared/dot-badge";
import { LoadingBasic } from "@/components/shared/loading";
import {
	ResponsiveDialog,
	type ResponsiveDialogProps,
} from "@/components/shared/responsive-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMasterDataSync } from "@/hooks/admin-portal/use-master-data-sync";
import { useActionPermissions } from "@/hooks/admin-portal/use-therapist-utils";
import { getGenderIcon } from "@/hooks/use-gender";
import { useIsMobile } from "@/hooks/use-mobile";
import { getBrandBadgeVariant } from "@/lib/services";
import { getEmpStatusBadgeVariant } from "@/lib/therapists";
import {
	cn,
	generateInitials,
	populateQueryParams,
	removeWhiteSpaces,
} from "@/lib/utils";
import type { Appointment } from "@/types/admin-portal/appointment";
import type { Location } from "@/types/admin-portal/location";
import type {
	Therapist,
	TherapistEmploymentStatus,
	TherapistEmploymentType,
} from "@/types/admin-portal/therapist";
import type { GlobalPageProps as BaseGlobalPageProps } from "@/types/globals";
import type { Metadata } from "@/types/pagy";

export interface PageProps {
	therapists: {
		data: Therapist[];
		metadata: Metadata;
	};
	selectedTherapist: null | Therapist;
	selectedTherapistAppts: null | Appointment[];
	filterOptions?: {
		employmentStatuses: TherapistEmploymentStatus;
		employmentTypes: TherapistEmploymentType;
		locations: Location[];
	};
}
export type TableRowDataProps = Row<PageProps["therapists"]["data"][number]>;
export type TableToolbarDataProps = TableTanstack<
	PageProps["therapists"]["data"][number]
>;
export interface TherapistIndexGlobalPageProps
	extends BaseGlobalPageProps,
		PageProps {
	[key: string]: any;
}

export default function Index({
	therapists,
	selectedTherapist,
	selectedTherapistAppts,
}: PageProps) {
	const { props: globalProps, url: pageURL } =
		usePage<TherapistIndexGlobalPageProps>();
	const isMobile = useIsMobile();
	const { t } = useTranslation("translation");
	const { t: tt } = useTranslation("therapists");

	// Use custom hook for master data sync
	const onSyncComplete = useCallback(() => {
		// Refresh therapist data when sync completes
		router.reload({ only: ["adminPortal", "therapists"] });
	}, []);

	const { isLoading, syncStatus, triggerSync, clearStatus } = useMasterDataSync(
		{
			syncEndpoint: `${globalProps.adminPortal.router.adminPortal.therapistManagement.index}/sync-data-master`,
			statusEndpoint: `${globalProps.adminPortal.router.adminPortal.therapistManagement.index}/sync-status`,
			onSyncComplete,
			autoCheckOnMount: true,
		},
	);

	// * data table state management
	const currentExpanded = useMemo<ExpandedState>(() => {
		const { queryParams } = populateQueryParams(pageURL);
		const expandedList = queryParams?.expanded
			? removeWhiteSpaces(queryParams?.expanded)?.split(",")
			: [];
		const adminsIndex = therapists.data.reduce(
			(obj, item, index) => {
				if (expandedList.includes(String(item.id))) {
					obj[index] = true;
				}
				return obj;
			},
			{} as Record<number, boolean>,
		);

		return adminsIndex;
	}, [pageURL, therapists.data]);

	// * for table actions management state
	const routeTo = {
		edit: (id: number | string) => {
			const url = `${globalProps.adminPortal.router.adminPortal.therapistManagement.index}/${id}/edit`;

			router.get(url);
		},
		changePassword: (id: number | string) => {
			const url = pageURL;

			router.get(
				url,
				{ change_password: id },
				{
					only: ["adminPortal", "flash", "errors", "selectedTherapist"],
					preserveScroll: true,
					preserveState: true,
				},
			);
		},
		delete: (id: number | string) => {
			const url = pageURL;

			router.get(
				url,
				{ delete: id },
				{
					only: ["adminPortal", "flash", "errors", "selectedTherapist"],
					preserveScroll: true,
					preserveState: true,
				},
			);
		},
		detail: useCallback(
			(id: string) => {
				router.get(
					pageURL,
					{ details: id },
					{
						only: [
							"adminPortal",
							"flash",
							"errors",
							"selectedTherapist",
							"selectedTherapistAppts",
						],
						preserveScroll: true,
						preserveState: true,
					},
				);
			},
			[pageURL],
		),
	};
	const formDialog = useMemo<
		ResponsiveDialogProps & {
			mode: {
				isChangePasswordMode: boolean;
				isDeleteMode: boolean;
				isDetailsMode: boolean;
			};
		}
	>(() => {
		const currentQuery = globalProps.adminPortal?.currentQuery;
		const isChangePasswordMode = !!currentQuery?.changePassword;
		const isDeleteMode = !!currentQuery?.delete;
		const isDetailsMode = !!currentQuery?.details;
		const mode = {
			isChangePasswordMode,
			isDeleteMode,
			isDetailsMode,
		};
		const isOpen = isChangePasswordMode || isDeleteMode || isDetailsMode;
		let title = "";
		let description = "";

		if (isDeleteMode) {
			title = "Are you absolutely sure?";
			description =
				"This action is irreversible. Deleting actions will permanently remove data from our servers and cannot be recovered.";
		}

		if (isChangePasswordMode) {
			title = "Change Password";
			description =
				"Make password changes using the generate the form link or via form.";
		}

		if (isDetailsMode) {
			title = "Therapist Details";
			description =
				"View therapist profile, contract, and assigned appointments data-all in one place.";
		}

		return {
			title,
			description,
			isOpen,
			mode,
			onOpenChange: (value: boolean) => {
				if (!value) {
					const objQueryParams = isChangePasswordMode
						? { change_password: null }
						: isDeleteMode
							? { delete: null }
							: { details: null };
					const { fullUrl } = populateQueryParams(pageURL, objQueryParams);

					router.get(
						fullUrl,
						{},
						{
							only: ["selectedTherapist", "flash", "adminPortal", "errors"],
							preserveScroll: true,
						},
					);
				}
			},
		};
	}, [pageURL, globalProps.adminPortal?.currentQuery]);
	const columns = useMemo<
		ColumnDef<PageProps["therapists"]["data"][number]>[]
	>(() => {
		const items: ColumnDef<PageProps["therapists"]["data"][number]>[] = [
			{
				accessorKey: "profile",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Profile" />
				),
				enableSorting: false,
				enableHiding: false,
				cell: ({ row }) => {
					const name = row.original.name;
					const initials = generateInitials(name);
					const registrationNumber = row.original.registrationNumber;
					const isOnline = row.original.user["isOnline?"];
					const isCurrent =
						row.original.user.email ===
						globalProps.auth.currentUser?.user.email;
					const isSuspended = row.original.user["suspended?"];

					return (
						<div className="flex items-center gap-2 text-sm text-left">
							<Avatar className="w-8 h-8 border rounded-lg bg-muted">
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
													: "bg-muted",
									)}
								>
									{initials}
								</AvatarFallback>
							</Avatar>
							<div className="flex-1 space-y-0.5 text-sm leading-tight text-left">
								<p className="font-bold uppercase truncate max-w-52 md:max-w-full">
									{name}
								</p>
								<p className="text-xs font-light">#{registrationNumber}</p>
							</div>
						</div>
					);
				},
			},
		];

		if (!isMobile) {
			items.push(
				{
					accessorKey: "gender",
					header: ({ column }) => (
						<DataTableColumnHeader column={column} title="Gender" />
					),
					enableSorting: true,
					enableHiding: false,
					cell: ({ row }) => {
						const gender = row.original.gender;

						return (
							<Badge variant="outline">
								<div className="flex items-center gap-1">
									{getGenderIcon(
										gender,
										"size-4 text-muted-foreground/75 shrink-0",
									)}
									<span>{gender}</span>
								</div>
							</Badge>
						);
					},
				},
				{
					accessorKey: "type",
					header: ({ column }) => (
						<DataTableColumnHeader column={column} title="Type" />
					),
					enableSorting: true,
					enableHiding: false,
					cell: ({ row }) => {
						const employmentType = row.original.employmentType;

						return (
							<Badge
								variant={employmentType === "KARPIS" ? "accent" : "secondary"}
							>
								{employmentType}
							</Badge>
						);
					},
				},
				{
					accessorKey: "service",
					header: ({ column }) => (
						<DataTableColumnHeader column={column} title="Service" />
					),
					enableSorting: true,
					enableHiding: false,
					cell: ({ row }) => {
						const serviceName = row.original.service.name.replaceAll("_", " ");
						const serviceCode = row.original.service.code;
						const brandBadgeVariant = getBrandBadgeVariant(serviceCode);

						return (
							<Badge variant="outline" className={cn("", brandBadgeVariant)}>
								{serviceName}
							</Badge>
						);
					},
				},
				{
					accessorKey: "status",
					header: ({ column }) => (
						<DataTableColumnHeader column={column} title="Status" />
					),
					enableSorting: true,
					enableHiding: false,
					cell: ({ row }) => {
						const variant = getEmpStatusBadgeVariant(
							row.original.employmentStatus,
						);

						return (
							<Badge className={variant}>{row.original.employmentStatus}</Badge>
						);
					},
				},
				{
					accessorKey: "activity",
					header: ({ column }) => (
						<DataTableColumnHeader column={column} title="Activity" />
					),
					enableSorting: true,
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
											<DotBadgeWithLabel
												variant={isOnline ? "success" : "outline"}
											>
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
			);
		}

		items.push({
			id: "actions",
			cell: ({ row }) => {
				const { isShowEdit, isShowChangePassword, isShowDelete, isPermitted } =
					// biome-ignore lint/correctness/useHookAtTopLevel: <->
					useActionPermissions({
						authData: globalProps.auth,
						user: row.original.user,
					});

				if (!isPermitted) return;

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
										onSelect={() => routeTo.detail(row.original.id)}
									>
										<Info />
										<span>Details</span>
									</DropdownMenuItem>

									{isShowEdit && (
										<DropdownMenuItem
											onSelect={() => routeTo.edit(row.original.id)}
										>
											<SquarePenIcon />
											<span>Edit</span>
										</DropdownMenuItem>
									)}

									{isShowChangePassword && (
										<DropdownMenuItem
											onSelect={() => routeTo.changePassword(row.original.id)}
										>
											<LockIcon />
											<span>Change Password</span>
										</DropdownMenuItem>
									)}
								</DropdownMenuGroup>

								{isShowDelete && (
									<>
										<DropdownMenuSeparator />
										<DropdownMenuItem
											onSelect={() => routeTo.delete(row.original.id)}
										>
											<Trash2Icon />
											<span>Delete</span>
										</DropdownMenuItem>
									</>
								)}
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				);
			},
		});

		return items;
	}, [
		globalProps.auth,
		isMobile,
		routeTo.changePassword,
		routeTo.edit,
		routeTo.delete,
		routeTo.detail,
	]);

	return (
		<>
			<Head title={tt("head_title")} />

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
							{tt("page_title")}
						</h1>

						<p className="w-full text-sm md:w-8/12 text-pretty text-muted-foreground">
							{tt("page_description")}
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
										{tt("button.sync")}
									</>
								)}
							</Button>
						)}

						{(globalProps?.auth?.currentUser?.["isSuperAdmin?"] ||
							globalProps?.auth?.currentUser?.["isAdminSupervisor?"]) && (
							<Button asChild>
								<Link
									href={
										globalProps.adminPortal.router.adminPortal
											.therapistManagement.new
									}
								>
									<PlusCircle />
									{tt("button.add")}
								</Link>
							</Button>
						)}
					</div>
				</div>

				<Separator className="bg-border" />

				<DataTable
					columns={columns}
					data={therapists.data}
					toolbar={(table) => <ToolbarTable table={table} />}
					customPagination={(table) => (
						<PaginationTable table={table} metadata={therapists.metadata} />
					)}
					currentExpanded={currentExpanded}
				/>

				{formDialog.isOpen && (
					<>
						{selectedTherapist && formDialog.mode.isChangePasswordMode && (
							<ResponsiveDialog {...formDialog}>
								<ChangePasswordContent
									selectedTherapistAccount={selectedTherapist.user}
									forceMode={formDialog.forceMode}
									handleOpenChange={formDialog.onOpenChange}
								/>
							</ResponsiveDialog>
						)}

						{selectedTherapist && formDialog.mode.isDeleteMode && (
							<DeleteTherapistAlert
								{...formDialog}
								selectedTherapist={selectedTherapist}
							/>
						)}

						{formDialog.mode.isDetailsMode && (
							<ResponsiveDialog
								{...formDialog}
								dialogWidth={selectedTherapist ? "75%" : undefined}
							>
								{selectedTherapist ? (
									<DetailsTherapistContent
										therapist={selectedTherapist}
										appts={selectedTherapistAppts}
									/>
								) : (
									<LoadingBasic columnBased />
								)}
							</ResponsiveDialog>
						)}
					</>
				)}
			</PageContainer>
		</>
	);
}
