import { humanize } from "@/lib/utils";
import type { AdminTypes } from "@/types/admin-portal/admin";
import type { GlobalPageProps } from "@/types/globals";
import { usePage } from "@inertiajs/react";
import {
	BriefcaseMedical,
	Calendar1,
	CalendarRange,
	LayoutDashboard,
	Users,
} from "lucide-react";
import { createContext, useContext, useMemo } from "react";
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
			account: globalProps.adminPortal.router.auth.registration.edit,
		};

		return { userData, url };
	}, [
		globalProps.auth.currentUser?.adminType,
		globalProps.auth.currentUser?.user.email,
		globalProps.auth.currentUser?.name,
		globalProps.adminPortal.router.logout,
		globalProps.adminPortal.router.auth.registration.edit,
	]);
	const navMainProps = useMemo<NavMainProps>(() => {
		const dashboardMenu = {
			title: "Dashboard",
			url: globalProps.adminPortal.router.authenticatedRootPath,
			icon: LayoutDashboard,
			isActive: true,
			subItems: [],
		};
		const appointmentMenu = {
			title: "Appointment",
			url: globalProps.adminPortal.router.adminPortal.appointment.index,
			icon: Calendar1,
			isActive: true,
			subItems: [],
		};
		const availabilityMenu = {
			title: "Availability Time",
			url: globalProps.adminPortal.router.adminPortal.availability.index,
			icon: CalendarRange,
			isActive: true,
			subItems: [],
		};
		let userManagementMenu = {
			title: "User Management",
			url: globalProps.adminPortal.router.adminPortal.adminManagement.index,
			icon: Users,
			isActive: false,
			subItems: [
				{
					title: "Admins",
					url: globalProps.adminPortal.router.adminPortal.adminManagement.index,
					isActive: false,
				},
				{
					title: "Therapists",
					url: globalProps.adminPortal.router.adminPortal.therapistManagement
						.index,
					isActive: false,
				},
			],
		};
		const serviceManagementMenu = {
			title: "Brands & Locations",
			url: globalProps.adminPortal.router.adminPortal.serviceManagement.index,
			icon: BriefcaseMedical,
			isActive: false,
			subItems: [
				{
					title: "Brands",
					url: globalProps.adminPortal.router.adminPortal.serviceManagement
						.index,
					isActive: false,
				},
				{
					title: "Locations",
					url: globalProps.adminPortal.router.adminPortal.locationManagement
						.index,
					isActive: false,
				},
			],
		};

		// filtering menu items for therapist user account
		if (globalProps.auth.currentUserType === "THERAPIST") {
			userManagementMenu = {
				...userManagementMenu,
				subItems: userManagementMenu.subItems.filter(
					(item) => item.title !== "Admins",
				),
			};
		}

		const items = [
			dashboardMenu,
			appointmentMenu,
			availabilityMenu,
			userManagementMenu,
			serviceManagementMenu,
		].map((menu) => {
			const isActiveLink = (currentUrl: string, menuUrl: string) => {
				const isRoot =
					menuUrl === globalProps.adminPortal.router.authenticatedRootPath;
				const commonActiveURL =
					currentUrl === menuUrl || currentUrl.startsWith(`${menuUrl}/`);

				if (!isRoot) return commonActiveURL || currentUrl.includes(menuUrl);

				return commonActiveURL;
			};
			const updatedMenu = { ...menu, isActive: false };

			if (
				menu.subItems &&
				Array.isArray(menu.subItems) &&
				menu.subItems.length
			) {
				updatedMenu.subItems = menu.subItems.map((subItem) => {
					const isActive = isActiveLink(currentUrl, subItem.url);
					if (isActive) {
						updatedMenu.isActive = true; // Set parent as active
					}
					return { ...subItem, isActive };
				});
			} else {
				updatedMenu.isActive =
					!!menu?.url && isActiveLink(currentUrl, menu.url);
			}

			return updatedMenu;
		});

		return {
			// label: "User Management",
			items,
		};
	}, [
		currentUrl,
		globalProps.adminPortal.router.adminPortal,
		globalProps.adminPortal.router.authenticatedRootPath,
		globalProps.auth.currentUserType,
	]);

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
