import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ContextFn, Locale } from "date-fns";
import { enUS } from "date-fns/locale";
import { tz } from "@date-fns/tz";
import i18n from "@/lib/i18n";
import { LOCALES } from "@/lib/constants";
import { usePage } from "@inertiajs/react";
import type { GlobalPageProps } from "@/types/globals";

type DateProviderProps = {
	children: React.ReactNode;
};

type DateProviderState = {
	locale: Locale;
	timezone: string;
	tzDate: ContextFn<Date>;
};

const DateProviderContext = createContext<DateProviderState>({
	locale: enUS,
	timezone: "Asia/Jakarta",
	tzDate: tz("Asia/Jakarta"),
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

	const contextValue = useMemo(() => {
		return { locale, timezone, tzDate: tz(timezone) };
	}, [locale, timezone]);

	return (
		<DateProviderContext.Provider value={contextValue}>
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
