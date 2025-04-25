import i18n from "i18next";
import HttpBackend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import ChainedBackend from "i18next-chained-backend";
import LocalStorageBackend from "i18next-localstorage-backend";

function genRandonNumber(length: number) {
	const chars = "0123456789";
	const charLength = chars.length;
	let result = "";
	for (let i = 0; i < length; i++) {
		result += chars.charAt(Math.floor(Math.random() * charLength));
	}
	return result;
}

const LOCAL_DOMAINS = ["localhost", "127.0.0.1"];
const HASH = genRandonNumber(10);

i18n
	// load translation using http -> see /public/locales
	// learn more: https://github.com/i18next/i18next-http-backend
	.use(ChainedBackend)
	// detect user language
	// learn more: https://github.com/i18next/i18next-browser-languageDetector
	.use(LanguageDetector)
	// pass the i18n instance to react-i18next.
	.use(initReactI18next)
	// init i18next
	// for all options read: https://www.i18next.com/overview/configuration-options
	.init({
		fallbackLng: "en",
		// debug only in dev
		debug: LOCAL_DOMAINS.includes(window.location.hostname),

		backend: {
			backends: [
				LocalStorageBackend, // primary
				HttpBackend, // fallback
			],
			backendOptions: [
				{
					expirationTime: 24 * 60 * 60 * 1000 * 3, // 3 days
					defaultVersion: `v${HASH}`, // generate a new version every build to refresh
				},
			],
			cacheHitMode: "refreshAndUpdateStore", // learn more: https://github.com/i18next/i18next-chained-backend,
		},

		react: {
			bindI18nStore: "added", // this way, when the HttpBackend delivers new translations (thanks to refreshAndUpdateStore), the UI gets updated
		},
	});

i18n.on("languageChanged", () => {
	document.documentElement.lang = i18n.language;
});

export default i18n;
