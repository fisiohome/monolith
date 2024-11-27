import { ThemeProvider } from "@/components/providers/theme-provider";
import { ToastProvider } from "@/components/providers/toast-provider";
import AppSidebar from "@/components/sidebar/app-sidebar";
import AppTopBar from "@/components/topbar/app-topbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SIDEBAR_WIDTH, SIDEBAR_WIDTH_MOBILE } from "@/lib/constants";
import { type PropsWithChildren, useMemo } from "react";

export default function AdminLayout({ children }: PropsWithChildren) {
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
			<ToastProvider>
				<SidebarProvider style={sidebarStyle}>
					<AppSidebar />

					<SidebarInset>
						<AppTopBar />

						<div className="flex flex-col flex-1 gap-4 pt-0 md:p-4">
							{children}
						</div>
					</SidebarInset>
				</SidebarProvider>
			</ToastProvider>
		</ThemeProvider>
	);
}
