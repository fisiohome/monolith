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
import { getBrandBadgeVariant } from "@/lib/services";
import { cn, generateInitials } from "@/lib/utils";
import type { AppointmentIndexProps } from "@/pages/AdminPortal/Appointment/Index";
import { format, formatDistance, isToday } from "date-fns";
import {
	Ban,
	Building,
	Cctv,
	ChevronsDown,
	ChevronsUp,
	Clock3,
	Contact,
	CreditCard,
	Hash,
	Hospital,
	Link,
	Mail,
	MapPinHouse,
	MapPinIcon,
	Phone,
	ShieldCheck,
	Stethoscope,
	TicketPercent,
	User,
} from "lucide-react";
import { type ComponentProps, useMemo } from "react";

// * appointment schedule component
interface ScheduleListProps {
	appointment: NonNullable<AppointmentIndexProps["appointments"]>[number];
	schedule: NonNullable<
		AppointmentIndexProps["appointments"]
	>[number]["schedules"][number];
}

function ScheduleList({ schedule }: ScheduleListProps) {
	console.log(schedule);
	const distanceBadgeVariant = useMemo(() => {
		const pending =
			"text-yellow-800 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-100";
		const booked =
			"text-blue-800 bg-blue-100 dark:bg-blue-900 dark:text-blue-100";
		const cancel = "text-red-800 bg-red-100 dark:bg-red-900 dark:text-red-100";
		const paid =
			"text-emerald-800 bg-emerald-100 dark:bg-emerald-900 dark:text-emerald-100";

		return schedule.status === "PENDING THERAPIST ASSIGNMENT" ||
			schedule.status === "PENDING PATIENT APPROVAL" ||
			schedule.status === "PENDING PAYMENT"
			? pending
			: schedule.status === "BOOKED"
				? booked
				: schedule.status === "PAID"
					? paid
					: schedule.status === "CANCELLED"
						? cancel
						: "";
	}, [schedule.status]);
	const statusDotVariant = useMemo<VariantDotBadge["variant"]>(() => {
		return schedule.status === "PENDING THERAPIST ASSIGNMENT"
			? "warning"
			: schedule.status === "BOOKED"
				? "secondary"
				: "default";
	}, [schedule.status]);
	const startTimeLabel = useMemo(() => {
		// Format it to 12-hour time with an AM/PM indicator.
		const timePeriod = format(schedule.appointmentDateTime, "hh:mm a");
		// Split the time with period based on the space
		const startTime = timePeriod.split(" ");
		const time = startTime[0];
		const period = startTime[1];
		// Get the time distance
		const distance = formatDistance(schedule.appointmentDateTime, new Date(), {
			addSuffix: true,
		});

		return { time, period, distance };
	}, [schedule.appointmentDateTime]);

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
																{schedule.status}
															</span>
														</DotBadgeWithLabel>
													</div>
												</TooltipTrigger>
												<TooltipContent>
													<p className="uppercase">Status: {schedule.status}</p>
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

											<div className="flex items-center gap-2">
												<div className="flex -space-x-3">
													{schedule?.admins?.map((admin, index) => (
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
													<p className="line-clamp-1">
														{schedule?.admins?.length || 0} Person in charge(s)
													</p>
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
														{schedule?.package?.numberOfVisit || "N/A"} visit(s)
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

							<ExpandableContent preset="blur-md" stagger staggerChildren={0.2}>
								<div className="grid gap-6 xl:grid-cols-12">
									<div className="flex flex-col h-full gap-3 xl:col-span-4">
										<h3 className="text-xs font-light uppercase">
											Patient Details
										</h3>

										<div className="flex flex-col h-full gap-4 p-4 border rounded-lg shadow-inner border-border bg-sidebar">
											<div className="grid gap-6">
												<div className="flex items-center gap-2">
													<Avatar className="text-[10px] border rounded-lg border-border bg-background size-6">
														<AvatarImage
															src="#"
															alt={schedule?.patient?.name || "N/A"}
														/>
														<AvatarFallback className="bg-background">
															{schedule?.patient?.name
																? generateInitials(schedule.patient.name)
																: "N/A"}
														</AvatarFallback>
													</Avatar>
													<div>
														<p className="font-semibold capitalize line-clamp-1">
															{schedule?.patient?.name || "N/A"}
														</p>
													</div>
												</div>

												<div className="grid gap-3">
													<div className="flex justify-between gap-2">
														<div className="flex items-center gap-2">
															<Contact className="size-4 text-muted-foreground/75" />
															<p className="font-light">Contact Name:</p>
														</div>
														<p className="font-semibold capitalize">
															{schedule?.patient?.contact?.contactName || "N/A"}
														</p>
													</div>

													<div className="flex justify-between gap-2">
														<div className="flex items-center gap-2">
															<Phone className="size-4 text-muted-foreground/75" />
															<p className="font-light">Contact Phone:</p>
														</div>
														<p className="font-semibold">
															{schedule?.patient?.contact?.contactPhone ||
																"N/A"}
														</p>
													</div>

													<div className="flex justify-between gap-2">
														<div className="flex items-center gap-2">
															<Link className="size-4 text-muted-foreground/75" />
															<p className="font-light">MiiTel Link:</p>
														</div>
														<p
															className="font-semibold truncate"
															title={
																schedule?.patient?.contact?.miitelLink || "N/A"
															}
														>
															{schedule?.patient?.contact?.miitelLink || "N/A"}
														</p>
													</div>

													<div className="flex justify-between gap-2">
														<div className="flex items-center gap-2">
															<Mail className="size-4 text-muted-foreground/75" />
															<p className="font-light">Email:</p>
														</div>
														<p className="font-semibold">
															{schedule?.patient?.contact?.email || "N/A"}
														</p>
													</div>

													<Separator className="my-2" />

													<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
														<div>
															<p className="font-light">Gender:</p>
															<p className="flex items-center gap-1 font-semibold uppercase">
																{schedule?.patient?.gender &&
																	getGenderIcon(schedule.patient.gender)}
																{schedule?.patient?.gender || "N/A"}
															</p>
														</div>

														<div>
															<p className="font-light">Age:</p>
															<p className="font-semibold capitalize">
																<span>
																	{schedule?.patient?.age || "N/A"} years
																</span>
																<span className="mx-1">&#x2022;</span>
																<span>
																	{schedule?.patient?.dateOfBirth
																		? format(
																				schedule?.patient?.dateOfBirth,
																				"PP",
																			)
																		: "N/A"}
																</span>
															</p>
														</div>

														<div>
															<p className="font-light">Current condition:</p>
															<p className="font-semibold uppercase">
																{schedule?.patientCondition || "N/A"}
															</p>
														</div>

														<div>
															<p className="font-light">Complaint:</p>
															<p className="font-semibold capitalize">
																{schedule?.patientComplaintDescription || "N/A"}
															</p>
														</div>

														<div>
															<p className="font-light">Illness onset date:</p>
															<p className="font-semibold capitalize">
																{schedule?.patientIllnessOnsetDate || "N/A"}
															</p>
														</div>

														<div>
															<p className="font-light">Medical history:</p>
															<p className="font-semibold capitalize">
																{schedule?.patientMedicalHistory || "N/A"}
															</p>
														</div>
													</div>
												</div>
											</div>
										</div>
									</div>

									<div className="flex flex-col h-full gap-3 xl:col-span-8">
										<h3 className="text-xs font-light uppercase xl:invisible">
											Appointment Details
										</h3>

										<div className="flex flex-col h-full gap-6 p-4 border rounded-lg shadow-inner border-border bg-sidebar">
											<div className="grid gap-4 md:grid-cols-2">
												<div>
													<p className="font-light">Booked appointment date:</p>
													<p className="font-semibold capitalize">
														{format(schedule.appointmentDateTime, "PPPP")}
													</p>
												</div>

												<div>
													<p className="font-light">Booked appointment time:</p>
													<p className="font-semibold uppercase">
														{format(schedule.appointmentDateTime, "hh:mm a")}
													</p>
												</div>

												<div className="col-span-full md:col-span-1">
													<p className="font-light">Visit region:</p>
													<p className="font-semibold uppercase">
														{[
															schedule?.location?.city,
															schedule?.location?.state,
															schedule?.location?.country,
														]?.join(", ") || "N/A"}
													</p>
												</div>

												<div className="col-span-full md:col-span-1">
													<p className="font-light">Visit address:</p>
													<p className="font-semibold capitalize">
														{schedule.patient?.activeAddress?.address || "N/A"}
													</p>
													<p className="italic font-normal">
														Note:{" "}
														{schedule.patient?.activeAddress?.notes || "N/A"}
													</p>
													{schedule?.patient?.activeAddress?.coordinates
														?.length && (
														<Button
															type="button"
															variant="accent-outline"
															size="sm"
															className="mt-2"
															onClick={(event) => {
																event.preventDefault();
																event.stopPropagation();
																window.open(
																	`https://www.google.com/maps/search/?api=1&query=${schedule?.patient?.activeAddress?.coordinates.join(",")}`,
																);
															}}
														>
															<MapPinIcon />
															View on Google Maps
														</Button>
													)}
												</div>

												<div>
													<p className="font-light">
														Preferred therapist gender:
													</p>
													<p className="flex gap-1 font-semibold uppercase">
														{getGenderIcon(schedule.preferredTherapistGender)}{" "}
														{schedule.preferredTherapistGender}
													</p>
												</div>

												<div>
													<p className="font-light">Referral source:</p>
													<p className="font-semibold capitalize">
														{schedule?.otherReferralSource ||
															schedule?.referralSource ||
															"N/A"}
													</p>
												</div>

												<div className="col-span-full">
													<p className="font-light">Notes:</p>
													<p className="italic font-semibold capitalize">
														{schedule?.notes || "N/A"}
													</p>
												</div>
											</div>

											<Separator />

											<div className="grid gap-4">
												<h4 className="text-xs font-light uppercase">
													Payment Details
												</h4>

												<div className="grid gap-4 p-3 border rounded-lg md:grid-cols-2 border-border bg-muted">
													<div className="flex gap-2">
														<Building className="mt-0.5 size-4 text-muted-foreground/75" />
														<div>
															<p className="font-light">Booking partner:</p>
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
															<p className="font-light">Voucher:</p>
															<p className="font-semibold capitalize">
																{schedule?.voucherCode || "N/A"}
															</p>
														</div>
													</div>
												</div>

												<div className="flex items-center justify-between">
													<div className="flex items-center gap-2">
														<CreditCard className="size-4 text-muted-foreground/75" />
														<span className="font-light">Price</span>
													</div>
													<span>
														{schedule?.package
															?.formattedTotalPriceWithoutDiscount || "N/A"}
													</span>
												</div>

												<div className="flex items-center justify-between">
													<div className="flex items-center gap-2">
														<TicketPercent className="size-4 text-muted-foreground/75" />
														<span className="font-light">Discount</span>
														{schedule.voucherCode && (
															<Badge
																variant="outline"
																className="ml-2 text-xs border-2"
															>
																SERVICE{schedule.service?.code}
															</Badge>
														)}
													</div>
													<span className="font-semibold text-primary">
														- {schedule.package?.formattedDiscount}
													</span>
												</div>

												<div className="flex items-center justify-between">
													<div className="flex items-center gap-2">
														<TicketPercent className="size-4 text-muted-foreground/75" />
														<span className="font-light">Discount</span>
														{schedule.voucherCode && (
															<Badge
																variant="outline"
																className="ml-2 text-xs border-2"
															>
																{schedule.voucherCode}
															</Badge>
														)}
													</div>
													<span className="font-semibold text-primary">
														- {schedule.formattedDiscount}
													</span>
												</div>

												<Separator />

												<div className="flex items-center justify-between font-medium">
													<span className="font-bold uppercase">
														Total Price
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

									<div className="grid grid-cols-1 gap-6 xl:grid-cols-2 col-span-full">
										<div className="flex flex-col gap-3">
											<h3 className="text-xs font-light uppercase">
												Therapist Details
											</h3>

											<div className="flex flex-col h-full gap-4 p-4 border rounded-lg shadow-inner border-border bg-sidebar">
												{schedule?.therapist && (
													<div className="grid gap-6">
														<div className="flex items-center gap-2">
															<Avatar className="text-[10px] border rounded-lg border-border bg-background size-6">
																<AvatarImage
																	src="#"
																	alt={schedule.therapist.name}
																/>
																<AvatarFallback className="bg-background">
																	{generateInitials(schedule.therapist.name)}
																</AvatarFallback>
															</Avatar>
															<div>
																<p className="font-semibold line-clamp-1">
																	{schedule.therapist.name}
																</p>
															</div>
														</div>

														<div className="grid gap-3">
															<div className="flex justify-between gap-2">
																<div className="flex items-center gap-2">
																	<Hash className="size-4 text-muted-foreground/75" />
																	<p className="font-light">Reg. Number:</p>
																</div>
																<p className="font-semibold uppercase">
																	{schedule.therapist.registrationNumber}
																</p>
															</div>

															<div className="flex justify-between gap-2">
																<div className="flex items-center gap-2">
																	<Phone className="size-4 text-muted-foreground/75" />
																	<p className="font-light">Phone:</p>
																</div>
																<p className="font-semibold">
																	{schedule.therapist.phoneNumber}
																</p>
															</div>

															<div className="flex justify-between gap-2">
																<div className="flex items-center gap-2">
																	<Mail className="size-4 text-muted-foreground/75" />
																	<p className="font-light">Email:</p>
																</div>
																<p className="font-semibold">
																	{schedule.therapist.user.email}
																</p>
															</div>

															<Separator className="my-2" />

															<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
																<div>
																	<p className="font-light">Emp. type:</p>
																	<p className="font-semibold uppercase">
																		{schedule.therapist.employmentType}
																	</p>
																</div>

																<div>
																	<p className="font-light">Gender:</p>
																	<p className="flex items-center gap-1 font-semibold uppercase">
																		{getGenderIcon(schedule.therapist.gender)}
																		{schedule.therapist.gender}
																	</p>
																</div>
															</div>
														</div>
													</div>
												)}
											</div>
										</div>

										<div className="flex flex-col gap-3">
											<h3 className="text-xs font-light uppercase">
												PIC Details
											</h3>

											<div className="flex flex-col h-full gap-4 p-4 border rounded-lg shadow-inner border-border bg-sidebar">
												{schedule?.admins?.map((admin, index) => (
													<div key={admin.name} className="grid gap-6">
														<div className="flex items-center gap-2">
															<Avatar className="text-[10px] border rounded-lg border-border bg-background size-6">
																<AvatarImage src="#" alt={admin.name} />
																<AvatarFallback className="bg-background">
																	{generateInitials(admin.name)}
																</AvatarFallback>
															</Avatar>
															<div>
																<p className="font-semibold line-clamp-1">
																	{admin.name}
																</p>
															</div>
														</div>

														<div className="grid gap-3">
															<div className="flex justify-between gap-2">
																<div className="flex items-center gap-2">
																	<Mail className="size-4 text-muted-foreground/75" />
																	<p className="font-light">Email:</p>
																</div>
																<p className="font-semibold">
																	{admin?.user?.email}
																</p>
															</div>

															<div className="flex justify-between gap-2">
																<div className="flex items-center gap-2">
																	<ShieldCheck className="size-4 text-muted-foreground/75" />
																	<p className="font-light">Type:</p>
																</div>
																<p className="font-semibold uppercase">
																	{admin.adminType.replaceAll("_", " ")}
																</p>
															</div>
														</div>

														{index + 1 !== schedule?.admins?.length && (
															<Separator className="my-1" />
														)}
													</div>
												))}
											</div>
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
										Reschedule
									</Button>
									<Button
										variant="outline"
										className="w-full border lg:w-auto border-primary text-primary hover:bg-primary"
									>
										<Cctv />
										Update PIC(s)
									</Button>
									<Button variant="destructive" className="w-full lg:w-auto">
										<Ban />
										Cancel Booking
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
	appointment: NonNullable<AppointmentIndexProps["appointments"]>[number];
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
