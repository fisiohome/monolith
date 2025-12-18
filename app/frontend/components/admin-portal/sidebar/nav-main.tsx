import { Link } from "@inertiajs/react";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { useMemo } from "react";
import { useNavigation } from "@/components/providers/navigation-provider";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

export interface NavMainProps {
	items: {
		title: string;
		url: string;
		icon: LucideIcon;
		isActive: boolean;
		subItems?: {
			title: string;
			url: string;
			isActive: boolean;
		}[];
	}[];
	label?: string;
}

export function NavMain() {
	const { toggleSidebar } = useSidebar();
	const isMobile = useIsMobile();

	// navigation context
	const { navigation } = useNavigation();
	const label = useMemo(() => navigation.main?.label, [navigation.main?.label]);
	const items = useMemo(() => navigation.main?.items, [navigation.main?.items]);

	if (!items) return;

	return (
		<SidebarGroup>
			{label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}

			<SidebarMenu>
				{items.map((item) => {
					if (item.subItems?.length) {
						return (
							<Collapsible
								key={item.title}
								asChild
								defaultOpen={true}
								className="group/collapsible"
							>
								<SidebarMenuItem>
									<CollapsibleTrigger asChild>
										<SidebarMenuButton
											tooltip={item.title}
											isActive={item.subItems.some(
												(subItem) => !!subItem?.isActive,
											)}
											className="motion-preset-slide-down"
										>
											{item.icon && <item.icon />}
											<span>{item.title}</span>
											<ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
										</SidebarMenuButton>
									</CollapsibleTrigger>

									<CollapsibleContent>
										<SidebarMenuSub>
											{item.subItems?.map((subItem) => (
												<SidebarMenuSubItem
													key={subItem.title}
													className="motion-preset-slide-down motion-delay-100"
												>
													<SidebarMenuSubButton
														asChild
														isActive={subItem.isActive}
														onClick={() => {
															if (!isMobile) return;

															toggleSidebar();
														}}
													>
														<Link href={subItem.url}>{subItem.title}</Link>
													</SidebarMenuSubButton>
												</SidebarMenuSubItem>
											))}
										</SidebarMenuSub>
									</CollapsibleContent>
								</SidebarMenuItem>
							</Collapsible>
						);
					}

					return (
						<SidebarMenuItem key={item.title}>
							<SidebarMenuButton
								asChild
								tooltip={item.title}
								isActive={item.isActive}
								className="motion-preset-slide-down"
								onClick={() => {
									if (!isMobile) return;

									toggleSidebar();
								}}
							>
								<Link href={item.url}>
									<item.icon />
									<span>{item.title}</span>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
					);
				})}
			</SidebarMenu>
		</SidebarGroup>
	);
}
