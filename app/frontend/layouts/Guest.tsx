import { ThemeProvider } from "@/components/providers/theme-provider";
import { ToastProvider } from "@/components/providers/toast-provider";
import { PropsWithChildren } from "react";

export default function GuestLayout({ children }: PropsWithChildren) {
  return (
    <ThemeProvider defaultTheme="system" storageKey="portal-ui-theme">
      <ToastProvider>
        {children}
      </ToastProvider>
    </ThemeProvider>
  )
}