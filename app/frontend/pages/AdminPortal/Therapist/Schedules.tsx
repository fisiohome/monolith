import { Head, router, usePage } from "@inertiajs/react";
import type { GlobalPageProps as BaseGlobalPageProps } from "@/types/globals";
import { useTranslation } from "react-i18next";
import { useCallback, useMemo } from "react";
import { addDays, format, subDays } from "date-fns";
import { PageContainer } from "@/components/admin-portal/shared/page-layout";
import { useDateContext } from "@/components/providers/date-provider";
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
import { useCalendarSchedule } from "@/hooks/use-calendar-schedule";
import type { Metadata } from "@/types/pagy";
import type { Therapist } from "@/types/admin-portal/therapist";
import { populateQueryParams } from "@/lib/utils";
import type { Location } from "@/types/admin-portal/location";

interface SchedulesPageProps {
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
	};
}

export interface SchedulesPageGlobalProps
	extends BaseGlobalPageProps,
		SchedulesPageProps {
	[key: string]: any;
}

export default function SchedulesPage({
	params,
	therapists,
}: SchedulesPageProps) {
	const { url: pageUrl } = usePage<SchedulesPageGlobalProps>();
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
	// @ts-ignore
	const pageParam = useMemo(() => params.page, [params.page]);
	// @ts-ignore
	const limitParam = useMemo(() => params.limit, [params.limit]);
	const changePageParam = useCallback(
		(type: "prev" | "next") => {
			let url = "";

			if (type === "prev") {
				url = therapists.metadata.prevUrl;
			}

			if (type === "next") {
				url = therapists.metadata.nextUrl;
			}

			router.get(
				url,
				{},
				{
					preserveScroll: false,
					preserveState: true,
					only: ["params", "therapists"],
				},
			);
		},
		[therapists.metadata.prevUrl, therapists.metadata.nextUrl],
	);

	// * for calendar management state
	const { timeSlots, currentTimeSlot } = useCalendarSchedule();

	return (
		<>
			<Head title={t("title")} />

			<PageContainer className="min-h-[100vh] flex flex-1 md:min-h-min gap-6 flex-col">
				<div className="flex flex-col gap-4 md:items-center md:flex-row md:justify-between">
					<h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>

					<ScheduleDateToolbar
						selectedDate={dateParam}
						actions={{
							goToNextDay: () => changeDateParam("next"),
							goToPrevDay: () => changeDateParam("prev"),
							goToToday: () => changeDateParam("today"),
							goToByDate: (value: Date) => changeDateParam("date", value),
						}}
					/>
				</div>

				<div className="grid gap-2">
					<div className="flex flex-col items-center justify-between gap-4 md:flex-row">
						<ScheduleFilters />

						<SchedulePagination
							metadata={therapists.metadata}
							actions={{
								goToPrevpage: () => changePageParam("prev"),
								goToNextPage: () => changePageParam("next"),
							}}
						/>
					</div>

					<CalendarContainer>
						<CalendarHeader therapists={therapists.data} />

						<CalendarBodyContainer>
							<>
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
							</>
						</CalendarBodyContainer>
					</CalendarContainer>
				</div>
			</PageContainer>
		</>
	);
}
