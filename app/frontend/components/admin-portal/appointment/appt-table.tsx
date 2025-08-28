import { router, usePage } from "@inertiajs/react";
import {
	flexRender,
	getCoreRowModel,
	getExpandedRowModel,
	type Row,
	useReactTable,
} from "@tanstack/react-table";
import { differenceInHours, parseISO } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { memo, useCallback, useMemo } from "react";
import { Fragment } from "react/jsx-runtime";
import { useTranslation } from "react-i18next";
import { useDateContext } from "@/components/providers/date-provider";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn, populateQueryParams } from "@/lib/utils";
import type { AppointmentIndexGlobalPageProps } from "@/pages/AdminPortal/Appointment/Index";
import type { Appointment } from "@/types/admin-portal/appointment";
import getColumns from "./columns";
import AppointmentListItemDetails from "./details";
import AppointmentActionButtons from "./details/action-buttons";
import AdminCard from "./details/admins";
import HistoryList from "./details/histories";
import PatientCard from "./details/patient";
import TherapistCard from "./details/therapist";

// * for the core table component
export interface ApptTableProps {
	data: Appointment[];
}

const ApptTable = memo(({ data }: ApptTableProps) => {
	const { props: globalProps } = usePage<AppointmentIndexGlobalPageProps>();
	const { tzDate } = useDateContext();
	const isSuperAdmin = useMemo(
		() => globalProps.auth.currentUser?.["isSuperAdmin?"] || false,
		[globalProps.auth.currentUser],
	);
	const isAdminSupervisor = useMemo(
		() => globalProps.auth.currentUser?.["isAdminSupervisor?"] || false,
		[globalProps.auth.currentUser],
	);
	const columns = useMemo(() => getColumns(), []);
	const table = useReactTable({
		data,
		columns,
		getRowCanExpand: () => true,
		getCoreRowModel: getCoreRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
	});

	return (
		<div className="rounded-md border">
			<Table>
				<TableHeader>
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow key={headerGroup.id}>
							{headerGroup.headers.map((header) => {
								return (
									<TableHead key={header.id}>
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
									</TableHead>
								);
							})}
						</TableRow>
					))}
				</TableHeader>
				<TableBody>
					{table.getRowModel().rows?.length ? (
						table.getRowModel().rows.map((row) => {
							const isAdminPIC =
								row.original.admins?.some(
									(admin) => admin.id === globalProps.auth.currentUser?.id,
								) || false;

							const schedule = row.original;
							// Check if the appointment was created within the last 24 hours
							const isFreshAppt =
								differenceInHours(
									new Date(),
									parseISO(schedule.createdAt, { in: tzDate }),
									{ in: tzDate },
								) <= 24;

							return (
								<Fragment key={row.id}>
									<TableRow
										data-state={row.getIsSelected() && "selected"}
										className={cn({
											"bg-primary/10 hover:bg-primary/20": isFreshAppt,
										})}
									>
										{row.getVisibleCells().map((cell) => (
											<TableCell key={cell.id}>
												{flexRender(
													cell.column.columnDef.cell,
													cell.getContext(),
												)}
											</TableCell>
										))}
									</TableRow>
									{row.getIsExpanded() && (
										<TableRow>
											<TableCell
												colSpan={columns.length}
												className="p-0 border-b-0"
											>
												<AnimatePresence>
													<motion.div
														key={`expanded-${row.id}`}
														initial={{ opacity: 0, height: 0 }}
														animate={{ opacity: 1, height: "auto" }}
														exit={{ opacity: 0, height: 0 }}
														transition={{ duration: 0.3 }}
													>
														<AppointmentDetails
															row={row}
															isSuperAdmin={isSuperAdmin}
															isAdminSupervisor={isAdminSupervisor}
															isAdminPIC={isAdminPIC}
															isFreshAppt={isFreshAppt}
														/>
													</motion.div>
												</AnimatePresence>
											</TableCell>
										</TableRow>
									)}
								</Fragment>
							);
						})
					) : (
						<TableRow>
							<TableCell colSpan={columns.length} className="h-24 text-center">
								No results.
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		</div>
	);
});

export default ApptTable;

// * expandable component
export interface AppointmentDetailsProps {
	row: Row<Appointment>;
	isSuperAdmin: boolean;
	isAdminSupervisor: boolean;
	isAdminPIC: boolean;
	isFreshAppt?: boolean;
}

export const AppointmentDetails = memo((props: AppointmentDetailsProps) => {
	const { t } = useTranslation("appointments");
	const isMobile = useIsMobile();
	const { url: pageURL } = usePage<AppointmentIndexGlobalPageProps>();

	const { row, isSuperAdmin, isAdminSupervisor, isAdminPIC, isFreshAppt } =
		props;
	const appointment = row.original;
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
		<div className="relative p-4 bg-muted/50">
			{isFreshAppt && (
				<div className="absolute top-0 -translate-x-1/2 left-1/2">
					<div className="flex items-center gap-1 p-1 px-2 text-white border-b border-l border-r border-white rounded-br-md rounded-bl-md bg-gradient-to-l from-secondary/60 to-secondary animate-pulse duration[2s]">
						<Sparkles className="size-3.5 shrink-0 text-inherit" />
						<p className="text-xs text-nowrap">{t("list.recently_added")}</p>
					</div>
				</div>
			)}
			<div className="grid gap-6 xl:grid-cols-12">
				<div className="flex flex-col h-full gap-3 xl:col-span-8">
					<h3 className="text-xs font-light uppercase">
						{t("list.appointment_details")}
					</h3>
					<AppointmentListItemDetails
						schedule={appointment}
						isFreshAppt={!!isFreshAppt}
						isMobile={isMobile}
						seeDetailVisitSeries={seeDetailVisitSeries}
					/>
				</div>
				<div className="flex flex-col h-full gap-3 xl:col-span-4">
					<h3 className="text-xs font-light uppercase">
						{t("list.status_histories.title")}
					</h3>
					<div className="flex flex-col h-full gap-4 p-4 border rounded-lg shadow-inner border-border bg-sidebar">
						<HistoryList histories={appointment.statusHistories} />
					</div>
				</div>
				<div className="grid grid-cols-1 gap-6 xl:grid-cols-3 col-span-full">
					<div className="flex flex-col gap-3">
						<h3 className="text-xs font-light uppercase">
							{t("list.patient_details")}
						</h3>
						<PatientCard
							patient={appointment.patient}
							patientMedicalRecord={appointment.patientMedicalRecord}
							className="flex flex-col h-full"
						/>
					</div>
					<div className="flex flex-col gap-3">
						<h3 className="text-xs font-light uppercase">
							{t("list.therapist_details")}
						</h3>
						<TherapistCard
							therapist={appointment.therapist}
							className="flex flex-col h-full "
						/>
					</div>
					<div className="flex flex-col gap-3">
						<h3 className="text-xs font-light uppercase">
							{t("list.pic_details")}
						</h3>
						<AdminCard
							admins={appointment.admins}
							className="flex flex-col h-full"
						/>
					</div>
				</div>
				<div className="col-span-full">
					<AppointmentActionButtons
						schedule={appointment}
						isExpanded={true}
						isSuperAdmin={isSuperAdmin}
						isAdminPIC={isAdminPIC}
						isAdminSupervisor={isAdminSupervisor}
					/>
				</div>
			</div>
		</div>
	);
});
