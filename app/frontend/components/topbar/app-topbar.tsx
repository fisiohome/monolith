import { Separator } from "@/components/ui/separator";
import {
	CURRENT_DATE_TOPBAR,
	INTERVAL_TOPBAR_DATE,
	LOCALES,
} from "@/lib/constants";
import type { GlobalPageProps } from "@/types/globals";
import { tz } from "@date-fns/tz";
import { usePage } from "@inertiajs/react";
import type { Locale } from "date-fns";
import {
	Clock1,
	Clock2,
	Clock3,
	Clock4,
	Clock5,
	Clock6,
	Clock7,
	Clock8,
	Clock9,
	Clock10,
	Clock11,
	Clock12,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SidebarTrigger } from "../ui/sidebar";

const CLOCK_ICONS = [
	Clock1,
	Clock2,
	Clock3,
	Clock4,
	Clock5,
	Clock6,
	Clock7,
	Clock8,
	Clock9,
	Clock10,
	Clock11,
	Clock12,
];
const CURRENT_HOUR = new Date().getHours() % 12 || 12 - 1;

export default function AppTopBar() {
	const { props: globalProps } = usePage<GlobalPageProps>();
	const currentLocale = useMemo(() => {
		let locale = "" as unknown as Locale;
		switch (globalProps.adminPortal.currentLocale) {
			case "en":
				locale = LOCALES.enUS;
				break;
			default:
				locale = LOCALES.enUS;
				break;
		}

		return locale;
	}, [globalProps.adminPortal.currentLocale]);
	const currentTimezone = useMemo(
		() => globalProps.adminPortal.currentTimezone,
		[globalProps.adminPortal.currentTimezone],
	);
	const [currentDate, setCurrentDate] = useState(
		CURRENT_DATE_TOPBAR({
			locale: currentLocale,
			timezone: tz(currentTimezone),
		}),
	);
	const [ClockIcon, setClockIcon] = useState(() => CLOCK_ICONS[CURRENT_HOUR]);
	useEffect(() => {
		// Update the date at the specified interval
		const intervalId = setInterval(() => {
			const date = CURRENT_DATE_TOPBAR({
				locale: currentLocale,
				timezone: tz(currentTimezone),
			});
			setCurrentDate(date);

			// Update the clock icon based on the current hour
			setClockIcon(CLOCK_ICONS[CURRENT_HOUR]);
		}, INTERVAL_TOPBAR_DATE * 60000); // Convert minutes to milliseconds

		// Cleanup the interval on component unmount
		return () => clearInterval(intervalId);
	}, [currentLocale, currentTimezone]);

	return (
		<header className="sticky top-0 flex flex-row items-center justify-between h-16 gap-2 bg-background rounded-xl shrink-0">
			<div className="flex items-center gap-2 px-4">
				<SidebarTrigger className="-ml-1" />

				<Separator orientation="vertical" className="h-4" />

				{/* <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="#">
                Building Your Application
              </BreadcrumbLink>
            </BreadcrumbItem>

            <BreadcrumbSeparator className="hidden md:block" />

            <BreadcrumbItem>
              <BreadcrumbPage>Data Fetching</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb> */}
			</div>

			<div className="flex items-center gap-2 px-4 text-sm text-muted-foreground">
				{ClockIcon && <ClockIcon className="size-4" />}
				{String(currentDate)}
			</div>
		</header>
	);
}
