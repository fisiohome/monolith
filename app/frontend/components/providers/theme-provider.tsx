import { useLocalStorage } from "@uidotdev/usehooks";
import { createContext, useContext, useEffect, useMemo } from "react";
import {
	DEFAULT_THEME,
	DEFAULT_USER_PREFERENCES,
	type Theme,
	USER_PREF_STORAGE_KEY,
} from "@/lib/constants";

type ThemeProviderProps = {
	children: React.ReactNode;
};

type ThemeProviderState = {
	theme: Theme;
	setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
	theme: DEFAULT_THEME,
	setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
	const [userPreferences, setUserPreferences] = useLocalStorage(
		USER_PREF_STORAGE_KEY,
		{
			...DEFAULT_USER_PREFERENCES,
		},
	);
	const theme = useMemo(() => userPreferences.theme, [userPreferences.theme]);

	useEffect(() => {
		const root = window.document.documentElement;

		root.classList.remove("light", "dark");

		if (theme === "system") {
			const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
				.matches
				? "dark"
				: "light";

			root.classList.add(systemTheme);
			return;
		}

		root.classList.add(theme);
	}, [theme]);

	const value = {
		theme,
		setTheme: (theme: Theme) => {
			setUserPreferences((prev) => ({ ...prev, theme }));
		},
	};

	return (
		<ThemeProviderContext.Provider {...props} value={value}>
			{children}
		</ThemeProviderContext.Provider>
	);
}

export const useTheme = () => {
	const context = useContext(ThemeProviderContext);

	if (context === undefined)
		throw new Error("useTheme must be used within a ThemeProvider");

	return context;
};
