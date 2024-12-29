import PaginationTable from "@/components/admin-portal/shared/data-table-pagination";
import { PageContainer } from "@/components/admin-portal/shared/page-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table/column-header";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, generateInitials } from "@/lib/utils";
import type { Therapist } from "@/types/admin-portal/therapist";
import type { GlobalPageProps } from "@/types/globals";
import type { Metadata } from "@/types/pagy";
import { Head, Link, usePage } from "@inertiajs/react";
import type { ColumnDef } from "@tanstack/react-table";
import { format, formatDistanceToNow } from "date-fns";
import { InfinityIcon, Plus } from "lucide-react";

export interface PageProps {
	therapists: {
		data: Therapist[];
		metadata: Metadata;
	};
}

export default function Index({ therapists }: PageProps) {
	const { props: globalProps } = usePage<GlobalPageProps>();

	// table state management
	const columns: ColumnDef<PageProps["therapists"]["data"][number]>[] = [
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
				const email = row.original.user.email;
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
									<p className="text-xs truncate">{email}</p>
								</div>
							</div>
						</div>
					</>
				);
			},
		},
		{
			accessorKey: "onlineStatus",
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
					customPagination={(table) => (
						<PaginationTable table={table} metadata={therapists.metadata} />
					)}
					// currentExpanded={currentExpanded}
				/>
			</PageContainer>
		</>
	);
}
