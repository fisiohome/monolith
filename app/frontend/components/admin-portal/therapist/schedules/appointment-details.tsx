import { useDateContext } from "@/components/providers/date-provider";
import { LoadingBasic } from "@/components/shared/loading";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getGenderIcon } from "@/hooks/use-gender";
import { getbadgeVariantStatus } from "@/lib/appointments/utils";
import { getBrandBadgeVariant } from "@/lib/services";
import { cn } from "@/lib/utils";
import type { Admin } from "@/types/admin-portal/admin";
import type { Appointment } from "@/types/admin-portal/appointment";
import type {
	Patient,
	PatientMedicalRecord,
} from "@/types/admin-portal/patient";
import type { Therapist } from "@/types/admin-portal/therapist";
import { format } from "date-fns";
import {
	Building,
	CreditCard,
	Hash,
	MapPinIcon,
	TicketPercent,
	User,
} from "lucide-react";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";

// * for the appointment details section
export interface AppointmentDetailsSectionProps extends ComponentProps<"div"> {
	appointment: Appointment;
}

export function AppointmentDetailsSection({
	className,
	appointment,
}: AppointmentDetailsSectionProps) {
	const { locale, tzDate } = useDateContext();
	const { t, ready } = useTranslation("appointments");

	if (!ready) {
		return (
			<div className="p-3 border rounded-lg border-border bg-background text-muted-foreground">
				<LoadingBasic columnBased={true} />
			</div>
		);
	}

	return (
		<div
			className={cn(
				"grid w-full gap-3 p-2 border rounded-lg border-border bg-background text-muted-foreground",
				className,
			)}
		>
			<div>
				<p className="font-light">{t("list.booked_appointment_time")}:</p>
				<p className="font-semibold text-pretty">
					<span>
						{format(appointment.appointmentDateTime, "PPPP", {
							locale,
							in: tzDate,
						})}
					</span>
					<span className="mx-2">&bull;</span>
					<span className="uppercase">
						{format(appointment.appointmentDateTime, "hh:mm a", {
							locale,
							in: tzDate,
						})}
					</span>
				</p>
			</div>

			<Separator />

			<p className="font-light uppercase text-[10px] tracking-wider">
				{t("list.visit_service")}
			</p>

			<div>
				<p className="font-semibold text-pretty">
					{appointment?.service?.name?.replaceAll("_", " ") || "N/A"}{" "}
				</p>
				<p className="italic font-semibold text-pretty">
					<span>{appointment?.package?.name}</span>
					<span className="mx-1">-</span>
					<span className="font-light">
						{appointment?.package?.numberOfVisit || "N/A"} visit(s)
					</span>
				</p>
			</div>

			<Separator />

			<p className="font-light uppercase text-[10px] tracking-wider">
				{t("list.visit_region")}
			</p>

			<div>
				<p className="font-semibold uppercase text-pretty">
					{[
						appointment?.location?.city,
						appointment?.location?.state,
						appointment?.location?.country,
					]?.join(", ") || "N/A"}
				</p>

				<div className="mt-3">
					<p className="font-light">{t("list.visit_address")}:</p>
					<p className="font-semibold capitalize text-pretty">
						{appointment.visitAddress?.addressLine || "N/A"}
					</p>
					<p className="italic font-normal text-pretty">
						{t("list.notes")}: {appointment.visitAddress?.notes || "N/A"}
					</p>
					{!!appointment?.visitAddress?.coordinates && (
						<Button
							type="button"
							variant="primary-outline"
							size="sm"
							className="mt-2"
							onClick={(event) => {
								event.preventDefault();
								event.stopPropagation();
								window.open(
									`https://www.google.com/maps/search/?api=1&query=${appointment?.visitAddress?.coordinates.y},${appointment.visitAddress?.coordinates.x}`,
								);
							}}
						>
							<MapPinIcon />
							<span>{t("list.view_on_google_maps")}</span>
						</Button>
					)}
				</div>
			</div>

			<Separator />

			<div className="grid gap-4 md:grid-cols-2">
				<div>
					<p className="font-light">{t("list.preferred_therapist_gender")}:</p>
					<p className="flex gap-1 font-semibold uppercase">
						{getGenderIcon(appointment.preferredTherapistGender)}{" "}
						{appointment.preferredTherapistGender}
					</p>
				</div>

				<div>
					<p className="font-light">{t("list.referral_source")}:</p>
					<p className="font-semibold capitalize text-pretty">
						{appointment?.otherReferralSource ||
							appointment?.referralSource ||
							"N/A"}
					</p>
				</div>

				<div className="col-span-full">
					<p className="font-light">{t("list.notes")}:</p>
					<p className="italic font-semibold capitalize text-pretty">
						{appointment?.notes || "N/A"}
					</p>
				</div>
			</div>

			<Separator />

			<p className="font-light uppercase text-[10px] tracking-wider">
				{t("list.series")}
			</p>

			{appointment?.allVisits?.map((visit) => (
				<div
					key={visit.id}
					className={cn(
						"grid gap-1 p-3 border rounded-lg border-border bg-muted",
						visit.registrationNumber === appointment.registrationNumber &&
							"border-primary/50 text-primary",
					)}
				>
					<div className="flex items-center justify-between">
						<div className="flex-none mb-1">
							<Badge
								variant="outline"
								className={cn(
									"text-pretty font-bold !text-[10px] px-1",
									appointment?.service?.code &&
										getBrandBadgeVariant(appointment.service.code),
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
						<p className="font-bold">Visit {visit.visitProgress}</p>

						<p className="text-xs font-light">
							{format(visit.appointmentDateTime, "PPPP", {
								locale,
								in: tzDate,
							})}
						</p>
					</div>
				</div>
			))}

			<Separator />

			<p className="font-light uppercase text-[10px] tracking-wider">
				{t("list.payment_details")}
			</p>

			<div className="grid gap-4 p-3 border rounded-lg md:grid-cols-2 border-border bg-muted">
				<div className="flex gap-2">
					<Building className="mt-0.5 size-4 text-muted-foreground/75" />
					<div>
						<p className="font-light">{t("list.booking_partner")}:</p>
						<p className="font-semibold capitalize text-pretty">
							{appointment?.otherFisiohomePartnerName ||
								appointment?.fisiohomePartnerName ||
								"N/A"}
						</p>
					</div>
				</div>

				<div className="flex gap-2">
					<TicketPercent className="mt-0.5 size-4 text-muted-foreground/75" />
					<div>
						<p className="font-light">{t("list.voucher")}:</p>
						<p className="font-semibold capitalize text-pretty">
							{appointment?.voucherCode || "N/A"}
						</p>
					</div>
				</div>
			</div>

			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<CreditCard className="size-4 text-muted-foreground/75" />
					<span className="font-light">{t("list.price")}:</span>
				</div>
				<span>
					{appointment?.package?.formattedTotalPriceWithoutDiscount || "N/A"}
				</span>
			</div>

			{appointment?.service?.code && (
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<TicketPercent className="size-4 text-muted-foreground/75" />
						<span className="font-light">{t("list.discount")}:</span>
						<Badge variant="outline" className="ml-2 text-xs border-2">
							SERVICE{appointment?.service?.code}
						</Badge>
					</div>
					<span className="font-semibold text-primary">
						- {appointment?.package?.formattedDiscount || "N/A"}
					</span>
				</div>
			)}

			{appointment.voucherCode && (
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<TicketPercent className="size-4 text-muted-foreground/75" />
						<span className="font-light">{t("list.discount")}:</span>
						<Badge variant="outline" className="ml-2 text-xs border-2">
							{appointment.voucherCode}
						</Badge>
					</div>
					<span className="font-semibold text-primary">
						- {appointment.formattedDiscount || "N/A"}
					</span>
				</div>
			)}

			<Separator />

			<div className="flex items-center justify-between font-medium">
				<span className="font-bold uppercase">{t("list.total_price")}</span>
				<span className="text-lg font-bold">
					{appointment.formattedTotalPrice}
				</span>
			</div>
		</div>
	);
}

// * for the patient details section
export interface PatientDetailsSectionProps extends ComponentProps<"div"> {
	patientDetails: Patient;
	patientMedicalRecord?: PatientMedicalRecord;
}

export default function PatientDetailsSection({
	className,
	patientDetails,
	patientMedicalRecord,
}: PatientDetailsSectionProps) {
	const { locale, tzDate } = useDateContext();
	const { t, ready } = useTranslation("appointments");

	if (!ready) {
		return (
			<div className="p-3 border rounded-lg border-border bg-background text-muted-foreground">
				<LoadingBasic columnBased={true} />
			</div>
		);
	}

	return (
		<div className={cn("grid gap-3 text-muted-foreground", className)}>
			<h3 className="text-xs font-semibold tracking-wider uppercase">
				{t("list.patient_details")}
			</h3>

			<div className="grid w-full gap-3 p-2 border rounded-lg border-border bg-background text-muted-foreground">
				<Accordion type="single" collapsible className="w-full ">
					<AccordionItem value="item-1">
						<AccordionTrigger className="pt-0">
							<div className="flex items-center gap-2">
								<Avatar className="text-[10px] border rounded-lg border-border bg-muted size-6">
									<AvatarImage src="#" />
									<AvatarFallback>
										<User className="flex-shrink-0 size-4 text-muted-foreground/75" />
									</AvatarFallback>
								</Avatar>

								<p className="font-semibold uppercase line-clamp-1">
									{patientDetails?.name}
								</p>
							</div>
						</AccordionTrigger>

						<AccordionContent>
							<div className="grid gap-3 text-xs">
								<div className="grid grid-cols-3 gap-4">
									<p className="font-light">{t("list.gender")}</p>
									<p className="col-span-2 font-semibold flex gap-1.5">
										{getGenderIcon(
											patientDetails.gender,
											"flex-shrink-0 size-3.5 text-muted-foreground/75 mt-0.5",
										)}
										{patientDetails?.gender || "N/A"}
									</p>
								</div>
								<div className="grid grid-cols-3 gap-4">
									<p className="font-light">{t("list.age")}</p>
									<p className="col-span-2 font-semibold">
										<span>
											{patientDetails?.age || "N/A"} {t("list.years")}:
										</span>
										<span className="mx-1">&#x2022;</span>
										<span>
											{patientDetails?.dateOfBirth
												? format(
														new Date(String(patientDetails?.dateOfBirth)),
														"PP",
														{
															locale,
															in: tzDate,
														},
													)
												: "N/A"}
										</span>
									</p>
								</div>

								<div className="mt-2 uppercase text-[10px] tracking-wider col-span-full">
									{t("list.contact_details")}
								</div>
								<div className="grid grid-cols-3 gap-4">
									<p className="font-light">{t("list.contact_name")}</p>
									<p className="col-span-2 font-semibold">
										{patientDetails?.contact?.contactName || "N/A"}
									</p>
								</div>
								<div className="grid grid-cols-3 gap-4">
									<p className="font-light">{t("list.contact_phone")}</p>
									<p className="col-span-2 font-semibold">
										{patientDetails?.contact?.contactPhone || "N/A"}
									</p>
								</div>
								<div className="grid grid-cols-3 gap-4">
									<p className="font-light">MiiTel Link</p>
									<p className="col-span-2 font-semibold">
										{patientDetails?.contact?.miitelLink || "N/A"}
									</p>
								</div>
								<div className="grid grid-cols-3 gap-4">
									<p className="font-light">Email</p>
									<p className="col-span-2 font-semibold break-all">
										{patientDetails?.contact?.email || "N/A"}
									</p>
								</div>

								<div className="mt-2 uppercase text-[10px] tracking-wider col-span-full">
									{t("list.patient_medical_record")}
								</div>
								<div className="grid grid-cols-3 gap-4">
									<p className="font-light">{t("list.current_condition")}</p>
									<p className="col-span-2 font-semibold text-pretty">
										{patientMedicalRecord?.condition || "N/A"}
									</p>
								</div>
								<div className="grid grid-cols-3 gap-4">
									<p className="font-light">{t("list.complaint")}</p>
									<p className="col-span-2 font-semibold text-pretty">
										{patientMedicalRecord?.complaintDescription || "N/A"}
									</p>
								</div>
								<div className="grid grid-cols-3 gap-4">
									<p className="font-light">{t("list.illness_onset_date")}</p>
									<p className="col-span-2 font-semibold text-pretty">
										{patientMedicalRecord?.illnessOnsetDate || "N/A"}
									</p>
								</div>
								<div className="grid grid-cols-3 gap-4">
									<p className="font-light">{t("list.medical_history")}</p>
									<p className="col-span-2 font-semibold text-pretty">
										{patientMedicalRecord?.medicalHistory || "N/A"}
									</p>
								</div>
							</div>
						</AccordionContent>
					</AccordionItem>
				</Accordion>
			</div>
		</div>
	);
}

// * for the therapist details section
export interface TherapistDetailsSectionProps extends ComponentProps<"div"> {
	therapistDetails: Therapist;
}

export function TherapistDetailsSection({
	className,
	therapistDetails,
}: TherapistDetailsSectionProps) {
	const { t, ready } = useTranslation("appointments");

	if (!ready) {
		return (
			<div className="p-3 border rounded-lg border-border bg-background text-muted-foreground">
				<LoadingBasic columnBased={true} />
			</div>
		);
	}

	return (
		<div className={cn("grid gap-3 text-muted-foreground", className)}>
			<h3 className="text-xs font-semibold tracking-wider uppercase">
				{t("list.therapist_details")}
			</h3>

			<div className="grid w-full gap-2 p-2 border rounded-lg border-border bg-background">
				<Accordion type="single" collapsible className="w-full ">
					<AccordionItem value="item-1">
						<AccordionTrigger className="pt-0">
							<div className="flex items-center gap-2">
								<Avatar className="text-[10px] border rounded-lg border-border bg-muted size-6">
									<AvatarImage src="#" />
									<AvatarFallback>
										<User className="flex-shrink-0 size-4 text-muted-foreground/75" />
									</AvatarFallback>
								</Avatar>

								<p className="font-semibold uppercase line-clamp-1">
									{therapistDetails.name}
								</p>
							</div>
						</AccordionTrigger>

						<AccordionContent>
							<div className="grid gap-3 text-xs">
								<div className="grid grid-cols-3 gap-4">
									<p className="font-light">REG ID</p>
									<p className="col-span-2 font-semibold flex gap-1.5">
										<Hash className="flex-shrink-0 mt-0.5 size-3 text-muted-foreground/75" />
										{therapistDetails.registrationNumber}
									</p>
								</div>
								<div className="grid grid-cols-3 gap-4">
									<p className="font-light">{t("list.emp_type")}</p>
									<p className="col-span-2 font-semibold">
										{therapistDetails.employmentType}
									</p>
								</div>
								<div className="grid grid-cols-3 gap-4">
									<p className="font-light">{t("list.gender")}</p>
									<p className="col-span-2 font-semibold flex gap-1.5">
										{getGenderIcon(
											therapistDetails.gender,
											"flex-shrink-0 size-3.5 text-muted-foreground/75 mt-0.5",
										)}
										{therapistDetails?.gender || "N/A"}
									</p>
								</div>
								<div className="grid grid-cols-3 gap-4">
									<p className="font-light">Email</p>
									<p className="col-span-2 font-semibold break-all">
										{therapistDetails.user.email}
									</p>
								</div>
								<div className="grid grid-cols-3 gap-4">
									<p className="font-light">{t("list.contact_phone")}</p>
									<p className="col-span-2 font-semibold">
										{therapistDetails.phoneNumber}
									</p>
								</div>
							</div>
						</AccordionContent>
					</AccordionItem>
				</Accordion>
			</div>
		</div>
	);
}

// * for the admin pic's details section
export interface PICDetailsSectionProps extends ComponentProps<"div"> {
	picList: Admin[];
}

export function PICDetailsSection({
	className,
	picList,
}: PICDetailsSectionProps) {
	const { t, ready } = useTranslation("appointments");

	if (!ready) {
		return (
			<div className="p-3 border rounded-lg border-border bg-background text-muted-foreground">
				<LoadingBasic columnBased={true} />
			</div>
		);
	}

	return (
		<div className={cn("grid gap-3 text-muted-foreground", className)}>
			<h3 className="text-xs font-semibold tracking-wider uppercase">
				{t("list.pic_details")}
			</h3>

			<div className="grid w-full gap-2 p-2 border rounded-lg border-border bg-background">
				<p className="text-[10px] tracking-wider font-light uppercase">
					{picList?.length || 0} {t("list.person_in_charge")}
				</p>

				{picList.map((pic, index) => (
					<Accordion key={pic.id} type="single" collapsible className="w-full ">
						<AccordionItem value={pic.name}>
							<AccordionTrigger className={cn(index === 0 && "pt-0")}>
								<div className="flex items-center gap-2">
									<Avatar className="text-[10px] border rounded-lg border-border bg-muted size-6">
										<AvatarImage src="#" />
										<AvatarFallback>
											<User className="flex-shrink-0 size-4 text-muted-foreground/75" />
										</AvatarFallback>
									</Avatar>

									<p className="font-semibold uppercase line-clamp-1">
										{pic.name}
									</p>
								</div>
							</AccordionTrigger>

							<AccordionContent>
								<div className="grid gap-3 text-xs">
									<div className="grid grid-cols-3 gap-4">
										<p className="font-light">{t("list.type")}</p>
										<p className="col-span-2 font-semibold">
											{pic.adminType.replaceAll("_", " ")}
										</p>
									</div>
									<div className="grid grid-cols-3 gap-4">
										<p className="font-light">Email</p>
										<p className="col-span-2 font-semibold break-all">
											{pic.user.email}
										</p>
									</div>
								</div>
							</AccordionContent>
						</AccordionItem>
					</Accordion>
				))}
			</div>
		</div>
	);
}
