import { useLocalStorage } from "@uidotdev/usehooks";
import { MotionGlobalConfig } from "framer-motion";
import type React from "react";
import { createContext, useContext, useEffect, useMemo } from "react";
import {
	DEFAULT_USER_PREFERENCES,
	type MotionPreference,
	USER_PREF_STORAGE_KEY,
} from "@/lib/constants";

export const STORAGE_KEY = "portal-ui-motion";

type MotionProviderProps = {
	children: React.ReactNode;
};

interface MotionContextProps {
	motion: MotionPreference;
	setMotion: (motion: MotionPreference) => void;
}

const MotionProviderContext = createContext<MotionContextProps | undefined>(
	undefined,
);

export const MotionProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}: MotionProviderProps) => {
	const [userPreferences, setUserPreferences] = useLocalStorage(
		USER_PREF_STORAGE_KEY,
		{
			...DEFAULT_USER_PREFERENCES,
		},
	);
	const motion = useMemo(
		() => userPreferences.motion,
		[userPreferences.motion],
	);

	useEffect(() => {
		// Optionally, check prefers-reduced-motion
		const prefersReduced = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;
		const shouldDisableMotion =
			motion === "off" || (motion === "system" && prefersReduced);

		// add/remove a class to <body> for global CSS
		document.body.classList.toggle("motion-off", shouldDisableMotion);

		// skip animations the framer-motion if motion preference is off
		MotionGlobalConfig.skipAnimations = shouldDisableMotion;
	}, [motion]);

	const setMotion = (motion: MotionPreference) => {
		setUserPreferences((prev) => ({ ...prev, motion }));
	};

	return (
		<MotionProviderContext.Provider value={{ motion, setMotion }}>
			{children}
		</MotionProviderContext.Provider>
	);
};

export const useMotion = () => {
	const context = useContext(MotionProviderContext);
	if (context === undefined) {
		throw new Error("useMotion must be used within a MotionProvider");
	}
	return context;
};
