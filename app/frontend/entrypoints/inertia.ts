import AdminLayout from "@/layouts/Admin";
import GuestLayout from "@/layouts/Guest";
import { createInertiaApp } from "@inertiajs/react";
import { type ReactNode, createElement } from "react";
import { createRoot } from "react-dom/client";

type ResolvedComponent = {
	default: ReactNode;
	layout?: (page: ReactNode) => ReactNode;
};

createInertiaApp({
	// Set default page title
	// see https://inertia-rails.netlify.app/guide/title-and-meta
	//
	// title: title => title ? `${title} - App` : 'App',
	title: (title) => (title ? `${title} - Admin Portal` : "Admin Portal"),

	// Disable progress bar
	//
	// see https://inertia-rails.netlify.app/guide/progress-indicators
	// progress: false,

	resolve: (name) => {
		const pages = import.meta.glob<ResolvedComponent>("../pages/**/*.tsx", {
			eager: true,
		});
		// return pages[`../pages/${name}.tsx`]

		// To use a default layout, import the Layout component
		// and use the following lines.
		// see https://inertia-rails.netlify.app/guide/pages#default-layouts
		//
		// const page = pages[`../pages/${name}.tsx`]
		// page.default.layout ||= (page) => createElement(Layout, null, page)

		const useGuestLayout = name.startsWith("Auth/") || name === "Error";
		const useAdminLayout = name.startsWith("AdminPortal/");
		const page = pages[`../pages/${name}.tsx`];
		// @ts-ignore
		page.default.layout = useAdminLayout
			// @ts-ignore
			? (page: ResolvedComponent) => createElement(AdminLayout, null, page)
			: useGuestLayout
				// @ts-ignore
				? (page: ResolvedComponent) => createElement(GuestLayout, null, page)
				: undefined;

		return page;
	},

	setup({ el, App, props }) {
		const root = createRoot(el);

		root.render(createElement(App, props));
	},
});
