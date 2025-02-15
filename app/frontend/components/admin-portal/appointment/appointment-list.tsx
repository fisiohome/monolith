import { cn, generateInitials } from "@/lib/utils";
import type { Appointment } from "@/pages/AdminPortal/Appointment/Index";
import { format, formatDistance, isToday, parse } from "date-fns";
import { useMemo, type ComponentProps } from "react";
import { Separator } from "@/components/ui/separator";
import {
	Expandable,
	ExpandableCard,
	ExpandableCardContent,
	ExpandableCardFooter,
	ExpandableCardHeader,
	ExpandableContent,
	ExpandableTrigger,
} from "@/components/shared/expandable";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
	Ban,
	BriefcaseMedical,
	ChevronsDown,
	ChevronsUp,
	Clock3,
	Hash,
	Mail,
	MapPinHouse,
	Mars,
	PersonStanding,
	Phone,
	ShieldCheck,
	Venus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBrandBadgeVariant } from "@/lib/services";

// * appointment schedule component
interface ScheduleListProps {
	appointment: Appointment[number];
	schedule: Appointment[number]["schedules"][number];
}

function ScheduleList({ appointment, schedule }: ScheduleListProps) {
	const distanceBadgeVariant = useMemo(() => {
		const upcoming =
			"text-blue-800 bg-blue-100 dark:bg-blue-900 dark:text-blue-100";
		const pending =
			"text-yellow-800 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-100";
		const past =
			"text-gray-800 bg-gray-100 dark:bg-gray-900 dark:text-gray-100";
		const cancel = "text-red-800 bg-red-100 dark:bg-red-900 dark:text-red-100";

		return appointment.status === "upcoming"
			? upcoming
			: appointment.status === "pending"
				? pending
				: appointment.status === "past"
					? past
					: appointment.status === "cancel"
						? cancel
						: "";
	}, [appointment.status]);
	const startTimeLabel = useMemo(() => {
		// Parse the time using today's date as the reference.
		const parsedTime = parse(schedule.startTime, "HH:mm", appointment.date);
		// Format it to 12-hour time with an AM/PM indicator.
		const timePeriod = format(parsedTime, "hh:mm a");
		// Split the time with period based on the space
		const startTime = timePeriod.split(" ");
		const time = startTime[0];
		const period = startTime[1];
		// Get the time distance
		const distance = formatDistance(parsedTime, new Date(), {
			addSuffix: true,
		});

		return { time, period, distance };
	}, [appointment.date, schedule.startTime]);

	return (
		<Expandable
			expandDirection="vertical"
			expandBehavior="replace"
			initialDelay={0.25}
			className="group"
			// onExpandStart={() => console.log("Expanding...")}
			// onExpandEnd={() => console.log("Expanded!")}
		>
			{({ isExpanded }) => (
				<ExpandableTrigger>
					<ExpandableCard
						expandDelay={250}
						collapseDelay={500}
						// collapsedSize={{ width: 320, height: 240 }}
						// expandedSize={{ width: 420, height: 480 }}
						className="relative w-full border shadow-inner rounded-xl bg-background border-border"
					>
						<ExpandableCardHeader
							className={cn("p-4 md:p-6", isExpanded ? "" : "!pb-2")}
						>
							<div className="flex flex-col flex-1 gap-6 md:flex-row">
								<div className="flex flex-col items-center self-center w-full my-2 md:w-32">
									<Badge
										className={cn(
											"mb-1 text-center text-pretty",
											distanceBadgeVariant,
										)}
									>
										{startTimeLabel.distance}
									</Badge>
									<p className="text-2xl font-bold tracking-widest">
										{startTimeLabel.time}
									</p>
									<p className="text-xs font-semibold">
										{startTimeLabel.period}
									</p>
								</div>

								<Separator
									orientation="vertical"
									className="w-[2px] h-auto rounded hidden md:inline-block"
								/>

								<div className="grid items-start w-full grid-cols-1 gap-4 my-2 md:grid-cols-3">
									<div className="flex items-center order-first gap-1 col-span-full xl:col-span-1">
										<Badge
											className={cn(
												"mb-1 text-center text-pretty",
												getBrandBadgeVariant(schedule.brand.code),
											)}
										>
											{schedule.brand.name}
										</Badge>
										<span>&#x2022;</span>
										<div>
											<span className="font-semibold">
												{schedule.brand.package.name}
											</span>{" "}
											<span className="italic">
												({schedule.brand.package.visit} visit)
											</span>
										</div>
									</div>

									<div className="flex items-start order-last gap-2 xl:order-first col-span-full xl:col-span-2">
										<MapPinHouse className="flex-shrink-0 size-4 text-muted-foreground/75" />
										<span
											title={schedule.patient.address}
											className={cn(
												"font-semibold text-pretty",
												isExpanded ? "" : "line-clamp-1",
											)}
										>
											{schedule.patient.address}
										</span>
									</div>

									<div className="flex items-center gap-2">
										<Avatar className="text-[10px] border rounded-lg border-border bg-muted size-6">
											<AvatarImage src="#" alt={schedule.patient.name} />
											<AvatarFallback>
												{generateInitials(schedule.patient.name)}
											</AvatarFallback>
										</Avatar>
										<div>
											<p className="font-semibold line-clamp-1">
												{schedule.patient.name}
											</p>
											{/* <div className="flex gap-1 text-xs font-light line-clamp-1">
												<span>{schedule.patient.gender}</span>
												<span>&#x2022;</span>
												<span>{schedule.patient.age} years</span>
											</div> */}
										</div>
									</div>

									<div className="flex items-center gap-2">
										<Avatar className="text-[10px] border rounded-lg border-border bg-muted size-6">
											<AvatarImage src="#" alt={schedule.therapist.name} />
											<AvatarFallback>
												{generateInitials(schedule.therapist.name)}
											</AvatarFallback>
										</Avatar>
										<div>
											<p className="font-semibold line-clamp-1">
												{schedule.therapist.name}
											</p>
											{/* <div className="flex gap-1 text-xs font-light line-clamp-1">
												<span>{schedule.therapist.employmentType}</span>
											</div> */}
										</div>
									</div>

									<div className="flex items-center gap-2">
										<div className="flex -space-x-3">
											{schedule.admins.map((admin, index) => (
												<TooltipProvider key={admin.name}>
													<Tooltip>
														<TooltipTrigger asChild>
															<Avatar
																className={cn(
																	"border rounded-lg border-border bg-muted size-6 text-[10px]",
																	index !== 0
																		? "border-l-muted-foreground/25 border-l-2"
																		: "",
																)}
															>
																<AvatarImage src="#" alt={admin.name} />
																<AvatarFallback>
																	{generateInitials(admin.name)}
																</AvatarFallback>
															</Avatar>
														</TooltipTrigger>
														<TooltipContent>
															<p>{admin.name}</p>
														</TooltipContent>
													</Tooltip>
												</TooltipProvider>
											))}
										</div>
										<div>
											<p className="font-semibold line-clamp-1">
												{schedule.admins.length} Person in charge(s)
											</p>
										</div>
									</div>
								</div>
							</div>
						</ExpandableCardHeader>

						<ExpandableCardContent className="px-4 pb-0 md:px-6">
							<div className="flex flex-col items-start justify-between mb-4">
								<div className="flex flex-col items-center mx-auto gap-0.5 text-muted-foreground/75 text-xs font-light group-hover:text-primary">
									<span className="leading-none">
										{isExpanded ? "see less" : "see more"}
									</span>
									{isExpanded ? (
										<ChevronsUp className="size-4 group-hover:animate-bounce" />
									) : (
										<ChevronsDown className="size-4 group-hover:animate-bounce" />
									)}
								</div>
							</div>

							<ExpandableContent preset="blur-md" stagger staggerChildren={0.2}>
								<div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
									<div className="flex flex-col gap-3">
										<h3 className="text-xs uppercase">Patient Details</h3>

										<div className="flex flex-col h-full gap-4 p-4 border rounded-lg border-border">
											<div className="grid gap-3">
												<div className="flex items-center gap-2">
													<Avatar className="text-[10px] border rounded-lg border-border bg-muted size-6">
														<AvatarImage src="#" alt={schedule.patient.name} />
														<AvatarFallback>
															{generateInitials(schedule.patient.name)}
														</AvatarFallback>
													</Avatar>
													<div>
														<p className="font-semibold line-clamp-1">
															{schedule.patient.name}
														</p>
													</div>
												</div>

												<div className="grid gap-2">
													<div className="flex justify-between gap-2">
														<div className="flex items-center gap-2">
															<Mail className="size-4 text-muted-foreground/75" />
															<p className="font-light">Email:</p>
														</div>
														<p className="font-semibold truncate">
															{schedule.patient.email}
														</p>
													</div>

													<div className="flex justify-between gap-2">
														<div className="flex items-center gap-2">
															<Phone className="size-4 text-muted-foreground/75" />
															<p className="font-light">Phone:</p>
														</div>
														<p className="font-semibold truncate">
															{schedule.patient.phoneNumber}
														</p>
													</div>

													<Separator className="my-1" />

													<div className="flex justify-between gap-2">
														<p className="font-light">Gender:</p>
														<p className="flex items-center gap-1 font-semibold truncate">
															{schedule.patient.gender === "male" ? (
																<Mars className="size-4" />
															) : (
																<Venus className="size-4" />
															)}
															{schedule.patient.gender}
														</p>
													</div>

													<div className="flex justify-between gap-2">
														<p className="font-light">Age:</p>
														<p className="font-semibold truncate">
															{schedule.patient.age} years
														</p>
													</div>
												</div>
											</div>
										</div>
									</div>

									<div className="flex flex-col gap-3">
										<h3 className="text-xs uppercase">Therapist Details</h3>

										<div className="flex flex-col h-full gap-4 p-4 border rounded-lg border-border">
											<div className="grid gap-3">
												<div className="flex items-center gap-2">
													<Avatar className="text-[10px] border rounded-lg border-border bg-muted size-6">
														<AvatarImage
															src="#"
															alt={schedule.therapist.name}
														/>
														<AvatarFallback>
															{generateInitials(schedule.therapist.name)}
														</AvatarFallback>
													</Avatar>
													<div>
														<p className="font-semibold line-clamp-1">
															{schedule.therapist.name}
														</p>
													</div>
												</div>

												<div className="grid gap-2">
													<div className="flex justify-between gap-2">
														<div className="flex items-center gap-2">
															<Hash className="size-4 text-muted-foreground/75" />
															<p className="font-light">Reg. Number:</p>
														</div>
														<p className="font-semibold truncate">
															{schedule.therapist.registrationNumber}
														</p>
													</div>

													<div className="flex justify-between gap-2">
														<div className="flex items-center gap-2">
															<BriefcaseMedical className="size-4 text-muted-foreground/75" />
															<p className="font-light">Emp. Type:</p>
														</div>
														<p className="font-semibold truncate">
															{schedule.therapist.employmentType}
														</p>
													</div>

													<div className="flex justify-between gap-2">
														<div className="flex items-center gap-2">
															<Mail className="size-4 text-muted-foreground/75" />
															<p className="font-light">Email:</p>
														</div>
														<p className="font-semibold truncate">
															{schedule.therapist.email}
														</p>
													</div>

													<div className="flex justify-between gap-2">
														<div className="flex items-center gap-2">
															<Phone className="size-4 text-muted-foreground/75" />
															<p className="font-light">Phone:</p>
														</div>
														<p className="font-semibold truncate">
															{schedule.therapist.phoneNumber}
														</p>
													</div>
												</div>

												<Separator className="my-1" />

												<div className="flex justify-between gap-2">
													<p className="font-light">Gender:</p>
													<p className="flex items-center gap-1 font-semibold truncate">
														{schedule.therapist.gender === "male" ? (
															<Mars className="size-4" />
														) : (
															<Venus className="size-4" />
														)}
														{schedule.therapist.gender}
													</p>
												</div>
											</div>
										</div>
									</div>

									<div className="flex flex-col gap-3">
										<h3 className="text-xs uppercase">PIC Details</h3>

										<div className="flex flex-col h-full gap-4 p-4 border rounded-lg border-border">
											{schedule.admins.map((admin, index) => (
												<div key={admin.name} className="grid gap-3">
													<div className="flex items-center gap-2">
														<Avatar className="text-[10px] border rounded-lg border-border bg-muted size-6">
															<AvatarImage src="#" alt={admin.name} />
															<AvatarFallback>
																{generateInitials(admin.name)}
															</AvatarFallback>
														</Avatar>
														<div>
															<p className="font-semibold line-clamp-1">
																{admin.name}
															</p>
														</div>
													</div>

													<div className="grid gap-2">
														<div className="flex justify-between gap-2">
															<div className="flex items-center gap-2">
																<Mail className="size-4 text-muted-foreground/75" />
																<p className="font-light">Email:</p>
															</div>
															<p className="font-semibold truncate">
																{admin.email}
															</p>
														</div>

														<div className="flex justify-between gap-2">
															<div className="flex items-center gap-2">
																<ShieldCheck className="size-4 text-muted-foreground/75" />
																<p className="font-light">Type:</p>
															</div>
															<p className="font-semibold truncate">
																{admin.adminType.replaceAll("_", " ")}
															</p>
														</div>
													</div>

													{index + 1 !== schedule.admins.length && (
														<Separator className="my-1" />
													)}
												</div>
											))}
										</div>
									</div>
								</div>
							</ExpandableContent>
						</ExpandableCardContent>

						<ExpandableContent preset="slide-up">
							<ExpandableCardFooter className="p-4 md:p-6">
								<div className="flex flex-col items-center w-full gap-3 lg:flex-row lg:justify-end">
									<Button
										variant="outline"
										className="w-full border lg:w-auto border-primary text-primary hover:bg-primary"
									>
										<Clock3 />
										Reschedule Appointment
									</Button>
									<Button
										variant="outline"
										className="w-full border lg:w-auto border-primary text-primary hover:bg-primary"
									>
										<PersonStanding />
										Update PIC(s)
									</Button>
									<Button variant="destructive" className="w-full lg:w-auto">
										<Ban />
										Cancel Appointment
									</Button>
								</div>
							</ExpandableCardFooter>
						</ExpandableContent>
					</ExpandableCard>
				</ExpandableTrigger>
			)}
		</Expandable>
	);
}

// * appointment list component
export interface AppointmentListProps extends ComponentProps<"section"> {
	appointment: Appointment[number];
	index: number;
}

export default function AppointmentList({
	className,
	appointment,
	index: _index,
}: AppointmentListProps) {
	const label = useMemo(
		() =>
			isToday(appointment.date) ? "Today" : format(appointment.date, "PPPP"),
		[appointment.date],
	);

	return (
		<section
			className={cn(
				"grid w-full gap-6 text-sm motion-preset-slide-down motion-delay-200",
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
