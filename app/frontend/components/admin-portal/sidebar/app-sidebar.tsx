import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { humanize } from "@/lib/utils";
import type { AdminTypes } from "@/types/admin-portal/admin";
import type { GlobalPageProps } from "@/types/globals";
import { Link, usePage } from "@inertiajs/react";
import {
	BriefcaseMedical,
	HousePlus,
	LayoutDashboard,
	Users,
} from "lucide-react";
import type * as React from "react";
import { useMemo } from "react";
import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";

export default function AppSidebar({
	...props
}: React.ComponentProps<typeof Sidebar>) {
	const { props: globalProps, url: currentUrl } = usePage<GlobalPageProps>();
	console.log(globalProps);
	const navUserProps = useMemo<React.ComponentProps<typeof NavUser>>(() => {
		const user = {
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

		return { user, url };
	}, [
		globalProps.auth.currentUser?.adminType,
		globalProps.auth.currentUser?.user.email,
		globalProps.auth.currentUser?.name,
		globalProps.adminPortal.router.logout,
		globalProps.adminPortal.router.auth.registration.edit,
	]);
	const navMainProps = useMemo<React.ComponentProps<typeof NavMain>>(() => {
		const dashboardMenu = {
			title: "Dashboard",
			url: globalProps.adminPortal.router.authenticatedRootPath,
			icon: LayoutDashboard,
			isActive: true,
			items: [],
		};
		let userManagementMenu = {
			title: "User Management",
			url: globalProps.adminPortal.router.adminPortal.adminManagement.index,
			icon: Users,
			isActive: true,
			items: [
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
			title: "Brand Management",
			url: globalProps.adminPortal.router.adminPortal.serviceManagement.index,
			icon: BriefcaseMedical,
			isActive: false,
			items: [
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
				items: userManagementMenu.items.filter(
					(item) => item.title !== "Admins",
				),
			};
		}

		const items = [
			dashboardMenu,
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

			if (menu.items && Array.isArray(menu.items) && menu.items.length) {
				updatedMenu.items = menu.items.map((subItem) => {
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
		<Sidebar variant="inset" {...props}>
			<SidebarHeader className="motion-preset-bounce">
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size="lg" asChild>
							<Link href={globalProps.adminPortal.router.authenticatedRootPath}>
								<div className="flex items-center justify-center rounded-lg bg-primary aspect-square size-8 text-sidebar-primary-foreground">
									<HousePlus className="size-4" />
								</div>
								<div className="grid flex-1 text-sm leading-tight text-left">
									<span className="font-semibold truncate">Fisiohome</span>
									<span className="text-xs truncate">Admin Portal</span>
								</div>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<NavMain {...navMainProps} />
				{/* <NavProjects projects={data.projects} /> */}
				{/* <NavSecondary items={data.navSecondary} className="mt-auto" /> */}
			</SidebarContent>
			<SidebarFooter className="motion-preset-bounce">
				<NavUser {...navUserProps} />
			</SidebarFooter>
		</Sidebar>
	);
}
