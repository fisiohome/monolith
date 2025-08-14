import { Cctv } from "lucide-react";
import { type ComponentProps, memo } from "react";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, generateInitials } from "@/lib/utils";
import type { ScheduleListProps } from "../appointment-list";

interface AdminCardProps extends ComponentProps<"div"> {
	admins: ScheduleListProps["schedule"]["admins"];
}

const AdminCard = memo(function Component({
	className,
	admins,
}: AdminCardProps) {
	const { t } = useTranslation("appointments");

	return (
		<div
			className={cn(
				"gap-4 p-4 border rounded-lg shadow-inner border-border bg-sidebar",
				className,
			)}
		>
			{admins?.length ? (
				<>
					<div className="flex items-center gap-2">
						<div className="flex -space-x-3">
							{admins?.map((admin, index) => (
								<TooltipProvider key={admin.name}>
									<Tooltip>
										<TooltipTrigger asChild>
											<Avatar
												className={cn(
													"border rounded-lg border-border bg-background size-6 text-[10px]",
													index !== 0
														? "border-l-muted-foreground/25 border-l-2"
														: "",
												)}
											>
												<AvatarImage src="#" alt={admin.name} />
												<AvatarFallback className="bg-background">
													<Cctv className="flex-shrink-0 size-4 text-muted-foreground/75" />
													{/* {generateInitials(admin.name)} */}
												</AvatarFallback>
											</Avatar>
										</TooltipTrigger>
										<TooltipContent>
											<p className="uppercase">{admin.name}</p>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							))}
						</div>

						<div>
							<p className="uppercase line-clamp-1">
								{admins?.length || 0} {t("list.person_in_charge")}
							</p>
						</div>
					</div>

					{admins?.map((admin, adminIndex) => (
						<AdminList
							key={admin.name}
							index={adminIndex}
							admin={admin}
							totalAdmin={admins?.length || 0}
						/>
					))}
				</>
			) : (
				<div className="flex flex-col items-center justify-center rounded-md">
					<Cctv className="mb-2 size-6 text-muted-foreground/75" />
					<p className="text-sm text-center text-muted-foreground">
						{t("list.empty.no_admins_assigned")}
					</p>
				</div>
			)}
		</div>
	);
});

export default AdminCard;

// * admin list
interface AdminListProps {
	admin: NonNullable<ScheduleListProps["schedule"]["admins"]>[number];
	index: number;
	totalAdmin: number;
}

const AdminList = memo(function Component({
	admin,
	index,
	totalAdmin,
}: AdminListProps) {
	const { t } = useTranslation("appointments");

	return (
		<div className="grid gap-6">
			<div className="flex items-center gap-2">
				<Avatar className="text-[10px] border rounded-lg border-border bg-background size-6">
					<AvatarImage src="#" alt={admin.name} />
					<AvatarFallback className="bg-background">
						{generateInitials(admin.name)}
					</AvatarFallback>
				</Avatar>
				<div>
					<p className="font-semibold uppercase line-clamp-1">{admin.name}</p>
				</div>
			</div>

			<div className="grid gap-3">
				<div className="grid grid-cols-3 gap-2">
					<p className="font-light">Email:</p>
					<p className="col-span-2 font-semibold text-right text-pretty break-all">
						{admin?.user?.email}
					</p>
				</div>

				<div className="grid grid-cols-3 gap-2">
					<p className="font-light">{t("list.type")}:</p>
					<p className="col-span-2 font-semibold text-right uppercase text-pretty">
						{admin.adminType.replaceAll("_", " ")}
					</p>
				</div>

				{index + 1 !== totalAdmin && <Separator className="my-2" />}
			</div>
		</div>
	);
});
