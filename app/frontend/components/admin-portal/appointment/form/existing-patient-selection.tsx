import { useDateContext } from "@/components/providers/date-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import { getGenderIcon } from "@/hooks/use-gender";
import { useIsMobile } from "@/hooks/use-mobile";
import {
	type AppointmentBookingSchema,
	DEFAULT_VALUES_LOCATION,
	DEFAULT_VALUES_PATIENT_ADDRESS,
	DEFAULT_VALUES_PATIENT_CONTACT,
	defineAppointmentFormDefaultValues,
} from "@/lib/appointments/form";
import { cn, debounce, populateQueryParams } from "@/lib/utils";
import type { AppointmentNewGlobalPageProps } from "@/pages/AdminPortal/Appointment/New";
import type { Patient } from "@/types/admin-portal/patient";
import { router, usePage } from "@inertiajs/react";
import { format, isSameDay } from "date-fns";
import {
	AlertCircle,
	Cake,
	IdCard,
	Info,
	Link,
	LoaderIcon,
	Mail,
	MapPinHouse,
	MapPinIcon,
	MapPinned,
	MousePointerClick,
	Pencil,
	Phone,
	Search,
	User,
	UserRoundPlus,
	X,
} from "lucide-react";
import {
	type Dispatch,
	Fragment,
	type SetStateAction,
	memo,
	useCallback,
	useMemo,
	useState,
} from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useFormProvider } from "../new-appointment-form";
import { CardPatientBasicInfoForm } from "./patient-basic-info";
import { AnimatePresence, motion } from "framer-motion";

interface CardSelectionProps {
	patient: Patient;
}

