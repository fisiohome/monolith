// import AppSidebar from "@/components/sidebar/app-sidebar";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ToastProvider } from "@/components/providers/toast-provider";
// import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
// import { SIDEBAR_WIDTH, SIDEBAR_WIDTH_MOBILE } from "@/lib/constants";
import { PropsWithChildren, useMemo } from "react";
// import AppTopBar from "@/components/topbar/app-topbar";

export default function AdminLayout({ children }: PropsWithChildren) {
  // const sidebarStyle = useMemo(() => ({
  //   "--sidebar-width": SIDEBAR_WIDTH,
  //   "--sidebar-width-mobile": SIDEBAR_WIDTH_MOBILE,
  // } as Record<string, any>),
  //   [SIDEBAR_WIDTH, SIDEBAR_WIDTH_MOBILE]
  // )

  return (
    <ThemeProvider defaultTheme="system">
      <ToastProvider>
        {/* <SidebarProvider style={sidebarStyle}>
          <AppSidebar />

          <SidebarInset>
            <AppTopBar /> */}

        <div className="flex flex-col flex-1 gap-4 p-4 pt-0 h-[1000px]">
          {children}
        </div>
        {/* </SidebarInset>
        </SidebarProvider> */}
      </ToastProvider>
    </ThemeProvider>
  )
}