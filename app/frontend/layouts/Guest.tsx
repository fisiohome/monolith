import type { PropsWithChildren } from "react";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ToastProvider } from "@/components/providers/toast-provider";

export default function GuestLayout({ children }: PropsWithChildren) {
	return (
		<ThemeProvider>
			<ToastProvider>{children}</ToastProvider>
		</ThemeProvider>
	);
}
