import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { generateInitials, humanize } from "@/lib/utils";
import type {
	PageProps,
	TableRowDataProps,
} from "@/pages/AdminPortal/Admin/Index";
import type { GlobalPageProps } from "@/types/globals";
import type { usePage } from "@inertiajs/react";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns/format";
import { ChevronDown, ChevronUp, Ellipsis } from "lucide-react";
import { useMemo } from "react";

const columns = ({
	isSuperAdmin,
	handleDelete,
	globalProps,
}: {
	isSuperAdmin: boolean;
	handleDelete: (row: TableRowDataProps) => void;
	globalProps: ReturnType<typeof usePage<GlobalPageProps>>["props"];
}): ColumnDef<PageProps["admins"]["data"][number]>[] => {
	return [
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

				return (
					<>
						<div className="flex items-center gap-2 text-sm text-left">
							<Avatar className="w-8 h-8 rounded-lg">
								<AvatarImage src="" alt={name} />
								<AvatarFallback className="text-xs rounded-lg">
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
			accessorKey: "onlineStatus",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Online Status" />
			),
			enableSorting: false,
			enableHiding: false,
			cell: ({ row }) => {
				const isOnline = row.original.user["isOnline?"];
				const currentIP = row.original.user.currentSignInIp;
				const lastIP = row.original.user.lastSignInIp;
				const lastSignIn = row.original.user.lastSignInAt;

				return (
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger>
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
										{lastSignIn && (
											<span>
												Last Sign in: <b>{format(lastSignIn, "PPpp")}</b>
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
					[
						isSuperAdmin,
						globalProps.auth.currentUser?.user.email,
						row.original.user.email,
					],
				);

				return (
					<div className="flex items-center justify-end">
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

									<DropdownMenuItem disabled>Change Password</DropdownMenuItem>
								</DropdownMenuGroup>

								{isShowDelete && (
									<>
										<DropdownMenuSeparator />
										<AlertDialog>
											<AlertDialogTrigger asChild>
												<DropdownMenuItem onSelect={(e) => e.preventDefault()}>
													Delete
												</DropdownMenuItem>
											</AlertDialogTrigger>
											<AlertDialogContent>
												<AlertDialogHeader>
													<AlertDialogTitle>
														Are you absolutely sure?
													</AlertDialogTitle>
													<AlertDialogDescription>
														This action is irreversible. Deleting your account
														will permanently remove all associated data from our
														servers and cannot be recovered.
													</AlertDialogDescription>
												</AlertDialogHeader>
												<AlertDialogFooter>
													<AlertDialogCancel>Keep Account</AlertDialogCancel>
													<Button
														variant="destructive"
														onClick={() => handleDelete(row)}
													>
														Delete
													</Button>
												</AlertDialogFooter>
											</AlertDialogContent>
										</AlertDialog>
									</>
								)}
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				);
			},
		},
	];
};

export default columns;
