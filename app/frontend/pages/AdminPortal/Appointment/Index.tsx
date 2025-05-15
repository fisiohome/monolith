import AppointmentList from "@/components/admin-portal/appointment/appointment-list";
import {
	CancelAppointmentForm,
	UpdatePICForm,
	UpdateStatusForm,
} from "@/components/admin-portal/appointment/feature-form";
import FilterList from "@/components/admin-portal/appointment/filter-list";
import { PageContainer } from "@/components/admin-portal/shared/page-layout";
import {
	ResponsiveDialog,
	type ResponsiveDialogProps,
} from "@/components/shared/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { populateQueryParams } from "@/lib/utils";
import type { Admin } from "@/types/admin-portal/admin";
import type {
	Appointment,
	AppointmentStatuses,
} from "@/types/admin-portal/appointment";
import type { Location } from "@/types/admin-portal/location";
import type { GlobalPageProps as BaseGlobalPageProps } from "@/types/globals";
import { Deferred, Head, Link, router, usePage } from "@inertiajs/react";
import { Plus } from "lucide-react";
import { type ReactNode, createContext, useContext, useMemo } from "react";
import { useTranslation } from "react-i18next";

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
export interface AppointmentIndexProps {
	appointments?: { date: string; schedules: Appointment[] }[];
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
		if (!globalProps?.appointments || !globalProps?.appointments?.length)
			return [];

		return globalProps.appointments;
	}, [globalProps?.appointments]);
	const isAppointmentExist = useMemo(
		() => !!appointments?.length,
		[appointments?.length],
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

	return (
		<PageProvider>
			<Head title={t("head_title")} />

			<PageContainer className="min-h-[100vh] flex-1 md:min-h-min space-y-4">
				<div className="flex flex-col justify-between gap-4 md:flex-row">
					<div>
						<h1 className="text-lg font-bold tracking-tight uppercase">
							{t("page_title")}
						</h1>

						<p className="w-full text-sm text-muted-foreground text-pretty md:w-8/12">
							{t("page_description")}
						</p>
					</div>

					<div className="flex flex-col gap-2 md:flex-row">
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
				</div>

				<Separator className="bg-border" />

				<FilterList />

				<Deferred
					data={["appointments"]}
					fallback={
						<div className="flex flex-col self-end gap-6 mt-6">
							<Skeleton className="w-2/12 h-4 rounded-sm" />
							<Skeleton className="relative w-full h-32 rounded-xl" />
						</div>
					}
				>
					<div className="grid gap-6 mt-6">
						{isAppointmentExist ? (
							appointments.map((appointment, index) => (
								<AppointmentList
									key={String(appointment.date)}
									appointment={appointment}
									index={index}
								/>
							))
						) : (
							<div className="flex items-center justify-center px-3 py-8 border rounded-md border-border bg-background">
								<h2 className="w-8/12 text-sm text-center animate-bounce text-pretty">
									{noAppointmentsLabel}
								</h2>
							</div>
						)}
					</div>
				</Deferred>
			</PageContainer>
		</PageProvider>
	);
}
