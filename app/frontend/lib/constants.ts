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

export const ADMIN_TYPES = [
	"SUPER_ADMIN",
	"ADMIN_L1",
	"ADMIN_L2",
	"ADMIN_L3",
	"ADMIN_BACKLOG",
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
] as const;

// * patient condition enums
export const PATIENT_CONDITIONS = [
	"Normal",
	"Only able to sit",
	"Bedridden",
] as const;

export const PATIENT_CONDITIONS_WITH_DESCRIPTION = PATIENT_CONDITIONS.map(
	(condition) => {
		let description = "";

		switch (condition) {
			case "Normal":
				description = "Fully mobile with no restrictions.";
				break;
			case "Only able to sit":
				description =
					"Limited mobility, the patient can sit but not stand or walk.";
				break;
			case "Bedridden":
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
