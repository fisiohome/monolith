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
import type { GlobalPageProps } from "@/types/globals";
import { Link, usePage } from "@inertiajs/react";
import { HandPlatter, HousePlus, Users } from "lucide-react";
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
			name: globalProps.auth.currentUser?.adminType
				? humanize(globalProps.auth.currentUser?.adminType)
				: "Admin",
			email: globalProps.auth.currentUser?.user.email || "",
			avatar: "",
		};
		const url = {
			logout: globalProps.adminPortal.router.logout,
			account: globalProps.adminPortal.router.auth.registration.edit,
		};

		return { user, url };
	}, [
		globalProps.auth.currentUser?.user.email,
		globalProps.auth.currentUser?.adminType,
		globalProps.adminPortal.router.logout,
		globalProps.adminPortal.router.auth.registration.edit,
	]);
	const navMainProps = useMemo<React.ComponentProps<typeof NavMain>>(() => {
		// const label = 'Users Management'
		const items = [
			{
				title: "User Management",
				url: globalProps.adminPortal.router.authenticatedRootPath,
				icon: Users,
				isActive: true,
				items: [
					{
						title: "Admins",
						url: globalProps.adminPortal.router.authenticatedRootPath,
						isActive: false,
					},
					{
						title: "Therapists",
						url: globalProps.adminPortal.router.adminPortal.therapistManagement
							.index,
						isActive: false,
					},
				],
			},
			{
				title: "Service Management",
				url: globalProps.adminPortal.router.adminPortal.serviceManagement.index,
				icon: HandPlatter,
				isActive: false,
				items: [
					{
						title: "Services",
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
			},
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

			if (menu.items && Array.isArray(menu.items)) {
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

		return { items };
	}, [
		currentUrl,
		globalProps.adminPortal.router.adminPortal,
		globalProps.adminPortal.router.authenticatedRootPath,
	]);

	return (
		<Sidebar variant="inset" {...props}>
			<SidebarHeader>
				<SidebarMenu className="rounded-md shadow bg-background">
					<SidebarMenuItem>
						<SidebarMenuButton size="lg" asChild>
							<Link href={globalProps.adminPortal.router.authenticatedRootPath}>
								<div className="flex items-center justify-center bg-purple-600 rounded-lg aspect-square size-8 text-sidebar-primary-foreground">
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
			<SidebarFooter>
				<NavUser {...navUserProps} />
			</SidebarFooter>
		</Sidebar>
	);
}
