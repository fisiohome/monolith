import { humanize } from "@/lib/utils";
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

type NavigationProviderProps = {
	children: React.ReactNode;
};

type NaviagtionProviderState = {
	navigation: {
		main: NavMainProps | null;
		user: NavUserProps | null;
	};
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
		const userData = {
			name: humanize(globalProps.auth.currentUser?.name || "Admin"),
			email: globalProps.auth.currentUser?.user.email || "",
			avatar: "",
			type:
				(globalProps.auth.currentUser?.adminType as AdminTypes[number]) ||
				"THERAPIST",
		};
		const url = {
			logout: globalProps.adminPortal.router.logout,
			account:
				globalProps.adminPortal.router.adminPortal.settings.accountSecurity,
		};

		return { userData, url };
	}, [
		globalProps.auth.currentUser?.adminType,
		globalProps.auth.currentUser?.user.email,
		globalProps.auth.currentUser?.name,
		globalProps.adminPortal.router.logout,
		globalProps.adminPortal.router.adminPortal.settings.accountSecurity,
	]);
	const navMainProps = useMemo<NavMainProps>(() => {
		const { adminPortal, authenticatedRootPath } =
			globalProps.adminPortal.router;
		const { currentUserType } = globalProps.auth;

		const isActiveLink = (currentUrl: string, menuUrl: string) => {
			const isRoot = menuUrl === authenticatedRootPath;
			const commonMatch =
				currentUrl === menuUrl || currentUrl.startsWith(`${menuUrl}/`);
			return isRoot ? commonMatch : commonMatch || currentUrl.includes(menuUrl);
		};

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

		const dashboardMenu = createMenuItem(
			"Dashboard",
			authenticatedRootPath,
			LayoutDashboard,
		);
		const appointmentMenu = createMenuItem(
			t("appointment"),
			adminPortal.appointment.index,
			Calendar1,
		);
		const availabilityMenu = createMenuItem(
			t("availability"),
			adminPortal.availability.index,
			CalendarRange,
		);
		const therapistSchedule = createMenuItem(
			t("therapist_schedules"),
			adminPortal.therapistManagement.schedules,
			CalendarDays,
		);
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

		// filter the sub items of user management for therapist user
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

		// Construct menu based on user type
		const items = [dashboardMenu];
		if (currentUserType === "ADMIN") {
			items.push(appointmentMenu, availabilityMenu, therapistSchedule);
		}
		items.push(userManagementMenu, serviceManagementMenu);

		// Determine active state
		const finalItems = items.map((menu) => {
			const updatedMenu = { ...menu, isActive: false };

			if (menu.subItems?.length) {
				updatedMenu.subItems = menu.subItems.map((subItem) => {
					const active = isActiveLink(currentUrl, subItem.url);
					if (active) updatedMenu.isActive = true;
					return { ...subItem, isActive: active };
				});
			} else {
				updatedMenu.isActive = isActiveLink(currentUrl, menu.url);
			}

			return updatedMenu;
		});

		return { items: finalItems };
	}, [currentUrl, globalProps.adminPortal.router, globalProps.auth, t]);

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
