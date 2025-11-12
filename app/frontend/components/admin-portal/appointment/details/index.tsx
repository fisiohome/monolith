import { format, formatDistance } from "date-fns";
import {
	Building,
	CreditCard,
	Info,
	MapPinIcon,
	Sparkles,
	TicketPercent,
} from "lucide-react";
import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useDateContext } from "@/components/providers/date-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { getGenderIcon } from "@/hooks/use-gender";
import { getBadgeVariantStatus } from "@/lib/appointments/utils";
import { cn } from "@/lib/utils";
import type { AppointmentIndexProps } from "@/pages/AdminPortal/Appointment/Index";
import SeriesItem from "./appt-series";

export interface AppointmentListItemDetailsProps {
	schedule: NonNullable<
		AppointmentIndexProps["appointments"]
	>["data"][number]["schedules"][number];
	isFreshAppt: boolean;
	isMobile: boolean;
	seeDetailVisitSeries: (registrationNumber: string) => void;
}

const AppointmentListItemDetails = memo(function Component({
	schedule,
	isFreshAppt,
	isMobile,
	seeDetailVisitSeries,
}: AppointmentListItemDetailsProps) {
	const { t } = useTranslation("appointments");
	const { locale, tzDate, timeFormatDateFns } = useDateContext();
	const startTimeLabel = useMemo(() => {
		if (!schedule.appointmentDateTime)
			return {
				time: "--:--",
				distance: "N/A",
				period: "--",
			};
		// Format it to 12-hour time with an AM/PM indicator.
		const timePeriod = format(schedule.appointmentDateTime, timeFormatDateFns, {
			locale,
			in: tzDate,
		});
		// Split the time with period based on the space
		const startTime = timePeriod.split(" ");
		const time = startTime[0];
		const period = startTime[1];
		// Get the time distance
		const distance = formatDistance(schedule.appointmentDateTime, new Date(), {
			addSuffix: true,
			locale,
			in: tzDate,
		});

		return { time, period, distance };
	}, [locale, tzDate, timeFormatDateFns, schedule]);
	const distanceBadgeVariant = useMemo(
		() => getBadgeVariantStatus(schedule.status),
		[schedule.status],
	);

	return (
		<div className="flex flex-col h-full gap-6 p-4 border rounded-lg shadow-inner border-border bg-sidebar">
			<div className="grid gap-4 md:grid-cols-2">
				<div>
					<p className="font-light">{t("list.booked_appointment_date")}:</p>
					<p className="font-semibold capitalize">
						{schedule.appointmentDateTime
							? format(schedule.appointmentDateTime, "PPPP", {
									locale,
									in: tzDate,
								})
							: "N/A"}
					</p>
				</div>

				<div>
					<p className="font-light">{t("list.booked_appointment_time")}:</p>
					<div className="font-semibold uppercase">
						<span>
							{schedule.appointmentDateTime
								? format(schedule.appointmentDateTime, timeFormatDateFns, {
										locale,
										in: tzDate,
									})
								: "N/A"}
						</span>
						<Badge
							variant="outline"
							className={cn(
								"ml-2 text-center text-pretty",
								distanceBadgeVariant,
							)}
						>
							{startTimeLabel.distance}
						</Badge>
					</div>
				</div>

				<div className="col-span-full md:col-span-1">
					<p className="font-light">{t("list.visit_service")}:</p>
					<p className="font-semibold">
						<span>
							{schedule?.service?.name?.replaceAll("_", " ") || "N/A"}{" "}
						</span>
						<span className="mx-2">&#x2022;</span>
						<span>{schedule?.package?.name}</span>
						<span className="mx-1">-</span>
						<span className="italic font-light">
							{schedule?.package?.numberOfVisit || "N/A"} visit(s)
						</span>
					</p>
				</div>

				<div>
					<p className="font-light">{t("list.visit_region")}:</p>
					<p className="font-semibold uppercase">
						{[
							schedule?.location?.city,
							schedule?.location?.state,
							schedule?.location?.country,
						]?.join(", ") || "N/A"}
					</p>
				</div>

				<div className="col-span-full">
					<p className="font-light">{t("list.visit_address")}:</p>
					<p className="font-semibold capitalize">
						{schedule.visitAddress?.addressLine || "N/A"}
					</p>
					<p className="italic font-normal">
						{t("list.notes")}: {schedule.visitAddress?.notes || "N/A"}
					</p>
					{!!schedule?.visitAddress?.coordinates && (
						<Button
							type="button"
							variant="primary-outline"
							size="sm"
							className="mt-2"
							onClick={(event) => {
								event.preventDefault();
								event.stopPropagation();
								window.open(
									`https://www.google.com/maps/search/?api=1&query=${schedule?.visitAddress?.coordinates.y},${schedule.visitAddress?.coordinates.x}`,
								);
							}}
						>
							<MapPinIcon />
							{t("list.view_on_google_maps")}
						</Button>
					)}
				</div>

				<div>
					<p className="font-light">{t("list.preferred_therapist_gender")}:</p>
					<p className="flex gap-1 font-semibold uppercase">
						{getGenderIcon(schedule.preferredTherapistGender)}{" "}
						{schedule.preferredTherapistGender}
					</p>
				</div>

				<div>
					<p className="font-light">{t("list.referral_source")}:</p>
					<p className="font-semibold capitalize">
						{schedule?.otherReferralSource || schedule?.referralSource || "N/A"}
					</p>
				</div>

				<div className="p-2 border rounded-md col-span-full border-border bg-input">
					<p className="font-light">{t("list.notes")}:</p>
					<p className="italic font-semibold capitalize">
						{schedule?.notes || "N/A"}
					</p>
				</div>

				<div>
					<p className="font-light">{t("list.created_at")}:</p>
					<div>
						<span className="font-semibold capitalize">
							{schedule.createdAt
								? format(schedule.createdAt, "PPPP", {
										locale,
										in: tzDate,
									})
								: "N/A"}
						</span>

						{isFreshAppt && (
							<p className="inline-block ml-1.5">
								<span className="flex items-center gap-1 p-0 px-1 text-white border border-white rounded-md bg-gradient-to-r from-violet-500 to-purple-500 animate-pulse">
									<Sparkles className="size-3 shrink-0 text-inherit" />
									<span className="text-[10px] text-nowrap">
										{t("list.recently_added")}
									</span>
								</span>
							</p>
						)}
					</div>
				</div>

				<div>
					<p className="font-light">{t("list.updated_at")}:</p>
					<p className="font-semibold capitalize">
						{schedule.updatedAt
							? format(schedule.updatedAt, "PPPP", {
									locale,
									in: tzDate,
								})
							: "N/A"}
					</p>
				</div>
			</div>

			<Separator />

			<div className="grid gap-4">
				<h4 className="text-xs font-light uppercase">{t("list.series")}</h4>

				{schedule?.allVisits?.map((visit: any) => (
					<SeriesItem key={visit.id} parentAppt={schedule} appointment={visit}>
						<div className="flex mt-2">
							<Button
								size={isMobile ? "sm" : "xs"}
								type="button"
								variant="primary-outline"
								onClick={(event) => {
									event.preventDefault();
									event.stopPropagation();

									seeDetailVisitSeries(visit.registrationNumber);
								}}
							>
								{t("button.detail")}
							</Button>
						</div>
						{/* <AppointmentActionButtons
								schedule={visit}
								isExpanded={isExpanded}
								isSuperAdmin={isSuperAdmin}
								isAdminPIC={isAdminPIC}
								isAdminSupervisor={isAdminSupervisor}
								buttonSize={isMobile ? "sm" : "xs"}
								className="mt-4"
							/> */}
					</SeriesItem>
				))}
			</div>

			<Separator />

			<div className="grid gap-4">
				<h4 className="text-xs font-light uppercase">
					{t("list.payment_details")}
				</h4>

				<div className="grid gap-4 p-3 border rounded-lg md:grid-cols-2 border-border bg-input">
					<div className="flex gap-2">
						<Building className="mt-0.5 size-4 text-muted-foreground/75" />
						<div>
							<p className="font-light">{t("list.booking_partner")}:</p>
							<p className="font-semibold capitalize">
								{schedule?.otherFisiohomePartnerName ||
									schedule?.fisiohomePartnerName ||
									"N/A"}
							</p>
						</div>
					</div>

					<div className="flex gap-2">
						<TicketPercent className="mt-0.5 size-4 text-muted-foreground/75" />
						<div>
							<p className="font-light">{t("list.voucher")}:</p>
							<p className="font-semibold capitalize">
								{schedule?.voucherCode || "N/A"}
							</p>
						</div>
					</div>
				</div>

				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<CreditCard className="size-4 text-muted-foreground/75" />
						<p className="flex font-light gap-1.5">
							<span>{t("list.price")}:</span>
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<Info className="align-top cursor-pointer size-3" />
									</TooltipTrigger>
									<TooltipContent>
										<p>{t("list.price-info")}</p>
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						</p>
					</div>
					<span>
						{schedule?.package?.formattedTotalPriceWithoutDiscount || "N/A"}
					</span>
				</div>

				{schedule?.service?.code && (
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<TicketPercent className="size-4 text-muted-foreground/75" />
							<span className="font-light">{t("list.discount")}:</span>
							<Badge
								variant="outline"
								className="ml-0 text-xs border-2 md:ml-2"
							>
								SERVICE{schedule?.service?.code}
							</Badge>
						</div>
						<span className="font-semibold text-primary">
							- {schedule?.package?.formattedDiscount || "N/A"}
						</span>
					</div>
				)}

				{schedule.voucherCode && (
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<TicketPercent className="size-4 text-muted-foreground/75" />
							<span className="font-light">{t("list.discount")}:</span>
							<Badge variant="outline" className="ml-2 text-xs border-2">
								{schedule.voucherCode}
							</Badge>
						</div>
						<span className="font-semibold text-primary">
							- {schedule.formattedDiscount || "N/A"}
						</span>
					</div>
				)}

				<Separator />

				<div className="flex items-center justify-between font-medium">
					<span className="font-bold uppercase">{t("list.total_price")}</span>
					<span className="text-lg font-bold">
						{schedule.formattedTotalPrice}
					</span>
				</div>

				{/* <div className="p-3 border rounded-lg bg-muted border-border">
						<div className="flex items-center justify-between text-sm">
							<span className="text-muted-foreground">
								Therapist Fee
							</span>
							<span>
								{schedule?.package?.formattedFeePerVisit}
							</span>
						</div>
					</div> */}
			</div>
		</div>
	);
});

export default AppointmentListItemDetails;
