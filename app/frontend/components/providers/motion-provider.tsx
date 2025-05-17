import { MotionGlobalConfig } from "framer-motion";
import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";

export const STORAGE_KEY = "portal-ui-motion";
export type MotionPreference = "on" | "off" | "system";

type MotionProviderProps = {
	children: React.ReactNode;
	defaultMotion?: MotionPreference;
	storageKey?: string;
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
	defaultMotion = "system",
	storageKey = STORAGE_KEY,
}: MotionProviderProps) => {
	const [motion, setMotionState] = useState<MotionPreference>(
		() =>
			(localStorage.getItem(STORAGE_KEY) as MotionPreference) || defaultMotion,
	);

	useEffect(() => {
		localStorage.setItem(storageKey, motion);

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
	}, [motion, storageKey]);

	const setMotion = (motion: MotionPreference) => setMotionState(motion);

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
