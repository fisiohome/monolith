import { Head, router, usePage } from "@inertiajs/react";
import { addDays, format, subDays } from "date-fns";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { PageContainer } from "@/components/admin-portal/shared/page-layout";
import {
	CalendarBodyContainer,
	CalendarContainer,
	CalendarHeader,
	CalendarTherapistSlot,
	CalendarTimeSlot,
	ScheduleDateToolbar,
	ScheduleFilters,
	SchedulePagination,
} from "@/components/admin-portal/therapist/schedules/calendar";
import ChangeViewButton from "@/components/admin-portal/therapist/schedules/change-view-button";
import { useDateContext } from "@/components/providers/date-provider";
import { Separator } from "@/components/ui/separator";
import { useCalendarSchedule } from "@/hooks/use-calendar-schedule";
import { populateQueryParams } from "@/lib/utils";
import type { Location } from "@/types/admin-portal/location";
import type {
	Therapist,
	TherapistEmploymentType,
} from "@/types/admin-portal/therapist";
import type { GlobalPageProps as BaseGlobalPageProps } from "@/types/globals";
import type { Metadata } from "@/types/pagy";

interface DaySchedulesPageProps {
	params: {
		page: number;
		limit: number;
		date: string;
	};
	therapists: {
		metadata: Metadata;
		data: Therapist[];
	};
	filterOptions?: {
		locations: Location[];
		employmentTypes: TherapistEmploymentType;
	};
}

export interface DaySchedulesPageGlobalProps
	extends BaseGlobalPageProps,
		DaySchedulesPageProps {
	[key: string]: any;
}

export default function DaySchedulesPage({
	params,
	therapists,
}: DaySchedulesPageProps) {
	const { url: pageUrl, props: globalPageProps } =
		usePage<DaySchedulesPageGlobalProps>();
	const { t } = useTranslation("therapist-schedules");
	const { locale, tzDate } = useDateContext();

	// * date params management state
	const dateParam = useMemo(() => new Date(params.date), [params.date]);
	const changeDateParam = useCallback(
		(type: "today" | "next" | "prev" | "date" = "today", value?: Date) => {
			let newDate = new Date(); // default to today's date;

			if (type === "date" && value) {
				newDate = value;
			}

			if (type === "next") {
				newDate = addDays(dateParam, 1, { in: tzDate });
			}

			if (type === "prev") {
				newDate = subDays(dateParam, 1, { in: tzDate });
			}

			const formattedDate = format(newDate, "yyyy-MM-dd", {
				in: tzDate,
				locale,
			});
			const { fullUrl } = populateQueryParams(
				pageUrl,
				// null value means reset the another param value
				{ date: formattedDate, page: null },
			);
			router.get(
				fullUrl,
				{},
				{
					preserveScroll: false,
					preserveState: true,
					only: ["params", "therapists", "adminPortal"],
				},
			);
		},
		[tzDate, dateParam, locale, pageUrl],
	);

	// * pagination params management state
	const changePageParam = useCallback(
		(type: "first" | "prev" | "next" | "last" | "page", value?: number) => {
			const { firstUrl, prevUrl, nextUrl, lastUrl, pageUrl } =
				therapists.metadata;
			const options = {
				preserveScroll: false,
				preserveState: true,
				only: ["params", "therapists"] as string[],
			};

			if (type === "page") {
				if (!value || Number.isNaN(value)) return;
				router.get(pageUrl, { page: value }, options);
				return;
			}

			const urlMap: Record<
				"first" | "prev" | "next" | "last",
				string | undefined
			> = {
				first: firstUrl,
				prev: prevUrl,
				next: nextUrl,
				last: lastUrl,
			};
			const targetUrl = urlMap[type];
			if (!targetUrl) return;

			router.get(targetUrl, {}, options);
		},
		[therapists.metadata],
	);

	// * for calendar management state
	const { timeSlots, currentTimeSlot } = useCalendarSchedule();

	return (
		<>
			<Head title={t("title")} />

			<PageContainer className="min-h-[100vh] flex-1 md:min-h-min space-y-4">
				<div className="flex flex-col justify-between gap-4 md:flex-row">
					<div>
						<h1 className="text-lg font-bold tracking-tight uppercase">
							{t("title")}
						</h1>
					</div>

					<div>
						<ChangeViewButton
							currentPage="daySchedules"
							routes={{
								daySchedules:
									globalPageProps.adminPortal.router.adminPortal
										.therapistManagement.daySchedules,
								schedules:
									globalPageProps.adminPortal.router.adminPortal
										.therapistManagement.schedules,
							}}
						/>
					</div>
				</div>

				<Separator className="bg-border" />

				<ScheduleDateToolbar
					selectedDate={dateParam}
					actions={{
						goToNextDay: () => changeDateParam("next"),
						goToPrevDay: () => changeDateParam("prev"),
						goToToday: () => changeDateParam("today"),
						goToByDate: (value: Date) => changeDateParam("date", value),
					}}
				/>

				<ScheduleFilters />

				<div>
					<SchedulePagination
						metadata={therapists.metadata}
						actions={{
							goToFirstPage: () => changePageParam("first"),
							goToPrevPage: () => changePageParam("prev"),
							goToNextPage: () => changePageParam("next"),
							goToLastPage: () => changePageParam("last"),
							goToPage: (page: number) => changePageParam("page", page),
						}}
					/>

					<CalendarContainer>
						<CalendarHeader therapists={therapists.data} />

						<CalendarBodyContainer>
							<CalendarTimeSlot
								selectedDate={dateParam}
								timeSlots={timeSlots}
								currentTimeSlot={currentTimeSlot}
							/>

							<CalendarTherapistSlot
								therapists={therapists.data}
								timeSlots={timeSlots}
								selectedDate={dateParam}
							/>
						</CalendarBodyContainer>
					</CalendarContainer>
				</div>
			</PageContainer>
		</>
	);
}
