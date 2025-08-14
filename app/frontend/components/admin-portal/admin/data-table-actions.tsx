import { usePage } from "@inertiajs/react";
import type { CellContext } from "@tanstack/react-table";
import { Ellipsis } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useActionPermissions } from "@/hooks/admin-portal/use-admin-utils";
import type { Admin } from "@/types/admin-portal/admin";
import type { GlobalPageProps } from "@/types/globals";
import { DeleteAdminAlert } from "./feature-actions";

export interface DataTableActionsProps extends CellContext<Admin, unknown> {
	routeTo: {
		editAdmin: (id: number) => void;
		changePassword: (id: number) => void;
		suspendAdmin: (id: number) => void;
	};
}

export default function DataTableActions({
	row,
	routeTo,
}: DataTableActionsProps) {
	const { props: globalProps } = usePage<GlobalPageProps>();
	const {
		isShowEdit,
		isShowChangePassword,
		isShowSuspend,
		isShowDelete,
		isPermitted,
	} = useActionPermissions({
		currentUser: globalProps.auth.currentUser,
		user: row.original.user,
		adminType: row.original.adminType,
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
						{isShowEdit && (
							<DropdownMenuItem
								onSelect={() => routeTo.editAdmin(row.original.id)}
							>
								Edit
							</DropdownMenuItem>
						)}
					</DropdownMenuGroup>

					{(isShowChangePassword || isShowSuspend) && (
						<>
							<DropdownMenuSeparator />
							<DropdownMenuGroup>
								{isShowChangePassword && (
									<DropdownMenuItem
										onSelect={() => routeTo.changePassword(row.original.id)}
									>
										Change Password
									</DropdownMenuItem>
								)}
								{isShowSuspend && (
									<DropdownMenuItem
										onSelect={() => routeTo.suspendAdmin(row.original.id)}
									>
										{row.original.user["suspended?"] ? "Activate" : "Suspend"}
									</DropdownMenuItem>
								)}
							</DropdownMenuGroup>
						</>
					)}

					{isShowDelete && (
						<>
							<DropdownMenuSeparator />
							<DeleteAdminAlert row={row}>
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
}
