import { tz } from "@date-fns/tz";
import { usePage } from "@inertiajs/react";
import { useLocalStorage } from "@uidotdev/usehooks";
import type { ContextFn, Locale } from "date-fns";
import { enUS } from "date-fns/locale";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
	DEFAULT_TIME_FORMAT_12,
	DEFAULT_TIME_FORMAT_12_DATE_FNS,
	DEFAULT_TIME_FORMAT_24_DATE_FNS,
	DEFAULT_TIMEZONE,
	DEFAULT_USER_PREFERENCES,
	LOCALES,
	type TimeFormat,
	type TimeFormatDateFns,
	USER_PREF_STORAGE_KEY,
} from "@/lib/constants";
import i18n from "@/lib/i18n";
import type { GlobalPageProps } from "@/types/globals";

type DateProviderProps = {
	children: React.ReactNode;
};

type DateProviderState = {
	locale: Locale;
	timezone: string;
	tzDate: ContextFn<Date>;
	timeFormat: TimeFormat;
	setTimeFormat: (value: TimeFormat) => void;
	timeFormatDateFns: TimeFormatDateFns;
};

const DateProviderContext = createContext<DateProviderState>({
	locale: enUS,
	timezone: DEFAULT_TIMEZONE,
	tzDate: tz(DEFAULT_TIMEZONE),
	timeFormat: DEFAULT_TIME_FORMAT_12,
	setTimeFormat: () => {},
	timeFormatDateFns: DEFAULT_TIME_FORMAT_12_DATE_FNS,
});

export function DateProvider({ children }: DateProviderProps) {
	const { props: globalProps } = usePage<GlobalPageProps>();

	// * watching the current language
	const [currentLanguage, setCurrentLanguage] = useState(i18n.language);
	useEffect(() => {
		// Define the event handler that updates state on language change
		const handleLanguageChange = (lng: string) => {
			setCurrentLanguage(lng);
			// You can perform other side effects here if needed
			console.log("Language changed to:", lng);
		};

		// Subscribe to the languageChanged event
		i18n.on("languageChanged", handleLanguageChange);

		// Clean up the event listener on unmount
		return () => {
			i18n.off("languageChanged", handleLanguageChange);
		};
	}, []);

	// * time preference toggler
	const [userPreferences, setUserPreferences] = useLocalStorage(
		USER_PREF_STORAGE_KEY,
		{
			...DEFAULT_USER_PREFERENCES,
		},
	);
	const timeFormatDateFns = useMemo(
		() =>
			userPreferences.timeFormat === "12-hours"
				? DEFAULT_TIME_FORMAT_12_DATE_FNS
				: DEFAULT_TIME_FORMAT_24_DATE_FNS,
		[userPreferences.timeFormat],
	);

	// * get the date-fns locale an timezone
	const locale = useMemo(() => {
		// ? this is using the locale from i18n library
		return currentLanguage === "id" ? LOCALES.id : LOCALES.enUS;

		// ? this is using the locale from the server
		// let locale = "" as unknown as Locale;
		// switch (globalProps.adminPortal.currentLocale) {
		// 	case "en":
		// 		locale = LOCALES.enUS;
		// 		break;
		// 	case "id":
		// 		locale = LOCALES.id;
		// 		break;
		// 	default:
		// 		locale = LOCALES.enUS;
		// 		break;
		// }
		// return locale;
	}, [currentLanguage]);
	const timezone = useMemo(
		() => globalProps.adminPortal.currentTimezone,
		[globalProps.adminPortal.currentTimezone],
	);

	return (
		<DateProviderContext.Provider
			value={{
				locale,
				timezone,
				tzDate: tz(timezone),
				timeFormat: userPreferences.timeFormat,
				setTimeFormat: (timeFormat: TimeFormat) => {
					setUserPreferences((prev) => ({ ...prev, timeFormat }));
				},
				timeFormatDateFns,
			}}
		>
			{children}
		</DateProviderContext.Provider>
	);
}

export const useDateContext = () => {
	const context = useContext(DateProviderContext);

	if (context === undefined)
		throw new Error("useDateContext must be used within a DateProvider");

	return context;
};
