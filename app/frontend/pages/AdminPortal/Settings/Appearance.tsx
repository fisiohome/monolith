import {
	SettingLayout,
	SettingSectionLayout,
} from "@/components/admin-portal/settings/layout";
import { useDateContext } from "@/components/providers/date-provider";
import { useMotion } from "@/components/providers/motion-provider";
import { useTheme } from "@/components/providers/theme-provider";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
	DEFAULT_TIME_FORMAT_12,
	DEFAULT_TIME_FORMAT_24,
	type Theme,
	type TimeFormat,
} from "@/lib/constants";
import { Head } from "@inertiajs/react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export default function SettingsAppearance() {
	const { t, i18n } = useTranslation("settings", {
		keyPrefix: "appearance",
	});

	// * theme context
	const { theme, setTheme } = useTheme();
	const handleToggleTheme = (value: string) => {
		const themeValue = value as Theme;
		setTheme(themeValue);
	};

	// * language context
	const selectedLang = useMemo(() => i18n.language, [i18n.language]);

	// * motion context
	const { motion, setMotion } = useMotion();

	// * date context
	const { timeFormat, setTimeFormat } = useDateContext();

	return (
		<>
			<Head title={t("title")} />

			<SettingLayout>
				<div className="grid gap-8">
					<SettingSectionLayout
						title={t("language.title")}
						description={t("language.description")}
					>
						<RadioGroup
							value={selectedLang}
							className="flex flex-col gap-4 md:flex-row"
							onValueChange={(value) => {
								i18n.changeLanguage(value);

								// if using bahasa, change the time format to using 24-hours
								setTimeFormat(value === "id" ? "24-hours" : "12-hours");
							}}
						>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="en" id="en" />
								<Label htmlFor="en">{t("language.choice.english")}</Label>
							</div>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="id" id="id" />
								<Label htmlFor="id">{t("language.choice.indonesian")}</Label>
							</div>
						</RadioGroup>
					</SettingSectionLayout>

					<SettingSectionLayout
						title={t("timeFormat.title", "Time Format")}
						description={t(
							"timeFormat.description",
							"Choose how time is displayed throughout the application.",
						)}
					>
						<RadioGroup
							value={timeFormat}
							className="flex flex-col gap-4 md:flex-row"
							onValueChange={(value) => {
								setTimeFormat(value as TimeFormat);
							}}
						>
							<div className="flex items-center space-x-2">
								<RadioGroupItem
									value={DEFAULT_TIME_FORMAT_12}
									id={DEFAULT_TIME_FORMAT_12}
								/>
								<Label htmlFor={DEFAULT_TIME_FORMAT_12}>
									{t("timeFormat.choice.12", "12-hour (AM/PM)")}
								</Label>
							</div>
							<div className="flex items-center space-x-2">
								<RadioGroupItem
									value={DEFAULT_TIME_FORMAT_24}
									id={DEFAULT_TIME_FORMAT_24}
								/>
								<Label htmlFor={DEFAULT_TIME_FORMAT_24}>
									{t("timeFormat.choice.24", "24-hour")}
								</Label>
							</div>
						</RadioGroup>
					</SettingSectionLayout>

					<SettingSectionLayout
						title={t("motion.title")}
						description={t("motion.description")}
					>
						<div className="flex flex-row items-center justify-between w-8/12 gap-6 p-4 border rounded-lg bg-card">
							<div className="space-y-0.5 text-sm">
								<p className="font-semibold">{t("motion.choice.title")}</p>
								<p className="text-muted-foreground">
									{t("motion.choice.description")}
								</p>
							</div>
							<div>
								<Switch
									checked={motion === "on"}
									onCheckedChange={(value) => {
										setMotion(value ? "on" : "off");
									}}
								/>
							</div>
						</div>
					</SettingSectionLayout>

					<SettingSectionLayout
						title={t("theme.title")}
						description={t("theme.description")}
					>
						<RadioGroup
							value={theme}
							className="grid grid-cols-1 gap-8 lg:grid-cols-3"
							onValueChange={(value) => {
								handleToggleTheme(value);
							}}
						>
							<Label
								htmlFor="system"
								className="grid gap-4 [&:has([data-state=checked])>div]:border-primary"
							>
								<div className="items-center p-1 border-2 rounded-md border-muted hover:bg-accent">
									<div className="space-y-2 rounded-sm bg-[#f5f5f5] p-2">
										<div className="p-2 space-y-2 bg-white rounded-md shadow-sm">
											<Skeleton className="h-2 w-[80px] rounded-lg bg-[#f5f5f5]" />
											<Skeleton className="h-2 w-[100px] rounded-lg bg-[#f5f5f5]" />
										</div>
										<div className="flex items-center p-2 space-x-2 rounded-md shadow-sm bg-slate-800">
											<Skeleton className="w-4 h-4 rounded-full bg-slate-400" />
											<Skeleton className="h-2 w-[100px] rounded-lg bg-slate-400" />
										</div>
									</div>
								</div>

								<div className="flex items-center justify-center gap-2">
									<RadioGroupItem value="system" id="system" />
									<span className="font-semibold">
										{t("theme.choice.system")}
									</span>
								</div>
							</Label>

							<Label
								htmlFor="light"
								className="grid gap-4 [&:has([data-state=checked])>div]:border-primary"
							>
								<div className="items-center p-1 border-2 rounded-md border-muted hover:bg-accent">
									<div className="space-y-2 rounded-sm bg-[#f5f5f5] p-2">
										<div className="p-2 space-y-2 bg-white rounded-md shadow-sm">
											<Skeleton className="h-2 w-[80px] rounded-lg bg-[#f5f5f5]" />
											<Skeleton className="h-2 w-[100px] rounded-lg bg-[#f5f5f5]" />
										</div>
										<div className="flex items-center p-2 space-x-2 bg-white rounded-md shadow-sm">
											<Skeleton className="h-4 w-4 rounded-full bg-[#f5f5f5]" />
											<Skeleton className="h-2 w-[100px] rounded-lg bg-[#f5f5f5]" />
										</div>
									</div>
								</div>

								<div className="flex items-center justify-center gap-2">
									<RadioGroupItem value="light" id="light" />
									<span className="font-semibold">
										{t("theme.choice.light")}
									</span>
								</div>
							</Label>

							<Label
								htmlFor="dark"
								className="grid gap-4 [&:has([data-state=checked])>div]:border-primary"
							>
								<div className="items-center p-1 border-2 rounded-md border-muted bg-popover hover:bg-accent hover:text-accent-foreground">
									<div className="p-2 space-y-2 rounded-sm bg-slate-950">
										<div className="p-2 space-y-2 rounded-md shadow-sm bg-slate-800">
											<Skeleton className="h-2 w-[80px] rounded-lg bg-slate-400" />
											<Skeleton className="h-2 w-[100px] rounded-lg bg-slate-400" />
										</div>
										<div className="flex items-center p-2 space-x-2 rounded-md shadow-sm bg-slate-800">
											<Skeleton className="w-4 h-4 rounded-full bg-slate-400" />
											<Skeleton className="h-2 w-[100px] rounded-lg bg-slate-400" />
										</div>
									</div>
								</div>

								<div className="flex items-center justify-center gap-2">
									<RadioGroupItem value="dark" id="dark" />
									<span className="font-semibold">
										{t("theme.choice.dark")}
									</span>
								</div>
							</Label>
						</RadioGroup>
					</SettingSectionLayout>
				</div>
			</SettingLayout>
		</>
	);
}
