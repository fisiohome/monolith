import { Link } from "@inertiajs/react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ApptViewChangerProps {
	activeView: "appointments" | "drafts" | "orders";
	showNewBadge?: boolean;
}

export const ROUTES = {
	APPOINTMENTS: "/admin-portal/appointments",
	DRAFTS: "/admin-portal/appointments/drafts",
	ORDERS: "/admin-portal/appointments/orders",
};

export default function ApptViewChanger({
	activeView,
	showNewBadge = false,
}: ApptViewChangerProps) {
	return (
		<Tabs value={activeView} className="items-center w-full lg:w-auto">
			<ScrollArea>
				<TabsList className="w-full lg:w-auto">
					<TabsTrigger
						value="appointments"
						asChild
						className="w-full lg:w-auto"
					>
						<Link href={ROUTES.APPOINTMENTS}>Visits</Link>
					</TabsTrigger>
					<TabsTrigger
						value="orders"
						className="group w-full lg:w-auto"
						asChild
					>
						<Link href={ROUTES.ORDERS}>
							Orders
							{showNewBadge && (
								<Badge className="ms-1.5 transition-opacity group-data-[state=inactive]:opacity-50">
									New
								</Badge>
							)}
						</Link>
					</TabsTrigger>
					<TabsTrigger
						value="drafts"
						className="group w-full lg:w-auto"
						asChild
					>
						<Link href={ROUTES.DRAFTS}>
							Drafts
							{showNewBadge && (
								<Badge className="ms-1.5 transition-opacity group-data-[state=inactive]:opacity-50">
									New
								</Badge>
							)}
						</Link>
					</TabsTrigger>
				</TabsList>

				<ScrollBar orientation="horizontal" />
			</ScrollArea>
		</Tabs>
	);
}
