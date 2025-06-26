import ScheduleForm from "@/components/admin-portal/availability/schedule-form";
import { TherapistList } from "@/components/admin-portal/availability/therapist-list";
import { PageContainer } from "@/components/admin-portal/shared/page-layout";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { DAY_NAMES } from "@/lib/constants";
import type { Therapist } from "@/types/admin-portal/therapist";
import type { GlobalPageProps as BaseGlobalPageProps } from "@/types/globals";
import { Deferred, Head } from "@inertiajs/react";
import { useTranslation } from "react-i18next";

export interface PageProps {
	therapists: Therapist[];
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
	const { t: tta } = useTranslation("therapist-availability");

	// for sync data
	// const { props: globalProps } = usePage<AvailabilityGlobalPageProps>();
	// const [isLoading, setIsLoading] = useState({ sync: false });
	// const doSync = useCallback(() => {
	// 	router.put(
	// 		globalProps.adminPortal.router.adminPortal.availability.sync,
	// 		{},
	// 		{
	// 			preserveScroll: true,
	// 			preserveState: true,
	// 			only: ["adminPortal", "flash", "errors", "selectedTherapist"],
	// 			onStart: () => {
	// 				setIsLoading((prev) => ({ ...prev, sync: true }));
	// 			},
	// 			onFinish: () => {
	// 				setTimeout(() => {
	// 					setIsLoading((prev) => ({ ...prev, sync: false }));
	// 				}, 250);
	// 			},
	// 		},
	// 	);
	// }, [globalProps.adminPortal.router.adminPortal.availability.sync]);

	return (
		<>
			<Head title={tta("head_title")} />

			<PageContainer className="min-h-[100vh] flex-1 md:min-h-min space-y-4">
				<div className="flex flex-col justify-between gap-4 md:flex-row">
					<div>
						<h1 className="text-lg font-bold tracking-tight uppercase">
							{tta("page_title")}
						</h1>

						<p className="w-full text-sm md:w-8/12 text-pretty text-muted-foreground">
							{tta("page_description")}
						</p>
					</div>

					{/* {globalProps?.auth?.currentUser?.["isSuperAdmin?"] && (
						<div className="flex flex-col gap-2 md:flex-row">
							<Button
								variant="primary-outline"
								disabled={isLoading.sync}
								onClick={(event) => {
									event.preventDefault();
									doSync();
								}}
							>
								{isLoading.sync ? (
									<>
										<LoaderIcon className="animate-spin" />
										<span>{`${t("components.modal.wait")}...`}</span>
									</>
								) : (
									<>
										<RefreshCcw />
										{tta("button.sync")}
									</>
								)}
							</Button>
						</div>
					)} */}
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
							therapists={therapists}
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
