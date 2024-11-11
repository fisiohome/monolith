import { type ContextFn, format } from "date-fns";
import { enUS, type Locale } from "date-fns/locale";
import { tz } from "@date-fns/tz";

export const SIDEBAR_WIDTH = "16rem"
export const SIDEBAR_WIDTH_MOBILE = "18rem"

export const INTERVAL_TOPBAR_DATE = 1
export const LOCALES = { enUS }
export const CURRENT_DATE_TOPBAR = ({ locale = enUS, timezone = tz("Asia/Jakarta") }: { locale?: Locale; timezone?: ContextFn<Date> }) =>
  format(new Date(), "PPPP 'at' p", { locale, in: timezone })