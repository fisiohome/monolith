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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import { cn, populateQueryParams } from "@/lib/utils";
import type { Admin } from "@/types/admin-portal/admin";
import type {
	Appointment,
	AppointmentStatuses,
} from "@/types/admin-portal/appointment";
import type { Location } from "@/types/admin-portal/location";
import type { GlobalPageProps as BaseGlobalPageProps } from "@/types/globals";
import { Deferred, Head, Link, router, usePage } from "@inertiajs/react";
import { useMediaQuery } from "@uidotdev/usehooks";
import { Plus } from "lucide-react";
import {
	type ReactNode,
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import { Fragment } from "react";
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
	const { props: globalProps, url: pageURL } =
		usePage<AppointmentIndexGlobalPageProps>();
	const isDekstop = useMediaQuery("(min-width: 768px)");
	const { t } = useTranslation("appointments");

	// * tabs management
	const [isTabChange, setIsTabChange] = useState(false);
	const tabList = useMemo(() => {
		return [
			{
				text: t("tab.title.upcoming"),
				value: "upcoming",
			},
			{
				text: t("tab.title.pending"),
				value: "pending",
			},
			{
				text: t("tab.title.past"),
				value: "past",
			},
			{
				text: t("tab.title.unschedule"),
				value: "unschedule",
			},
			{
				text: t("tab.title.cancelled"),
				value: "cancel",
			},
		] as const;
	}, [t]);
	const tabActive = useMemo<(typeof tabList)[number]["value"]>(
		() =>
			(globalProps?.adminPortal?.currentQuery
				?.filterByAppointmentStatus as (typeof tabList)[number]["value"]) ||
			"upcoming",
		[globalProps?.adminPortal?.currentQuery?.filterByAppointmentStatus],
	);
	const onTabClick = useCallback(
		(value: (typeof tabList)[number]["value"]) => {
			const { fullUrl, queryParams } = populateQueryParams(
				pageURL,
				deepTransformKeysToSnakeCase({
					filterByAppointmentStatus: value,
				}),
			);

			router.get(
				fullUrl,
				{ ...queryParams },
				{
					replace: true,
					preserveScroll: true,
					preserveState: true,
					only: ["adminPortal", "flash", "errors", "appointments"],
					onStart: () => {
						setIsTabChange(true);
					},
					onFinish: () => {
						setTimeout(() => {
							setIsTabChange(false);
						}, 250);
					},
				},
			);
		},
		[pageURL],
	);
	const appointments = useMemo(() => {
		if (!globalProps?.appointments || !globalProps?.appointments?.length)
			return [];

		return globalProps.appointments;
	}, [globalProps?.appointments]);
	const noAppointmentsLabel = useMemo(() => {
		let label = "";

		switch (tabActive) {
			case "upcoming":
				label = t("tab.no_content.upcoming");
				break;
			case "cancel":
				label = t("tab.no_content.cancelled");
				break;
			case "past":
				label = t("tab.no_content.past");
				break;
			case "pending":
				label = t("tab.no_content.pending");
				break;
			case "unschedule":
				label = t("tab.no_content.unschedule");
				break;
		}

		return label;
	}, [tabActive, t]);
	const isAppointmentExist = useMemo(
		() => !!appointments?.length,
		[appointments?.length],
	);

	return (
		<PageProvider>
			<Head title={t("head_title")} />

			<PageContainer className="flex items-center justify-between">
				<h1 className="text-2xl font-bold tracking-tight">{t("page_title")}</h1>
			</PageContainer>

			<PageContainer className="flex-1 gap-6 md:min-h-min">
				<Tabs defaultValue={tabActive}>
					<div className="flex flex-col items-center justify-between gap-3 md:flex-row">
						<TabsList
							className={cn(
								"",
								isDekstop ? "" : "grid grid-cols-4 w-full h-fit",
							)}
						>
							{tabList.map((tab) => (
								<Fragment key={tab.value}>
									<TabsTrigger
										disabled={isTabChange && tabActive !== tab.value}
										value={tab.value}
										className="px-3 py-2 md:py-1"
										onClick={() => onTabClick(tab.value)}
									>
										{tab.text}
									</TabsTrigger>
								</Fragment>
							))}
						</TabsList>

						<Button asChild disabled={isTabChange} className="w-full md:w-fit">
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
				</Tabs>
			</PageContainer>
		</PageProvider>
	);
}
