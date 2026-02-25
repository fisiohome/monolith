import { Deferred, Head, router, usePage } from "@inertiajs/react";
import { CalendarOff, LoaderIcon, RefreshCcwIcon, X } from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import ScheduleForm from "@/components/admin-portal/availability/schedule-form";
import { TherapistList } from "@/components/admin-portal/availability/therapist-list";
import { PageContainer } from "@/components/admin-portal/shared/page-layout";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useMasterDataSync } from "@/hooks/admin-portal/use-master-data-sync";
import type { DAY_NAMES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Therapist } from "@/types/admin-portal/therapist";
import type { GlobalPageProps as BaseGlobalPageProps } from "@/types/globals";
import type { Metadata } from "@/types/pagy";

export interface PageProps {
	therapists: {
		data: Therapist[];
		metadata: Metadata;
	};
	selectedTherapist: Therapist | null;
	dayNames: (typeof DAY_NAMES)[number][];
}
export interface AvailabilityGlobalPageProps
	extends BaseGlobalPageProps,
		PageProps {
	[key: string]: any;
}

export default function AvailabilityIndex({
	therapists,
	selectedTherapist,
	dayNames,
}: PageProps) {
	const { props: globalProps } = usePage<AvailabilityGlobalPageProps>();
	const { t } = useTranslation();
	const { t: tta } = useTranslation("therapist-availability");

	// Callback when leave sync completes
	const onSyncComplete = useCallback(() => {
		router.reload({ only: ["adminPortal", "selectedTherapist"] });
	}, []);

	// Hook for leave sync
	const {
		isLoading: isLoadingLeaveSync,
		syncStatus: leaveSyncStatus,
		triggerSync: triggerLeaveSync,
		clearStatus: clearLeaveStatus,
	} = useMasterDataSync({
		syncEndpoint: `${globalProps.adminPortal.router.adminPortal.availability.index}/sync-leaves`,
		statusEndpoint: `${globalProps.adminPortal.router.adminPortal.availability.index}/sync-leaves-status`,
		onSyncComplete,
		autoCheckOnMount: true,
	});

	return (
		<>
			<Head title={tta("head_title")} />

			<PageContainer className="min-h-[100vh] flex-1 md:min-h-min space-y-4">
				{/* Leave sync status notification */}
				{leaveSyncStatus.message && (
					<div
						className={cn(
							"p-4 rounded-md border relative",
							leaveSyncStatus.type === "success" &&
								"bg-green-50 border-green-200 text-green-800",
							leaveSyncStatus.type === "error" &&
								"bg-red-50 border-red-200 text-red-800",
							leaveSyncStatus.type === "info" &&
								"bg-blue-50 border-blue-200 text-blue-800",
						)}
					>
						<button
							onClick={clearLeaveStatus}
							type="button"
							className="absolute top-2 right-2 p-1 rounded-md hover:bg-black/10 transition-colors"
							aria-label="Close notification"
						>
							<X className="h-4 w-4" />
						</button>
						<div className="flex items-center gap-2 pr-8">
							{leaveSyncStatus.type === "info" && (
								<LoaderIcon className="animate-spin h-4 w-4" />
							)}
							{leaveSyncStatus.type === "success" && (
								<CalendarOff className="h-4 w-4" />
							)}
							<span className="text-sm font-medium">
								{leaveSyncStatus.message}
							</span>
						</div>
					</div>
				)}

				<div className="flex flex-col justify-between gap-4 md:flex-row">
					<div>
						<h1 className="text-lg font-bold tracking-tight uppercase">
							{tta("page_title")}
						</h1>

						<p className="w-full text-sm md:w-8/12 text-pretty text-muted-foreground">
							{tta("page_description")}
						</p>
					</div>

					{(globalProps?.auth?.currentUser?.["isSuperAdmin?"] ||
						globalProps?.auth?.currentUser?.["isAdminSupervisor?"]) && (
						<div className="flex flex-col gap-2 md:flex-row">
							<Button
								variant="primary-outline"
								disabled={isLoadingLeaveSync}
								onClick={(event) => {
									event.preventDefault();
									triggerLeaveSync();
								}}
							>
								{isLoadingLeaveSync ? (
									<>
										<LoaderIcon className="animate-spin" />
										<span>{`${t("components.modal.wait")}...`}</span>
									</>
								) : (
									<>
										<RefreshCcwIcon />
										Sync Therapists Leaves
									</>
								)}
							</Button>
						</div>
					)}
				</div>

				<Separator className="bg-border" />

				<div className="grid grid-cols-12 gap-6 ">
					<Deferred
						data={["therapists"]}
						fallback={
							<Skeleton className="h-full rounded-md col-span-full xl:col-span-4" />
						}
					>
						<TherapistList
							therapists={therapists?.data ?? []}
							metadata={therapists?.metadata as Metadata}
							className="col-span-full xl:col-span-4"
						/>
					</Deferred>

					<ScheduleForm
						selectedTherapist={selectedTherapist}
						dayNames={dayNames}
						className="col-span-full xl:col-span-8"
					/>
				</div>
			</PageContainer>
		</>
	);
}
