import { tz } from "@date-fns/tz";
import { type ContextFn, format } from "date-fns";
import { type Locale, enUS } from "date-fns/locale";

export const SIDEBAR_WIDTH = "16rem";
export const SIDEBAR_WIDTH_MOBILE = "18rem";

export const INTERVAL_TOPBAR_DATE = 1;
export const LOCALES = { enUS };
export const CURRENT_DATE_TOPBAR = ({
	locale = enUS,
	timezone = tz("Asia/Jakarta"),
}: { locale?: Locale; timezone?: ContextFn<Date> }) =>
	format(new Date(), "PPPP 'at' p", { locale, in: timezone });

export const ADMIN_TYPES = ["SUPER_ADMIN", "ADMIN_L1", "ADMIN_L2", "ADMIN_L3", "ADMIN_BACKLOG"] as const