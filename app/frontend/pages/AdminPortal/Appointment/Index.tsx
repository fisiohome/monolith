import AppointmentList from "@/components/admin-portal/appointment/appointment-list";
import { PageContainer } from "@/components/admin-portal/shared/page-layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import { cn, populateQueryParams } from "@/lib/utils";
import type { Appointment } from "@/types/admin-portal/appointment";
import type { GlobalPageProps as BaseGlobalPageProps } from "@/types/globals";
import { Deferred, Head, Link, router, usePage } from "@inertiajs/react";
import { useMediaQuery } from "@uidotdev/usehooks";
import { Plus } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Fragment } from "react";

export interface AppointmentIndexProps {
	appointments?: { date: string; schedules: Appointment[] }[];
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

	// * tabs management
	const [isTabChange, setIsTabChange] = useState(false);
	const tabList = useMemo(() => {
		return [
			{
				text: "Upcoming",
				value: "upcoming",
			},
			{
				text: "Pending",
				value: "pending",
			},
			{
				text: "Past",
				value: "past",
			},
			{
				text: "Cancelled",
				value: "cancel",
			},
		] as const;
	}, []);
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
					only: ["adminPortal", "flash", "errors"],
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
				label = "There are no upcoming appointments scheduled.";
				break;
			case "cancel":
				label = "There are no cancelled appointments to show.";
				break;
			case "past":
				label = "There are no past appointments to show.";
				break;
			case "pending":
				label = "There are no appointments are pending confirmation.";
				break;
		}

		return label;
	}, [tabActive]);
	const isAppointmentExist = useMemo(
		() => !!appointments?.length,
		[appointments?.length],
	);

	return (
		<>
			<Head title="Appointment Schedule" />

			<PageContainer className="flex items-center justify-between">
				<h1 className="text-2xl font-bold tracking-tight">
					Appointment Schedule
				</h1>
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

						<Button
							asChild
							disabled={isTabChange}
							className={cn(
								"w-full md:w-fit",
								!isAppointmentExist && "animate-pulse",
							)}
						>
							<Link
								href={
									globalProps.adminPortal.router.adminPortal.appointment.new
								}
							>
								<Plus />
								Create Appointment
							</Link>
						</Button>
					</div>

					{tabList.map((tab) => (
						<Fragment key={tab.value}>
							<TabsContent value={tab.value}>
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
							</TabsContent>
						</Fragment>
					))}
				</Tabs>
			</PageContainer>
		</>
	);
}
