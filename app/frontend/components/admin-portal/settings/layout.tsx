import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { GlobalPageProps } from "@/types/globals";
import { usePage } from "@inertiajs/react";
import { ChevronLeft } from "lucide-react";
import { type ComponentProps, useMemo } from "react";
import { SidebarNav } from "./sidebar-nav";

export interface SettingsLayoutProps extends ComponentProps<"article"> {
	featureTitle: string;
	featureDescription: string;
}

export default function SettingsLayout({
	children,
	featureTitle,
	featureDescription,
}: SettingsLayoutProps) {
	const { props: globalProps, url: pageUrl } = usePage<GlobalPageProps>();

	const sidebarNavItems = useMemo(() => {
		const items = [
			{
				title: "Change Password",
				href: globalProps.adminPortal.router.auth.registration.edit,
				isActive: false,
			},
		];

		return items.map((item) => {
			return {
				...item,
				isActive: item.href === pageUrl,
			};
		});
	}, [globalProps.adminPortal.router.auth.registration.edit, pageUrl]);

	return (
		<article className="min-h-[100vh] flex-1 rounded-xl bg-sidebar shadow-inner md:min-h-min p-6 space-y-6 md:block">
			<div className="-space-y-0.5">
				<Button
					onClick={() => window.history.back()}
					variant="link"
					className="p-0"
				>
					<ChevronLeft className="size-4" />
					<span>Back</span>
				</Button>

				<div className="space-y-0.5">
					<h1 className="text-xl font-bold tracking-tight">
						<span>Settings</span>
					</h1>
					<p className="text-muted-foreground">
						Manage your account settings and preferences.
					</p>
				</div>
			</div>
			<Separator className="my-6 bg-muted-foreground/50" />
			<div className="flex flex-col space-y-8 lg:flex-row lg:space-x-6 lg:space-y-0">
				<aside className="lg:w-1/5">
					<SidebarNav items={sidebarNavItems} />
				</aside>
				<div className="flex-1 lg:max-w-2xl">
					<div className="space-y-6">
						<div>
							<h3 className="text-lg font-medium">{featureTitle}</h3>
							<p className="text-sm text-muted-foreground">
								{featureDescription}
							</p>
						</div>
						<Separator className="bg-muted-foreground/50" />
						{children}
					</div>
				</div>
			</div>
		</article>
	);
}
