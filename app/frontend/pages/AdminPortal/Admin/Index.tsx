import ExpandSubTable from "@/components/admin-portal/admin/data-table-expand";
import PaginationTable from "@/components/admin-portal/admin/data-table-pagination";
import ToolbarTable from "@/components/admin-portal/admin/data-table-toolbar";
import { DeleteAdminAlert } from "@/components/admin-portal/admin/feature-actions";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { cn, populateQueryParams } from "@/lib/utils";
import { generateInitials, humanize } from "@/lib/utils";
import type { Admin } from "@/types/admin-portal/admin";
import type { GlobalPageProps } from "@/types/globals";
import type { Metadata } from "@/types/pagy";
import { Head, Link, router, usePage } from "@inertiajs/react";
import type { Row } from "@tanstack/react-table";
import type { Table as TableTanstack } from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns/format";
import { Plus } from "lucide-react";
import { ChevronDown, ChevronUp, Ellipsis, InfinityIcon } from "lucide-react";
import { Fragment, useMemo, useState } from "react";

export interface PageProps {
	admins: {
		data: Admin[];
		metadata: Metadata;
	};
}
export type TableRowDataProps = Row<PageProps["admins"]["data"][number]>;
export type TableToolbarDataProps = TableTanstack<
	PageProps["admins"]["data"][number]
>;

