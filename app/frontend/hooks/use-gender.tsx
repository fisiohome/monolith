import { Mars, Venus, VenusAndMars } from "lucide-react";

export const getGenderIcon = (gender: string) => {
	const lower = gender.toLowerCase();
	if (lower === "male") return <Mars className="size-4" />;
	if (lower === "female") return <Venus className="size-4" />;
	return <VenusAndMars className="size-4" />;
};
