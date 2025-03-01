import { useNavigation } from "@/components/providers/navigation-provider";
import { type Theme, useTheme } from "@/components/providers/theme-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuPortal,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { generateInitials } from "@/lib/utils";
import type { AdminTypes } from "@/types/admin-portal/admin";
import { Link } from "@inertiajs/react";
import {
	ChevronsUpDown,
	LogOut,
	Moon,
	Settings,
	Sun,
	SunMoon,
} from "lucide-react";
import { useMemo } from "react";

export interface NavUserProps {
	userData: {
		name: string;
		email: string;
		avatar: string;
		type: AdminTypes[number] | "THERAPIST";
	};
	url: {
		logout: string;
		account: string;
	};
}

export function NavUser() {
	const { isMobile } = useSidebar();

	// theme context
	const { theme, setTheme } = useTheme();
	const handleToggleTheme = (value: string) => {
		const themeValue = value as Theme;
		setTheme(themeValue);
	};

	// navigation context
	const { navigation } = useNavigation();
	const user = useMemo(
		() => navigation.user?.userData,
		[navigation.user?.userData],
	);
	const url = useMemo(() => navigation.user?.url, [navigation.user?.url]);

	if (!user || !url) return;

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						>
							<Avatar className="rounded-lg size-10">
								<AvatarImage src={user.avatar} alt={user.name} />
								<AvatarFallback className="rounded-lg">
									{generateInitials(user.name)}
								</AvatarFallback>
							</Avatar>
							<div className="grid my-1 text-sm leading-tight text-left">
								<span className="text-[8px] uppercase bg-primary px-1 rounded text-primary-foreground justify-self-start">
									{user.type.replaceAll("_", " ")}
								</span>
								<div className="flex flex-col">
									<span className="font-semibold uppercase truncate">
										{user.name}
									</span>
									<span className="text-xs truncate">{user.email}</span>
								</div>
							</div>
							<ChevronsUpDown className="ml-auto size-4" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
						side={isMobile ? "bottom" : "right"}
						align="end"
						sideOffset={4}
					>
						<DropdownMenuLabel className="p-0 font-normal">
							<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
								<Avatar className="w-8 h-8 rounded-lg">
									<AvatarImage src={user.avatar} alt={user.name} />
									<AvatarFallback className="rounded-lg">
										{generateInitials(user.name)}
									</AvatarFallback>
								</Avatar>
								<div className="grid flex-1 text-sm leading-tight text-left">
									<span className="font-semibold capitalize truncate">
										{user.name}
									</span>
									<span className="text-xs truncate">{user.email}</span>
								</div>
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuSub>
							<DropdownMenuSubTrigger>
								{theme === "system" ? (
									<SunMoon className="h-[1.2rem] w-[1.2rem]" />
								) : (
									<>
										<Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
										<Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
									</>
								)}
								Toggle Theme
							</DropdownMenuSubTrigger>
							<DropdownMenuPortal>
								<DropdownMenuSubContent>
									<DropdownMenuRadioGroup
										value={theme}
										onValueChange={handleToggleTheme}
									>
										<DropdownMenuRadioItem
											value="dark"
											onSelect={(event) => event.preventDefault()}
										>
											Dark
										</DropdownMenuRadioItem>
										<DropdownMenuRadioItem
											value="light"
											onSelect={(event) => event.preventDefault()}
										>
											Light
										</DropdownMenuRadioItem>
										<DropdownMenuSeparator />
										<DropdownMenuRadioItem
											value="system"
											onSelect={(event) => event.preventDefault()}
										>
											System
										</DropdownMenuRadioItem>
									</DropdownMenuRadioGroup>
								</DropdownMenuSubContent>
							</DropdownMenuPortal>
						</DropdownMenuSub>
						<DropdownMenuGroup>
							<DropdownMenuItem asChild className="hover:cursor-pointer">
								<Link href={url.account}>
									<Settings />
									Settings
								</Link>
							</DropdownMenuItem>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuItem asChild className="hover:cursor-pointer">
							<a href={url.logout}>
								<LogOut />
								Log out
							</a>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
