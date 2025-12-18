import { router, usePage } from "@inertiajs/react";
import { format } from "date-fns";
import { ArrowUpRight, Hash } from "lucide-react";
import { type ComponentProps, memo, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import { useIsMobile } from "@/hooks/use-mobile";
import { getDotVariantStatus } from "@/lib/appointments/utils";
import { getBrandBadgeVariant } from "@/lib/services";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/types/admin-portal/appointment";
import type { GlobalPageProps as BaseGlobalPageProps } from "@/types/globals";
import { useDateContext } from "../providers/date-provider";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import type { VariantDotBadge } from "./dot-badge";
import DotBadgeWithLabel from "./dot-badge";

interface AppointmentCardProps extends ComponentProps<"div"> {
	appt: Appointment;
}

const ApptCard = memo(function Component({
	className,
	appt,
}: AppointmentCardProps) {
	const { t: tappt } = useTranslation("appointments");
	const isMobile = useIsMobile();
	const { locale, tzDate, timeFormatDateFns } = useDateContext();
	const { props: globalProps } = usePage<BaseGlobalPageProps>();
	const statusDotVariant = useMemo<VariantDotBadge["variant"]>(
		() => getDotVariantStatus(appt.status),
		[appt.status],
	);
	const startTimeLabel = useMemo(() => {
		return format(appt.appointmentDateTime, timeFormatDateFns, {
			locale,
			in: tzDate,
		});
	}, [appt.appointmentDateTime, locale, tzDate, timeFormatDateFns]);
	const dateLabel = useMemo(() => {
		return format(appt.appointmentDateTime, "PPP", {
			locale,
			in: tzDate,
		});
	}, [appt.appointmentDateTime, locale, tzDate]);
	const onClickDetails = useCallback(
		(registrationNumber: string) => {
			router.get(
				globalProps.adminPortal.router.adminPortal.appointment.index,
				deepTransformKeysToSnakeCase({ registrationNumber }),
			);
		},
		[globalProps.adminPortal.router.adminPortal.appointment.index],
	);

	return (
		<div className={cn("flex flex-col gap-2 text-sm", className)}>
			<div className="flex items-center justify-between">
				<Badge
					variant="outline"
					className={cn(
						"text-pretty font-bold",
						appt?.service?.code && getBrandBadgeVariant(appt.service.code),
					)}
				>
					<Hash className="size-3" />
					<span>{appt.registrationNumber}</span>
				</Badge>

				<p className="text-xs font-light text-pretty">
					<span>{startTimeLabel}</span>
					<span className="mx-2">&#x2022;</span>
					<span>{dateLabel}</span>
				</p>
			</div>

			<div className="flex justify-between gap-3">
				<div className="flex flex-col gap-2">
					<p className="font-medium text-pretty">
						<span>{appt?.service?.name?.replaceAll("_", " ") || "N/A"} </span>
						<span className="mx-2">&#x2022;</span>
						<span>{appt?.package?.name}</span>
						<span className="mx-1">-</span>
						<span className="italic font-light">
							{appt?.package?.numberOfVisit || "N/A"} visit(s)
						</span>
					</p>

					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<div className="mb-1 -mt-1">
									<DotBadgeWithLabel
										className="relative flex-shrink-0 text-left"
										variant={statusDotVariant}
										size="xs"
									>
										<span
											title={appt.status}
											className="flex-grow-0 tracking-wide text-nowrap text-[10px]"
										>
											{tappt(`statuses.${appt.status}`)}
										</span>
									</DotBadgeWithLabel>
								</div>
							</TooltipTrigger>
							<TooltipContent>
								<p className="uppercase">
									Status: {tappt(`statuses.${appt.status}`)}
								</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>

				{!isMobile && (
					<Button
						size="icon"
						variant="ghost"
						onClick={(event) => {
							event.preventDefault();
							event.stopPropagation();

							onClickDetails(appt.registrationNumber);
						}}
					>
						<ArrowUpRight />
					</Button>
				)}
			</div>

			{isMobile && (
				<Button
					size="xs"
					onClick={(event) => {
						event.preventDefault();
						event.stopPropagation();

						onClickDetails(appt.registrationNumber);
					}}
				>
					Details
				</Button>
			)}
		</div>
	);
});
export default ApptCard;
