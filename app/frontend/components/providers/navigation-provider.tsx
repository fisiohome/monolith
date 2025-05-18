import { humanize, populateQueryParams } from "@/lib/utils";
import type { AdminTypes } from "@/types/admin-portal/admin";
import type { GlobalPageProps } from "@/types/globals";
import { usePage } from "@inertiajs/react";
import {
	Calendar1,
	CalendarDays,
	CalendarRange,
	Hospital,
	LayoutDashboard,
	Users,
} from "lucide-react";
import { createContext, useContext, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { NavMainProps } from "../admin-portal/sidebar/nav-main";
import type { NavUserProps } from "../admin-portal/sidebar/nav-user";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";

type NavigationProviderProps = {
	children: React.ReactNode;
};

type NaviagtionProviderState = {
	navigation: {
		main: NavMainProps | null;
		user: NavUserProps | null;
	};
};

// Utility to strip query parameters
const stripQueryParams = (url: string) => url.split("?")[0];
// Compare URLs ignoring query parameters
const isActiveLink = (
	currentUrl: string,
	menuUrl: string,
	rootPath: string,
) => {
	const cleanCurrentUrl = stripQueryParams(currentUrl);
	const cleanMenuUrl = stripQueryParams(menuUrl);
	const isRoot = cleanMenuUrl === rootPath;

	const exactOrSubMatch =
		cleanCurrentUrl === cleanMenuUrl ||
		cleanCurrentUrl.startsWith(`${cleanMenuUrl}/`);

	return isRoot
		? exactOrSubMatch
		: exactOrSubMatch || cleanCurrentUrl.includes(cleanMenuUrl);
};

const initialState: NaviagtionProviderState = {
	navigation: {
		main: null,
		user: null,
	},
};

const NavigationProviderContext =
	createContext<NaviagtionProviderState>(initialState);

export function NavigationProvider({
	children,
	...props
}: NavigationProviderProps) {
	const { props: globalProps, url: currentUrl } = usePage<GlobalPageProps>();
	const { t } = useTranslation("side-menu");

	const navUserProps = useMemo<NavUserProps>(() => {
		const currentUser = globalProps.auth.currentUser;
		const globalRouter = globalProps.adminPortal.router;

		const userData = {
			name: humanize(currentUser?.name || "Admin"),
			email: currentUser?.user.email || "",
			avatar: "",
			type: (currentUser?.adminType as AdminTypes[number]) || "THERAPIST",
		};
		const url = {
			logout: globalRouter.logout,
			account: globalRouter.adminPortal.settings.accountSecurity,
		};

		return { userData, url };
	}, [globalProps]);

	const navMainProps = useMemo<NavMainProps>(() => {
		const { adminPortal, authenticatedRootPath } =
			globalProps.adminPortal.router;
		const { currentUserType } = globalProps.auth;

		// * Helper to create menu items
		const createMenuItem = (
			title: string,
			url: string,
			icon: any,
			subItems: { title: string; url: string; isActive: boolean }[] = [],
		) => ({
			title,
			url,
			icon,
			isActive: false,
			subItems,
		});

		// * Build menus
		const dashboardMenu = createMenuItem(
			"Dashboard",
			authenticatedRootPath,
			LayoutDashboard,
		);
		// Use the utility to append the additional param
		const { fullUrl } = populateQueryParams(
			adminPortal.appointment.index,
			deepTransformKeysToSnakeCase({
				assignedTo: "me",
			}),
		);
		const appointmentMenu = createMenuItem(
			t("appointment"),
			fullUrl,
			Calendar1,
		);
		const availabilityMenu = createMenuItem(
			t("availability"),
			adminPortal.availability.index,
			CalendarRange,
		);
		const therapistScheduleMenu = createMenuItem(
			t("therapist_schedules"),
			adminPortal.therapistManagement.schedules,
			CalendarDays,
		);
		// filter the sub items of user management for therapist user
		const userManagementSubItems = [
			{
				title: t("admins"),
				url: adminPortal.adminManagement.index,
				isActive: false,
			},
			{
				title: t("therapists"),
				url: adminPortal.therapistManagement.index,
				isActive: false,
			},
		];
		const filteredUserSubItems =
			currentUserType === "THERAPIST"
				? userManagementSubItems.filter((item) => item.title !== t("admins"))
				: userManagementSubItems;
		const userManagementMenu = createMenuItem(
			t("user_management"),
			adminPortal.adminManagement.index,
			Users,
			filteredUserSubItems,
		);
		const serviceManagementMenu = createMenuItem(
			t("brand_and_location"),
			adminPortal.serviceManagement.index,
			Hospital,
			[
				{
					title: t("brands"),
					url: adminPortal.serviceManagement.index,
					isActive: false,
				},
				{
					title: t("locations"),
					url: adminPortal.locationManagement.index,
					isActive: false,
				},
			],
		);

		// * Construct menu based on user type
		const allMenus = [dashboardMenu];
		if (currentUserType === "ADMIN") {
			allMenus.push(appointmentMenu, availabilityMenu, therapistScheduleMenu);
		}
		allMenus.push(userManagementMenu, serviceManagementMenu);

		// * Determine which items are active
		const finalItems = allMenus.map((menu) => {
			const updatedMenu = { ...menu, isActive: false };

			if (menu.subItems.length) {
				updatedMenu.subItems = menu.subItems.map((subItem) => {
					const active = isActiveLink(
						currentUrl,
						subItem.url,
						authenticatedRootPath,
					);
					if (active) updatedMenu.isActive = true;
					return { ...subItem, isActive: active };
				});
			} else {
				updatedMenu.isActive = isActiveLink(
					currentUrl,
					menu.url,
					authenticatedRootPath,
				);
			}

			return updatedMenu;
		});

		return { items: finalItems };
	}, [currentUrl, globalProps, t]);

	return (
		<NavigationProviderContext.Provider
			{...props}
			value={{ navigation: { main: navMainProps, user: navUserProps } }}
		>
			{children}
		</NavigationProviderContext.Provider>
	);
}

export const useNavigation = () => {
	const context = useContext(NavigationProviderContext);

	if (context === undefined)
		throw new Error(
			"useNavigation must be used within a NavigationProviderContext",
		);

	return context;
};
