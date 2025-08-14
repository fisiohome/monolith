import { format } from "date-fns";
import { Link } from "lucide-react";
import { type ComponentProps, memo } from "react";
import { useTranslation } from "react-i18next";
import { useDateContext } from "@/components/providers/date-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { getGenderIcon } from "@/hooks/use-gender";
import { cn, generateInitials } from "@/lib/utils";
import type { ScheduleListProps } from "../appointment-list";

interface PatientCardProps extends ComponentProps<"div"> {
	patient: ScheduleListProps["schedule"]["patient"];
	patientMedicalRecord: ScheduleListProps["schedule"]["patientMedicalRecord"];
}

const PatientCard = memo(function Component({
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
						<p className="font-semibold uppercase line-clamp-1">
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
						<p className="col-span-2 font-semibold text-right text-pretty break-all">
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
});

export default PatientCard;
