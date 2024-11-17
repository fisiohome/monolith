import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import type { GlobalPageProps } from "@/types/globals";
import { usePage } from "@inertiajs/react";
import {
	type PropsWithChildren,
	createContext,
	useContext,
	useEffect,
} from "react";
import { Toaster as ToasterSonner } from "sonner";

interface ToastContextProps {
	toast: ReturnType<typeof useToast>["toast"];
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

export const ToastProvider = ({ children }: PropsWithChildren) => {
	const { toast } = useToast();
	const props = usePage<GlobalPageProps>().props;

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		const isSuccess = !!props?.flash?.success;
		const message = props?.flash?.success || props?.flash?.alert;

		if (!message) return;

		toast({
			description: message,
			variant: isSuccess ? "default" : "destructive",
		});
	}, [props]);

	return (
		<ToastContext.Provider value={{ toast }}>
			<Toaster />
			<ToasterSonner />

			{children}
		</ToastContext.Provider>
	);
};

export const useToastContext = () => {
	const context = useContext(ToastContext);
	if (context === undefined) {
		throw new Error("useToastContext must be used within a ToastProvider");
	}
	return context;
};
