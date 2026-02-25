import { Deferred, Head, Link, router, usePage } from "@inertiajs/react";
import { useLocalStorage } from "@uidotdev/usehooks";
import { AnimatePresence, motion } from "framer-motion";
import {
	AlarmClockIcon,
	ArrowDownUpIcon,
	FileSpreadsheetIcon,
	ListFilterIcon,
	LoaderCircleIcon,
	PlusIcon,
} from "lucide-react";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import type { DateRange } from "react-day-picker";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import ApptTable from "@/components/admin-portal/appointment/appt-table";
import ApptViewChanger from "@/components/admin-portal/appointment/appt-view-changer";
import {
	CancelAppointmentForm,
	UpdatePICForm,
	UpdateStatusForm,
} from "@/components/admin-portal/appointment/feature-form";
import FilterList from "@/components/admin-portal/appointment/filter-list";
import ApptPagination from "@/components/admin-portal/appointment/pagination-list";
import { SyncDataMaster } from "@/components/admin-portal/appointment/sync-data-master";
import { PageContainer } from "@/components/admin-portal/shared/page-layout";
import {
	ResponsiveDialog,
	type ResponsiveDialogProps,
} from "@/components/shared/responsive-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Announcement,
	AnnouncementTag,
	AnnouncementTitle,
} from "@/components/ui/kibo-ui/announcement";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppointmentDataMasterSync } from "@/hooks/admin-portal/appointment/use-appointment-data-master-sync";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import { useIsMobile } from "@/hooks/use-mobile";
import type { GENDERS } from "@/lib/constants";
import { cn, populateQueryParams } from "@/lib/utils";
import type { Admin } from "@/types/admin-portal/admin";
import type {
	Appointment,
	AppointmentStatuses,
} from "@/types/admin-portal/appointment";
import type { Location } from "@/types/admin-portal/location";
import type { Package } from "@/types/admin-portal/package";
import type { Service } from "@/types/admin-portal/service";
import type { GlobalPageProps as BaseGlobalPageProps } from "@/types/globals";
import type { Metadata } from "@/types/pagy";

export const PREFERENCES_STORAGE_KEY = "appointment-index-preferences";

// * page context provider
interface PageProviderState {
	dialog: ResponsiveDialogProps;
}

interface PageProviderProps {
	children: ReactNode;
}

const PageProviderContext = createContext<PageProviderState>({
	dialog: {
		isOpen: false,
		title: "",
		description: "",
		onOpenChange: () => {},
	},
});

