import { cn } from "@/lib/utils";
import { Mars, Venus, VenusAndMars } from "lucide-react";

export const getGenderIcon = (gender: string, classname?: string) => {
	const lower = gender.toLowerCase();
	if (lower === "male") return <Mars className={cn("size-4", classname)} />;
	if (lower === "female") return <Venus className={cn("size-4", classname)} />;
	return <VenusAndMars className={cn("size-4", classname)} />;
};
