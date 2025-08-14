import { router, usePage } from "@inertiajs/react";
import {
	differenceInHours,
	format,
	formatDistance,
	isToday,
	parseISO,
} from "date-fns";
import {
	ChevronsDown,
	ChevronsUp,
	Hash,
	Hospital,
	MapPinHouse,
	Sparkles,
	Stethoscope,
	User,
} from "lucide-react";
import { type ComponentProps, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
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
import { Separator } from "@/components/ui/separator";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import { useIsMobile } from "@/hooks/use-mobile";
import {
	getBadgeVariantStatus,
	getDotVariantStatus,
} from "@/lib/appointments/utils";
import { getBrandBadgeVariant } from "@/lib/services";
import { cn, populateQueryParams } from "@/lib/utils";
import type {
	AppointmentIndexGlobalPageProps,
	AppointmentIndexProps,
} from "@/pages/AdminPortal/Appointment/Index";
import AppointmentListItemDetails from "./details";
import AppointmentActionButtons from "./details/action-buttons";
import AdminCard from "./details/admins";
import HistoryList from "./details/histories";
import PatientCard from "./details/patient";
import TherapistCard from "./details/therapist";

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
export interface ScheduleListProps {
	appointment: NonNullable<
		AppointmentIndexProps["appointments"]
	>["data"][number];
	schedule: NonNullable<
		AppointmentIndexProps["appointments"]
	>["data"][number]["schedules"][number];
}

export function ScheduleList({ schedule }: ScheduleListProps) {
	const isMobile = useIsMobile();
	const { locale, tzDate, timeFormatDateFns } = useDateContext();
	const { props: globalProps, url: pageURL } =
		usePage<AppointmentIndexGlobalPageProps>();
	const { t } = useTranslation("appointments");
	const distanceBadgeVariant = useMemo(
		() => getBadgeVariantStatus(schedule.status),
		[schedule.status],
	);
	const statusDotVariant = useMemo<VariantDotBadge["variant"]>(
		() => getDotVariantStatus(schedule.status),
		[schedule.status],
	);
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
	const seeDetailVisitSeries = useCallback(
		(registrationNumber: string) => {
			const { baseUrl } = populateQueryParams(pageURL);
			router.get(
				baseUrl,
				deepTransformKeysToSnakeCase({ registrationNumber }),
				{
					only: ["adminPortal", "flash", "errors", "appointments"],
					preserveState: true,
					replace: true,
				},
			);
		},
		[pageURL],
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
															Status: {t(`statuses.${schedule.status}`)}
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
															{schedule?.service?.name?.replaceAll("_", " ") ||
																"N/A"}{" "}
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

											<AppointmentListItemDetails
												schedule={schedule}
												isFreshAppt={isFreshAppt}
												isMobile={isMobile}
												seeDetailVisitSeries={seeDetailVisitSeries}
											/>
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

							<ExpandableContent preset="slide-up">
								<ExpandableCardFooter className="p-4 md:p-6 bg-background">
									<AppointmentActionButtons
										schedule={schedule}
										isExpanded={isExpanded}
										isSuperAdmin={isSuperAdmin}
										isAdminPIC={isAdminPIC}
										isAdminSupervisor={isAdminSupervisor}
									/>
								</ExpandableCardFooter>
							</ExpandableContent>
						</ExpandableCard>
					</ExpandableTrigger>
				);
			}}
		</Expandable>
	);
}
