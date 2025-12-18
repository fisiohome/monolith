import { Ban, Mars, Venus } from "lucide-react";
import { cn } from "@/lib/utils";

export const getGenderIcon = (gender: string, classname?: string) => {
	const lower = gender.toLowerCase();
	if (lower === "male") return <Mars className={cn("size-4", classname)} />;
	if (lower === "female") return <Venus className={cn("size-4", classname)} />;
	return <Ban className={cn("size-4", classname)} />;
};
