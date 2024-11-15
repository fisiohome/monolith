import { Button } from "@/components/ui/button";
import type { TableRowDataProps } from "@/pages/AdminPortal/Admin/Index";
import type { GlobalPageProps } from "@/types/globals";
import { usePage } from "@inertiajs/react";
import { format } from "date-fns/format";
import { Fingerprint, Pencil, Trash2 } from "lucide-react";
import { type ComponentProps, useMemo } from "react";
import { ChangePasswordPopover, DeleteAdminAlert } from "./feature-actions";

interface ExpandSubTableProps extends ComponentProps<"div"> {
	row: TableRowDataProps;
	isSuperAdmin: boolean;
	feature: {
		deleteAdmin: {
			handler: (row: TableRowDataProps) => void;
		};
		changePassword: {
			linkGenerated: string;
			handlerGenerated: (row: TableRowDataProps) => Promise<void>;
			resetGeneratedLink: () => void;
		};
	};
}

export default function ExpandSubTable({
	row,
	isSuperAdmin,
	feature,
}: ExpandSubTableProps) {
	const { props: globalProps } = usePage<GlobalPageProps>();

	const isCurrentUser = useMemo(
		() => globalProps.auth.currentUser?.user.email === row.original.user.email,
		[globalProps.auth.currentUser?.user.email, row.original.user.email],
	);
	const isShowDelete = useMemo(
		() => isSuperAdmin && !isCurrentUser,
		[isSuperAdmin, isCurrentUser],
	);

	return (
		<>
			<div className="grid w-full grid-cols-3 gap-4">
				<div className="space-y-1">
					<p className="text-xs text-muted-foreground">Created Date</p>
					<p className="font-semibold">
						{format(row.original.createdAt, "PPP")}
					</p>
				</div>
				<div className="space-y-1">
					<p className="text-xs text-muted-foreground">Last updated</p>
					<p className="font-semibold">
						{format(row.original.updatedAt, "PPpp")}
					</p>
				</div>
				{isSuperAdmin && row.original.user["isOnline?"] && (
					<div className="space-y-1">
						<p className="text-xs text-muted-foreground">Current IP</p>
						<p className="font-semibold">
							{row?.original?.user?.currentSignInIp || "-"}
						</p>
					</div>
				)}
				{isSuperAdmin && (
					<>
						<div className="space-y-1">
							<p className="text-xs text-muted-foreground">Last IP</p>
							<p className="font-semibold">
								{row?.original?.user?.lastSignInIp || "-"}
							</p>
						</div>
						<div className="space-y-1">
							<p className="text-xs text-muted-foreground">Last Sign In</p>
							<p className="font-semibold">
								{row?.original?.user?.lastSignInAt
									? format(row?.original?.user?.lastSignInAt, "PPpp")
									: "-"}
							</p>
						</div>
					</>
				)}
			</div>

			<div className="flex items-center justify-end space-x-2">
				<Button variant="outline" disabled>
					<Pencil />
					Edit
				</Button>

				{!isCurrentUser && (
					<ChangePasswordPopover
						row={row}
						linkGenerated={feature.changePassword.linkGenerated}
						handlerGenerated={feature.changePassword.handlerGenerated}
					>
						<Button
							variant="outline"
							onClick={() => feature.changePassword.resetGeneratedLink()}
						>
							<Fingerprint />
							Change Password
						</Button>
					</ChangePasswordPopover>
				)}

				{isShowDelete && (
					<DeleteAdminAlert row={row} handler={feature.deleteAdmin.handler}>
						<Button variant="destructive">
							<Trash2 />
							Delete
						</Button>
					</DeleteAdminAlert>
				)}
			</div>
		</>
	);
}
