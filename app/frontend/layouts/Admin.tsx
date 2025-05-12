import AppSidebar from "@/components/admin-portal/sidebar/app-sidebar";
import AppTopBar from "@/components/admin-portal/topbar/app-topbar";
import { DateProvider } from "@/components/providers/date-provider";
import { NavigationProvider } from "@/components/providers/navigation-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ToastProvider } from "@/components/providers/toast-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SIDEBAR_WIDTH, SIDEBAR_WIDTH_MOBILE } from "@/lib/constants";
import Cookies from "js-cookie";
import { type PropsWithChildren, useMemo } from "react";

function LayoutProviders({ children }: PropsWithChildren) {
	const defaultOpen = Cookies.get("sidebar:state") === "true";
	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	const sidebarStyle = useMemo(
		() =>
			({
				"--sidebar-width": SIDEBAR_WIDTH,
				"--sidebar-width-mobile": SIDEBAR_WIDTH_MOBILE,
			}) as Record<string, any>,
		[SIDEBAR_WIDTH, SIDEBAR_WIDTH_MOBILE],
	);

	return (
		<ThemeProvider>
			<DateProvider>
				<ToastProvider>
					<SidebarProvider style={sidebarStyle} defaultOpen={defaultOpen}>
						<NavigationProvider>{children}</NavigationProvider>
					</SidebarProvider>
				</ToastProvider>
			</DateProvider>
		</ThemeProvider>
	);
}

export default function AdminLayout({ children }: PropsWithChildren) {
	return (
		<LayoutProviders>
			<AppSidebar />

			<SidebarInset>
				<AppTopBar />

				<div className="flex flex-col flex-1 gap-4 pt-0 md:p-4 motion-preset-focus motion-delay-200">
					{children}
				</div>

				{/* NOTE: if needed the bottom nav (good for mobile device) */}
				{/* <nav className="sticky bottom-0 z-20 flex items-center justify-center w-full p-4 rounded-xl bg-background">
								<Button>
									<span>Dashboard</span>
								</Button>
							</nav> */}
			</SidebarInset>
		</LayoutProviders>
	);
}