const CardSelection = memo(function Component({ patient }: CardSelectionProps) {
	const { locale, tzDate } = useDateContext();
	const { t } = useTranslation("appointments");

	return (
		<div className="grid gap-4 p-3 text-sm border rounded-md shadow-inner border-input bg-sidebar text-muted-foreground">
			<div className="flex items-center gap-3">
				<Avatar className="border rounded-lg border-black/10 bg-muted size-8">
					<AvatarImage src="#" />
					<AvatarFallback>
						<User className="flex-shrink-0 size-4 text-muted-foreground/75" />
					</AvatarFallback>
				</Avatar>

				<div className="grid line-clamp-1">
					<p className="font-semibold uppercase truncate">{patient.name}</p>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<div className="flex gap-2">
					<Cake className="mt-0.5 size-4 text-muted-foreground/75 flex-shrink-0" />

					<div>
						<p className="font-light">{t("list.age")}:</p>
						<p className="font-semibold text-pretty">
							<span>
								{patient.age || "N/A"} {t("list.years")}
							</span>
							<span className="mx-1">&#x2022;</span>
							<span>
								{format(patient.dateOfBirth, "PP", {
									locale,
									in: tzDate,
								})}
							</span>
						</p>
					</div>
				</div>

				<div className="flex gap-2">
					{getGenderIcon(
						patient.gender,
						"size-4 text-muted-foreground/75 mt-0.5 flex-shrink-0",
					)}

					<div>
						<p className="font-light">{t("list.gender")}:</p>
						<Badge
							variant="outline"
							className="flex items-center gap-1 text-xs bg-background text-muted-foreground"
						>
							{patient.gender &&
								getGenderIcon(
									patient.gender,
									"size-4 text-muted-foreground flex-shrink-0",
								)}
							<p className="font-semibold">{patient.gender || "N/A"}</p>
						</Badge>
					</div>
				</div>
			</div>

			<Separator />

			<div className="grid grid-cols-2 gap-4">
				<p className="mb-2 text-xs tracking-wider uppercase text-muted-foreground col-span-full">
					{t("list.contact")}
				</p>

				<div className="flex items-center gap-3 col-span-full">
					<Avatar className="border rounded-lg border-black/10 bg-muted size-8">
						<AvatarImage src="#" />
						<AvatarFallback>
							<IdCard className="flex-shrink-0 size-4 text-muted-foreground/75" />
						</AvatarFallback>
					</Avatar>

					<div className="grid line-clamp-1">
						<p className="font-semibold uppercase truncate">
							{patient.contact?.contactName || "N/A"}
						</p>
					</div>
				</div>

				<div className="flex gap-2">
					<Phone className="mt-0.5 size-4 text-muted-foreground/75 flex-shrink-0" />

					<div>
						<p className="font-light">{t("list.contact_phone")}:</p>
						<p className="font-semibold break-all text-pretty">
							{patient?.contact?.contactPhone || "N/A"}
						</p>
					</div>
				</div>

				<div className="flex gap-2">
					<Mail className="mt-0.5 size-4 text-muted-foreground/75 flex-shrink-0" />

					<div>
						<p className="font-light">Email:</p>
						<p className="font-semibold break-all text-pretty">
							{patient?.contact?.email || "N/A"}
						</p>
					</div>
				</div>

				<div className="flex gap-2">
					<Link className="mt-0.5 size-4 text-muted-foreground/75 flex-shrink-0" />

					<div>
						<p className="font-light">MiiTel Link:</p>
						<p className="font-semibold break-all text-pretty">
							{patient?.contact?.miitelLink || "N/A"}
						</p>
					</div>
				</div>
			</div>

			<Separator />

			<div className="grid grid-cols-2 gap-4">
				<p className="mb-2 text-xs tracking-wider uppercase text-muted-foreground col-span-full">
					{t("list.visit_location")}
				</p>

				<div className="flex items-center gap-3 col-span-full">
					<Avatar className="border rounded-lg border-black/10 bg-muted size-8">
						<AvatarImage src="#" />
						<AvatarFallback>
							<MapPinned className="flex-shrink-0 size-4 text-muted-foreground/75" />
						</AvatarFallback>
					</Avatar>

					<div className="grid line-clamp-1">
						<p className="font-semibold uppercase text-pretty">
							{[
								patient?.activeAddress?.location?.city,
								patient?.activeAddress?.location?.state,
								patient?.activeAddress?.location?.country,
							]?.join(", ") || "N/A"}
						</p>
					</div>
				</div>

				<div className="flex gap-2 col-span-full">
					<MapPinHouse className="mt-0.5 size-4 text-muted-foreground/75 flex-shrink-0" />

					<div>
						<p className="font-light">{t("list.visit_address")}:</p>
						<p className="font-semibold uppercase text-pretty">
							{patient?.activeAddress?.address || "N/A"}
						</p>
						<p className="italic font-normal">
							{t("list.notes")}: {patient?.activeAddress?.notes || "N/A"}
						</p>
						{patient?.activeAddress?.coordinates?.length && (
							<Button
								type="button"
								variant="primary-outline"
								size="sm"
								className="mt-2"
								onClick={(event) => {
									event.preventDefault();
									event.stopPropagation();
									window.open(
										`https://www.google.com/maps/search/?api=1&query=${patient?.activeAddress?.coordinates.join(",")}`,
									);
								}}
							>
								<MapPinIcon />
								{t("list.view_on_google_maps")}
							</Button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
});

interface HoverCardListItemProps {
	isSelected: boolean;
	patient: Patient;
	setSelectedPatient: Dispatch<SetStateAction<Patient | null>>;
}

const HoverCardListItem = memo(function Component({
	isSelected,
	patient,
	setSelectedPatient,
}: HoverCardListItemProps) {
	const { locale, tzDate } = useDateContext();
	const { t } = useTranslation("appointments");

	return (
		<HoverCard>
			<HoverCardTrigger asChild>
				<button
					type="button"
					className={cn(
						"w-full p-3 mb-2 text-sm text-left border rounded-md shadow-inner border-input bg-background focus:bg-primary focus:ring-1 focus:text-primary-foreground focus:ring-primary",
						isSelected &&
							"bg-primary ring-1 text-primary-foreground ring-primary",
					)}
					onClick={(event) => {
						event.preventDefault();
						setSelectedPatient(patient);
					}}
				>
					<div className="flex items-center gap-3">
						<Avatar className="border rounded-lg border-border bg-muted size-6">
							<AvatarImage src="#" />
							<AvatarFallback>
								<User className="flex-shrink-0 size-3.5 text-muted-foreground/75" />
							</AvatarFallback>
						</Avatar>

						<div className="grid text-sm line-clamp-1">
							<p className="font-semibold uppercase truncate">{patient.name}</p>
						</div>
					</div>
				</button>
			</HoverCardTrigger>

			<HoverCardContent className="w-fit">
				<div className="flex items-center gap-3">
					<Avatar className="border rounded-lg border-border bg-muted size-12">
						<AvatarImage src="#" />
						<AvatarFallback>
							<User className="flex-shrink-0 size-5 text-muted-foreground/75" />
						</AvatarFallback>
					</Avatar>

					<div className="grid text-sm line-clamp-1">
						<p className="font-semibold uppercase truncate">{patient.name}</p>

						<div className="flex items-center gap-3 mt-2">
							<div className="flex items-center gap-1 text-xs">
								<Cake className={cn("size-3 text-muted-foreground")} />
								<p className="font-light text-pretty">
									<span>
										{patient?.age || "N/A"} {t("list.years")}
									</span>
									<span className="mx-1">&#x2022;</span>
									<span>
										{patient?.dateOfBirth
											? format(patient?.dateOfBirth, "PP", {
													locale,
													in: tzDate,
												})
											: "N/A"}
									</span>
								</p>
							</div>

							<Separator orientation="vertical" className={cn("bg-black/10")} />

							<Badge
								variant="outline"
								className={cn("flex items-center gap-1 text-xs font-light")}
							>
								{patient?.gender &&
									getGenderIcon(
										patient.gender,
										cn("size-3 text-muted-foreground"),
									)}

								<span>{patient?.gender || "N/A"}</span>
							</Badge>
						</div>
					</div>
				</div>
			</HoverCardContent>
		</HoverCard>
	);
});

export default function ExistingPatientSelection() {
	const { t } = useTranslation("appointments-form");
	const { t: tpp } = useTranslation("appointments-form", {
		keyPrefix: "patient_profile",
	});
	const isMobile = useIsMobile();
	const { props: globalProps } = usePage<AppointmentNewGlobalPageProps>();
	const { mode } = useFormProvider();
	const form = useFormContext<AppointmentBookingSchema>();
	const watchPatientRecordSourceValue = useWatch({
		control: form.control,
		name: "formOptions.patientRecordSource",
	});
	const watchPatientDetailsValue = useWatch({
		control: form.control,
		name: "patientDetails",
	});
	const isNotCompletedForm = useMemo(() => {
		const { fullName, age, dateOfBirth, gender } = watchPatientDetailsValue;
		return !fullName || !age || !dateOfBirth || !gender;
	}, [watchPatientDetailsValue]);

	// * manage the user selection to use existing patient data
	const [isOpenSheet, setIsOpenSheet] = useState(false);
	const [selectedPatient, setSelectedPatient] = useState<null | Patient>(
		globalProps?.appointmentReference?.patient || null,
	);
	const isPatientSelected = useCallback(
		(patient: Patient) => {
			if (!selectedPatient) return false;

			const isSameName = selectedPatient.name === patient.name;
			const isSameAge = selectedPatient.age === patient.age;
			const isSameGender = selectedPatient.gender === patient.gender;
			const isSameDateOfBirth = isSameDay(
				selectedPatient.dateOfBirth,
				patient.dateOfBirth,
			);

			return isSameName && isSameAge && isSameGender && isSameDateOfBirth;
		},
		[selectedPatient],
	);
	const patientSourceSelectionList = useMemo(() => {
		return [
			{
				title: tpp("fields.source_selection.options.existing.label"),
				value:
					"existing" satisfies AppointmentBookingSchema["formOptions"]["patientRecordSource"],
			},
			{
				title: tpp("fields.source_selection.options.new.label"),
				value:
					"add" satisfies AppointmentBookingSchema["formOptions"]["patientRecordSource"],
			},
		];
	}, [tpp]);
	const isExistingPatientSource = useMemo(
		() => watchPatientRecordSourceValue === "existing",
		[watchPatientRecordSourceValue],
	);
	const onHandleChangePatientSource = useCallback(() => {
		// reset the patient contact information and also the patient details
		const { patientDetails, contactInformation } =
			defineAppointmentFormDefaultValues();
		form.setValue("patientDetails", { ...patientDetails });
		form.resetField("patientDetails");
		form.setValue("contactInformation", { ...contactInformation });
		form.resetField("contactInformation");

		// reset the data fetching of patient list
		onHandleFetchPatientList("");

		// reset the selected patient record data and the search patient state
		setSelectedPatient(null);
		setSearchPatient("");
	}, [form.resetField, form.setValue]);

	// * for get the patient list
	const [isLoading, setIsLoading] = useState({ patientList: false });
	const [searchPatient, setSearchPatient] = useState(
		globalProps?.adminPortal?.currentQuery?.patientQuery || "",
	);
	const patients = useMemo(
		() => globalProps?.patientList || [],
		[globalProps?.patientList],
	);
	const onHandleFetchPatientList = useCallback(
		debounce((value: string) => {
			const { fullUrl } = populateQueryParams(
				globalProps.adminPortal.router.adminPortal.appointment.new,
				deepTransformKeysToSnakeCase({
					patientQuery: value || null,
				}),
			);
			router.get(
				fullUrl,
				{},
				{
					only: ["adminPortal", "flash", "errors", "patientList"],
					preserveScroll: true,
					preserveState: true,
					replace: false,
					onStart: () => {
						setIsLoading((prev) => ({
							...prev,
							patientList: true,
						}));
					},
					onFinish: () => {
						setTimeout(() => {
							setIsLoading((prev) => ({
								...prev,
								patientList: false,
							}));
						}, 250);
					},
				},
			);
		}, 250),
		[],
	);

	// * for selected the existing patient
	const onSaveSelectedPatient = useCallback(() => {
		if (!selectedPatient) return;

		// provide defaults for missing nested objects
		const {
			name,
			gender,
			age,
			dateOfBirth,
			activeAddress = {
				...selectedPatient.activeAddress,
				...DEFAULT_VALUES_PATIENT_ADDRESS,
				location: DEFAULT_VALUES_LOCATION,
			},
			contact = {
				...DEFAULT_VALUES_PATIENT_CONTACT,
				...selectedPatient.contact,
			},
		} = selectedPatient;
		const {
			latitude,
			longitude,
			postalCode,
			address,
			notes: addressNotes,
			location,
		} = activeAddress;
		const patientDetails = {
			fullName: name,
			gender,
			age,
			dateOfBirth: new Date(dateOfBirth),
			latitude,
			longitude,
			postalCode: postalCode || undefined,
			addressNotes: addressNotes || DEFAULT_VALUES_PATIENT_ADDRESS.addressNotes,
			address,
			location: {
				id: location.id,
				city: location.city,
			},
			complaintDescription: "",
			condition: "NORMAL",
			illnessOnsetDate: "",
			medicalHistory: "",
		} satisfies AppointmentBookingSchema["patientDetails"];
		const contactInformation = {
			contactName: contact.contactName,
			contactPhone: contact.contactPhone.includes("+")
				? contact.contactPhone
				: `+${contact.contactPhone}`,
			email: contact.email || DEFAULT_VALUES_PATIENT_CONTACT.email,
			miitelLink:
				contact.miitelLink || DEFAULT_VALUES_PATIENT_CONTACT.miitelLink,
		} satisfies AppointmentBookingSchema["contactInformation"];

		// set the form values from the selected patient
		form.setValue("patientDetails", { ...patientDetails });
		form.setValue("contactInformation", { ...contactInformation });
	}, [selectedPatient, form.setValue]);

	// * show and hide components
	const isShow = useMemo(() => {
		return {
			patientRecordRadio: mode === "new",
			existingPatientSource: isExistingPatientSource,
			patientSearch: mode === "new",
		};
	}, [mode, isExistingPatientSource]);

	return (
		<Fragment>
			{isShow.patientRecordRadio && (
				<FormField
					control={form.control}
					name="formOptions.patientRecordSource"
					render={({ field }) => (
						<FormItem className="space-y-3 col-span-full">
							<FormControl>
								<RadioGroup
									onValueChange={(event) => {
										field.onChange(event);
										onHandleChangePatientSource();
									}}
									defaultValue={field.value}
									orientation="horizontal"
									className="grid grid-cols-2 gap-4"
								>
									{patientSourceSelectionList.map((option, index) => (
										<FormItem
											key={option.value}
											className="flex items-center p-3 space-x-3 space-y-0 border rounded-md shadow-inner border-input bg-sidebar"
										>
											<FormControl>
												<RadioGroupItem value={option.value} />
											</FormControl>
											<FormLabel className="flex items-center gap-1.5 font-normal text-pretty flex-col text-center md:flex-row md:text-start">
												{index === 0 ? (
													<MousePointerClick className="flex-shrink-0 text-muted-foreground size-5" />
												) : (
													<UserRoundPlus className="flex-shrink-0 text-muted-foreground size-5" />
												)}
												{option.title}
											</FormLabel>
										</FormItem>
									))}
								</RadioGroup>
							</FormControl>

							<FormMessage />
						</FormItem>
					)}
				/>
			)}

			{(!!form?.formState?.errors?.patientDetails ||
				!!form?.formState?.errors?.contactInformation) &&
				isExistingPatientSource && (
					<Alert variant="destructive" className="col-span-full">
						<AlertCircle className="size-4" />
						<AlertTitle className="text-xs">
							{tpp("alert_empty.title")}
						</AlertTitle>
						<AlertDescription className="text-xs">
							{tpp("alert_empty.description")}
						</AlertDescription>
					</Alert>
				)}

			{isShow.existingPatientSource && (
				<Fragment>
					<CardPatientBasicInfoForm
						isNotCompletedForm={isNotCompletedForm}
						details={{
							fullName: watchPatientDetailsValue.fullName,
							age: watchPatientDetailsValue.age,
							dateOfBirth: watchPatientDetailsValue.dateOfBirth,
							gender: watchPatientDetailsValue.gender,
						}}
						fallbackText={tpp("empty_card")}
						className="flex items-center justify-between gap-4 col-span-full"
					>
						<Button
							variant="link"
							size="sm"
							effect="expandIcon"
							iconPlacement="left"
							type="button"
							icon={mode === "series" ? Info : Pencil}
							onClick={(event) => {
								event.preventDefault();
								setIsOpenSheet((prev) => !prev);
							}}
						>
							{mode === "series" ? "Detail" : "Edit"}
						</Button>
					</CardPatientBasicInfoForm>

					<Sheet open={isOpenSheet} onOpenChange={setIsOpenSheet}>
						<SheetContent
							side={isMobile ? "bottom" : "right"}
							className="!max-w-md max-h-screen p-0 overflow-auto"
						>
							<div className="flex flex-col w-full h-full px-6 mx-auto">
								<SheetHeader className="flex-none py-6">
									<SheetTitle>{tpp("modal.title")}</SheetTitle>
								</SheetHeader>

								<div className="grid content-start flex-1 gap-4 py-4 overflow-y-auto text-sm px-0.5">
									{isShow.patientSearch && (
										<>
											<div className="grid gap-2">
												<Input
													placeholder={tpp(
														"fields.existing_selection.placeholder",
													)}
													className="shadow-inner bg-sidebar"
													value={searchPatient}
													StartIcon={{ icon: Search }}
													EndIcon={
														searchPatient
															? {
																	isButton: true,
																	icon: X,
																	handleOnClick: (event) => {
																		event.preventDefault();

																		setSearchPatient("");
																		setSelectedPatient(null);
																		onHandleFetchPatientList("");
																	},
																}
															: undefined
													}
													onChange={(event) => {
														const value = event.target.value;

														setSearchPatient(value);
														setSelectedPatient(null);
														onHandleFetchPatientList(value);
													}}
												/>

												<p className="text-[0.8rem] text-pretty text-muted-foreground">
													{tpp("fields.existing_selection.description")}
												</p>
											</div>

											<ScrollArea
												className={cn(
													"w-full border rounded-md bg-sidebar",
													isMobile ? "max-h-96" : "max-h-80",
												)}
											>
												<div className="p-4">
													<h4 className="mb-4 text-xs leading-none tracking-wider uppercase text-muted-foreground">
														{tpp("fields.existing_selection.list.label")}
													</h4>

													{isLoading.patientList ? (
														<div className="flex flex-col items-center gap-2.5 text-muted-foreground">
															<LoaderIcon className="animate-spin" />
															<span>{tpp("loading")}</span>
														</div>
													) : patients?.length ? (
														patients?.map((patient) => (
															<HoverCardListItem
																key={patient.name}
																patient={patient}
																isSelected={isPatientSelected(patient)}
																setSelectedPatient={setSelectedPatient}
															/>
														))
													) : (
														<div className="grid gap-4">
															<Search className="mx-auto text-muted size-6" />
															<p className="text-center text-pretty text-muted w-[75%] mx-auto">
																{tpp("fields.existing_selection.list.empty")}
															</p>
														</div>
													)}
												</div>
											</ScrollArea>
										</>
									)}

									<AnimatePresence mode="sync">
										{!!selectedPatient && (
											<motion.div
												key="selected-patient"
												initial={{ opacity: 0, y: -10 }}
												animate={{ opacity: 1, y: 0 }}
												exit={{ opacity: 0, y: 10 }}
												transition={{ duration: 0.05 }}
											>
												<CardSelection patient={selectedPatient} />
											</motion.div>
										)}
									</AnimatePresence>
								</div>

								<SheetFooter className="sticky bottom-0 left-0 flex-none py-6 bg-background">
									<SheetClose asChild>
										<Button variant="primary-outline" className="mt-6 sm:mt-0">
											{t("button.close")}
										</Button>
									</SheetClose>

									{isShow.patientSearch && (
										<Button
											disabled={!selectedPatient}
											onClick={(event) => {
												event.preventDefault();
												onSaveSelectedPatient();
												setIsOpenSheet((prev) => !prev);
											}}
										>
											{tpp("button.select")}
										</Button>
									)}
								</SheetFooter>
							</div>
						</SheetContent>
					</Sheet>
				</Fragment>
			)}
		</Fragment>
	);
}
