import { Hash, Stethoscope } from "lucide-react";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { getGenderIcon } from "@/hooks/use-gender";
import { cn, generateInitials } from "@/lib/utils";
import type { ScheduleListProps } from "../appointment-list";

export interface TherapistCardProps extends ComponentProps<"div"> {
	therapist: ScheduleListProps["schedule"]["therapist"];
}
export default function TherapistCard({
	className,
	therapist,
}: TherapistCardProps) {
	const { t } = useTranslation("appointments");

	return (
		<div
			className={cn(
				"gap-4 p-4 border rounded-lg shadow-inner border-border bg-sidebar",
				className,
			)}
		>
			{therapist ? (
				<div className="grid gap-6">
					<div className="flex items-center gap-2">
						<Avatar className="text-[10px] border rounded-lg border-border bg-background size-6">
							<AvatarImage src="#" alt={therapist?.name || "N/A"} />
							<AvatarFallback className="bg-background">
								{therapist?.name ? generateInitials(therapist.name) : "N/A"}
							</AvatarFallback>
						</Avatar>
						<div>
							<p className="font-semibold uppercase line-clamp-1">
								{therapist?.name || "N/A"}
							</p>
						</div>
					</div>

					<div className="grid gap-3">
						<div className="grid grid-cols-3 gap-2">
							<p className="font-light">{t("list.reg_number")}:</p>
							<div className="col-span-2">
								<p className="flex items-center justify-end gap-0.5 w-full font-semibold uppercase text-pretty">
									<Hash className="size-3 text-muted-foreground/75 shrink-0" />
									{therapist?.registrationNumber || "N/A"}
								</p>
							</div>
						</div>

						<div className="grid grid-cols-3 gap-2">
							<p className="font-light">{t("list.phone")}:</p>
							<p className="col-span-2 font-semibold text-right text-pretty">
								{therapist?.phoneNumber || "N/A"}
							</p>
						</div>

						<div className="grid grid-cols-3 gap-2">
							<p className="font-light">Email:</p>
							<p className="col-span-2 font-semibold text-right text-pretty break-all">
								{therapist?.user?.email || "N/A"}
							</p>
						</div>

						<Separator className="my-2" />

						<div className="grid grid-cols-3 gap-2">
							<p className="font-light">{t("list.emp_type")}:</p>
							<p className="col-span-2 font-semibold text-right uppercase text-pretty">
								{therapist?.employmentType || "N/A"}
							</p>
						</div>

						<div className="grid grid-cols-3 gap-2">
							<p className="font-light">{t("list.gender")}:</p>
							<div className="col-span-2">
								<p className="flex items-center justify-end gap-0.5 w-full font-semibold uppercase text-pretty">
									{getGenderIcon(
										therapist.gender,
										"size-4 text-muted-foreground/75 shrink-0",
									)}
									{therapist?.gender || "N/A"}
								</p>
							</div>
						</div>
					</div>
				</div>
			) : (
				<div className="flex flex-col items-center justify-center rounded-md">
					<Stethoscope className="mb-2 size-6 text-muted-foreground/75" />
					<p className="text-sm text-center text-muted-foreground">
						{t("list.empty.no_therapist_assigned")}
					</p>
				</div>
			)}
		</div>
	);
}
