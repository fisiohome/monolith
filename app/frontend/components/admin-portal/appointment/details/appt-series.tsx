import { format } from "date-fns";
import { Hash } from "lucide-react";
import { type ComponentProps, memo } from "react";
import { useTranslation } from "react-i18next";
import { useDateContext } from "@/components/providers/date-provider";
import { Badge } from "@/components/ui/badge";
import { getBadgeVariantStatus } from "@/lib/appointments/utils";
import { getBrandBadgeVariant } from "@/lib/services";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/types/admin-portal/appointment";

interface SeriesItemProps extends ComponentProps<"div"> {
	parentAppt: any;
	appointment: Pick<
		Appointment,
		| "id"
		| "registrationNumber"
		| "status"
		| "visitProgress"
		| "appointmentDateTime"
	>;
}

const SeriesItem = memo(function Component({
	children,
	className,
	parentAppt,
	appointment,
}: SeriesItemProps) {
	const { t } = useTranslation("appointments");
	const { locale, tzDate, timeFormatDateFns } = useDateContext();

	return (
		<div
			className={cn(
				"grid gap-1 p-3 border rounded-lg border-border bg-input",
				className,
				appointment.registrationNumber === parentAppt.registrationNumber &&
					"ring-1 ring-primary text-primary",
			)}
		>
			<div className="flex items-center justify-between">
				<div className="flex-none mb-1">
					<Badge
						variant="outline"
						className={cn(
							"text-pretty font-bold !text-[10px] px-1",
							parentAppt?.service?.code &&
								getBrandBadgeVariant(parentAppt.service.code),
						)}
					>
						<Hash className="size-2.5" />
						<span>{appointment.registrationNumber}</span>
					</Badge>
				</div>

				<div>
					<Badge
						variant="outline"
						className={cn(
							"mb-1 text-center text-pretty !text-[10px]",
							getBadgeVariantStatus(appointment.status),
						)}
					>
						{t(`statuses.${appointment.status}`)}
					</Badge>
				</div>
			</div>

			<div className="flex flex-col flex-1">
				<p className="font-bold">Visit {appointment.visitProgress}</p>

				{appointment.appointmentDateTime ? (
					<p className="text-xs font-light">
						<span>
							{format(appointment.appointmentDateTime, timeFormatDateFns, {
								locale,
								in: tzDate,
							})}
						</span>

						<span className="mx-1">&bull;</span>

						<span>
							{format(appointment.appointmentDateTime, "PPPP", {
								locale,
								in: tzDate,
							})}
						</span>
					</p>
				) : (
					<p className="text-xs font-light">N/A</p>
				)}
			</div>

			{children}
		</div>
	);
});

export default SeriesItem;
