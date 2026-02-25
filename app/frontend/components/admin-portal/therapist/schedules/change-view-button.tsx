import { Link } from "@inertiajs/react";
import { GalleryVerticalIcon, StretchHorizontalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ChangeViewButtonProps {
	currentPage: "daySchedules" | "schedules";
	routes: {
		daySchedules: string;
		schedules: string;
	};
}

export default function ChangeViewButton({
	currentPage,
	routes,
}: ChangeViewButtonProps) {
	return (
		<ButtonGroup aria-label="Media controls" className="h-fit">
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="outline"
						size="icon"
						asChild
						className={cn(
							"",
							currentPage === "daySchedules" &&
								"bg-primary text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground",
						)}
					>
						<Link href={routes.daySchedules}>
							<GalleryVerticalIcon />
						</Link>
					</Button>
				</TooltipTrigger>
				<TooltipContent>
					<p>Daily Grid View</p>
				</TooltipContent>
			</Tooltip>

			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="outline"
						size="icon"
						asChild
						className={cn(
							"",
							currentPage === "schedules" &&
								"bg-primary text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground",
						)}
					>
						<Link href={routes.schedules}>
							<StretchHorizontalIcon />
						</Link>
					</Button>
				</TooltipTrigger>
				<TooltipContent>
					<p>Timelines View</p>
				</TooltipContent>
			</Tooltip>
		</ButtonGroup>
	);
}
