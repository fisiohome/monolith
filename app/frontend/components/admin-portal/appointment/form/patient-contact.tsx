import { LoadingBasic } from "@/components/shared/loading";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import { useIsMobile } from "@/hooks/use-mobile";
import {
	defineAppointmentFormDefaultValues,
	type AppointmentBookingSchema,
} from "@/lib/appointments/form";
import {
	cn,
	debounce,
	generateInitials,
	populateQueryParams,
} from "@/lib/utils";
import type { AppointmentNewGlobalPageProps } from "@/pages/AdminPortal/Appointment/New";
import type { Patient } from "@/types/admin-portal/patient";
import { router, usePage } from "@inertiajs/react";
import { AnimatePresence, motion } from "framer-motion";
import {
	AlertCircle,
	BookPlus,
	IdCard,
	Link,
	Mail,
	MousePointerClick,
	Pencil,
	Phone,
	Search,
	X,
} from "lucide-react";
import {
	type Dispatch,
	Fragment,
	memo,
	type SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

export default function PatientContactForm() {
	const { t } = useTranslation("appointments-form");
	const { t: tpc } = useTranslation("appointments-form", {
		keyPrefix: "patient_contact",
	});
	const isMobile = useIsMobile();
	const { props: globalProps } = usePage<AppointmentNewGlobalPageProps>();

	// * form management state
	const form = useFormContext<AppointmentBookingSchema>();
	const watchPatientContactValue = useWatch({
		control: form.control,
		name: "contactInformation",
	});
	const contactNameCard = useMemo(() => {
		const { contactName, contactPhone } = watchPatientContactValue;
		if (!contactName || !contactPhone) return tpc("empty_card");

		return watchPatientContactValue.contactName;
	}, [watchPatientContactValue, tpc]);
	const [isOpenSheet, setIsOpenSheet] = useState(false);
	const hasFormErrors = useMemo(
		() => !!form?.formState?.errors?.contactInformation,
		[form?.formState?.errors?.contactInformation],
	);

	// * for contact source selection
	const contactSourceSelection = useWatch({
		control: form.control,
		name: "formOptions.patientContactSource",
	});
	const contactSourceList = useMemo(() => {
		return [
			{
				title: tpc("fields.source_selection.options.existing.label"),
				value:
					"existing" satisfies AppointmentBookingSchema["formOptions"]["patientContactSource"],
			},
			{
				title: tpc("fields.source_selection.options.new.label"),
				value:
					"new" satisfies AppointmentBookingSchema["formOptions"]["patientContactSource"],
			},
		];
	}, [tpc]);
	const [isLoading, setIsLoading] = useState({ contactList: false });
	const [searchContact, setSearchContact] = useState(
		watchPatientContactValue.contactName ||
			globalProps?.adminPortal?.currentQuery?.patientContactQuery ||
			"",
	);
	const contacts = useMemo(
		() => globalProps?.patientContactList || [],
		[globalProps?.patientContactList],
	);
	useEffect(() => {
		onHandleFetchContactList(searchContact);
	}, [searchContact]);
	const onHandleContactSource = useCallback(() => {
		// reset the patient contact information
		const { contactInformation } = defineAppointmentFormDefaultValues();
		form.resetField("contactInformation", {
			defaultValue: { ...contactInformation },
		});

		setSearchContact("");
		setSelectedContact(null);
	}, [form.resetField]);
	const onHandleFetchContactList = useCallback(
		debounce((value: string) => {
			const { fullUrl } = populateQueryParams(
				globalProps.adminPortal.router.adminPortal.appointment.new,
				deepTransformKeysToSnakeCase({
					patientContactQuery: value || null,
				}),
			);
			router.get(
				fullUrl,
				{},
				{
					only: ["adminPortal", "flash", "errors", "patientContactList"],
					preserveScroll: true,
					preserveState: true,
					replace: false,
					onStart: () => {
						setIsLoading((prev) => ({
							...prev,
							contactList: true,
						}));
					},
					onFinish: () => {
						setTimeout(() => {
							setIsLoading((prev) => ({
								...prev,
								contactList: false,
							}));
						}, 250);
					},
				},
			);
		}, 250),
		[],
	);

	//* for patient contact selection
	const [selectedContact, setSelectedContact] = useState<null | NonNullable<
		Patient["contact"]
	>>(null);
	const isSelected = useCallback(
		(contact: NonNullable<Patient["contact"]>) => {
			if (!selectedContact) return false;

			const isSamePhone = selectedContact.contactPhone === contact.contactPhone;
			const isSameEmail = selectedContact.email === contact.email;

			return isSamePhone && isSameEmail;
		},
		[selectedContact],
	);
	const onSaveSelectedContact = useCallback(() => {
		if (!selectedContact) return;

		// define the selected contact details
		const { contactInformation: defaultContact } =
			defineAppointmentFormDefaultValues();
		const contactInformation = {
			contactName: selectedContact.contactName,
			contactPhone: selectedContact.contactPhone,
			email: selectedContact?.email || defaultContact.email,
			miitelLink: selectedContact?.miitelLink || defaultContact.miitelLink,
		} satisfies AppointmentBookingSchema["contactInformation"];

		// save the defined contact details to the form values
		form.setValue("contactInformation", { ...contactInformation });
	}, [selectedContact, form.setValue]);

	return (
		<Fragment>
			<div className="flex items-center justify-between col-span-full">
				<p className="mb-2 text-xs tracking-wider uppercase text-muted-foreground col-span-full">
					{tpc("label")}
				</p>

				<Button
					variant="link"
					size="sm"
					effect="expandIcon"
					iconPlacement="left"
					type="button"
					icon={Pencil}
					onClick={(event) => {
						event.preventDefault();
						setIsOpenSheet((prev) => !prev);
					}}
				>
					{t("button.edit")}
				</Button>
			</div>

			{hasFormErrors && (
				<Alert variant="destructive" className="col-span-full">
					<AlertCircle className="size-4" />
					<AlertTitle className="text-xs">
						{tpc("alert_empty.title")}
					</AlertTitle>
					<AlertDescription className="text-xs">
						{tpc("alert_empty.description")}
					</AlertDescription>
				</Alert>
			)}

			<div className="p-3 border rounded-md shadow-inner border-input bg-sidebar col-span-full">
				<div className="flex items-center gap-3">
					<Avatar className="border rounded-lg border-black/10 bg-muted size-8">
						<AvatarImage src="#" />
						<AvatarFallback>
							<IdCard className="flex-shrink-0 size-4 text-muted-foreground/75" />
						</AvatarFallback>
					</Avatar>

					<div className="grid text-sm line-clamp-1">
						<p className="font-semibold uppercase truncate">
							{contactNameCard}
						</p>
					</div>
				</div>
			</div>

			<Sheet open={isOpenSheet} onOpenChange={setIsOpenSheet}>
				<SheetContent
					side={isMobile ? "bottom" : "right"}
					className="max-h-screen p-0 overflow-auto !max-w-md"
				>
					<div className="flex flex-col w-full h-full px-6">
						<SheetHeader className="flex-none py-6">
							<SheetTitle>{tpc("modal.title")}</SheetTitle>
						</SheetHeader>

						<div className="grid content-start flex-1 gap-4 py-4 overflow-y-auto text-sm px-0.5">
							<FormField
								control={form.control}
								name="formOptions.patientContactSource"
								render={({ field }) => (
									<FormItem className="space-y-3 col-span-full">
										<FormControl>
											<RadioGroup
												onValueChange={(event) => {
													field.onChange(event);

													onHandleContactSource();
												}}
												defaultValue={field.value}
												orientation="horizontal"
												className="grid grid-cols-2 gap-4"
											>
												{contactSourceList.map((option, index) => (
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
																<BookPlus className="flex-shrink-0 text-muted-foreground size-5" />
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

							<AnimatePresence mode="wait">
								{contactSourceSelection === "new" ? (
									<motion.div
										key="new-form-fields"
										initial={{ opacity: 0, y: -10 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, y: 10 }}
										transition={{ duration: 0.05 }}
										className="grid gap-4"
									>
										<FormField
											control={form.control}
											name="contactInformation.contactName"
											render={({ field }) => (
												<FormItem>
													<FormLabel>{tpc("fields.name.label")}</FormLabel>
													<FormControl>
														<Input
															{...field}
															type="text"
															autoComplete="name"
															placeholder={tpc("fields.name.placeholder")}
															className="shadow-inner bg-sidebar"
														/>
													</FormControl>

													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name="contactInformation.contactPhone"
											render={({ field }) => (
												<FormItem>
													<FormLabel>
														{tpc("fields.contact_number.label")}
													</FormLabel>
													<FormControl>
														<PhoneInput
															{...field}
															international
															placeholder={tpc(
																"fields.contact_number.placeholder",
															)}
															defaultCountry="ID"
															autoComplete="tel"
															className="shadow-inner bg-sidebar"
														/>
													</FormControl>

													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name="contactInformation.email"
											render={({ field }) => (
												<FormItem className="col-span-1">
													<FormLabel>{tpc("fields.email.label")}</FormLabel>
													<FormControl>
														<Input
															{...field}
															type="email"
															autoComplete="email"
															placeholder={tpc("fields.email.placeholder")}
															className="shadow-inner bg-sidebar"
														/>
													</FormControl>

													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name="contactInformation.miitelLink"
											render={({ field }) => (
												<FormItem>
													<FormLabel>
														{tpc("fields.miitel_link.label")}
													</FormLabel>
													<FormControl>
														<Input
															{...field}
															type="url"
															placeholder={tpc(
																"fields.miitel_link.placeholder",
															)}
															className="shadow-inner bg-sidebar"
														/>
													</FormControl>

													<FormMessage />
												</FormItem>
											)}
										/>
									</motion.div>
								) : (
									<motion.div
										key="existing-contact"
										initial={{ opacity: 0, y: -10 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, y: 10 }}
										transition={{ duration: 0.05 }}
										className="grid gap-4"
									>
										<div className="grid gap-2">
											<Input
												placeholder={tpc(
													"fields.existing_selection.placeholder",
												)}
												className="shadow-inner bg-sidebar"
												value={searchContact}
												StartIcon={{ icon: Search }}
												EndIcon={
													searchContact
														? {
																isButton: true,
																icon: X,
																handleOnClick: (event) => {
																	event.preventDefault();

																	setSearchContact("");
																	setSelectedContact(null);
																},
															}
														: undefined
												}
												onChange={(event) => {
													const value = event.target.value;

													setSearchContact(value);
													setSelectedContact(null);
												}}
											/>

											<p className="text-[0.8rem] text-pretty text-muted-foreground">
												{tpc("fields.existing_selection.description")}
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
													{tpc("fields.existing_selection.list.label")}
												</h4>

												{isLoading.contactList ? (
													<div className="flex flex-col items-center gap-2.5 text-muted-foreground">
														<LoadingBasic columnBased />
													</div>
												) : contacts?.length ? (
													contacts?.map((contact) => (
														<ListItem
															key={contact.id}
															contact={contact}
															isSelected={isSelected(contact)}
															setSelected={setSelectedContact}
														/>
													))
												) : (
													<div className="grid gap-4">
														<Search className="mx-auto text-muted size-6" />
														<p className="text-center text-pretty text-muted w-[75%] mx-auto">
															{tpc("fields.existing_selection.list.empty")}
														</p>
													</div>
												)}
											</div>
										</ScrollArea>

										<AnimatePresence mode="sync">
											{!!selectedContact && (
												<motion.div
													key="selected-contact"
													initial={{ opacity: 0, y: -10 }}
													animate={{ opacity: 1, y: 0 }}
													exit={{ opacity: 0, y: 10 }}
													transition={{ duration: 0.05 }}
												>
													<CardSelection contact={selectedContact} />
												</motion.div>
											)}
										</AnimatePresence>
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

							{contactSourceSelection === "new" ? (
								<SheetClose asChild>
									<Button>{t("button.save.label")}</Button>
								</SheetClose>
							) : (
								<Button
									onClick={(event) => {
										event.preventDefault();

										onSaveSelectedContact();
										setIsOpenSheet((prev) => !prev);
									}}
								>
									{tpc("button.select")}
								</Button>
							)}
						</SheetFooter>
					</div>
				</SheetContent>
			</Sheet>
		</Fragment>
	);
}

// * list item component
interface ListItemProps {
	isSelected: boolean;
	contact: NonNullable<Patient["contact"]>;
	setSelected: Dispatch<SetStateAction<NonNullable<Patient["contact"]> | null>>;
}

const ListItem = memo(function Component({
	isSelected,
	contact,
	setSelected,
}: ListItemProps) {
	return (
		<button
			type="button"
			className={cn(
				"w-full p-3 mb-2 text-sm text-left border rounded-md shadow-inner border-input bg-background focus:bg-primary focus:ring-1 focus:text-primary-foreground focus:ring-primary grid gap-2",
				isSelected && "bg-primary ring-1 text-primary-foreground ring-primary",
			)}
			onClick={(event) => {
				event.preventDefault();

				setSelected(contact);
			}}
		>
			<div className="flex gap-3">
				<Avatar className="border rounded-lg border-border bg-muted size-6">
					<AvatarImage src="#" />
					<AvatarFallback>
						<IdCard className="flex-shrink-0 size-4 text-muted-foreground/75" />
					</AvatarFallback>
				</Avatar>

				<div className="grid gap-0.5 text-sm">
					<div className="line-clamp-1">
						<p className="font-semibold uppercase truncate">
							{contact.contactName}
						</p>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-2">
				<div className="flex items-center gap-1">
					<Mail className="size-3 shrink-0" />
					<p className="text-xs font-light line-clamp-1">{contact.email}</p>
				</div>
				<div className="flex items-center gap-1">
					<Phone className="size-3 shrink-0" />
					<p className="text-xs font-light line-clamp-1">
						{contact.contactPhone}
					</p>
				</div>
			</div>
		</button>
	);
});

// * card selection component
interface CardSelectionProps {
	contact: NonNullable<Patient["contact"]>;
}

const CardSelection = memo(function Component({ contact }: CardSelectionProps) {
	const { t } = useTranslation("appointments");

	return (
		<div className="grid gap-4 p-3 text-sm border rounded-md shadow-inner border-input bg-sidebar text-muted-foreground">
			<div className="flex items-center gap-2">
				<Avatar className="text-[10px] border rounded-lg border-border bg-background size-6">
					<AvatarImage src="#" alt={contact.contactName} />
					<AvatarFallback className="bg-background">
						{generateInitials(contact.contactName)}
					</AvatarFallback>
				</Avatar>
				<div>
					<p className="font-semibold uppercase line-clamp-1">
						{contact?.contactName}
					</p>
				</div>
			</div>

			<div className="grid gap-3">
				<div className="grid grid-cols-3 gap-2">
					<p className="font-light">{t("list.contact_phone")}:</p>
					<p className="col-span-2 font-semibold text-right uppercase text-pretty">
						{contact?.contactPhone || "N/A"}
					</p>
				</div>

				<div className="grid grid-cols-3 gap-2">
					<p className="font-light">MiiTel Link:</p>
					<div className="col-span-2">
						<p className="flex items-center justify-end gap-0.5 w-full font-semibold uppercase text-pretty">
							<Link className="size-4 text-muted-foreground/75 shrink-0" />
							{contact?.miitelLink || "N/A"}
						</p>
					</div>
				</div>

				<div className="grid grid-cols-3 gap-2">
					<p className="font-light">Email:</p>
					<p className="col-span-2 font-semibold text-right text-pretty">
						{contact?.email || "N/A"}
					</p>
				</div>
			</div>
		</div>
	);
});
