import PaginationTable from "@/components/admin-portal/shared/data-table-pagination";
import { PageContainer } from "@/components/admin-portal/shared/page-layout";
import ExpandSubTable from "@/components/admin-portal/therapist/data-table-expand";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table/column-header";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { getEmpStatusBadgeVariant } from "@/lib/therapists";
import {
	cn,
	copyToClipboard,
	formatPhoneNumber,
	generateInitials,
	populateQueryParams,
	removeWhiteSpaces,
} from "@/lib/utils";
import type { Therapist } from "@/types/admin-portal/therapist";
import type { GlobalPageProps } from "@/types/globals";
import type { Metadata } from "@/types/pagy";
import { Head, Link, router, usePage } from "@inertiajs/react";
import type { ColumnDef, ExpandedState, Row } from "@tanstack/react-table";
import { format, formatDistanceToNow } from "date-fns";
import {
	ChevronDown,
	ChevronUp,
	Clipboard,
	InfinityIcon,
	Mail,
	Phone,
	Plus,
} from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";

export interface PageProps {
	therapists: {
		data: Therapist[];
		metadata: Metadata;
	};
}
export type TableRowDataProps = Row<PageProps["therapists"]["data"][number]>;

export default function Index({ therapists }: PageProps) {
	console.log(therapists.data[0]);
	const { props: globalProps, url: pageURL } = usePage<GlobalPageProps>();

	// table state management
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
	const columns: ColumnDef<PageProps["therapists"]["data"][number]>[] = [
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
										className="w-5 h-5 border shadow border-primary/25"
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
					row.original.user.email === globalProps.auth.currentUser?.user.email;
				const isSuspended = row.original.user["suspended?"];

				return (
					<>
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
									<p className="font-semibold truncate">{name}</p>
									<p className="text-xs truncate">#{registrationNumber}</p>
								</div>
							</div>
						</div>
					</>
				);
			},
		},
		{
			accessorKey: "type",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Type" />
			),
			enableSorting: false,
			enableHiding: false,
			cell: ({ row }) => {
				const employmentType = row.original.employmentType;
				const serviceName = row.original.service.name.replaceAll("_", " ");

				return (
					<Badge
						variant="outline"
						className="border border-primary text-primary"
					>
						{employmentType} at {serviceName}
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
				const variant = useMemo(
					() => getEmpStatusBadgeVariant(row.original.employmentStatus),
					[row.original.employmentStatus],
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
									<div className="flex items-center space-x-2">
										<div className="bg-red-700 rounded-full size-2" />
										<span>Suspended</span>
									</div>
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
									<div className="flex items-center space-x-2">
										<div
											className={cn(
												"rounded-full size-2",
												isOnline ? "bg-green-700" : "bg-muted-foreground",
											)}
										/>
										<span>{isOnline ? "Online" : "Offline"}</span>
									</div>
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
					<div className="flex items-center space-x-2">
						<div
							className={cn(
								"rounded-full size-2",
								isOnline ? "bg-green-700" : "bg-muted-foreground",
							)}
						/>
						<span>{isOnline ? "Online" : "Offline"}</span>
					</div>
				);
			},
		},
	];

	return (
		<>
			<Head title="Therapist Management" />

			<PageContainer className="flex items-center justify-between">
				<h1 className="text-2xl font-bold tracking-tight">Therapists</h1>
				{globalProps.auth.currentUserType === "ADMIN" && (
					<Button asChild>
						<Link
							href={
								globalProps.adminPortal.router.adminPortal.therapistManagement
									.new
							}
						>
							<Plus />
							Add Therapist
						</Link>
					</Button>
				)}
			</PageContainer>

			<PageContainer className="min-h-[100vh] flex-1 md:min-h-min gap-4">
				<DataTable
					columns={columns}
					data={therapists.data}
					// toolbar={(table) => <ToolbarTable table={table} />}
					// subComponent={(row) => <ExpandSubTable row={row} routeTo={routeTo} />}
					subComponent={(row) => <ExpandSubTable row={row} />}
					customPagination={(table) => (
						<PaginationTable table={table} metadata={therapists.metadata} />
					)}
					currentExpanded={currentExpanded}
				/>
			</PageContainer>
		</>
	);
}
