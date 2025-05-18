import AppointmentList from "@/components/admin-portal/appointment/appointment-list";
import {
	CancelAppointmentForm,
	UpdatePICForm,
	UpdateStatusForm,
} from "@/components/admin-portal/appointment/feature-form";
import FilterList from "@/components/admin-portal/appointment/filter-list";
import ApptPagination from "@/components/admin-portal/appointment/pagination-list";
import { PageContainer } from "@/components/admin-portal/shared/page-layout";
import {
	ResponsiveDialog,
	type ResponsiveDialogProps,
} from "@/components/shared/responsive-dialog";
import { Button } from "@/components/ui/button";
import {
	Announcement,
	AnnouncementTag,
	AnnouncementTitle,
} from "@/components/ui/kibo-ui/announcement";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { GENDERS } from "@/lib/constants";
import { populateQueryParams } from "@/lib/utils";
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
import { Deferred, Head, Link, router, usePage } from "@inertiajs/react";
import { useLocalStorage } from "@uidotdev/usehooks";
import { AnimatePresence, motion } from "framer-motion";
import { AlarmClock, ListFilter, Plus } from "lucide-react";
import {
	type ReactNode,
	createContext,
	useCallback,
	useContext,
	useMemo,
} from "react";
import { useTranslation } from "react-i18next";

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
	};
}

export interface AppointmentIndexGlobalPageProps
	extends BaseGlobalPageProps,
		AppointmentIndexProps {
	[key: string]: any;
}

export default function AppointmentIndex() {
	const { props: globalProps } = usePage<AppointmentIndexGlobalPageProps>();
	const { t } = useTranslation("appointments");

	const appointments = useMemo(() => {
		if (!globalProps?.appointments || !globalProps?.appointments?.data?.length)
			return [];

		return globalProps.appointments.data;
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
		(type: "prev" | "next" | "limit", value?: string) => {
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

	return (
		<PageProvider>
			<Head title={t("head_title")} />

			<PageContainer className="min-h-[100vh] flex-1 md:min-h-min space-y-4">
				<div className="flex flex-col justify-between gap-4 md:flex-row">
					<div>
						<h1 className="text-lg font-bold tracking-tight uppercase">
							{t("page_title")}
						</h1>

						<p className="w-full text-sm text-muted-foreground text-pretty md:w-10/12 xl:w-8/12">
							{t("page_description")}
						</p>
					</div>
				</div>

				<Separator className="bg-border" />

				<div className="grid gap-4">
					<div className="z-10 flex flex-col justify-end gap-2 md:flex-row">
						<Button
							type="button"
							variant={preferences.isShowFilter ? "default" : "outline"}
							className="w-full md:w-fit"
							onClick={(event) => {
								event.preventDefault();

								handleToggleFilter();
							}}
						>
							<ListFilter />
							{preferences.isShowFilter
								? t("button.close_filter")
								: t("button.filter")}
						</Button>

						<Button asChild className="w-full md:w-fit">
							<Link
								href={
									globalProps.adminPortal.router.adminPortal.appointment.new
								}
							>
								<Plus />
								{t("button.create")}
							</Link>
						</Button>
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
									<AlarmClock className="shrink-0 size-4" />
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
						<div className="flex flex-col self-end gap-6 mt-6">
							<Skeleton className="w-2/12 h-4 rounded-sm" />
							<Skeleton className="relative w-full h-32 rounded-xl" />
						</div>
					}
				>
					<div className="grid gap-6 !mt-8 !mb-6">
						{isAppointmentExist ? (
							appointments?.map((appointment, index) => (
								<AppointmentList
									key={String(appointment.date)}
									appointment={appointment}
									index={index}
								/>
							))
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
						<div className="flex flex-col self-end gap-6 mt-6">
							<Skeleton className="w-2/12 h-4 rounded-sm" />
							<Skeleton className="relative w-full h-32 rounded-xl" />
						</div>
					}
				>
					<ApptPagination
						metadata={apptMetadata}
						actions={{
							goToPrevpage: () => changePageParam("prev"),
							goToNextPage: () => changePageParam("next"),
							onChangeLimit: (value) => changePageParam("limit", value),
						}}
					/>
				</Deferred>
			</PageContainer>
		</PageProvider>
	);
}
