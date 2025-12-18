import { tz } from "@date-fns/tz";
import { type ContextFn, format } from "date-fns";
import { enUS, id, type Locale } from "date-fns/locale";

// * for user preferencecs
export const USER_PREF_STORAGE_KEY = "user-preferences";
// the date provider
export const DEFAULT_TIMEZONE = "Asia/Jakarta";
export const DEFAULT_TIME_FORMAT_12 = "12-hours" as const;
export const DEFAULT_TIME_FORMAT_24 = "24-hours" as const;
export const DEFAULT_TIME_FORMAT_12_DATE_FNS = "hh:mm a";
export const DEFAULT_TIME_FORMAT_24_DATE_FNS = "HH:mm";
export type TimeFormat =
	| typeof DEFAULT_TIME_FORMAT_12
	| typeof DEFAULT_TIME_FORMAT_24;
export type TimeFormatDateFns =
	| typeof DEFAULT_TIME_FORMAT_12_DATE_FNS
	| typeof DEFAULT_TIME_FORMAT_24_DATE_FNS;
// the theme provider
export const DEFAULT_THEME = "system";
export type Theme = "dark" | "light" | "system";
// the motion provider
export const DEFAULT_MOTION = "system";
export type MotionPreference = "on" | "off" | "system";
// the local storage for user preferences
export const DEFAULT_USER_PREFERENCES = {
	theme: DEFAULT_THEME as Theme,
	motion: DEFAULT_MOTION as MotionPreference,
	timeFormat: DEFAULT_TIME_FORMAT_12 as TimeFormat,
};
export type UserPreferences = typeof DEFAULT_USER_PREFERENCES;

export const SIDEBAR_WIDTH = "16rem";
export const SIDEBAR_WIDTH_MOBILE = "18rem";

export const INTERVAL_TOPBAR_DATE = 1;
export const LOCALES = { enUS, id };
export const CURRENT_DATE_TOPBAR = ({
	locale = enUS,
	timezone = tz(DEFAULT_TIMEZONE),
}: {
	locale?: Locale;
	timezone?: ContextFn<Date>;
}) => {
	const timeLabel = locale.code === "id" ? "pukul" : "at";

	return format(new Date(), `PPPP '${timeLabel}' p`, { locale, in: timezone });
};

export const ADMIN_TYPES = [
	"SUPER_ADMIN",
	"ADMIN",
	"ADMIN_SUPERVISOR",
] as const;

export const GENDERS = ["MALE", "FEMALE"] as const;

export const EMPLOYMENT_STATUSES = ["ACTIVE", "HOLD", "INACTIVE"] as const;
export const EMPLOYMENT_TYPES = ["KARPIS", "FLAT"] as const;

export const DAY_NAMES = [
	"Sunday",
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
] as const;

export const PREFERRED_THERAPIST_GENDER = [
	"MALE",
	"FEMALE",
	"NO PREFERENCE",
] as const;

export const PATIENT_REFERRAL_OPTIONS = [
	"Instagram",
	"Facebook",
	"Family or Close Related Person",
	"Other",
] as const;

export const FISIOHOME_PARTNER = [
	"Cosmart",
	"KlinikGo",
	"The Asian Parent",
	"Orami Circle",
	"Ibu2canggih",
	"Ibu Bayi Canggih",
	"Kompas myValue",
	"Blibli",
	"LoveCare",
	"Medlife",
	"Medikids",
	"Bumi Health",
	"Other",
] as const;

// * patient condition enums
export const PATIENT_CONDITIONS = [
	"NORMAL",
	"ONLY ABLE TO SIT",
	"BEDRIDDEN",
] as const;

export const PATIENT_CONDITIONS_WITH_DESCRIPTION = PATIENT_CONDITIONS.map(
	(condition) => {
		let description = "";

		switch (condition) {
			case "NORMAL":
				description = "Fully mobile with no restrictions.";
				break;
			case "ONLY ABLE TO SIT":
				description =
					"Limited mobility, the patient can sit but not stand or walk.";
				break;
			case "BEDRIDDEN":
				description = "The patient is confined to bed.";
				break;
		}

		return { title: condition, description };
	},
);

// * media query list
export const IS_DEKSTOP_MEDIA_QUERY = "only screen and (min-width : 1024px)";
export const IS_TABLET_MEDIA_QUERY =
	"only screen and (min-width : 768px) and (max-width : 1023px)";
export const IS_MOBILE_MEDIA_QUERY = "only screen and (max-width : 767px)";
