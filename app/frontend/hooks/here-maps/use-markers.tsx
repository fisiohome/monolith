import { useMemo } from "react";

export default function useMarkers() {
	const primaryIcon = useMemo(() => {
		const svg = `<svg width="40" height="40" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="cursor-pointer">
        <path fill="#8b5cf6" d="M12 2C8.13 2 5 5.13 5 9c0 4.97 7 13 7 13s7-8.03 7-13c0-3.87-3.13-7-7-7z"/>
        <circle cx="12" cy="9" r="4" fill="#FFFFFF"/>
      </svg>`;

		return new H.map.Icon(svg);
	}, []);
	const secondaryIcon = useMemo(() => {
		const svg = `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="cursor-pointer">
        <path fill="#000" d="M12 2C8.13 2 5 5.13 5 9c0 4.97 7 13 7 13s7-8.03 7-13c0-3.87-3.13-7-7-7z"/>
        <circle cx="12" cy="9" r="4" fill="#FFFFFF"/>
      </svg>`;

		return new H.map.Icon(svg);
	}, []);

	return { primaryIcon, secondaryIcon };
}

export function useTherapistMarker() {
	const therapistIcon = useMemo(() => {
		const flatSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-stethoscope cursor-pointer"><path d="M11 2v2"/><path d="M5 2v2"/><path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1"/><path d="M8 15a6 6 0 0 0 12 0v-3"/><circle cx="20" cy="10" r="2"/></svg>`;

		const karpisSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-award-icon lucide-award cursor-pointer"><path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/><circle cx="12" cy="8" r="6"/></svg>`;

		return {
			KARPIS: new H.map.Icon(karpisSvg),
			FLAT: new H.map.Icon(flatSvg),
		};
	}, []);

	return therapistIcon;
}
