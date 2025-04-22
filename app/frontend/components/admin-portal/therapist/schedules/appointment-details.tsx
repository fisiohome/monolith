import { useDateContext } from "@/components/providers/date-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getGenderIcon } from "@/hooks/use-gender";
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
	Cake,
	CreditCard,
	Hash,
	IdCard,
	Mail,
	MapPinIcon,
	ShieldCheck,
	TicketPercent,
	User,
} from "lucide-react";
import { Fragment, type ComponentProps } from "react";
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
	const { t } = useTranslation("translation", { keyPrefix: "appointments" });

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
	const { t } = useTranslation("translation", { keyPrefix: "appointments" });

	return (
		<div className={cn("grid gap-3 text-muted-foreground", className)}>
			<h3 className="text-xs font-semibold tracking-wider uppercase">
				Patient Details
			</h3>

			<div className="grid w-full gap-3 p-2 border rounded-lg border-border bg-background text-muted-foreground">
				<div className="grid grid-cols-2 gap-2">
					<div className="grid gap-2">
						<Avatar className="text-[10px] border rounded-lg border-border bg-muted size-6">
							<AvatarImage src="#" />
							<AvatarFallback>
								<User className="flex-shrink-0 size-4 text-muted-foreground/75" />
							</AvatarFallback>
						</Avatar>

						<p className="font-semibold uppercase text-pretty">
							{patientDetails?.name}
						</p>
					</div>

					<div className="grid gap-2">
						<p className="flex items-center gap-2 text-xs">
							<Cake className="size-3" />
							<span>
								{patientDetails?.age || "N/A"} {t("list.years")} &#x2022;{" "}
								{patientDetails?.dateOfBirth
									? format(patientDetails?.dateOfBirth, "PP", {
											locale,
											in: tzDate,
										})
									: "N/A"}
							</span>
						</p>

						<p className="flex items-center gap-2 text-xs">
							{patientDetails?.gender &&
								getGenderIcon(patientDetails.gender, "size-3")}
							{patientDetails?.gender || "N/A"}
						</p>
					</div>
				</div>

				<Separator />

				<div className="grid gap-2">
					<div className="flex gap-3 text-xs">
						<p className="font-light">{t("list.contact_name")}:</p>

						<p className="flex-1 text-right break-all text-pretty">
							{patientDetails?.contact?.contactName}
						</p>
					</div>

					<div className="flex gap-3 text-xs">
						<p className="font-light">Email:</p>

						<p className="flex-1 text-right break-all text-pretty">
							{patientDetails?.contact?.email}
						</p>
					</div>

					<div className="flex gap-3 text-xs">
						<p className="font-light">{t("list.contact_phone")}:</p>

						<p className="flex-1 text-right break-all text-pretty">
							{patientDetails?.contact?.contactPhone}
						</p>
					</div>

					<div className="flex gap-3 text-xs">
						<p className="font-light">MiiTel Link:</p>

						<p className="flex-1 text-right break-all text-pretty">
							{patientDetails?.contact?.miitelLink || "N/A"}
						</p>
					</div>
				</div>

				<Separator />

				<div className="grid gap-2 text-xs">
					<div>
						<p className="font-light">{t("list.current_condition")}:</p>

						<p className="break-all text-pretty">
							{patientMedicalRecord?.condition || "N/A"}
						</p>
					</div>

					<div>
						<p className="font-light">{t("list.complaint")}:</p>

						<p className="break-all text-pretty">
							{patientMedicalRecord?.complaintDescription || "N/A"}
						</p>
					</div>

					<div>
						<p className="font-light">{t("list.illness_onset_date")}:</p>

						<p className="break-all text-pretty">
							{patientMedicalRecord?.illnessOnsetDate || "N/A"}
						</p>
					</div>

					<div>
						<p className="font-light">{t("list.medical_history")}:</p>

						<p className="break-all text-pretty">
							{patientMedicalRecord?.medicalHistory || "N/A"}
						</p>
					</div>
				</div>
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
	const { t } = useTranslation("translation", { keyPrefix: "appointments" });

	return (
		<div className={cn("grid gap-3 text-muted-foreground", className)}>
			<h3 className="text-xs font-semibold tracking-wider uppercase">
				Therapist Details
			</h3>

			<div className="grid w-full gap-2 p-2 border rounded-lg border-border bg-background">
				<div className="grid grid-cols-2 gap-2">
					<div className="grid gap-2">
						<Avatar className="text-[10px] border rounded-lg border-border bg-muted size-6">
							<AvatarImage src="#" />
							<AvatarFallback>
								<User className="flex-shrink-0 size-4 text-muted-foreground/75" />
							</AvatarFallback>
						</Avatar>

						<p className="font-semibold uppercase text-pretty">
							{therapistDetails.name}
						</p>
					</div>

					<div className="grid gap-2">
						<p className="flex items-center gap-2 text-xs">
							<Hash className="size-3" />
							{therapistDetails.registrationNumber}
						</p>

						<p className="flex items-center gap-2 text-xs">
							<IdCard className="size-3" />
							{therapistDetails.employmentType}
						</p>

						<p className="flex items-center gap-2 text-xs">
							{therapistDetails?.gender &&
								getGenderIcon(therapistDetails.gender, "size-3")}
							{therapistDetails?.gender || "N/A"}
						</p>
					</div>
				</div>

				<Separator />

				<div className="grid gap-2">
					<div className="flex gap-3 text-xs">
						<p className="font-light">Email:</p>

						<p className="flex-1 text-right break-all">
							{therapistDetails.user.email}
						</p>
					</div>

					<div className="flex gap-3 text-xs">
						<p className="font-light">{t("list.contact_phone")}:</p>

						<p className="flex-1 text-right break-all">
							{therapistDetails.phoneNumber}
						</p>
					</div>
				</div>
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
	const { t } = useTranslation("translation", { keyPrefix: "appointments" });

	return (
		<div className={cn("grid gap-3 text-muted-foreground", className)}>
			<h3 className="text-xs font-semibold tracking-wider uppercase">
				PIC(s) Details
			</h3>

			<div className="grid w-full gap-2 p-2 border rounded-lg border-border bg-background">
				<p className="text-[10px] tracking-wider font-light uppercase">
					{picList?.length || 0} {t("list.person_in_charge")}
				</p>

				{picList.map((pic, index) => (
					<Fragment key={pic.id}>
						<div className="grid grid-cols-2 gap-2">
							<div className="grid gap-2">
								<Avatar className="text-[10px] border rounded-lg border-border bg-muted size-6">
									<AvatarImage src="#" />
									<AvatarFallback>
										<User className="flex-shrink-0 size-4 text-muted-foreground/75" />
									</AvatarFallback>
								</Avatar>

								<p className="font-semibold uppercase text-pretty">
									{pic.name}
								</p>
							</div>

							<div className="grid gap-2">
								<p className="flex items-center gap-2 text-xs break-all">
									<ShieldCheck className="size-3" />
									{pic.adminType.replaceAll("_", " ")}
								</p>

								<p className="flex items-center gap-2 text-xs break-all">
									<Mail className="size-3" />
									{pic.user.email}
								</p>
							</div>
						</div>

						{index + 1 !== picList?.length && <Separator className="my-2" />}
					</Fragment>
				))}
			</div>
		</div>
	);
}
