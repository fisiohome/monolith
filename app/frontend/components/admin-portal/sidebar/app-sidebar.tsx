import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { GlobalPageProps } from "@/types/globals";
import { Link, usePage } from "@inertiajs/react";
import { HousePlus } from "lucide-react";
import type * as React from "react";
import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";

export default function AppSidebar({
	...props
}: React.ComponentProps<typeof Sidebar>) {
	const { props: globalProps } = usePage<GlobalPageProps>();

	return (
		<Sidebar variant="inset" collapsible="icon" {...props}>
			<SidebarHeader className="motion-preset-bounce">
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size="lg" asChild>
							<Link href={globalProps.adminPortal.router.authenticatedRootPath}>
								<div className="flex items-center justify-center rounded-lg bg-primary aspect-square size-8 text-sidebar-primary-foreground">
									<HousePlus className="size-4" />
								</div>
								<div className="grid flex-1 text-sm leading-tight text-left">
									<span className="font-bold uppercase truncate">
										Fisiohome
									</span>
									<span className="text-xs uppercase truncate">
										Admin Portal
									</span>
								</div>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>

			<SidebarContent>
				<NavMain />
			</SidebarContent>

			<SidebarFooter className="motion-preset-bounce">
				<NavUser />
			</SidebarFooter>
		</Sidebar>
	);
}
