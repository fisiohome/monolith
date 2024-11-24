import { ThemeProvider } from "@/components/providers/theme-provider";
import { ToastProvider } from "@/components/providers/toast-provider";
import type { PropsWithChildren } from "react";

export default function GuestLayout({ children }: PropsWithChildren) {
	return (
		<ThemeProvider>
			<ToastProvider>{children}</ToastProvider>
		</ThemeProvider>
	);
}
