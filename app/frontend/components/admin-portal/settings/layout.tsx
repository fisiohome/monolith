import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type ComponentProps, useCallback, useMemo } from "react";
import {
	FormPageContainer,
	FormPageHeaderGridPattern,
} from "../shared/page-layout";
import { router, usePage } from "@inertiajs/react";
import type { GlobalPageProps } from "@/types/globals";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export interface SettingLayoutProps extends ComponentProps<"div"> {}

export function SettingLayout({ children }: SettingLayoutProps) {
	const { props: globalProps } = usePage<GlobalPageProps>();
	const { t } = useTranslation("settings");

	// * tab management state
	const tabs = useMemo(() => {
		return [
			{
				title: t("account_security.tab.title"),
				value: "security" as const,
				path: globalProps.adminPortal.router.adminPortal.settings
					.accountSecurity,
				description: t("account_security.tab.description"),
			},
			{
				title: t("appearance.tab.title"),
				value: "appearance" as const,
				path: globalProps.adminPortal.router.adminPortal.settings.appearance,
				description: t("appearance.tab.description"),
			},
		];
	}, [globalProps.adminPortal.router, t]);
	const tabSelected = useMemo(
		() => tabs.find((tab) => window.location.pathname.includes(tab.path)),
		[tabs],
	);
	const onValueChangeTab = useCallback(
		(value: (typeof tabs)[number]["value"]) => {
			const selectedTab = tabs.find((tab) => tab.value === value);
			const path = selectedTab?.path;

			if (!path) {
				console.error("path cannot be found in the requested settings section");
				return;
			}

			router.visit(path);
		},
		[tabs],
	);

	return (
		<FormPageContainer>
			<section className="flex flex-col">
				<FormPageHeaderGridPattern
					title={t("title")}
					description={t("description")}
					titleClass="text-lg"
					descriptionClass="text-base tracking-tight"
				/>
			</section>

			<Tabs
				defaultValue={tabSelected?.value}
				onValueChange={(value) => {
					onValueChangeTab(value as (typeof tabs)[number]["value"]);
				}}
				className="w-full"
			>
				<TabsList className="border border-border">
					{tabs?.map((tab) => (
						<TabsTrigger
							key={tab.value}
							value={tab.value}
							className="data-[state=active]:shadow-inner"
						>
							{tab.title}
						</TabsTrigger>
					))}
				</TabsList>

				{tabs?.map((tab) => (
					<TabsContent
						key={tab.value}
						value={tab.value}
						className="p-4 border shadow-inner bg-background md:p-6 border-border rounded-xl"
					>
						<div className="grid gap-4">
							<div>
								<h2 className="z-10 text-base font-bold tracking-tighter whitespace-pre-wrap">
									{tab.title}
								</h2>
								<p className="text-sm text-muted-foreground text-pretty">
									{tab.description}
								</p>
							</div>

							<Separator />

							{children}
						</div>
					</TabsContent>
				))}
			</Tabs>
		</FormPageContainer>
	);
}

interface SettingSectionLayoutProps extends ComponentProps<"article"> {
	title: string;
	description: string;
}

export function SettingSectionLayout({
	children,
	className,
	title,
	description,
}: SettingSectionLayoutProps) {
	return (
		<article className={cn("grid grid-cols-12 gap-4 md:gap-6", className)}>
			<section className="col-span-full md:col-span-4">
				<h2 className="z-10 text-sm font-semibold tracking-tighter whitespace-pre-wrap">
					{title}
				</h2>
				<p className="text-sm text-muted-foreground text-pretty">
					{description}
				</p>
			</section>

			<article className="grid gap-4 col-span-full md:col-span-8">
				{children}
			</article>
		</article>
	);
}