function PageProvider({ children }: PageProviderProps) {
	const { props: globalProps, url: pageURL } =
		usePage<AppointmentIndexGlobalPageProps>();
	const { t } = useTranslation("appointments");

	// dialog management state
	const dialogMode = useMemo(() => {
		const currentQuery = globalProps.adminPortal?.currentQuery;
		const isCancelMode = !!currentQuery?.cancel;
		const isUpdatePICMode = !!currentQuery?.updatePic;
		const isUpdateStatusMode = !!currentQuery?.updateStatus;

		return {
			cancel: isCancelMode,
			updatePIC: isUpdatePICMode,
			updateStatus: isUpdateStatusMode,
		};
	}, [globalProps.adminPortal?.currentQuery]);
	const dialog = useMemo<ResponsiveDialogProps>(() => {
		const isOpen =
			dialogMode.cancel || dialogMode.updatePIC || dialogMode.updateStatus;
		let title = "";
		let description = "";
		let dialogWidth = "";

		if (dialogMode.cancel) {
			title = t("modal.cancel.title");
			description = t("modal.cancel.description");
			dialogWidth = "650px";
		}

		if (dialogMode.updatePIC) {
			title = t("modal.update_pic.title");
			description = t("modal.update_pic.description");
		}

		if (dialogMode.updateStatus) {
			title = t("modal.update_status.title");
			description = t("modal.update_status.description");
		}

		return {
			isOpen,
			title,
			description,
			dialogWidth,
			onOpenChange: (value: boolean) => {
				if (!value) {
					const objQueryParams = {
						cancel: null,
						update_pic: null,
						update_status: null,
					};
					const { fullUrl } = populateQueryParams(pageURL, objQueryParams);

					router.get(
						fullUrl,
						{},
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
				}
			},
		};
	}, [dialogMode, pageURL, t]);

	return (
		<PageProviderContext.Provider value={{ dialog }}>
			{children}

			{globalProps?.selectedAppointment && dialog.isOpen && (
				<ResponsiveDialog {...dialog}>
					{dialogMode.cancel && (
						<CancelAppointmentForm
							selectedAppointment={globalProps.selectedAppointment}
						/>
					)}

					{dialogMode.updatePIC && (
						<UpdatePICForm
							selectedAppointment={globalProps.selectedAppointment}
						/>
					)}

					{dialogMode.updateStatus && (
						<UpdateStatusForm
							selectedAppointment={globalProps.selectedAppointment}
						/>
					)}
				</ResponsiveDialog>
			)}
		</PageProviderContext.Provider>
	);
}

export const usePageContext = () => {
	const context = useContext(PageProviderContext);

	if (context === undefined)
		throw new Error("usePageContext must be used within a PageProviderContext");

	return context;
};

// * page component
type ServicePick = { packages: Package[] } & Omit<Service, "packages">;
export interface AppointmentIndexProps {
	appointments?: {
		data: { date: string; schedules: Appointment[] }[];
		metadata: Metadata;
	};
	selectedAppointment?: Appointment;
	optionsData?: {
		admins: Admin[];
		statuses: {
			key: keyof typeof AppointmentStatuses;
			value: AppointmentStatuses;
		}[];
	};
	filterOptionsData?: {
		locations: Location[];
		services: ServicePick[];
		patientGenders: typeof GENDERS;
		sortList: ["newest", "oldest", "upcoming_visit", "furthest_visit"];
	};
}

export interface AppointmentIndexGlobalPageProps
	extends BaseGlobalPageProps,
		AppointmentIndexProps {
	[key: string]: any;
}

export default function AppointmentIndex() {
	const { props: globalProps, url: pageURL } =
		usePage<AppointmentIndexGlobalPageProps>();
	const { t } = useTranslation("appointments");
	const isMobile = useIsMobile();

	const schedules = useMemo(() => {
		if (!globalProps?.appointments || !globalProps?.appointments?.data?.length)
			return [];

		return globalProps.appointments.data.flatMap(
			(appointment) => appointment.schedules,
		);
	}, [globalProps?.appointments]);
	const apptMetadata = useMemo(() => {
		if (!globalProps?.appointments || !globalProps?.appointments?.metadata)
			return null;

		return globalProps.appointments.metadata;
	}, [globalProps?.appointments]);
	const isAppointmentExist = useMemo(
		() => !!globalProps?.appointments?.data?.length,
		[globalProps?.appointments?.data?.length],
	);
	const noAppointmentsLabel = useMemo(() => {
		let label = "";

		switch (globalProps?.adminPortal?.currentQuery?.status) {
			case "cancel":
				label = t("tab.no_content.cancelled");
				break;
			case "past":
				label = t("tab.no_content.past");
				break;
			case "pending_therapist":
				label = t("tab.no_content.pending_therapist");
				break;
			case "pending_patient_approval":
				label = t("tab.no_content.pending_patient_approval");
				break;
			case "pending_payment":
				label = t("tab.no_content.pending_payment");
				break;
			case "unschedule":
				label = t("tab.no_content.unschedule");
				break;
			default:
				label = t("tab.no_content.unschedule");
				break;
		}

		return label;
	}, [globalProps?.adminPortal?.currentQuery?.status, t]);
	const isShowAnnouncement = useMemo(
		() =>
			!!globalProps?.adminPortal?.currentQuery?.status &&
			[
				"pending_therapist",
				"pending_patient_approval",
				"pending_payment",
			].includes(globalProps.adminPortal.currentQuery.status),
		[globalProps?.adminPortal?.currentQuery?.status],
	);

	// * pagination params management state
	const changePageParam = useCallback(
		(
			type: "prev" | "next" | "limit" | "first" | "last" | "page",
			value?: string,
		) => {
			if (!apptMetadata) {
				console.warn("Pagination metadata not available");
				return;
			}

			let url: string | undefined;
			switch (type) {
				case "prev":
					url = apptMetadata.prevUrl;
					break;
				case "next":
					url = apptMetadata.nextUrl;
					break;
				case "first":
					url = apptMetadata.firstUrl;
					break;
				case "last":
					url = apptMetadata.lastUrl;
					break;
				case "limit": {
					if (!value) {
						console.warn("Value required for 'limit' pagination");
						return;
					}
					const { fullUrl } = populateQueryParams(apptMetadata.pageUrl, {
						limit: value,
					});
					url = fullUrl;
					break;
				}
				case "page": {
					if (!value) {
						console.warn("Value required for 'page' pagination");
						return;
					}
					const { fullUrl } = populateQueryParams(apptMetadata.pageUrl, {
						page: value,
					});
					url = fullUrl;
					break;
				}
				default:
					console.warn("Invalid pagination type");
					return;
			}

			if (!url) {
				console.warn("No pagination URL available");
				return;
			}

			router.get(
				url,
				{},
				{
					preserveScroll: false,
					preserveState: true,
					only: ["adminPortal", "flash", "errors", "appointments"],
				},
			);
		},
		[apptMetadata],
	);

	// * filter management state with animation
	const [preferences, savePreferences] = useLocalStorage(
		PREFERENCES_STORAGE_KEY,
		{
			isShowFilter: false,
		},
	);
	const handleToggleFilter = () => {
		savePreferences((prev) => ({ ...prev, isShowFilter: !prev.isShowFilter }));
	};

	// * sort management state with animation
	const [isSorting, setIsSorting] = useState(false);
	const sortBy = useMemo(() => {
		const currentQuery = globalProps?.adminPortal?.currentQuery;

		return currentQuery?.sort || "";
	}, [globalProps?.adminPortal?.currentQuery]);
	const sortList = useMemo(
		() => globalProps.filterOptionsData?.sortList || [],
		[globalProps.filterOptionsData?.sortList],
	);
	const onChangeSort = useCallback(
		(value: string) => {
			const { fullUrl } = populateQueryParams(
				pageURL,
				deepTransformKeysToSnakeCase({
					sort: value === "clear" ? null : value,
				}),
			);
			router.get(
				fullUrl,
				{},
				{
					preserveState: true,
					only: ["adminPortal", "flash", "errors", "appointments"],
					onStart: () => {
						setIsSorting(true);
					},
					onFinish: () => {
						setTimeout(() => {
							setIsSorting(false);
						}, 250);
					},
				},
			);
		},
		[pageURL],
	);

	// * sync management state
	const { isSynchronizing, doSync } = useAppointmentDataMasterSync({
		pageURL,
		syncRoute: globalProps.adminPortal.router.adminPortal.appointment.sync,
	});

	// * export management state
	const [isOpenReportModal, setIsOpenReportModal] = useState(false);
	const [isGenerateReport, setIsGenerateReport] = useState(false);
	const [reportDates, setReportDates] = useState<DateRange | undefined>(
		undefined,
	);
	const doGenerateReport = useCallback(() => {
		const { queryParams } = populateQueryParams(pageURL);
		const { fullUrl } = populateQueryParams(
			globalProps.adminPortal.router.adminPortal.appointment.export,
			{
				...queryParams,
				report_from: reportDates?.from,
				report_to: reportDates?.to,
			},
		);

		// Force `.csv` format BEFORE the query string
		const urlObj = new URL(fullUrl, window.location.origin);
		const csvUrl = `${urlObj.pathname}.csv${urlObj.search}`;

		window.location.href = csvUrl; // triggers the download

		setIsGenerateReport(true);
		setTimeout(() => {
			setIsOpenReportModal(false);
			setIsGenerateReport(false);
			toast("Sucessfully generated report");
		}, 250);
	}, [
		pageURL,
		globalProps.adminPortal.router.adminPortal.appointment.export,
		reportDates,
	]);

	return (
		<PageProvider>
			<Head title={t("head_title")} />

			<PageContainer className="min-h-[100vh] flex-1 md:min-h-min space-y-4">
				<div className="flex flex-col justify-between gap-4 md:flex-row">
					<div>
						<h1 className="text-lg font-bold tracking-tight uppercase">
							{t("page_title")}
						</h1>

						<p className="w-full text-sm text-muted-foreground text-pretty md:max-w-[60ch]">
							{t("page_description")}
						</p>
					</div>
				</div>

				<Separator className="bg-border" />

				<ApptViewChanger activeView="appointments" showNewBadge />

				<div className="grid gap-4">
					<div className="z-10 flex gap-2 justify-between">
						<div className="flex items-center gap-2">
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										disabled={isSorting}
										type="button"
										variant="outline"
										size={isMobile && !sortBy ? "icon" : "default"}
										className="shadow-none"
									>
										{isSorting ? (
											<LoaderCircleIcon className="animate-spin" />
										) : (
											<ArrowDownUpIcon />
										)}

										{isMobile
											? null
											: isSorting
												? t("button.sort.loading")
												: t("button.sort.base")}

										{sortBy && (
											<>
												<Separator orientation="vertical" />
												<Badge className="uppercase text-[10px] p-0 px-1">
													{sortBy?.replaceAll("_", " ")}
												</Badge>
											</>
										)}
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent
									align="start"
									side="bottom"
									className="w-fit"
								>
									<DropdownMenuLabel>
										{t("button.sort.label")}
									</DropdownMenuLabel>
									<DropdownMenuSeparator />
									<Deferred
										data={["filterOptionsData"]}
										fallback={<Skeleton className="w-full h-8" />}
									>
										<DropdownMenuRadioGroup
											value={sortBy}
											onValueChange={onChangeSort}
										>
											{sortList.map((item) => (
												<DropdownMenuRadioItem
													key={item}
													value={item}
													className="uppercase"
												>
													{t(
														`button.sort.options.${item?.replaceAll("_", " ")}`,
													)}
												</DropdownMenuRadioItem>
											))}
											<DropdownMenuSeparator />
											<DropdownMenuRadioItem
												value="clear"
												className="uppercase"
											>
												{t("button.sort.clear")}
											</DropdownMenuRadioItem>
										</DropdownMenuRadioGroup>
									</Deferred>
								</DropdownMenuContent>
							</DropdownMenu>

							<Button
								type="button"
								variant={preferences.isShowFilter ? "default" : "outline"}
								size={isMobile ? "icon" : "default"}
								className="shadow-none"
								onClick={(event) => {
									event.preventDefault();

									handleToggleFilter();
								}}
							>
								<ListFilterIcon />
								{isMobile
									? null
									: preferences.isShowFilter
										? t("button.close_filter")
										: t("button.filter")}
							</Button>
						</div>

						<div className="flex items-center gap-2">
							{/* ? the sync appointment is currently directly by the backend */}
							{false &&
								(globalProps.auth.currentUser?.["isSuperAdmin?"] ||
									globalProps.auth.currentUser?.["isAdminSupervisor?"]) && (
									<SyncDataMaster
										isSynchronizing={isSynchronizing}
										isMobile={isMobile}
										onSync={doSync}
									/>
								)}

							<Popover
								open={isOpenReportModal}
								onOpenChange={setIsOpenReportModal}
							>
								<PopoverTrigger asChild>
									<Button
										disabled={isGenerateReport}
										variant="outline"
										size={isMobile ? "icon" : "default"}
										className="shadow-none"
									>
										{isGenerateReport ? (
											<>
												<LoaderCircleIcon className="animate-spin" />
												{t("button.export.loading")}
											</>
										) : (
											<>
												<FileSpreadsheetIcon />
												{isMobile ? null : t("button.export.base")}
											</>
										)}
									</Button>
								</PopoverTrigger>
								<PopoverContent
									className="w-auto p-0 overflow-hidden"
									align="start"
								>
									<Calendar
										mode="range"
										selected={reportDates}
										captionLayout="dropdown"
										onSelect={(dates) => {
											setReportDates(dates);
										}}
									/>

									<Button
										className="w-full"
										disabled={!reportDates?.to}
										onClick={() => {
											doGenerateReport();
										}}
									>
										{t("button.export.generate")}
									</Button>
								</PopoverContent>
							</Popover>

							<Button
								asChild
								size={isMobile ? "icon" : "default"}
								className="shadow-none"
							>
								<Link
									href={
										globalProps.adminPortal.router.adminPortal.appointment.new
									}
								>
									<PlusIcon />
									{isMobile ? null : t("button.create")}
								</Link>
							</Button>
						</div>
					</div>

					<AnimatePresence initial={false}>
						{preferences.isShowFilter && (
							<motion.section
								initial={{ opacity: 0, y: -20, filter: "blur(8px)" }}
								animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
								transition={{ duration: 0.3, ease: "easeOut" }}
							>
								<FilterList
									className="p-3 border shadow-inner rounded-xl bg-background"
									isShow={preferences.isShowFilter}
									onToggleShow={() => {
										handleToggleFilter();
									}}
								/>
							</motion.section>
						)}
					</AnimatePresence>
				</div>

				{isShowAnnouncement && (
					<AnimatePresence>
						<motion.div
							key="announcement"
							initial={{ opacity: 0, y: -20, filter: "blur(8px)" }}
							animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
							exit={{ opacity: 0, y: -20, filter: "blur(8px)" }}
							transition={{ duration: 0.4, ease: "easeOut" }}
							className="flex justify-center !mt-6"
						>
							<Announcement themed className="text-orange-700 bg-orange-100">
								<AnnouncementTag className="flex items-center gap-1.5">
									<AlarmClockIcon className="shrink-0 size-4" />
									<span>{t("announcement.warning.tag")}</span>
								</AnnouncementTag>
								<AnnouncementTitle>
									{t("announcement.warning.title")}
								</AnnouncementTitle>
							</Announcement>
						</motion.div>
					</AnimatePresence>
				)}

				<Deferred
					data={["appointments"]}
					fallback={
						<div
							className={cn(
								"flex flex-col self-end gap-6",
								preferences.isShowFilter ? "!mt-6" : "",
							)}
						>
							<Skeleton className="w-2/12 h-4 rounded-sm" />
							<Skeleton className="relative w-full h-32 rounded-xl" />
						</div>
					}
				>
					<div
						className={cn(
							"grid gap-6 !mb-6",
							preferences.isShowFilter ? "!mt-8" : "",
						)}
					>
						{isAppointmentExist ? (
							<ApptTable data={schedules} />
						) : (
							<div className="flex items-center justify-center px-3 py-8 border rounded-md border-border bg-background text-muted-foreground">
								<h2 className="w-8/12 text-sm text-center animate-bounce text-pretty">
									{noAppointmentsLabel}
								</h2>
							</div>
						)}
					</div>
				</Deferred>

				<Deferred
					data={["appointments"]}
					fallback={
						<div className="flex flex-col justify-between gap-6 mt-6 md:flex-row">
							<div className="flex items-center self-end gap-4 md:self-start">
								<Skeleton className="w-[120px] h-4 rounded-sm" />
								<Skeleton className="w-[75px] rounded-sm h-9" />
							</div>

							<div className="flex items-center gap-4">
								<Skeleton className="w-full md:w-[200px] h-4 rounded-sm" />
								<div className="flex items-center gap-2">
									<Skeleton className="w-[35px] rounded-sm h-9" />
									<Skeleton className="w-[35px] rounded-sm h-9" />
								</div>
							</div>
						</div>
					}
				>
					<ApptPagination
						metadata={apptMetadata}
						actions={{
							goToPrevpage: () => changePageParam("prev"),
							goToNextPage: () => changePageParam("next"),
							onChangeLimit: (value) => changePageParam("limit", value),
							goToPage: (value) => changePageParam("page", value),
							goToFirstPage: () => changePageParam("first"),
							goToLastPage: () => changePageParam("last"),
						}}
					/>
				</Deferred>
			</PageContainer>
		</PageProvider>
	);
}
