import { Link } from "@inertiajs/react";
import {
	ChevronsUpDown,
	Languages,
	LogOut,
	Moon,
	Settings,
	Sun,
	SunMoon,
} from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@/components/providers/navigation-provider";
import { useTheme } from "@/components/providers/theme-provider";
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
import type { Theme } from "@/lib/constants";
import { generateInitials } from "@/lib/utils";
import type { AdminTypes } from "@/types/admin-portal/admin";

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
	const { isMobile, toggleSidebar } = useSidebar();
	const { t, i18n } = useTranslation("settings", {
		keyPrefix: "appearance",
	});
	const { t: tsm } = useTranslation("side-menu");

	// * theme context
	const { theme, setTheme } = useTheme();
	const handleToggleTheme = (value: string) => {
		const themeValue = value as Theme;
		setTheme(themeValue);
	};

	// * language context
	const selectedLang = useMemo(() => i18n.language, [i18n.language]);

	// * navigation context
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
							className="data-[state=open]:bg-accent data-[state=open]:text-accent-foreground data-[state=open]:border data-[state=open]:border-border h-full"
						>
							<Avatar className="self-start rounded-lg size-8">
								<AvatarImage src={user.avatar} alt={user.name} />
								<AvatarFallback className="self-start text-xs font-semibold border rounded-lg bg-background text-foreground border-border">
									{generateInitials(user.name)}
								</AvatarFallback>
							</Avatar>
							<div className="grid gap-1 text-sm leading-tight text-left">
								<div className="flex flex-col">
									<span className="font-semibold uppercase truncate">
										{user.name}
									</span>
								</div>
							</div>
							<ChevronsUpDown className="ml-auto opacity-50 !size-3" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
						side={isMobile ? "bottom" : "right"}
						align="end"
						sideOffset={16}
					>
						<DropdownMenuLabel className="p-0 font-normal">
							<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
								<Avatar className="rounded-lg size-12">
									<AvatarImage src={user.avatar} alt={user.name} />
									<AvatarFallback className="rounded-lg">
										{generateInitials(user.name)}
									</AvatarFallback>
								</Avatar>

								<div className="grid flex-1 text-sm leading-tight text-left">
									<span className="text-[8px] mb-0.5 uppercase bg-primary px-1.5 py-0.5 rounded text-primary-foreground w-fit">
										{user.type.replaceAll("_", " ")}
									</span>
									<span className="font-semibold uppercase truncate">
										{user.name}
									</span>
									<span className="text-xs font-light leading-none truncate">
										{user.email}
									</span>
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
								{tsm("toggle_theme")}
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
											{t("theme.choice.dark")}
										</DropdownMenuRadioItem>
										<DropdownMenuRadioItem
											value="light"
											onSelect={(event) => event.preventDefault()}
										>
											{t("theme.choice.light")}
										</DropdownMenuRadioItem>
										<DropdownMenuSeparator />
										<DropdownMenuRadioItem
											value="system"
											onSelect={(event) => event.preventDefault()}
										>
											{t("theme.choice.system")}
										</DropdownMenuRadioItem>
									</DropdownMenuRadioGroup>
								</DropdownMenuSubContent>
							</DropdownMenuPortal>
						</DropdownMenuSub>
						<DropdownMenuSub>
							<DropdownMenuSubTrigger>
								<Languages className="h-[1.2rem] w-[1.2rem]" />
								{t("language.title")}
							</DropdownMenuSubTrigger>
							<DropdownMenuPortal>
								<DropdownMenuSubContent>
									<DropdownMenuRadioGroup
										value={selectedLang}
										onValueChange={(value) => {
											i18n.changeLanguage(value);
										}}
									>
										<DropdownMenuRadioItem
											value="en"
											onSelect={(event) => event.preventDefault()}
										>
											{t("language.choice.english")}
										</DropdownMenuRadioItem>
										<DropdownMenuRadioItem
											value="id"
											onSelect={(event) => event.preventDefault()}
										>
											{t("language.choice.indonesian")}
										</DropdownMenuRadioItem>
									</DropdownMenuRadioGroup>
								</DropdownMenuSubContent>
							</DropdownMenuPortal>
						</DropdownMenuSub>
						<DropdownMenuGroup>
							<DropdownMenuItem
								asChild
								className="hover:cursor-pointer"
								onClick={() => {
									if (!isMobile) return;

									toggleSidebar();
								}}
							>
								<Link href={url.account}>
									<Settings />
									{tsm("settings")}
								</Link>
							</DropdownMenuItem>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuItem asChild className="hover:cursor-pointer">
							<a href={url.logout}>
								<LogOut />
								{tsm("logout")}
							</a>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
