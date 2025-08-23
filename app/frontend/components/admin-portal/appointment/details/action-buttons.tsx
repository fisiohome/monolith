import { router, usePage } from "@inertiajs/react";
import { Activity, Ban, Cctv, Clock3 } from "lucide-react";
import { type ComponentProps, memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn, populateQueryParams } from "@/lib/utils";
import type { AppointmentIndexGlobalPageProps } from "@/pages/AdminPortal/Appointment/Index";
import type { ScheduleListProps } from "../appointment-list";
import type { Appointment } from "@/types/admin-portal/appointment";

// * helper function
export const getPermission = {
	updateStatus: (appt: Appointment) =>
		appt.status !== "paid" &&
		appt.status !== "unscheduled" &&
		appt.status !== "pending_therapist_assignment" &&
		appt.status !== "on_hold",
	cancel: (appt: Appointment) => appt.initialVisit,
	createSeries: (appt: Appointment) =>
		appt.totalPackageVisits > 1 &&
		appt.visitNumber !== appt.totalPackageVisits &&
		appt.nextVisitProgress,
};

// * core component
interface AppointmentActionButtonsProps extends ComponentProps<"div"> {
	schedule: ScheduleListProps["schedule"];
	isExpanded: boolean;
	isSuperAdmin: boolean;
	isAdminPIC: boolean;
	isAdminSupervisor: boolean;
	buttonSize?: "xs" | "sm" | "default" | "lg" | "xl";
}

const AppointmentActionButtons = memo(function Component({
	className,
	schedule,
	isExpanded: _isExpanded,
	isAdminPIC,
	isAdminSupervisor,
	isSuperAdmin,
	buttonSize = "default",
}: AppointmentActionButtonsProps) {
	const { props: globalProps, url: pageURL } =
		usePage<AppointmentIndexGlobalPageProps>();
	const { t } = useTranslation("appointments");

	// const isPastFromToday = useMemo(() => {
	// 	if (!schedule.appointmentDateTime) return false;
	// 	return isBefore(schedule.appointmentDateTime, startOfToday());
	// }, [schedule.appointmentDateTime]);
	const isShow = useMemo(() => {
		const updateStatus = getPermission.updateStatus(schedule);
		const cancel = getPermission.cancel(schedule);
		const createSeries = getPermission.createSeries(schedule);

		return { updateStatus, cancel, createSeries };
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
		<div
			className={cn(
				"flex flex-col items-center w-full gap-3 lg:flex-row lg:justify-end",
				className,
			)}
		>
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

						<Button
							variant="primary-outline"
							className="w-full lg:w-auto"
							size={buttonSize}
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
								size={buttonSize}
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

						<Button
							variant="primary-outline"
							className="w-full lg:w-auto"
							size={buttonSize}
							onClick={(event) => {
								event.preventDefault();
								event.stopPropagation();

								routeTo.updatePic(String(schedule.id));
							}}
						>
							<Cctv />
							{t("button.update_pic")}
						</Button>

						{isShow.cancel && (
							<Button
								variant="destructive"
								className="w-full lg:w-auto"
								size={buttonSize}
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
		</div>
	);
});

export default AppointmentActionButtons;
