import { usePage } from "@inertiajs/react";
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
import { useEffect, useState } from "react";
import { useDateContext } from "@/components/providers/date-provider";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { CURRENT_DATE_TOPBAR, INTERVAL_TOPBAR_DATE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { GlobalPageProps } from "@/types/globals";

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
	const { locale, tzDate } = useDateContext();
	const [currentDate, setCurrentDate] = useState(
		CURRENT_DATE_TOPBAR({ locale, timezone: tzDate }),
	);
	const [ClockIcon, setClockIcon] = useState(() => CLOCK_ICONS[CURRENT_HOUR]);
	// * side effect for changing the time every one-minute
	useEffect(() => {
		// Update the date at the specified interval
		const intervalId = setInterval(() => {
			const date = CURRENT_DATE_TOPBAR({ locale, timezone: tzDate });
			setCurrentDate(date);

			// Update the clock icon based on the current hour
			setClockIcon(CLOCK_ICONS[CURRENT_HOUR]);
		}, INTERVAL_TOPBAR_DATE * 60000); // Convert minutes to milliseconds

		// Cleanup the interval on component unmount
		return () => clearInterval(intervalId);
	}, [locale, tzDate]);

	return (
		<header
			className={cn(
				"sticky z-30 flex flex-row items-center justify-between h-auto py-2 gap-2 bg-background rounded-xl shrink-0 motion-preset-bounce",
				globalProps.adminPortal.railsEnv !== "production"
					? "top-8 md:top-9"
					: "top-0",
			)}
		>
			<div className="flex items-center gap-2 px-4">
				<SidebarTrigger className="-ml-1" />

				<Separator
					orientation="vertical"
					className="h-4 bg-muted-foreground/25"
				/>

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
