import { tz } from "@date-fns/tz";
import { zodResolver } from "@hookform/resolvers/zod";
import { Deferred, Head, router, usePage } from "@inertiajs/react";
import { format, parse } from "date-fns";
import {
	Check,
	ChevronsUpDown,
	Loader2Icon,
	SendHorizonalIcon,
	UsersRoundIcon,
} from "lucide-react";
import { Fragment, useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { PageContainer } from "@/components/admin-portal/shared/page-layout";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/extended/input";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { getGenderIcon } from "@/hooks/use-gender";
import type {
	GENDER_LABELS,
	PATIENT_CONDITIONS_WITH_DESCRIPTION,
	PREFERRED_THERAPIST_GENDER_LABELS,
} from "@/lib/constants";
import { DEFAULT_TIMEZONE, LOCALES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { TelegramGroup } from "@/types/admin-portal/telegram-broadcasts";
import type { GlobalPageProps as BaseGlobalPageProps } from "@/types/globals";

export interface PageProps extends BaseGlobalPageProps {
	broadcasts: any[];
	groups?: TelegramGroup[];
	optionsData?: {
		patientGenders: typeof GENDER_LABELS;
		preferredTherapistGender: typeof PREFERRED_THERAPIST_GENDER_LABELS;
		patientConditions: typeof PATIENT_CONDITIONS_WITH_DESCRIPTION;
	};
	[key: string]: any;
}

const broadcastSchema = z.object({
	chat_id: z.string().min(1, "Group is required"),
	kode_pasien: z.string().min(1, "Patient code is required"), // as patient code
	gender_req: z.string().optional(), // as therapist gender preference
	usia: z
		.number()
		.min(1, "Patient age is required")
		.or(z.string().min(1, "Patient age is required")), // as patient age
	jenis_kelamin: z.string().min(1, "Patient gender is required"), // as patient gender
	keluhan: z.string().optional(), // as patient complaint description
	durasi: z.string().optional(), // as patient illness onset date
	kondisi: z.string().min(1, "Patient condition is required"), // as patient current condition
	riwayat: z.string().optional(), // as patient medical history
	alamat: z.string().min(1, "Patient address is required"), // as patient address
	visit: z.string().min(1, "Patient visit type is required"), // as patient visit type (e.g., "4x Visit")
	jadwal: z.string().min(1, "Patient visit schedule is required"), // as patient visit schedule
});

type BroadcastFormData = z.infer<typeof broadcastSchema>;

export default function Index({ groups }: PageProps) {
	const { props: globalProps } = usePage<PageProps>();
	const { t } = useTranslation("telegram-broadcasts");
	const { t: tfn } = useTranslation("telegram-broadcasts", {
		keyPrefix: "form.new",
	});
	const { t: tpm } = useTranslation("appointments-form", {
		keyPrefix: "patient_medical",
	});
	const { t: tpp } = useTranslation("appointments-form", {
		keyPrefix: "patient_profile",
	});
	const { t: tas } = useTranslation("appointments-form", {
		keyPrefix: "appt_schedule",
	});

	// Get patient condition options from props
	const patientConditionOptions = useMemo(
		() => globalProps.optionsData?.patientConditions || [],
		[globalProps.optionsData?.patientConditions],
	);
	const telegramBroadcastsRoute =
		globalProps.adminPortal?.router?.adminPortal?.telegramBroadcasts?.index;

	const groupsData = useMemo(() => {
		return Array.isArray(groups) ? groups : [];
	}, [groups]);
	const [groupSelectorOpen, setGroupSelectorOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);

	const form = useForm<BroadcastFormData>({
		resolver: zodResolver(broadcastSchema),
		defaultValues: {
			chat_id: "",
			kode_pasien: "",
			gender_req: "",
			usia: "",
			jenis_kelamin: "",
			keluhan: "",
			durasi: "",
			kondisi: "",
			riwayat: "",
			alamat: "",
			visit: "",
			jadwal: "",
		},
	});

	const onSubmit = (data: BroadcastFormData) => {
		const { formatted } = formatMessage(data);
		const {
			patient: { code, prefGender, age, gender },
			patientMedical: { complaint, illnessDate, condition, history },
			visitDetails: { visitAddress, totalVisit, visitSchedule },
		} = formatted;

		const payload = {
			chat_id: data.chat_id,
			kode_pasien: code,
			gender_req: prefGender,
			usia: age,
			jenis_kelamin: gender,
			keluhan: complaint,
			durasi: illnessDate,
			kondisi: condition,
			riwayat: history,
			alamat: visitAddress,
			visit: totalVisit,
			jadwal: visitSchedule,
		};

		setIsSubmitting(true);
		router.post(
			telegramBroadcastsRoute,
			{ broadcast: payload },
			{
				preserveScroll: true,
				only: ["adminPortal", "flash", "errors"],
				onSuccess: () => {
					form.reset();
				},
				onError: () => {},
				onFinish: () => {
					setIsSubmitting(false);
					setConfirmOpen(false);
				},
			},
		);
	};

	const selectedGroup = groupsData.find((g) => g.id === form.watch("chat_id"));
	const formData = form.watch();

	const formatMessage = useCallback(
		(data: BroadcastFormData) => {
			// Extract formatted values for cleaner code
			const patientCode = data?.kode_pasien || "T/A";
			const patientAge = data?.usia ? `${data.usia} tahun` : "T/A";
			const complaint = data?.keluhan || "T/A";
			const illnessDate = data?.durasi || "T/A";
			const medicalHistory = data?.riwayat || "T/A";
			const visitAddress = data?.alamat || "T/A";
			const totalVisit = data?.visit ? `${data.visit}x Visit` : "T/A";

			// Get translated labels from options data
			const selectedCondition = patientConditionOptions.find(
				(c) => c.title === data?.kondisi,
			);
			const genderTitleId =
				globalProps.optionsData?.patientGenders.find(
					(g) => g.title === data?.jenis_kelamin,
				)?.titleId ||
				data?.jenis_kelamin ||
				"T/A";
			const prefGenderTitleId =
				globalProps.optionsData?.preferredTherapistGender.find(
					(g) => g.title === data?.gender_req,
				)?.titleId ||
				data?.gender_req ||
				"T/A";
			const conditionTitleId =
				selectedCondition?.titleId || data?.kondisi || "T/A";

			// Format visit schedule to Indonesian date format
			let formattedSchedule = "T/A";
			if (data?.jadwal) {
				try {
					const parsedDate = parse(
						data.jadwal,
						"yyyy-MM-dd'T'HH:mm",
						new Date(),
					);
					formattedSchedule = format(parsedDate, "PPPPpp", {
						locale: LOCALES.id,
						in: tz(DEFAULT_TIMEZONE),
					});
				} catch {
					formattedSchedule = data.jadwal;
				}
			}

			// Build the complete message for Telegram
			let message = "";
			message += `🩺 *INFORMASI PASIEN*\n\n`;
			message += `*KODE PASIEN* : ${patientCode}\n`;
			message += `*Request Gender* : ${prefGenderTitleId}\n`;
			message += `*Usia* : ${patientAge}\n`;
			message += `*Jenis Kelamin* : ${genderTitleId}\n\n`;

			message += `*Keluhan*\n${complaint}\n\n`;
			message += `*Durasi Keluhan*\n${illnessDate}\n\n`;
			message += `*Kondisi Pasien*\n${conditionTitleId}\n\n`;
			message += `*Riwayat Penyakit*\n${medicalHistory}\n\n`;
			message += `*Alamat Lengkap*\n${visitAddress}\n\n`;
			message += `*Request Layanan*\n${totalVisit}\n\n`;
			message += `*Rencana Kunjungan*\n${formattedSchedule}\n\n`;

			message += `────────────────────\n`;
			message += `🙏 *Informasi untuk Tim Fisioterapis*\n`;
			message += `Apabila berkenan menangani pasien di atas, silakan hubungi admin melalui *personal chat* dengan menyertakan *KODE PASIEN* serta opsi jadwal kunjungan alternatif.`;

			// Return both the formatted message and structured data
			return {
				message, // Complete formatted message for Telegram
				formatted: {
					// Patient basic information
					patient: {
						code: patientCode,
						gender: genderTitleId,
						prefGender: prefGenderTitleId,
						age: patientAge,
					},
					// Patient medical details
					patientMedical: {
						condition: conditionTitleId,
						complaint,
						illnessDate,
						history: medicalHistory,
					},
					// Visit related information
					visitDetails: {
						visitAddress,
						totalVisit,
						visitSchedule: formattedSchedule,
					},
				},
			};
		},
		[patientConditionOptions, globalProps.optionsData],
	);

	const formattedMessage = useMemo(
		() => formatMessage(formData).message,
		[formData, formatMessage],
	);

	return (
		<>
			<Head title="Telegram Broadcasts" />

			<PageContainer className="min-h-[100vh] flex-1 md:min-h-min space-y-4">
				<div className="flex flex-col justify-between gap-4 md:flex-row">
					<div className="flex-1">
						<h1 className="text-lg font-bold tracking-tight uppercase">
							{t("page_title")}
						</h1>

						<p className="w-full text-sm text-muted-foreground text-pretty md:w-10/12 xl:w-8/12">
							{t("page_description")}
						</p>
					</div>
				</div>

				<Separator className="bg-border" />

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						aria-busy={isSubmitting}
						aria-live="polite"
					>
						{isSubmitting ? (
							<Alert className="mb-4 flex items-center gap-3">
								<Loader2Icon className="h-4 w-4 animate-spin" />
								<AlertDescription>
									Sending broadcast&hellip; stay on this page until it finishes.
								</AlertDescription>
							</Alert>
						) : null}
						<fieldset
							disabled={isSubmitting}
							className="grid gap-4 md:gap-6 lg:grid-cols-12"
						>
							<div className="lg:col-span-7">
								<Card className="shadow-xs">
									<CardHeader className="p-3 !pb-6 lg:p-6">
										<CardTitle>{tfn("compose_section.title")}</CardTitle>
										<CardDescription>
											{tfn("compose_section.description")}
										</CardDescription>
									</CardHeader>
									<CardContent className="p-3 !pt-0 lg:p-6 text-sm space-y-10">
										<section className="space-y-4">
											<div className="grid gap-y-6 gap-x-4 grid-cols-1 md:grid-cols-2">
												<Deferred
													data={["groups"]}
													fallback={
														<div className="flex flex-col self-end gap-3 col-span-full">
															<Skeleton className="w-10 h-4 rounded-md" />
															<Skeleton className="relative w-full rounded-md h-9" />
														</div>
													}
												>
													<FormField
														control={form.control}
														name="chat_id"
														render={({ field }) => (
															<FormItem className="col-span-full">
																<FormLabel>Target Group</FormLabel>
																<Popover
																	open={groupSelectorOpen}
																	onOpenChange={setGroupSelectorOpen}
																>
																	<PopoverTrigger asChild>
																		<FormControl>
																			<Button
																				variant="outline"
																				className={cn(
																					"w-full justify-between",
																					!field.value &&
																						"text-muted-foreground",
																				)}
																			>
																				<div className="flex items-center gap-2 truncate">
																					<UsersRoundIcon className="w-4 h-4 shrink-0 opacity-60" />
																					<span
																						className={cn(
																							"truncate",
																							!field.value &&
																								"text-muted-foreground opacity-75",
																						)}
																					>
																						{field.value
																							? groupsData.find(
																									(group) =>
																										group.id === field.value,
																								)?.name
																							: "Select a Telegram group"}
																					</span>
																				</div>
																				<ChevronsUpDown className="w-4 h-4 opacity-50 shrink-0" />
																			</Button>
																		</FormControl>
																	</PopoverTrigger>
																	<PopoverContent
																		className="p-0 w-[var(--radix-popover-trigger-width)]"
																		align="start"
																	>
																		<Command>
																			<CommandInput placeholder="Search Telegram groups..." />
																			<CommandList>
																				<CommandEmpty>
																					No groups found.
																				</CommandEmpty>
																				<CommandGroup>
																					{groupsData.map((group) => (
																						<CommandItem
																							key={group.id}
																							value={group.id}
																							onSelect={() => {
																								field.onChange(
																									!field.value
																										? group.id
																										: undefined,
																								);
																							}}
																						>
																							<div className="flex flex-col gap-0.5 leading-tight">
																								<span>{group.name}</span>
																							</div>
																							<Check
																								className={cn(
																									"ml-auto h-4 w-4",
																									group.id === field.value
																										? "opacity-100"
																										: "opacity-0",
																								)}
																							/>
																						</CommandItem>
																					))}
																				</CommandGroup>
																			</CommandList>
																		</Command>
																	</PopoverContent>
																</Popover>
																<FormMessage />
															</FormItem>
														)}
													/>
												</Deferred>
												<FormField
													control={form.control}
													name="kode_pasien"
													render={({ field }) => (
														<FormItem>
															<FormLabel>Patient ID Code</FormLabel>
															<FormControl>
																<Input
																	{...field}
																	onChange={(event) =>
																		field.onChange(
																			event.target.value.toUpperCase(),
																		)
																	}
																	placeholder="Enter the patient id code..."
																/>
															</FormControl>
															<FormMessage />
														</FormItem>
													)}
												/>
												<FormField
													control={form.control}
													name="usia"
													render={({ field }) => (
														<FormItem>
															<FormLabel>{tpp("fields.age.label")}</FormLabel>
															<FormControl>
																<Input
																	{...field}
																	type="number"
																	min="0"
																	className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none w-[50%]"
																	placeholder={tpp("fields.age.placeholder2")}
																/>
															</FormControl>
															<FormDescription className="text-pretty">
																{tpp("fields.age.description2")}
															</FormDescription>
															<FormMessage />
														</FormItem>
													)}
												/>
												<Deferred
													data={["optionsData"]}
													fallback={
														<div className="flex flex-col self-end gap-3">
															<Skeleton className="w-10 h-4 rounded-md" />
															<div className="flex flex-col gap-4">
																<Skeleton className="relative w-full rounded-md h-9" />
																<Skeleton className="relative w-full rounded-md h-9" />
															</div>
														</div>
													}
												>
													<FormField
														control={form.control}
														name="jenis_kelamin"
														render={({ field }) => (
															<FormItem className="space-y-3">
																<FormLabel>
																	{tpp("fields.gender.label")}
																</FormLabel>
																<FormControl>
																	<RadioGroup
																		onValueChange={field.onChange}
																		value={field.value}
																		orientation="horizontal"
																		className="flex flex-col gap-4"
																	>
																		{globalProps.optionsData?.patientGenders.map(
																			(gender) => (
																				<Fragment key={gender.title}>
																					<FormItem className="flex items-start p-3 space-x-3 space-y-0 border rounded-md shadow-inner border-input bg-background">
																						<FormControl>
																							<RadioGroupItem
																								value={gender.title}
																							/>
																						</FormControl>
																						<FormLabel className="flex items-center gap-1 font-normal capitalize">
																							{getGenderIcon(gender.title)}
																							<span>
																								{tpp(
																									`fields.gender.options.${gender.title.toLowerCase()}`,
																								)}
																							</span>
																						</FormLabel>
																					</FormItem>
																				</Fragment>
																			),
																		)}
																	</RadioGroup>
																</FormControl>
																<FormMessage />
															</FormItem>
														)}
													/>
												</Deferred>
												<Deferred
													data={["optionsData"]}
													fallback={
														<div className="flex flex-col self-end gap-3">
															<Skeleton className="w-10 h-4 rounded-md" />
															<div className="flex flex-col gap-4">
																<Skeleton className="relative w-full rounded-md h-9" />
																<Skeleton className="relative w-full rounded-md h-9" />
															</div>
														</div>
													}
												>
													<FormField
														control={form.control}
														name="gender_req"
														render={({ field }) => (
															<FormItem className="space-y-3">
																<FormLabel>
																	{tas(`fields.pref_therapist_gender.label`)}
																</FormLabel>
																<FormControl>
																	<RadioGroup
																		onValueChange={field.onChange}
																		value={field.value}
																		orientation="horizontal"
																		className="flex flex-col gap-4"
																	>
																		{globalProps.optionsData?.preferredTherapistGender.map(
																			(gender) => (
																				<FormItem
																					key={gender.title}
																					className="flex items-start p-3 space-x-3 space-y-0 border rounded-md shadow-inner border-input bg-background"
																				>
																					<FormControl>
																						<RadioGroupItem
																							value={gender.title}
																						/>
																					</FormControl>
																					<FormLabel className="flex items-center gap-1 font-normal capitalize">
																						{getGenderIcon?.(gender.title)}
																						<span className="capitalize">
																							{tas(
																								`fields.pref_therapist_gender.options.${gender.title.toLowerCase()}`,
																							)}
																						</span>
																					</FormLabel>
																				</FormItem>
																			),
																		)}
																	</RadioGroup>
																</FormControl>
																<FormMessage />
															</FormItem>
														)}
													/>
												</Deferred>
											</div>
										</section>

										<section className="space-y-4">
											<div className="flex items-center gap-3 mb-6">
												<hr className="flex-1 border-t border-border" />
												<span className="text-xs font-semibold uppercase text-muted-foreground opacity-50">
													{tpm("label")}
												</span>
												<hr className="flex-1 border-t border-border" />
											</div>

											<div className="grid gap-y-6 gap-x-4 grid-cols-1 md:grid-cols-2">
												<Deferred
													data={["optionsData"]}
													fallback={
														<div className="flex flex-col self-end gap-3 col-span-full">
															<Skeleton className="w-10 h-4 rounded-md" />
															<div className="grid grid-cols-1 gap-4">
																<Skeleton className="relative w-full rounded-md h-9" />
																<Skeleton className="relative w-full rounded-md h-9" />
																<Skeleton className="relative w-full rounded-md h-9" />
															</div>
														</div>
													}
												>
													<FormField
														control={form.control}
														name="kondisi"
														render={({ field }) => (
															<FormItem className="col-span-full">
																<FormLabel className="capitalize">
																	{tpm("fields.condition.label")}
																</FormLabel>
																<FormControl>
																	<RadioGroup
																		onValueChange={field.onChange}
																		value={field.value}
																		className="flex flex-col gap-3"
																	>
																		{patientConditionOptions.map(
																			(condition) => (
																				<FormItem
																					key={condition.title}
																					className="flex items-start p-4 space-x-3 space-y-0 border rounded-md border-input bg-background"
																				>
																					<FormControl>
																						<RadioGroupItem
																							value={condition.title}
																						/>
																					</FormControl>
																					<FormLabel className="w-full space-y-1 font-normal capitalize">
																						<span>
																							{tpm(
																								`fields.condition.options.${condition.title.toLowerCase()}.label`,
																							)}
																						</span>
																						<FormDescription>
																							{tpm(
																								`fields.condition.options.${condition.title.toLowerCase()}.description`,
																							)}
																						</FormDescription>
																					</FormLabel>
																				</FormItem>
																			),
																		)}
																	</RadioGroup>
																</FormControl>
																<FormMessage />
															</FormItem>
														)}
													/>
												</Deferred>
												<FormField
													control={form.control}
													name="keluhan"
													render={({ field }) => (
														<FormItem className="col-span-full">
															<FormLabel className="capitalize">
																{tpm("fields.complaint.label")}{" "}
																<span className="text-sm italic font-light">
																	&mdash; (optional)
																</span>
															</FormLabel>
															<FormControl>
																<Textarea
																	{...field}
																	placeholder={tpm(
																		"fields.complaint.placeholder",
																	)}
																	className="min-h-[100px] resize-none"
																/>
															</FormControl>
															<FormMessage />
														</FormItem>
													)}
												/>
												<FormField
													control={form.control}
													name="durasi"
													render={({ field }) => (
														<FormItem className="col-span-full">
															<FormLabel className="capitalize">
																{tpm("fields.illness_onset_date.label")}{" "}
																<span className="text-sm italic font-light">
																	&mdash; (optional)
																</span>
															</FormLabel>
															<FormControl>
																<Textarea
																	{...field}
																	placeholder={tpm(
																		"fields.illness_onset_date.placeholder",
																	)}
																	className="min-h-[100px] resize-none"
																/>
															</FormControl>
															<FormMessage />
														</FormItem>
													)}
												/>
												<FormField
													control={form.control}
													name="riwayat"
													render={({ field }) => (
														<FormItem className="col-span-full">
															<FormLabel className="capitalize">
																{tpm("fields.medical_history.label")}{" "}
																<span className="text-sm italic font-light">
																	- (optional)
																</span>
															</FormLabel>
															<FormControl>
																<Textarea
																	{...field}
																	placeholder={tpm(
																		"fields.medical_history.placeholder",
																	)}
																	className="min-h-[100px] resize-none"
																/>
															</FormControl>
															<FormMessage />
														</FormItem>
													)}
												/>
											</div>
										</section>

										<section className="space-y-4">
											<div className="flex items-center gap-3 mb-6">
												<hr className="flex-1 border-t border-border" />
												<span className="text-xs font-semibold uppercase text-muted-foreground opacity-50">
													Visit Details
												</span>
												<hr className="flex-1 border-t border-border" />
											</div>

											<div className="grid gap-y-6 gap-x-4 grid-cols-1 md:grid-cols-2">
												<FormField
													control={form.control}
													name="visit"
													render={({ field }) => (
														<FormItem>
															<FormLabel>Total Request Visit</FormLabel>
															<FormControl>
																<Input
																	{...field}
																	type="number"
																	min="0"
																	className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none w-[50%]"
																	placeholder="e.g: 4"
																/>
															</FormControl>
															<FormDescription className="text-pretty">
																Enter how many the total visit are requested in
																numbers, e.g: 4.
															</FormDescription>
															<FormMessage />
														</FormItem>
													)}
												/>
												<FormField
													control={form.control}
													name="jadwal"
													render={({ field }) => (
														<FormItem>
															<FormLabel>Visit Schedule</FormLabel>
															<FormControl>
																<Input
																	{...field}
																	type="datetime-local"
																	className="pe-3"
																	placeholder="Select visit schedule..."
																/>
															</FormControl>
															<FormMessage />
														</FormItem>
													)}
												/>
												<FormField
													control={form.control}
													name="alamat"
													render={({ field }) => (
														<FormItem className="md:col-span-full">
															<FormLabel>Visit Address</FormLabel>
															<FormControl>
																<Textarea
																	{...field}
																	placeholder="Enter the visit address..."
																	className="min-h-[100px] resize-none"
																/>
															</FormControl>
															<FormMessage />
														</FormItem>
													)}
												/>
											</div>
										</section>
									</CardContent>
								</Card>
							</div>

							<hr className="h-[1px] border-t-0 bg-transparent bg-gradient-to-r from-transparent via-border to-transparent my-3 block lg:hidden" />

							<div className="space-y-4 lg:space-y-6 lg:col-span-5 lg:sticky lg:top-20 self-start">
								<Card className="shadow-xs">
									<CardHeader className="p-3 !pb-6 lg:p-6">
										<CardTitle>{tfn("preview_section.title")}</CardTitle>
										<CardDescription className="text-pretty">
											{tfn("preview_section.description")}
										</CardDescription>
									</CardHeader>
									<CardContent className="p-3 !pt-0 lg:p-6 space-y-4 text-sm">
										<div className="space-y-2">
											<p className="text-xs font-semibold uppercase text-muted-foreground">
												{tfn("preview_section.fields.group_info.title")}
											</p>

											{selectedGroup ? (
												<div className="flex items-center gap-3">
													<div className="p-2 bg-background border border-border">
														<UsersRoundIcon className="w-4 h-4 opacity-60" />
													</div>

													<p className="font-medium">{selectedGroup.name}</p>
												</div>
											) : (
												<p className="text-muted-foreground">
													{tfn("preview_section.fields.group_info.empty")}
												</p>
											)}
										</div>

										<Separator />

										<div className="space-y-2">
											<p className="text-xs font-semibold uppercase text-muted-foreground">
												{tfn("preview_section.fields.message_preview.title")}
											</p>

											<div className="rounded-md border border-border bg-background/50 p-3 text-foreground">
												{selectedGroup &&
												Object.entries(formData).filter(([_, value]) => value)
													.length > 0 ? (
													<MarkdownRenderer
														content={formattedMessage}
														className="text-sm"
													/>
												) : (
													<p className="text-muted-foreground text-sm">
														{tfn(
															"preview_section.fields.message_preview.empty",
														)}
													</p>
												)}
											</div>
										</div>
									</CardContent>
								</Card>

								<Alert>
									<AlertDescription className="text-justify">
										<strong>{tfn("note.title")}:</strong>{" "}
										{tfn("note.description")}
									</AlertDescription>
								</Alert>

								<div className="flex flex-col gap-4 md:flex-row md:justify-end md:gap-2">
									<Button
										className="w-full md:w-fit"
										type="button"
										variant="ghost"
										onClick={() => form.reset()}
										disabled={isSubmitting}
									>
										Reset
									</Button>

									<AlertDialog
										open={confirmOpen}
										onOpenChange={(open) => setConfirmOpen(open)}
									>
										<AlertDialogTrigger asChild>
											<Button
												type="button"
												disabled={isSubmitting || !selectedGroup}
												onClick={() => setConfirmOpen(true)}
											>
												Send Message
												<SendHorizonalIcon className="w-4 h-4" />
											</Button>
										</AlertDialogTrigger>
										<AlertDialogContent>
											<AlertDialogHeader>
												<AlertDialogTitle>
													Confirm Telegram Broadcast
												</AlertDialogTitle>
												<AlertDialogDescription>
													Please review the preview card carefully. Once you
													send this broadcast it will be delivered to{" "}
													<strong>{selectedGroup?.name ?? "the group"}</strong>.
													This action cannot be undone.
												</AlertDialogDescription>
											</AlertDialogHeader>
											<AlertDialogFooter>
												<AlertDialogCancel disabled={isSubmitting}>
													Cancel
												</AlertDialogCancel>
												<AlertDialogAction
													disabled={isSubmitting}
													onClick={(event) => {
														event.preventDefault();
														form.handleSubmit(onSubmit)();
													}}
												>
													{isSubmitting ? (
														<>
															Sending...
															<Loader2Icon className="w-4 h-4 animate-spin" />
														</>
													) : (
														"Yes, send it"
													)}
												</AlertDialogAction>
											</AlertDialogFooter>
										</AlertDialogContent>
									</AlertDialog>
								</div>
							</div>
						</fieldset>
					</form>
				</Form>
			</PageContainer>
		</>
	);
}
