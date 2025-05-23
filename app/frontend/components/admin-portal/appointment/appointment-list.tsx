import { useDateContext } from "@/components/providers/date-provider";
import DotBadgeWithLabel, {
	type VariantDotBadge,
} from "@/components/shared/dot-badge";
import {
	Expandable,
	ExpandableCard,
	ExpandableCardContent,
	ExpandableCardFooter,
	ExpandableCardHeader,
	ExpandableContent,
	ExpandableTrigger,
} from "@/components/shared/expandable";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { getbadgeVariantStatus } from "@/lib/appointments/utils";
import { getBrandBadgeVariant } from "@/lib/services";
import { cn, generateInitials, populateQueryParams } from "@/lib/utils";
import type {
	AppointmentIndexGlobalPageProps,
	AppointmentIndexProps,
} from "@/pages/AdminPortal/Appointment/Index";
import { router, usePage } from "@inertiajs/react";
import {
	compareDesc,
	differenceInHours,
	format,
	formatDistance,
	isBefore,
	isToday,
	parseISO,
	startOfToday,
} from "date-fns";
import {
	Activity,
	Ban,
	Building,
	Cctv,
	ChevronsDown,
	ChevronsUp,
	Clock3,
	CreditCard,
	Hash,
	Hospital,
	Info,
	Link,
	MapPinHouse,
	MapPinIcon,
	Sparkles,
	Stethoscope,
	TicketPercent,
	User,
} from "lucide-react";
import type React from "react";
import { type ComponentProps, memo, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";

// * status histories timeline
interface HistoryListProps extends ComponentProps<"div"> {
	histories: ScheduleListProps["schedule"]["statusHistories"];
}

const HistoryList: React.FC<HistoryListProps> = ({ className, histories }) => {
	const { locale, tzDate, timeFormatDateFns } = useDateContext();
	const { t } = useTranslation("appointments");

	const { grouped, sortedDates } = useMemo(() => {
		// Group by date
		const grouped: Record<
			string,
			ScheduleListProps["schedule"]["statusHistories"]
		> = {};
		for (const item of histories) {
			const dateKey = format(parseISO(item.changedAt), "yyyy-MM-dd", {
				locale,
				in: tzDate,
			});
			if (!grouped[dateKey]) {
				grouped[dateKey] = [];
			}
			grouped[dateKey].push(item);
		}

		// Sort dates descending
		const sortedDates = Object.keys(grouped).sort((a, b) =>
			compareDesc(parseISO(a, { in: tzDate }), parseISO(b, { in: tzDate })),
		);
		// Sort entries within each date descending by time
		for (const date of sortedDates) {
			grouped[date].sort((a, b) =>
				compareDesc(
					parseISO(a.changedAt, { in: tzDate }),
					parseISO(b.changedAt, { in: tzDate }),
				),
			);
		}

		return { grouped, sortedDates };
	}, [histories, locale, tzDate]);

	/** Make one nice sentence for each history row */
	const getHistoryMessage = useCallback(
		(h: HistoryListProps["histories"][number]) => {
			if (!h.oldStatus || h.oldStatus === "UNSCHEDULED") {
				// first save / “created”
				return t("list.status_histories.created");
			}

			if (h.newStatus === "CANCELLED") {
				return t("list.status_histories.cancelled");
			}

			if (h.oldStatus !== h.newStatus) {
				// genuine transition
				return t("list.status_histories.updated");
			}

			// same → same  (e.g. an admin pressed “save” without changing)
			return t("list.status_histories.reapplied");
		},
		[t],
	);

	return (
		<div className={cn("w-full", className)}>
			{!sortedDates?.length ? (
				<div className="flex flex-col items-center justify-center rounded-md">
					<Activity className="mb-2 size-6 text-muted-foreground/75" />
					<p className="text-sm text-center text-muted-foreground">
						{t("list.status_histories.empty")}
					</p>
				</div>
			) : (
				sortedDates.map((date) => (
					<div key={date} className="mb-2">
						<p className="mb-4 font-medium">
							{format(date, "PPP", { locale, in: tzDate })}
						</p>

						<div className="relative">
							{grouped[date].map((item, index) => (
								<div key={`${date}-${String(index)}`} className="flex gap-4">
									{/* Timeline line and dot */}
									<div className="flex flex-col items-center mt-1">
										<div className="w-4 h-4 rounded-md bg-primary shrink-0" />
										{index !== grouped[date].length - 1 && (
											<div className="w-0.5 h-full bg-border mt-2" />
										)}
									</div>

									{/* Content */}
									<div className="flex-1 pb-4">
										<div className="flex justify-between gap-2">
											<p className="text-sm font-light">
												{format(item.changedAt, timeFormatDateFns, {
													locale,
													in: tzDate,
												})}
											</p>

											<p className="flex-1 font-medium text-right uppercase break-all line-clamp-1 text-pretty">
												{t("list.status_histories.by")}{" "}
												{item.changedBy.profile.name}
											</p>
										</div>

										<div className="my-1">
											<p className="text-pretty">
												<span>{getHistoryMessage(item)}</span>{" "}
												{item.newStatus !== "CANCELLED" && (
													<span className="font-medium">
														{t(
															`statuses.${item.newStatus.toLowerCase().replaceAll(" ", "_")}`,
														)}
													</span>
												)}
											</p>
										</div>

										{item.reason && (
											<div className="font-light">
												<p>
													{t("list.status_histories.reason")}: {item.reason}
												</p>
											</div>
										)}
									</div>
								</div>
							))}
						</div>
					</div>
				))
			)}
		</div>
	);
};

// * appointment list component
export interface AppointmentListProps extends ComponentProps<"section"> {
	appointment: NonNullable<
		AppointmentIndexProps["appointments"]
	>["data"][number];
	index: number;
}

export default function AppointmentList({
	className,
	appointment,
	index: _index,
}: AppointmentListProps) {
	const { locale, tzDate } = useDateContext();
	const { t } = useTranslation("appointments");
	const label = useMemo(() => {
		if (!appointment?.date) return t("tab.title.unschedule");
		if (isToday(appointment.date)) return t("list.today");

		return format(appointment.date, "PPPP", { locale, in: tzDate });
	}, [appointment.date, locale, tzDate, t]);

	return (
		<section
			className={cn(
				"grid w-full gap-6 text-sm motion-preset-fade motion-delay-200",
				className,
			)}
		>
			<p className="text-xs font-semibold tracking-wider uppercase">{label}</p>

			<div className="grid gap-2">
				{appointment.schedules.map((schedule) => (
					<ScheduleList
						key={schedule.id}
						appointment={appointment}
						schedule={schedule}
					/>
				))}
			</div>
		</section>
	);
}

// * schedule/visit detail
interface ScheduleListProps {
	appointment: NonNullable<
		AppointmentIndexProps["appointments"]
	>["data"][number];
	schedule: NonNullable<
		AppointmentIndexProps["appointments"]
	>["data"][number]["schedules"][number];
}

function ScheduleList({ schedule }: ScheduleListProps) {
	const { locale, tzDate, timeFormatDateFns } = useDateContext();
	const { props: globalProps } = usePage<AppointmentIndexGlobalPageProps>();
	const { t } = useTranslation("appointments");
	const isPastFromToday = useMemo(() => {
		if (!schedule.appointmentDateTime) return false;
		return isBefore(schedule.appointmentDateTime, startOfToday());
	}, [schedule.appointmentDateTime]);
	const distanceBadgeVariant = useMemo(
		() => getbadgeVariantStatus(schedule.status),
		[schedule.status],
	);
	const statusDotVariant = useMemo<VariantDotBadge["variant"]>(() => {
		return schedule.status === "pending_patient_approval" ||
			schedule.status === "pending_payment" ||
			schedule.status === "pending_therapist_assignment"
			? "warning"
			: schedule.status === "unscheduled"
				? "outline"
				: schedule.status === "cancelled"
					? "destructive"
					: "success";
	}, [schedule.status]);
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
	}, [schedule.appointmentDateTime, locale, tzDate, timeFormatDateFns]);
	const isAdminPIC = useMemo(() => {
		const currentAccountId = globalProps.auth.currentUser?.id;

		return !!schedule.admins?.some((admin) => admin.id === currentAccountId);
	}, [globalProps.auth.currentUser?.id, schedule?.admins]);
	const isSuperAdmin = useMemo(
		() => !!globalProps.auth.currentUser?.["isSuperAdmin?"],
		[globalProps.auth.currentUser?.["isSuperAdmin?"]],
	);
	const isAdminSupervisor = useMemo(
		() => !!globalProps.auth.currentUser?.["isAdminSupervisor?"],
		[globalProps.auth.currentUser?.["isAdminSupervisor?"]],
	);
	const isFreshAppt = useMemo(
		() =>
			differenceInHours(new Date(), parseISO(schedule.createdAt), {
				in: tzDate,
			}) <= 24,
		[schedule.createdAt, tzDate],
	);

	return (
		<Expandable
			expandDirection="vertical"
			expandBehavior="replace"
			initialDelay={0.25}
			className="group"
			// onExpandStart={() => console.log("Expanding...")}
			// onExpandEnd={() => console.log("Expanded!")}
		>
			{({ isExpanded }) => {
				return (
					<ExpandableTrigger>
						<ExpandableCard
							expandDelay={250}
							collapseDelay={500}
							// collapsedSize={{ width: 320, height: 240 }}
							// expandedSize={{ width: 420, height: 480 }}
							className="relative transition delay-200 border shadow-inner hover:z-10 rounded-xl bg-background border-border hover:ring-2 hover:ring-primary hover:shadow-2xl hover:scale-[1.02]"
						>
							<ExpandableCardHeader
								className={cn("p-4 md:p-6", isExpanded ? "" : "!pb-2")}
							>
								<>
									<div className="flex flex-col flex-1 gap-6 md:flex-row">
										<div className="flex flex-col items-center self-center w-full my-2 md:w-32">
											<Badge
												variant="outline"
												className={cn(
													"mb-1 text-center text-pretty",
													distanceBadgeVariant,
												)}
											>
												{startTimeLabel.distance}
											</Badge>
											<p className="text-2xl font-bold tracking-widest group-hover:text-primary">
												{startTimeLabel.time}
											</p>
											<p className="text-xs font-semibold group-hover:text-primary">
												{startTimeLabel.period}
											</p>
											<Badge
												variant="outline"
												className="mt-3 text-xs font-semibold group-hover:text-primary"
											>
												Visit {schedule.visitProgress}
											</Badge>
										</div>

										<Separator
											orientation="vertical"
											className="w-[2px] h-auto rounded hidden md:inline-block"
										/>

										<div className="grid items-start w-full grid-cols-1 gap-4 my-2 lg:gap-6 md:grid-cols-12">
											<div className="flex flex-col items-start justify-between w-full gap-4 md:items-center md:flex-row col-span-full">
												<TooltipProvider>
													<Tooltip>
														<TooltipTrigger asChild>
															<div className="relative">
																<DotBadgeWithLabel
																	className="relative flex-shrink-0 text-left"
																	variant={statusDotVariant}
																>
																	<span
																		title={schedule.status}
																		className="flex-grow-0 text-xs tracking-wide text-nowrap"
																	>
																		{t(`statuses.${schedule.status}`)}
																	</span>
																</DotBadgeWithLabel>
															</div>
														</TooltipTrigger>
														<TooltipContent>
															<p className="uppercase">
																Status: {schedule.status}
															</p>
														</TooltipContent>
													</Tooltip>
												</TooltipProvider>

												<div className="flex-none order-first md:order-last">
													<Badge
														variant="outline"
														className={cn(
															"text-pretty font-bold",
															schedule?.service?.code &&
																getBrandBadgeVariant(schedule.service.code),
														)}
													>
														<Hash className="size-3" />
														<span>{schedule.registrationNumber}</span>
													</Badge>
												</div>
											</div>

											<div className="grid items-start gap-4 xl:grid-cols-12 col-span-full">
												<div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1 xl:col-span-4">
													<div className="flex items-center gap-2">
														{schedule?.patient && (
															<>
																<Avatar className="text-[10px] border rounded-lg border-border bg-muted size-6">
																	<AvatarImage
																		src="#"
																		alt={schedule.patient.name}
																	/>
																	<AvatarFallback>
																		<User className="flex-shrink-0 size-4 text-muted-foreground/75" />
																		{/* {generateInitials(schedule.patient.name)} */}
																	</AvatarFallback>
																</Avatar>
																<div>
																	<p className="uppercase line-clamp-1">
																		{schedule.patient.name}
																	</p>
																	{/* <div className="flex gap-1 text-xs font-light line-clamp-1">
															<span>{schedule.patient.gender}</span>
															<span>&#x2022;</span>
															<span>{schedule.patient.age} years</span>
														</div> */}
																</div>
															</>
														)}
													</div>

													<div className="flex items-center gap-2">
														<Avatar className="text-[10px] border rounded-lg border-border bg-muted size-6">
															<AvatarImage
																src="#"
																alt={schedule?.therapist?.name || "N/A"}
															/>
															<AvatarFallback>
																<Stethoscope className="flex-shrink-0 size-4 text-muted-foreground/75" />
																{/* {generateInitials(schedule?.therapist?.name || "?")} */}
															</AvatarFallback>
														</Avatar>

														<div>
															<p className="uppercase line-clamp-1">
																{schedule?.therapist?.name || "N/A"}
															</p>
															{/* <div className="flex gap-1 text-xs font-light line-clamp-1">
														<span>{schedule.therapist.employmentType}</span>
													</div> */}
														</div>
													</div>
												</div>

												<div className="grid order-first gap-4 xl:order-last xl:col-span-8">
													<div className="flex items-start gap-3 min-h-6">
														<Hospital className="flex-shrink-0 size-4 text-muted-foreground/75" />
														<p className="truncate text-pretty lg:line-clamp-1">
															<span>
																{schedule?.service?.name?.replaceAll(
																	"_",
																	" ",
																) || "N/A"}{" "}
															</span>
															<span className="mx-2">&#x2022;</span>
															<span>{schedule?.package?.name}</span>
															<span className="mx-1">-</span>
															<span className="italic font-light">
																{schedule?.package?.numberOfVisit || "N/A"}{" "}
																visit(s)
															</span>
														</p>
													</div>

													<div className="flex items-start gap-3 min-h-6">
														<MapPinHouse className="flex-shrink-0 size-4 text-muted-foreground/75" />
														<span
															title={
																[
																	schedule?.location?.city,
																	schedule?.location?.state,
																	schedule?.location?.country,
																]?.join(", ") || "N/A"
															}
															className={cn(
																"text-pretty capitalize",
																isExpanded ? "" : "line-clamp-2",
															)}
														>
															{[
																schedule?.location?.city,
																schedule?.location?.state,
																schedule?.location?.country,
															]?.join(", ") || "N/A"}
														</span>
													</div>
												</div>
											</div>
										</div>
									</div>

									{isFreshAppt && (
										<div className="absolute top-0 -translate-x-1/2 left-1/2">
											<div className="flex items-center gap-1 p-1 px-2 text-white border-b border-l border-r border-white rounded-br-md rounded-bl-md bg-gradient-to-r from-violet-500 to-purple-500 animate-pulse">
												<Sparkles className="size-3.5 shrink-0 text-inherit" />
												<p className="text-xs text-nowrap">
													{t("list.recently_added")}
												</p>
											</div>
										</div>
									)}
								</>
							</ExpandableCardHeader>
							<ExpandableCardContent className="px-4 pb-0 md:px-6">
								<div className="flex flex-col items-start justify-between mb-4">
									<div className="flex flex-col items-center mx-auto gap-0.5 text-muted-foreground/75 text-xs font-light group-hover:text-primary">
										{/* <span className="leading-none">
										{isExpanded ? "see less" : "see more"}
									</span> */}
										{isExpanded ? (
											<ChevronsUp className="size-4 group-hover:animate-bounce" />
										) : (
											<ChevronsDown className="size-4 group-hover:animate-bounce" />
										)}
									</div>
								</div>

								<ExpandableContent
									preset="blur-md"
									stagger
									staggerChildren={0.2}
								>
									<div className="grid gap-6 xl:grid-cols-12">
										<div className="flex flex-col h-full gap-3 xl:col-span-8">
											<h3 className="text-xs font-light uppercase xl:invisible">
												{t("list.appointment_details")}
											</h3>

											<div className="flex flex-col h-full gap-6 p-4 border rounded-lg shadow-inner border-border bg-sidebar">
												<div className="grid gap-4 md:grid-cols-2">
													<div>
														<p className="font-light">
															{t("list.booked_appointment_date")}:
														</p>
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
														<p className="font-light">
															{t("list.booked_appointment_time")}:
														</p>
														<p className="font-semibold uppercase">
															{schedule.appointmentDateTime
																? format(
																		schedule.appointmentDateTime,
																		timeFormatDateFns,
																		{
																			locale,
																			in: tzDate,
																		},
																	)
																: "N/A"}
														</p>
													</div>

													<div className="col-span-full md:col-span-1">
														<p className="font-light">
															{t("list.visit_service")}:
														</p>
														<p className="font-semibold">
															<span>
																{schedule?.service?.name?.replaceAll(
																	"_",
																	" ",
																) || "N/A"}{" "}
															</span>
															<span className="mx-2">&#x2022;</span>
															<span>{schedule?.package?.name}</span>
															<span className="mx-1">-</span>
															<span className="italic font-light">
																{schedule?.package?.numberOfVisit || "N/A"}{" "}
																visit(s)
															</span>
														</p>
													</div>

													<div>
														<p className="font-light">
															{t("list.visit_region")}:
														</p>
														<p className="font-semibold uppercase">
															{[
																schedule?.location?.city,
																schedule?.location?.state,
																schedule?.location?.country,
															]?.join(", ") || "N/A"}
														</p>
													</div>

													<div className="col-span-full">
														<p className="font-light">
															{t("list.visit_address")}:
														</p>
														<p className="font-semibold capitalize">
															{schedule.visitAddress?.addressLine || "N/A"}
														</p>
														<p className="italic font-normal">
															{t("list.notes")}:{" "}
															{schedule.visitAddress?.notes || "N/A"}
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
														<p className="font-light">
															{t("list.preferred_therapist_gender")}:
														</p>
														<p className="flex gap-1 font-semibold uppercase">
															{getGenderIcon(schedule.preferredTherapistGender)}{" "}
															{schedule.preferredTherapistGender}
														</p>
													</div>

													<div>
														<p className="font-light">
															{t("list.referral_source")}:
														</p>
														<p className="font-semibold capitalize">
															{schedule?.otherReferralSource ||
																schedule?.referralSource ||
																"N/A"}
														</p>
													</div>

													<div className="p-2 border rounded-md col-span-full border-border bg-input">
														<p className="font-light">{t("list.notes")}:</p>
														<p className="italic font-semibold capitalize">
															{schedule?.notes || "N/A"}
														</p>
													</div>

													<div>
														<p className="font-light">
															{t("list.created_at")}:
														</p>
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
														<p className="font-light">
															{t("list.updated_at")}:
														</p>
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
													<h4 className="text-xs font-light uppercase">
														{t("list.series")}
													</h4>

													{schedule?.allVisits?.map((visit) => (
														<div
															key={visit.id}
															className={cn(
																"grid gap-1 p-3 border rounded-lg border-border bg-input",
																visit.registrationNumber ===
																	schedule.registrationNumber &&
																	"border-primary/50 text-primary",
															)}
														>
															<div className="flex items-center justify-between">
																<div className="flex-none mb-1">
																	<Badge
																		variant="outline"
																		className={cn(
																			"text-pretty font-bold !text-[10px] px-1",
																			schedule?.service?.code &&
																				getBrandBadgeVariant(
																					schedule.service.code,
																				),
																		)}
																	>
																		<Hash className="size-2.5" />
																		<span>{visit.registrationNumber}</span>
																	</Badge>
																</div>

																<div>
																	<Badge
																		variant="outline"
																		className={cn(
																			"mb-1 text-center text-pretty !text-[10px]",
																			getbadgeVariantStatus(visit.status),
																		)}
																	>
																		{t(`statuses.${visit.status}`)}
																	</Badge>
																</div>
															</div>

															<div className="flex flex-col flex-1">
																<p className="font-bold">
																	Visit {visit.visitProgress}
																</p>

																{visit.appointmentDateTime ? (
																	<p className="text-xs font-light">
																		<span>
																			{format(
																				visit.appointmentDateTime,
																				timeFormatDateFns,
																				{
																					locale,
																					in: tzDate,
																				},
																			)}
																		</span>

																		<span className="mx-1">&bull;</span>

																		<span>
																			{format(
																				visit.appointmentDateTime,
																				"PPPP",
																				{
																					locale,
																					in: tzDate,
																				},
																			)}
																		</span>
																	</p>
																) : (
																	<p className="text-xs font-light">N/A</p>
																)}
															</div>
														</div>
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
																<p className="font-light">
																	{t("list.booking_partner")}:
																</p>
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
																<p className="font-light">
																	{t("list.voucher")}:
																</p>
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
															{schedule?.package
																?.formattedTotalPriceWithoutDiscount || "N/A"}
														</span>
													</div>

													{schedule?.service?.code && (
														<div className="flex items-center justify-between">
															<div className="flex items-center gap-2">
																<TicketPercent className="size-4 text-muted-foreground/75" />
																<span className="font-light">
																	{t("list.discount")}:
																</span>
																<Badge
																	variant="outline"
																	className="ml-0 text-xs border-2 md:ml-2"
																>
																	SERVICE{schedule?.service?.code}
																</Badge>
															</div>
															<span className="font-semibold text-primary">
																-{" "}
																{schedule?.package?.formattedDiscount || "N/A"}
															</span>
														</div>
													)}

													{schedule.voucherCode && (
														<div className="flex items-center justify-between">
															<div className="flex items-center gap-2">
																<TicketPercent className="size-4 text-muted-foreground/75" />
																<span className="font-light">
																	{t("list.discount")}:
																</span>
																<Badge
																	variant="outline"
																	className="ml-2 text-xs border-2"
																>
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
														<span className="font-bold uppercase">
															{t("list.total_price")}
														</span>
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
										</div>

										<div className="flex flex-col h-full gap-3 xl:col-span-4">
											<h3 className="text-xs font-light uppercase">
												{t("list.status_histories.title")}
											</h3>

											<div className="flex flex-col h-full gap-4 p-4 border rounded-lg shadow-inner border-border bg-sidebar">
												<HistoryList histories={schedule.statusHistories} />
											</div>
										</div>

										<div className="grid grid-cols-1 gap-6 xl:grid-cols-3 col-span-full">
											<div className="flex flex-col gap-3">
												<h3 className="text-xs font-light uppercase">
													{t("list.patient_details")}
												</h3>

												<PatientCard
													patient={schedule.patient}
													patientMedicalRecord={schedule.patientMedicalRecord}
													className="flex flex-col h-full"
												/>
											</div>

											<div className="flex flex-col gap-3">
												<h3 className="text-xs font-light uppercase">
													{t("list.therapist_details")}
												</h3>

												<TherapistCard
													therapist={schedule?.therapist}
													className="flex flex-col h-full "
												/>
											</div>

											<div className="flex flex-col gap-3">
												<h3 className="text-xs font-light uppercase">
													{t("list.pic_details")}
												</h3>

												<AdminCard
													admins={schedule?.admins}
													className="flex flex-col h-full"
												/>
											</div>
										</div>
									</div>
								</ExpandableContent>
							</ExpandableCardContent>

							<AppointmentActionButtons
								schedule={schedule}
								isExpanded={isExpanded}
								isSuperAdmin={isSuperAdmin}
								isAdminPIC={isAdminPIC}
								isAdminSupervisor={isAdminSupervisor}
								isPastFromToday={isPastFromToday}
							/>
						</ExpandableCard>
					</ExpandableTrigger>
				);
			}}
		</Expandable>
	);
}

// * appointment schedule component
interface AppointmentActionButtonsProps {
	schedule: ScheduleListProps["schedule"];
	isExpanded: boolean;
	isSuperAdmin: boolean;
	isAdminPIC: boolean;
	isAdminSupervisor: boolean;
	isPastFromToday: boolean;
}

const AppointmentActionButtons = memo(function Component({
	schedule,
	isExpanded: _isExpanded,
	isAdminPIC,
	isAdminSupervisor,
	isPastFromToday,
	isSuperAdmin,
}: AppointmentActionButtonsProps) {
	const { props: globalProps, url: pageURL } =
		usePage<AppointmentIndexGlobalPageProps>();
	const { t } = useTranslation("appointments");
	const isShow = useMemo(() => {
		const updateStatus =
			schedule.status !== "paid" &&
			schedule.status !== "unscheduled" &&
			schedule.status !== "pending_therapist_assignment";
		const cancel = schedule.initialVisit;
		// const createSeries =
		// 	schedule.totalPackageVisits > 1 &&
		// 	schedule.visitNumber !== schedule.totalPackageVisits &&
		// 	schedule.nextVisitProgress;

		return { updateStatus, cancel };
	}, [schedule]);
	const routeTo = {
		cancel: (id: string) => {
			const url = pageURL;

			router.get(
				url,
				{ cancel: id },
				{
					only: ["adminPortal", "flash", "errors", "selectedAppointment"],
					preserveScroll: true,
					preserveState: true,
					replace: false,
				},
			);
		},
		updatePic: (id: string) => {
			const url = pageURL;

			router.get(
				url,
				{ update_pic: id },
				{
					only: [
						"adminPortal",
						"flash",
						"errors",
						"selectedAppointment",
						"optionsData",
					],
					preserveScroll: true,
					preserveState: true,
					replace: false,
				},
			);
		},
		updateStatus: (id: string) => {
			const url = pageURL;

			router.get(
				url,
				{ update_status: id },
				{
					only: [
						"adminPortal",
						"flash",
						"errors",
						"selectedAppointment",
						"optionsData",
					],
					preserveScroll: true,
					preserveState: true,
					replace: false,
				},
			);
		},
		reschedule: (id: string) => {
			const urlSource =
				globalProps.adminPortal.router.adminPortal.appointment.index;
			const url = `${urlSource}/${id}/reschedule`;

			router.visit(url);
		},
		createSeries: (apptSource: NonNullable<ScheduleListProps["schedule"]>) => {
			const urlSource =
				globalProps.adminPortal.router.adminPortal.appointment.new;
			const idSource = apptSource?.appointmentReferenceId || apptSource.id;
			const { fullUrl } = populateQueryParams(urlSource, {
				reference: idSource,
			});

			router.visit(fullUrl);
		},
	};

	return (
		<ExpandableContent preset="slide-up">
			<ExpandableCardFooter className="p-4 md:p-6">
				<div className="flex flex-col items-center w-full gap-3 lg:flex-row lg:justify-end">
					{(isSuperAdmin || isAdminPIC || isAdminSupervisor) &&
						schedule.status !== "cancelled" && (
							<>
								{/* {isShow.createSeries && (
								<Button
									variant="primary-outline"
									className="w-full lg:w-auto"
									onClick={(event) => {
										event.preventDefault();
										event.stopPropagation();

										routeTo.createSeries(schedule);
									}}
								>
									<Repeat />
									{t("button.series")}
								</Button>
							)} */}

								{!isPastFromToday && (
									<>
										<Button
											variant="primary-outline"
											className="w-full lg:w-auto"
											onClick={(event) => {
												event.preventDefault();
												event.stopPropagation();

												routeTo.reschedule(String(schedule.id));
											}}
										>
											<Clock3 />
											{t("button.reschedule")}
										</Button>

										{isShow.updateStatus && (
											<Button
												variant="primary-outline"
												className="w-full lg:w-auto"
												onClick={(event) => {
													event.preventDefault();
													event.stopPropagation();

													routeTo.updateStatus(String(schedule.id));
												}}
											>
												<Activity />
												{t("button.update_status")}
											</Button>
										)}

										{(isAdminSupervisor || isSuperAdmin) && (
											<Button
												variant="primary-outline"
												className="w-full lg:w-auto"
												onClick={(event) => {
													event.preventDefault();
													event.stopPropagation();

													routeTo.updatePic(String(schedule.id));
												}}
											>
												<Cctv />
												{t("button.update_pic")}
											</Button>
										)}

										{isShow.cancel && (
											<Button
												variant="destructive"
												className="w-full lg:w-auto"
												onClick={(event) => {
													event.preventDefault();
													event.stopPropagation();

													routeTo.cancel(String(schedule.id));
												}}
											>
												<Ban />
												{t("button.cancel_booking")}
											</Button>
										)}
									</>
								)}
							</>
						)}
				</div>
			</ExpandableCardFooter>
		</ExpandableContent>
	);
});

// * for admin pic detail components
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
					<p className="col-span-2 font-semibold text-right text-pretty">
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

interface AdminCardProps extends ComponentProps<"div"> {
	admins: ScheduleListProps["schedule"]["admins"];
}

function AdminCard({ className, admins }: AdminCardProps) {
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
}

// * therapis detail
interface TherapistCardProps extends ComponentProps<"div"> {
	therapist: ScheduleListProps["schedule"]["therapist"];
}
function TherapistCard({ className, therapist }: TherapistCardProps) {
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
							<p className="font-semibold line-clamp-1">
								{therapist?.name || "N/A"}
							</p>
						</div>
					</div>

					<div className="grid gap-3">
						<div className="grid grid-cols-3 gap-2">
							<p className="font-light">{t("list.reg_number")}:</p>
							<div className="col-span-2">
								<p className="flex items-center justify-end gap-0.5 w-full font-semibold uppercase text-pretty">
									<Hash className="size-4 text-muted-foreground/75 shrink-0" />
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
							<p className="col-span-2 font-semibold text-right text-pretty">
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

// * patient card
interface PatientCardProps extends ComponentProps<"div"> {
	patient: ScheduleListProps["schedule"]["patient"];
	patientMedicalRecord: ScheduleListProps["schedule"]["patientMedicalRecord"];
}

function PatientCard({
	className,
	patient,
	patientMedicalRecord,
}: PatientCardProps) {
	const { locale, tzDate } = useDateContext();
	const { t } = useTranslation("appointments");

	return (
		<div
			className={cn(
				"gap-4 p-4 border rounded-lg shadow-inner border-border bg-sidebar",
				className,
			)}
		>
			<div className="grid gap-6">
				<div className="flex items-center gap-2">
					<Avatar className="text-[10px] border rounded-lg border-border bg-background size-6">
						<AvatarImage src="#" alt={patient?.name || "N/A"} />
						<AvatarFallback className="bg-background">
							{patient?.name ? generateInitials(patient.name) : "N/A"}
						</AvatarFallback>
					</Avatar>
					<div>
						<p className="font-semibold capitalize line-clamp-1">
							{patient?.name || "N/A"}
						</p>
					</div>
				</div>

				<div className="grid gap-3">
					<div className="grid grid-cols-3 gap-2">
						<p className="font-light">{t("list.gender")}:</p>
						<div className="col-span-2">
							<p className="flex items-center justify-end gap-0.5 w-full font-semibold uppercase text-pretty">
								{patient?.gender &&
									getGenderIcon(
										patient.gender,
										"size-4 text-muted-foreground/75 shrink-0",
									)}
								{patient?.gender || "N/A"}
							</p>
						</div>
					</div>

					<div className="grid grid-cols-3 gap-2">
						<p className="font-light">{t("list.age")}:</p>
						<p className="col-span-2 font-semibold text-right capitalize text-pretty">
							<span>
								{patient?.age || "N/A"} {t("list.years")}:
							</span>
							<span className="mx-1">&#x2022;</span>
							<span>
								{patient?.dateOfBirth
									? format(new Date(String(patient?.dateOfBirth)), "PP", {
											locale,
											in: tzDate,
										})
									: "N/A"}
							</span>
						</p>
					</div>

					<Separator className="my-2" />

					<p className="text-xs tracking-wider uppercase">
						{t("list.contact_details")}
					</p>

					<div className="grid grid-cols-3 gap-2">
						<p className="font-light">{t("list.contact_name")}:</p>
						<p className="col-span-2 font-semibold text-right uppercase text-pretty">
							{patient?.contact?.contactName || "N/A"}
						</p>
					</div>

					<div className="grid grid-cols-3 gap-2">
						<p className="font-light">{t("list.contact_phone")}:</p>
						<p className="col-span-2 font-semibold text-right uppercase text-pretty">
							{patient?.contact?.contactPhone || "N/A"}
						</p>
					</div>

					<div className="grid grid-cols-3 gap-2">
						<p className="font-light">MiiTel Link:</p>
						<div className="col-span-2">
							<p className="flex items-center justify-end gap-0.5 w-full font-semibold uppercase text-pretty">
								<Link className="size-4 text-muted-foreground/75 shrink-0" />
								{patient?.contact?.miitelLink || "N/A"}
							</p>
						</div>
					</div>

					<div className="grid grid-cols-3 gap-2">
						<p className="font-light">Email:</p>
						<p className="col-span-2 font-semibold text-right text-pretty">
							{patient?.contact?.email || "N/A"}
						</p>
					</div>

					<Separator className="my-2" />

					<p className="text-xs tracking-wider uppercase">
						{t("list.patient_medical_record")}
					</p>

					<div className="grid grid-cols-3 gap-2">
						<p className="font-light">{t("list.current_condition")}:</p>
						<p className="col-span-2 font-semibold text-right uppercase text-pretty">
							{patientMedicalRecord?.condition || "N/A"}
						</p>
					</div>

					<div className="grid grid-cols-3 gap-2">
						<p className="font-light">{t("list.complaint")}:</p>
						<p className="col-span-2 font-semibold text-right capitalize text-pretty">
							{patientMedicalRecord?.complaintDescription || "N/A"}
						</p>
					</div>

					<div className="grid grid-cols-3 gap-2">
						<p className="font-light">{t("list.illness_onset_date")}:</p>
						<p className="col-span-2 font-semibold text-right capitalize text-pretty">
							{patientMedicalRecord?.illnessOnsetDate || "N/A"}
						</p>
					</div>

					<div className="grid grid-cols-3 gap-2">
						<p className="font-light">{t("list.medical_history")}:</p>
						<p className="col-span-2 font-semibold text-right capitalize text-pretty">
							{patientMedicalRecord?.medicalHistory || "N/A"}
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