// TODO: table actions
// TODO: table filter by
// TODO: theme toggle
export default function Index({ admins }: PageProps) {
	const { props: globalProps, url: pageURL } = usePage<GlobalPageProps>();
	const { toast } = useToast();
	console.log(globalProps);

	// tabs management
	const tabActive = useMemo(
		() =>
			globalProps?.adminPortal?.currentQuery?.filterByAccountStatus || "all",
		[globalProps?.adminPortal?.currentQuery?.filterByAccountStatus],
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
				text: "Suspended",
				value: "suspended",
			},
		] as const;
	}, []);
	const handleTabClick = (value: (typeof tabList)[number]["value"]) => {
		const baseUrl = pageURL.split("?")[0];
		const { fullUrl, queryParams } = populateQueryParams(baseUrl, {
			filter_by_account_status: value,
		});

		router.get(
			fullUrl,
			{ ...queryParams },
			{ replace: true, preserveState: true, only: ["admins"] },
		);
	};

	// data table management
	const isSuperAdmin = useMemo(
		() => globalProps.auth.currentUser?.adminType === "SUPER_ADMIN",
		[globalProps.auth.currentUser?.adminType],
	);
	const handleDelete = (row: TableRowDataProps) => {
		console.log(`Deleting the Admin ${row.original.user.email}...`);
		router.delete(
			`${globalProps.adminPortal.router.adminPortal.adminManagement.index}/${row.original.id}`,
			{
				data: row.original,
			},
		);
		console.log(
			`Successfully to deleted the Admin ${row.original.user.email}...`,
		);
	};
	const [linkGenerated, setLinkGenerated] = useState("");
	const handleChangePassword = {
		generateLink: async (row: TableRowDataProps) => {
			console.log(
				`Generating the change password link for ${row.original.user.email}...`,
			);
			const { fullUrl } = populateQueryParams(
				globalProps.adminPortal.router.adminPortal.adminManagement
					.generateResetPasswordUrl,
				{ email: row.original.user.email },
			);
			const response = await fetch(fullUrl, { method: "get" });
			const data = await response.json();

			if (!data?.link && data?.error) {
				console.log(data.error);
				toast({ description: data.error, variant: "destructive" });
				return;
			}

			const successMessage = `Successfully generated the change password link for ${row.original.user.email}.`;
			setLinkGenerated(data.link);
			toast({ description: successMessage });
			console.log(successMessage);
		},
		resetGeneratedLink: () => {
			setLinkGenerated("");
		},
	};
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
										className="w-5 h-5 border shadow border-primary/25"
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
			cell: ({ row }) => (
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
									className="w-5 h-5 border shadow border-primary/25"
									onClick={() => row.toggleExpanded()}
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
			),
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

				return (
					<>
						<div className="flex items-center gap-2 text-sm text-left">
							<Avatar className="w-8 h-8 rounded-lg">
								<AvatarImage src="#" alt={name} />
								<AvatarFallback
									className={cn(
										"text-xs rounded-lg",
										isCurrent
											? "bg-purple-600"
											: isOnline
												? "bg-green-700"
												: "",
									)}
								>
									{initials}
								</AvatarFallback>
							</Avatar>
							<div className="flex-1 space-y-1 text-sm leading-tight text-left">
								<div>
									<p className="font-semibold truncate">{name}</p>
									<p className="text-xs truncate">{email}</p>
								</div>
							</div>
						</div>
					</>
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
					<>
						<Badge variant="secondary">
							{humanize(row.original.adminType).toUpperCase()}
						</Badge>
					</>
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
									<Badge variant="destructive">Suspended</Badge>
								</TooltipTrigger>
								<TooltipContent side="bottom">
									<div className="flex flex-col">
										{suspendedAt && (
											<span>
												Suspended on: <b>{format(suspendedAt, "PP")}</b>
											</span>
										)}
										<span className="flex items-center">
											Suspended end:{" "}
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

				return (
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger className="space-x-1">
								<Badge variant={isOnline ? "default" : "outline"}>
									{isOnline ? "Online" : "Offline"}
								</Badge>
							</TooltipTrigger>
							<TooltipContent side="bottom">
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
												<b>{format(lastOnlineAt, "PPpp")}</b>
											</span>
										)}
									</div>
								)}
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				);
			},
		},
		{
			id: "actions",
			cell: ({ row }) => {
				const isShowDelete = useMemo(
					() =>
						isSuperAdmin &&
						globalProps.auth.currentUser?.user.email !==
							row.original.user.email,
					[row.original.user.email],
				);

				return (
					<div className="flex items-center justify-end space-x-2">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="secondary" size="icon">
									<Ellipsis />
								</Button>
							</DropdownMenuTrigger>

							<DropdownMenuContent align="end">
								<DropdownMenuLabel>Actions</DropdownMenuLabel>
								<DropdownMenuSeparator />

								<DropdownMenuGroup>
									<DropdownMenuItem disabled>Edit</DropdownMenuItem>
								</DropdownMenuGroup>

								{isShowDelete && (
									<>
										<DropdownMenuSeparator />
										<DeleteAdminAlert row={row} handler={handleDelete}>
											<DropdownMenuItem onSelect={(e) => e.preventDefault()}>
												Delete
											</DropdownMenuItem>
										</DeleteAdminAlert>
									</>
								)}
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				);
			},
		},
	];

	return (
		<>
			<Head title="Admin Management" />
			<article className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min p-6 space-y-4">
				<section className="flex items-center justify-between">
					<h1 className="text-2xl font-bold tracking-tight">Admins</h1>
					{isSuperAdmin && (
						<Button asChild>
							<Link
								href={
									globalProps.adminPortal.router.adminPortal.adminManagement.new
								}
							>
								<Plus />
								Add Admin
							</Link>
						</Button>
					)}
				</section>

				<section className="min-w-full">
					<Tabs defaultValue={tabActive}>
						<TabsList>
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
										toolbar={(table) => <ToolbarTable table={table} />}
										subComponent={(row) => (
											<ExpandSubTable
												row={row}
												isSuperAdmin={isSuperAdmin}
												feature={{
													deleteAdmin: {
														handler: handleDelete,
													},
													changePassword: {
														linkGenerated,
														handlerGenerated: handleChangePassword.generateLink,
														resetGeneratedLink:
															handleChangePassword.resetGeneratedLink,
													},
												}}
											/>
										)}
										customPagination={(table) => (
											<PaginationTable
												table={table}
												metadata={admins.metadata}
											/>
										)}
									/>
								</TabsContent>
							</Fragment>
						))}
					</Tabs>
				</section>
			</article>
		</>
	);
}
