import { zodResolver } from "@hookform/resolvers/zod";
import { Deferred, router, usePage } from "@inertiajs/react";
import { format } from "date-fns";
import {
	AlertCircle,
	CalendarIcon,
	CheckCircleIcon,
	CheckIcon,
	EllipsisVerticalIcon,
	IdCard,
	LoaderIcon,
	PencilIcon,
	PlusIcon,
	SquarePen,
	Trash2,
	X,
} from "lucide-react";
import {
	Fragment,
	memo,
	Suspense,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useForm, useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { isValidPhoneNumber } from "react-phone-number-input";
import { toast } from "sonner";
import { Drawer as DrawerPrimitive } from "vaul";
import { z } from "zod";
import HereMap, { type HereMapProps } from "@/components/shared/here-map";
import { LoadingBasic } from "@/components/shared/loading";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar, type CalendarProps } from "@/components/ui/calendar";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemTitle,
} from "@/components/ui/item";
import { PhoneInput } from "@/components/ui/phone-input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import { getGenderIcon } from "@/hooks/use-gender";
import { GENDERS } from "@/lib/constants";
import { MAP_DEFAULT_COORDINATE } from "@/lib/here-maps";
import { calculateAge, cn, populateQueryParams } from "@/lib/utils";
import { idSchema } from "@/lib/validation";
import type { PatientIndexGlobalPageProps } from "@/pages/AdminPortal/Patient/Index";
import type { PatientActiveAddress } from "@/types/admin-portal/patient";
import AddAddressSection from "./form-create";

const ADDRESS_FORM_SCHEMA = z.object({
	address: z.string().min(1, "Address is required"),
	postalCode: z.string().optional(),
	coordinate: z.string().optional(),
	locationId: z.coerce.number().min(1, "Location is required"),
	notes: z.string().optional(),
});
type AddressFormSchema = z.infer<typeof ADDRESS_FORM_SCHEMA>;

const FORM_SCHEMA = z.object({
	contact: z.object({
		id: idSchema,
		contactName: z.string().min(1, "Contact name is required"),
		contactPhone: z
			.string()
			.min(1, { message: "Contact phone number is required" })
			.refine(isValidPhoneNumber, { message: "Invalid phone number" }),
		email: z.string().email("Invalid email").or(z.literal("")).optional(),
		miitelLink: z.string().url("MiiTel link must be a valid URL").optional(),
	}),
	profile: z.object({
		id: idSchema,
		fullName: z.string().min(1, "Patient full name is required"),
		dateOfBirth: z.coerce
			.date()
			// Ensure the date is in the past
			.refine((date) => date < new Date(), {
				message: "Date of birth must be in the past",
			}),
		age: z.coerce.number().int().positive(),
		gender: z.enum(GENDERS, {
			required_error: "Need to select a patient gender",
		}),
	}),
});
type FormSchema = z.infer<typeof FORM_SCHEMA>;

type PatientUpdatePayload = {
	contact: FormSchema["contact"];
	profile: Pick<FormSchema["profile"], "id" | "dateOfBirth" | "gender"> & {
		name: string;
	};
};

export interface FormEditProps {
	open: boolean;
	onOpenChange?: (open: boolean) => void;
	patient: NonNullable<PatientIndexGlobalPageProps["selectedPatient"]>;
}
const FormEdit = memo(function Component({
	open,
	onOpenChange,
	patient,
}: FormEditProps) {
	const { t: td } = useTranslation("translation", { keyPrefix: "components" });
	const { t: tpef } = useTranslation("patients", { keyPrefix: "edit_form" });
	const { props: globalProps, url: pageURL } =
		usePage<PatientIndexGlobalPageProps>();

	// ===== STATE MANAGEMENT =====
	const [isLoading, setIsLoading] = useState(false);
	const leftColumnRef = useRef<HTMLDivElement | null>(null);

	// ===== FORM CONFIGURATION =====
	const formDefaultvalues = useMemo(() => {
		const { contact } = patient;

		return {
			contact: {
				id: contact?.id || "",
				contactName: contact?.contactName || "",
				contactPhone: contact?.contactPhone || "",
				email: contact?.email || "",
				miitelLink: contact?.miitelLink || undefined,
			},
			profile: {
				id: patient.id,
				fullName: patient.name,
				dateOfBirth: new Date(patient.dateOfBirth),
				age: patient.age,
				gender: patient.gender,
			},
		} satisfies FormSchema;
	}, [patient]);

	const form = useForm({
		resolver: zodResolver(FORM_SCHEMA),
		defaultValues: { ...formDefaultvalues },
		mode: "onChange",
	});

	// ===== EVENT HANDLERS =====
	const onSubmit = useCallback(
		(values: FormSchema) => {
			console.group();
			console.log("Starting process to reschedule the appointment...");

			// define the url
			const id = patient.id;
			const baseURL =
				globalProps.adminPortal.router.adminPortal.patientManagement.index;
			const submitURL = `${baseURL}/${id}`;
			// populate current query params
			const { queryParams } = populateQueryParams(pageURL);
			// generate the submit form url with the source query params
			const { fullUrl } = populateQueryParams(submitURL, queryParams);

			// define the submit config
			const submitConfig = {
				preserveScroll: true,
				preserveState: true,
				replace: false,
				only: [
					"adminPortal",
					"flash",
					"errors",
					"patients",
					"selectedPatient",
					"optionsData",
				],
				onStart: () => setIsLoading(true),
				onFinish: () => {
					setTimeout(() => setIsLoading(false), 250);
				},
			} satisfies Parameters<typeof router.put>["2"];

			// define the payload
			const { contact, profile } = values;
			const payload = deepTransformKeysToSnakeCase({
				patient: {
					contact,
					profile: {
						id: profile.id,
						dateOfBirth: profile.dateOfBirth,
						gender: profile.gender,
						name: profile.fullName,
					},
				} satisfies PatientUpdatePayload,
			});

			router.put(fullUrl, payload, submitConfig);

			console.log("Appointment successfully rescheduled...");
			console.groupEnd();
		},
		[
			globalProps.adminPortal.router.adminPortal.patientManagement.index,
			patient.id,
			pageURL,
		],
	);

	// ===== COMPUTED VALUES =====
	const errorsServerValidation = useMemo(
		() => (globalProps?.errors?.fullMessages as unknown as string[]) || null,
		[globalProps?.errors?.fullMessages],
	);

	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<DrawerContent
				onInteractOutside={(event) => {
					event.preventDefault();
				}}
				className="flex flex-col rounded-t-[10px] mt-24 max-h-[90%] fixed bottom-0 left-0 right-0 outline-none bg-card"
			>
				<div className="flex-1 overflow-y-auto overflow-x-hidden">
					<div className="w-full lg:max-w-5xl mx-auto min-w-0">
						<DrawerHeader>
							<DrawerTitle>{tpef("title")}</DrawerTitle>
							<DrawerDescription className="max-w-xs">
								{tpef("description")}
							</DrawerDescription>
						</DrawerHeader>

						<Form {...form}>
							<form onSubmit={form.handleSubmit(onSubmit)}>
								<Suspense fallback={<LoadingBasic columnBased={true} />}>
									<div
										className={
											"grid items-start grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 p-4 min-w-0 overflow-hidden"
										}
									>
										<div
											className="grid gap-4 md:col-span-5"
											ref={leftColumnRef}
										>
											<ContactSection />

											<Separator className="mt-4" />

											<ProfileSection />
										</div>

										<Separator className="mt-4 md:hidden" />

										<div className="md:col-span-7">
											<AddressSection patient={patient} />
										</div>

										{/* for showing the alert error if there's any server validation error */}
										{!!errorsServerValidation?.length && (
											<Alert
												variant="destructive"
												className="mt-6 col-span-full motion-preset-rebound-down"
											>
												<AlertCircle className="size-4" />
												<AlertTitle className="text-xs">Error</AlertTitle>
												<AlertDescription className="text-xs">
													<ul className="list-disc">
														{errorsServerValidation?.map((error) => (
															<li key={error}>{error}</li>
														))}
													</ul>
												</AlertDescription>
											</Alert>
										)}
									</div>
								</Suspense>

								<DrawerFooter className="gap-4 lg:flex-row lg:gap-2 lg:justify-end">
									<Button
										type="submit"
										size="lg"
										disabled={isLoading || !form.formState.isValid}
									>
										{isLoading ? (
											<>
												<LoaderIcon className="animate-spin" />
												<span>{td("modal.wait")}</span>
											</>
										) : (
											<span>{td("modal.save")}</span>
										)}
									</Button>

									<DrawerClose asChild>
										<Button
											disabled={isLoading}
											variant="outline"
											type="button"
											size="lg"
											className="shadow-none bg-card"
										>
											{td("modal.close")}
										</Button>
									</DrawerClose>
								</DrawerFooter>
							</form>
						</Form>
					</div>
				</div>
			</DrawerContent>
		</Drawer>
	);
});
export default FormEdit;

const ContactSection = memo(function Component() {
	const { t: td } = useTranslation("translation", { keyPrefix: "components" });
	const { t: tp } = useTranslation("patients");
	const { t: tpef } = useTranslation("patients", { keyPrefix: "edit_form" });
	const { t: tpl } = useTranslation("patients", { keyPrefix: "list" });
	const { t: tpc } = useTranslation("appointments-form", {
		keyPrefix: "patient_contact",
	});

	// ===== STATE MANAGEMENT =====
	const [isLoading, setIsLoading] = useState(false);
	const [isOpen, setisOpen] = useState(false);

	// ===== FORM & DATA =====
	const form = useFormContext<FormSchema>();
	const { props: globalProps, url: pageURL } =
		usePage<PatientIndexGlobalPageProps>();
	const watchContact = useWatch({ control: form.control, name: "contact" });

	// ===== EVENT HANDLERS =====
	const onSave = useCallback(async () => {
		setIsLoading(true);
		try {
			console.log("Updating patient contact:", {
				contactId: watchContact.id,
				...watchContact,
			});

			// Get patient ID from form context
			const patientId = form.getValues("profile.id");

			// Generate the submit URL
			const baseURL =
				globalProps.adminPortal.router.adminPortal.patientManagement.index;
			const submitURL = `${baseURL}/${patientId}`;
			const { queryParams } = populateQueryParams(pageURL);
			const { fullUrl } = populateQueryParams(submitURL, queryParams);

			// Define the submit config
			const submitConfig = {
				preserveScroll: true,
				preserveState: true,
				replace: false,
				only: ["adminPortal", "flash", "errors", "patients", "selectedPatient"],
				onSuccess: (_page: any) => {
					// Close the contact drawer but keep parent drawer open
					setisOpen(false);

					// Show success toast
					toast.success("Contact updated successfully");
				},
				onError: (errors: any) => {
					console.error("Failed to update contact:", errors);
					toast.error("Failed to update contact");
				},
				onFinish: () => {
					// Always close drawer when request finishes
					setisOpen(false);
				},
			} as any;

			// Define the payload
			const payload = deepTransformKeysToSnakeCase({
				patient: {
					contact: {
						id: watchContact.id,
						contactName: watchContact.contactName,
						contactPhone: watchContact.contactPhone,
						email: watchContact.email,
						miitelLink: watchContact.miitelLink,
					},
					profile: {
						id: patientId,
						name: form.getValues("profile.fullName"),
						dateOfBirth: form.getValues("profile.dateOfBirth"),
						gender: form.getValues("profile.gender"),
					},
				},
			});

			// Make the API call using Inertia.js
			router.put(fullUrl, payload, submitConfig);

			console.log("Contact update submitted...");
		} catch (error) {
			console.error("Failed to update contact:", error);
			toast.error("Failed to update contact");
		} finally {
			setIsLoading(false);
		}
	}, [watchContact, form, globalProps, pageURL]);

	return (
		<div className="grid gap-2">
			<div className="flex items-center justify-between">
				<p className="text-xs font-semibold tracking-wider text-muted-foreground/75 uppercase">
					{tpl("contact")}
				</p>

				<Button
					variant="link"
					size="sm"
					effect="expandIcon"
					iconPlacement="left"
					type="button"
					className="p-0"
					icon={SquarePen}
					onClick={(event) => {
						event.preventDefault();
						event.stopPropagation();

						setisOpen(true);
					}}
				>
					{tp("button.edit")}
				</Button>
			</div>

			<div className="p-3 border rounded-md shadow-inner border-border bg-input col-span-full">
				<div className="flex items-center justify-start gap-3">
					<Avatar className="border rounded-lg border-black/10 bg-muted size-8">
						<AvatarImage src="#" />
						<AvatarFallback>
							<IdCard className="flex-shrink-0 size-4 text-muted-foreground/75" />
						</AvatarFallback>
					</Avatar>

					<div className="grid text-sm line-clamp-1">
						<p className="font-semibold uppercase truncate">
							{watchContact.contactName}
						</p>
					</div>
				</div>
			</div>

			<DrawerPrimitive.NestedRoot
				open={isOpen}
				onOpenChange={(value) => {
					setisOpen(value);
				}}
				setBackgroundColorOnScale
			>
				<DrawerContent
					onInteractOutside={(event) => {
						event.preventDefault();
					}}
					className="flex flex-col rounded-t-[10px] mt-24 max-h-[85%] fixed bottom-0 left-0 right-0 outline-none bg-card"
				>
					<div className="flex-1 overflow-y-auto">
						<div className="w-full max-w-sm mx-auto">
							<DrawerHeader>
								<DrawerTitle>{tpef("contact.title")}</DrawerTitle>
							</DrawerHeader>

							<div className="grid gap-4 p-4">
								<FormField
									control={form.control}
									name="contact.contactName"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{tpc("fields.name.label")}</FormLabel>
											<FormControl>
												<Input
													{...field}
													type="text"
													autoComplete="name"
													placeholder={tpc("fields.name.placeholder")}
													className="shadow-inner bg-input"
												/>
											</FormControl>

											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="contact.contactPhone"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												{tpc("fields.contact_number.label")}
											</FormLabel>
											<FormControl>
												<PhoneInput
													{...field}
													international
													placeholder={tpc("fields.contact_number.placeholder")}
													defaultCountry="ID"
													autoComplete="tel"
												/>
											</FormControl>

											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="contact.email"
									render={({ field }) => (
										<FormItem className="col-span-1">
											<FormLabel>
												{tpc("fields.email.label")}{" "}
												<span className="text-sm italic font-light">
													- (optional)
												</span>
											</FormLabel>
											<FormControl>
												<Input
													{...field}
													type="email"
													autoComplete="email"
													placeholder={tpc("fields.email.placeholder")}
													className="shadow-inner bg-input"
												/>
											</FormControl>

											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="contact.miitelLink"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												{tpc("fields.miitel_link.label")}{" "}
												<span className="text-sm italic font-light">
													- (optional)
												</span>
											</FormLabel>
											<FormControl>
												<Input
													{...field}
													type="url"
													placeholder={tpc("fields.miitel_link.placeholder")}
													className="shadow-inner bg-input"
												/>
											</FormControl>

											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<DrawerFooter className="gap-4">
								<Button
									type="button"
									size="lg"
									disabled={isLoading || !form.formState.isValid}
									onClick={(event) => {
										event.preventDefault();
										event.stopPropagation();

										onSave();
									}}
								>
									{isLoading ? (
										<>
											<LoaderIcon className="animate-spin" />
											<span>{td("modal.wait")}</span>
										</>
									) : (
										<span>{td("modal.save")}</span>
									)}
								</Button>

								<DrawerClose asChild>
									<Button
										disabled={isLoading}
										size="lg"
										variant="outline"
										type="button"
										className="shadow-none bg-card"
									>
										{td("modal.close")}
									</Button>
								</DrawerClose>
							</DrawerFooter>
						</div>
					</div>
				</DrawerContent>
			</DrawerPrimitive.NestedRoot>
		</div>
	);
});

const ProfileSection = memo(function Component() {
	// ===== TRANSLATIONS =====
	const { t: tpl } = useTranslation("patients", { keyPrefix: "list" });
	const { t: tpp } = useTranslation("appointments-form", {
		keyPrefix: "patient_profile",
	});
	const { props: globalProps } = usePage<PatientIndexGlobalPageProps>();

	// ===== FORM & DATA =====
	const form = useFormContext<FormSchema>();

	// ===== CONFIGURATION =====
	const dateOfBirthCalendarProps = useMemo<CalendarProps>(() => {
		return {
			// Show 100 years range
			fromYear: new Date().getFullYear() - 100,
			toYear: new Date().getFullYear(),
			// Disable future dates
			disabled: (date) => date >= new Date(),
		};
	}, []);

	// ===== EVENT HANDLERS =====
	// * automatically calculate the age from date of birth changes
	const doUpdateAge = useCallback(
		(value: Date | null | undefined) => {
			if (value) {
				// Calculate age using your custom function
				const age = calculateAge(value);
				// Update the age field in the form
				form.setValue("profile.age", age);
				form.trigger("profile.age");
			} else {
				form.setValue("profile.age", 0);
			}
		},
		[form.setValue, form.trigger],
	);

	// ===== COMPUTED VALUES =====
	const patientGenderOptions = useMemo(
		() => globalProps.optionsData?.patientGenders || [],
		[globalProps.optionsData?.patientGenders],
	);

	return (
		<div className="grid gap-2">
			<p className="text-xs font-semibold tracking-wider text-muted-foreground/75 uppercase">
				{tpl("profile")}
			</p>

			<div className="grid gap-4">
				<FormField
					control={form.control}
					name="profile.fullName"
					render={({ field }) => (
						<FormItem>
							<FormLabel>{tpp("fields.name.label")}</FormLabel>
							<FormControl>
								<Input
									{...field}
									type="text"
									autoComplete="name"
									placeholder={tpp("fields.name.placeholder")}
									className="shadow-inner bg-input"
								/>
							</FormControl>

							<FormMessage />
						</FormItem>
					)}
				/>

				<div className="flex flex-col gap-3">
					<div className="flex gap-3 items-center">
						<FormField
							control={form.control}
							name="profile.dateOfBirth"
							render={({ field }) => (
								<FormItem className="flex-1">
									<FormLabel>{tpp("fields.dob.label")}</FormLabel>
									<Popover modal>
										<PopoverTrigger asChild>
											<FormControl>
												<Button
													type="button"
													variant={"outline"}
													className={cn(
														"relative w-full flex justify-between font-normal shadow-inner bg-input",
														!field.value && "text-muted-foreground",
													)}
												>
													<p>
														{field.value
															? `${format(field.value, "PPP")}`
															: tpp("fields.dob.placeholder")}
													</p>

													{field.value ? (
														// biome-ignore lint/a11y/noStaticElementInteractions: -
														<div
															className="cursor-pointer"
															onClick={(event) => {
																event.preventDefault();
																event.stopPropagation();

																form.setValue(
																	"profile.dateOfBirth",
																	null as unknown as Date,
																);
																doUpdateAge(null);
															}}
															onKeyDown={(e) => {
																e.preventDefault();
																e.stopPropagation();
															}}
														>
															<X className="opacity-50" />
														</div>
													) : (
														<CalendarIcon className="w-4 h-4 ml-auto opacity-75" />
													)}
												</Button>
											</FormControl>
										</PopoverTrigger>
										<PopoverContent
											className="w-auto p-0"
											align="start"
											side="bottom"
										>
											<Calendar
												{...dateOfBirthCalendarProps}
												initialFocus
												mode="single"
												captionLayout="dropdown"
												selected={new Date(field.value)}
												onSelect={(date) => {
													field.onChange(date);
													doUpdateAge(date);
												}}
												defaultMonth={field.value}
											/>
										</PopoverContent>
									</Popover>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="profile.age"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{tpp("fields.age.label")}</FormLabel>
									<FormControl>
										<Input
											{...field}
											readOnly
											type="number"
											min={0}
											value={field?.value || ""}
											placeholder={tpp("fields.age.placeholder")}
											className="shadow-inner w-fit field-sizing-content bg-input"
										/>
									</FormControl>

									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					<FormDescription className="flex-none -mt-1">
						{tpp("fields.age.description")}
					</FormDescription>
				</div>

				<Deferred
					data={["optionsData"]}
					fallback={
						<div className="flex flex-col self-end gap-3 col-span-full">
							<Skeleton className="w-10 h-4 rounded-md" />
							<div className="grid grid-cols-2 gap-4">
								<Skeleton className="relative w-full rounded-md h-9" />
								<Skeleton className="relative w-full rounded-md h-9" />
							</div>
						</div>
					}
				>
					<FormField
						control={form.control}
						name="profile.gender"
						render={({ field }) => (
							<FormItem className="space-y-3 col-span-full">
								<FormLabel>{tpp("fields.gender.label")}</FormLabel>
								<FormControl>
									<RadioGroup
										onValueChange={field.onChange}
										defaultValue={field.value}
										orientation="horizontal"
										className="grid grid-cols-2 gap-4"
									>
										{patientGenderOptions.map((gender) => (
											<Fragment key={gender}>
												<FormItem className="flex items-start p-3 space-x-3 space-y-0 border rounded-md shadow-inner border-input bg-input">
													<FormControl>
														<RadioGroupItem value={gender} />
													</FormControl>
													<FormLabel className="flex items-center gap-1 font-normal capitalize">
														{getGenderIcon(gender)}
														<span className="uppercase">
															{tpp(
																`fields.gender.options.${gender.toLowerCase()}`,
															)}
														</span>
													</FormLabel>
												</FormItem>
											</Fragment>
										))}
									</RadioGroup>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</Deferred>
			</div>
		</div>
	);
});

const AddressSection = memo(function Component({
	patient,
}: {
	patient: NonNullable<PatientIndexGlobalPageProps["selectedPatient"]>;
}) {
	const { t: tpl } = useTranslation("patients", { keyPrefix: "list" });
	const { t: td } = useTranslation("translation", { keyPrefix: "components" });
	const { props: globalProps, url: pageURL } =
		usePage<PatientIndexGlobalPageProps>();

	// ===== STATE MANAGEMENT =====
	const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
	const [isAddAddressOpen, setIsAddAddressOpen] = useState(false);
	const [selectedAddress, setSelectedAddress] = useState<{
		active: boolean;
		address: PatientActiveAddress;
		addressId: number;
		id: number;
		patientId: number;
		updatedAt: string;
	} | null>(null);
	const [isAddressFormLoading, setIsAddressFormLoading] = useState(false);
	const [locationPopoverOpen, setLocationPopoverOpen] = useState(false);
	const hereMapRef = useRef<any>(null);
	const [latLngInputMethod, setLatLngInputMethod] = useState<
		"manual" | "automatic"
	>("manual");
	const [isGeocoding, setIsGeocoding] = useState(false);
	const [geocodingError, setGeocodingError] = useState<string | null>(null);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [addressToDelete, setAddressToDelete] = useState<{
		id: number;
		address: string;
	} | null>(null);

	// ===== FORM CONFIGURATION =====
	const addressForm = useForm<AddressFormSchema>({
		resolver: zodResolver(ADDRESS_FORM_SCHEMA),
		defaultValues: {
			address: "",
			postalCode: "",
			coordinate: "",
			locationId: 0,
			notes: "",
		},
		mode: "onChange",
	});

	// ===== FORM WATCHERS =====
	const coordinate = addressForm.watch("coordinate");
	const address = addressForm.watch("address");
	const locationId = addressForm.watch("locationId");
	const postalCode = addressForm.watch("postalCode");

	// ===== HELPER FUNCTIONS =====
	// Check if coordinates are filled
	const hasCoordinates = coordinate && coordinate.trim() !== "";

	// Handle field changes with coordinate reset warning
	const handleFieldChangeWithWarning = (fieldName: string, newValue: any) => {
		if (hasCoordinates) {
			const confirmReset = window.confirm(
				"Warning: Changing this field will reset the coordinates. Do you want to continue?",
			);
			if (!confirmReset) {
				return;
			}
			// Reset coordinates if user confirms
			addressForm.setValue("coordinate", "");
		}
		// Set the new value
		addressForm.setValue(fieldName as any, newValue);
	};

	// ===== LOCATION DATA PROCESSING =====
	// Group locations by country and state for dropdown, and create flattened list for search
	const { groupedLocations, flattenedLocations } = useMemo(() => {
		const locations = globalProps.filterOptions?.locations || [];

		const grouped = locations.reduce(
			(countries, location) => {
				const country = location.country || "Unknown Country";

				if (!countries[country]) {
					countries[country] = {};
				}

				const state = location.state || "Unknown State";

				if (!countries[country][state]) {
					countries[country][state] = [];
				}

				countries[country][state].push(location);
				return countries;
			},
			{} as Record<string, Record<string, typeof locations>>,
		);

		// Create flattened list for search functionality
		const flattened = locations.map((location) => ({
			...location,
			displayText:
				`${location.city}, ${location.state || ""}, ${location.country || ""}`
					.replace(/,\s*,/g, ",")
					.replace(/,$/, ""),
		}));

		return { groupedLocations: grouped, flattenedLocations: flattened };
	}, [globalProps.filterOptions?.locations]);

	// ===== MAP CONFIGURATION =====
	// Memoize HereMap props to prevent unnecessary recalculations
	const hereMapProps = useMemo(() => {
		let coords: number[] = MAP_DEFAULT_COORDINATE;
		if (coordinate) {
			const [lat, lng] = coordinate.split(",").map((s) => parseFloat(s.trim()));
			if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
				coords = [lat, lng];
			}
		}

		const location = flattenedLocations.find((loc) => loc.id === locationId);

		return {
			coordinate: coords,
			address: {
				address: address || "",
				city: location?.city || "",
				state: location?.state || "",
				country: location?.country || "",
				postalCode: postalCode || "",
			},
			options: { disabledEvent: true },
			className: "w-full",
			height: "400px",
		} satisfies HereMapProps;
	}, [coordinate, address, locationId, postalCode, flattenedLocations]);

	// ===== EFFECTS =====
	// Reset address form when selected address changes
	useEffect(() => {
		if (selectedAddress) {
			const latitude = selectedAddress.address.latitude;
			const longitude = selectedAddress.address.longitude;

			addressForm.reset({
				address: selectedAddress.address.address,
				postalCode: selectedAddress?.address?.postalCode || "",
				coordinate:
					latitude !== null && longitude !== null
						? `${latitude}, ${longitude}`
						: "",
				locationId: selectedAddress.address.locationId,
				notes: selectedAddress?.address?.notes || "",
			});
		}
	}, [selectedAddress, addressForm]);

	// ===== API HANDLERS =====
	const handleSetActiveAddress = async (patientAddress: any) => {
		if (!patientAddress) return;

		setIsAddressFormLoading(true);
		try {
			console.log("Setting address as active:", {
				patientAddressId: patientAddress.id,
				currentActive: patientAddress.active,
			});

			// Generate the submit URL
			const baseURL =
				globalProps.adminPortal.router.adminPortal.patientManagement.index;
			const submitURL = `${baseURL}/${patient.id}`;
			const { queryParams } = populateQueryParams(pageURL);
			const { fullUrl } = populateQueryParams(submitURL, queryParams);

			// Define the payload for setting active address
			const payload = deepTransformKeysToSnakeCase({
				patient: {
					profile: {
						id: patient.id,
						name: patient.name,
						dateOfBirth: patient.dateOfBirth,
						gender: patient.gender,
					},
					setActiveAddress: {
						patientAddressId: patientAddress.id,
						active: !patientAddress.active,
					},
				},
			});

			// Make the API call using Inertia.js
			router.put(fullUrl, payload, {
				preserveScroll: true,
				preserveState: true,
				replace: false,
				only: ["adminPortal", "flash", "errors", "patients", "selectedPatient"],
				onSuccess: () => {
					toast.success(
						patientAddress.active
							? "Address deactivated successfully"
							: "Address set as active successfully",
					);
				},
				onError: (errors: any) => {
					console.error("Failed to set active address:", errors);
					toast.error("Failed to update address status");
				},
			});

			console.log("Active address update submitted...");
		} catch (error) {
			console.error("Failed to set active address:", error);
			toast.error("Failed to update address status");
		} finally {
			setIsAddressFormLoading(false);
		}
	};

	const handleAddressSubmit = async (data: AddressFormSchema) => {
		if (!selectedAddress) return;

		setIsAddressFormLoading(true);
		try {
			console.log("Updating address:", {
				addressId: selectedAddress.addressId,
				...data,
			});

			// Generate the submit URL
			const baseURL =
				globalProps.adminPortal.router.adminPortal.patientManagement.index;
			const submitURL = `${baseURL}/${patient.id}`;
			const { queryParams } = populateQueryParams(pageURL);
			const { fullUrl } = populateQueryParams(submitURL, queryParams);

			// Define the submit config
			const submitConfig = {
				preserveScroll: true,
				preserveState: true,
				replace: false,
				only: ["adminPortal", "flash", "errors", "patients", "selectedPatient"],
				onSuccess: (_page: any) => {
					// Close the address drawer but keep parent drawer open
					setIsEditDrawerOpen(false);

					// Show success toast
					toast.success("Address updated successfully");
				},
				onError: (errors: any) => {
					console.error("Failed to update address:", errors);
					toast.error("Failed to update address");
				},
				onFinish: () => {
					// Always close drawer when request finishes
					setIsEditDrawerOpen(false);
				},
			} as any;

			// Parse coordinate string to numbers for the payload
			let latitude = null;
			let longitude = null;
			if (data.coordinate) {
				const [lat, lng] = data.coordinate
					.split(",")
					.map((s) => parseFloat(s.trim()));
				if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
					latitude = lat;
					longitude = lng;
				}
			}

			// Define the payload
			const payload = deepTransformKeysToSnakeCase({
				patient: {
					profile: {
						id: patient.id,
						name: patient.name,
						dateOfBirth: patient.dateOfBirth,
						gender: patient.gender,
					},
					patientAddress: {
						id: selectedAddress.id, // Use patient_address ID, not address ID
						address: data.address,
						postalCode: data.postalCode,
						latitude,
						longitude,
						locationId: data.locationId,
						notes: data.notes,
					},
				},
			});

			router.put(fullUrl, payload, submitConfig);

			console.log("Address update submitted...");
		} catch (error) {
			console.error("Failed to update address:", error);
		} finally {
			setIsAddressFormLoading(false);
		}
	};

	// ===== COORDINATE HANDLERS =====
	const handleResetCoordinates = useCallback(() => {
		addressForm.setValue("coordinate", "");
		setGeocodingError(null);

		// Clear markers from map
		if (hereMapRef.current?.marker?.onRemove) {
			hereMapRef.current.marker.onRemove();
		}
	}, [addressForm]);

	// Handle view on Google Maps
	const handleViewOnGoogleMaps = useCallback(() => {
		const coordStr = addressForm.getValues("coordinate");
		if (coordStr) {
			const [lat, lng] = coordStr.split(",").map((s) => parseFloat(s.trim()));
			if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
				window.open(
					`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
					"_blank",
				);
			}
		}
	}, [addressForm]);

	// ===== DELETE ADDRESS HANDLER =====
	const handleDeleteAddress = async (patientAddress: any) => {
		if (!patientAddress) return;

		// Set up confirmation dialog
		setAddressToDelete({
			id: patientAddress.id,
			address: patientAddress.address?.address || "Unknown address",
		});
		setDeleteConfirmOpen(true);
	};

	const confirmDeleteAddress = async () => {
		if (!addressToDelete) return;

		setIsAddressFormLoading(true);
		try {
			console.log("Deleting patient address:", {
				patientAddressId: addressToDelete.id,
			});

			// Generate the submit URL
			const baseURL =
				globalProps.adminPortal.router.adminPortal.patientManagement.index;
			const submitURL = `${baseURL}/${patient.id}`;
			const { queryParams } = populateQueryParams(pageURL);
			const { fullUrl } = populateQueryParams(submitURL, queryParams);

			// Define the payload for deleting address
			const payload = deepTransformKeysToSnakeCase({
				patient: {
					profile: {
						id: patient.id,
						name: patient.name,
						dateOfBirth: patient.dateOfBirth,
						gender: patient.gender,
					},
					deletePatientAddress: {
						patientAddressId: addressToDelete.id,
					},
				},
			});

			// Make the API call using Inertia.js
			router.put(fullUrl, payload, {
				preserveScroll: true,
				preserveState: true,
				replace: false,
				only: ["adminPortal", "flash", "errors", "patients", "selectedPatient"],
				onSuccess: () => {
					toast.success("Address deleted successfully");
					setDeleteConfirmOpen(false);
					setAddressToDelete(null);
				},
				onError: (errors: any) => {
					console.error("Failed to delete address:", errors);
					toast.error("Failed to delete address");
				},
				onFinish: () => {
					setIsAddressFormLoading(false);
				},
			});

			console.log("Address deletion submitted...");
		} catch (error) {
			console.error("Failed to delete address:", error);
			toast.error("Failed to delete address");
			setIsAddressFormLoading(false);
		}
	};

	// ===== GEOCODING =====
	const handleGeocoding = useCallback(async () => {
		const address = addressForm.getValues("address");
		const locationId = addressForm.getValues("locationId");

		// Clear any previous errors
		setGeocodingError(null);

		if (!address || address.trim() === "") {
			console.error("Address is required for geocoding");
			// Show error toast
			toast.error("Please enter an address before geocoding");
			setGeocodingError("Please enter an address before geocoding");
			return;
		}

		if (!locationId) {
			console.error("Location is required for geocoding");
			// Show error toast
			toast.error("Please select a region before geocoding");
			setGeocodingError("Please select a region before geocoding");
			return;
		}

		setIsGeocoding(true);
		try {
			// Get location details for better geocoding
			const location = flattenedLocations.find((loc) => loc.id === locationId);
			const fullAddress = location
				? `${address}, ${location.city}, ${location.state}, ${location.country}`
				: address;

			console.log("Geocoding address:", fullAddress);

			// Ensure we have a non-empty address for the API
			if (!fullAddress || fullAddress.trim() === "") {
				throw new Error("Address cannot be empty for geocoding");
			}

			// Use Here Maps geocoding via the map component
			if (hereMapRef.current?.geocode?.onCalculate) {
				try {
					// First, ensure the map has the current address data
					// The map component uses the address from hereMapProps, so we need to
					// make sure the form data is up-to-date before geocoding
					const currentAddress = addressForm.getValues("address");

					// Double-check we have valid address data
					if (!currentAddress?.trim()) {
						throw new Error("Address cannot be empty for geocoding");
					}

					console.log("Geocoding with address:", currentAddress);

					const result = await hereMapRef.current.geocode.onCalculate();

					if (result?.position) {
						const { lat, lng } = result.position;
						addressForm.setValue("coordinate", `${lat}, ${lng}`);
						console.log("Geocoding successful:", { lat, lng });

						// Add marker to map at the calculated position
						if (hereMapRef.current?.marker?.onAdd) {
							const location = flattenedLocations.find(
								(loc) => loc.id === locationId,
							);
							const fullAddress = location
								? `${address}, ${location.city}, ${location.state}, ${location.country}`
								: address;

							hereMapRef.current.marker.onAdd(
								[
									{
										position: { lat, lng },
										address: fullAddress,
									},
								],
								{ changeMapView: true },
							);
						}

						// Clear any errors on success
						setGeocodingError(null);

						// Show success toast
						toast.success("Coordinates calculated successfully");
					} else {
						throw new Error("No results found for the address");
					}
				} catch (geocodeError) {
					console.error("HERE Maps geocoding error:", geocodeError);

					// Check if it's the empty parameter error
					if (
						geocodeError instanceof Error &&
						(geocodeError.message.includes("non-empty") ||
							geocodeError.message.includes("Illegal input") ||
							geocodeError.message.includes("Value must be non-empty"))
					) {
						const errorMessage =
							"Address cannot be empty for geocoding. Please ensure the address field is filled out.";
						setGeocodingError(errorMessage);
						throw new Error(errorMessage);
					}

					throw geocodeError;
				}
			} else {
				const message = "Here Maps geocoding not available";
				console.warn(message);
				setGeocodingError(message);
				toast.error(message);
			}
		} catch (error) {
			console.error("Geocoding failed:", error);

			let errorMessage = "Failed to calculate coordinates";
			if (error instanceof Error) {
				if (error.message.includes("non-empty")) {
					errorMessage = "Address cannot be empty";
				} else if (error.message.includes("No results found")) {
					errorMessage =
						"Address not found, please check the address and try again";
				} else {
					errorMessage = error.message;
				}
			}

			setGeocodingError(errorMessage);
			toast.error(errorMessage);
		} finally {
			setIsGeocoding(false);
		}
	}, [addressForm, flattenedLocations]);

	return (
		<div className="grid gap-2">
			<div>
				<div className="flex items-center justify-between">
					<p className="text-xs font-semibold tracking-wider text-muted-foreground/75 uppercase">
						{tpl("addresses.label")}
					</p>
					<Button
						variant="ghost-primary"
						size="sm"
						type="button"
						onClick={() => setIsAddAddressOpen(true)}
					>
						<PlusIcon className="w-4 h-4" />
						Add
					</Button>
				</div>
			</div>

			{/* Display Patient Addresses */}
			{!patient.patientAddresses || patient.patientAddresses.length === 0 ? (
				<div className="text-center py-4 text-muted-foreground text-sm">
					No addresses available
				</div>
			) : (
				<div className="max-h-[35dvh] overflow-y-auto">
					{patient.patientAddresses.map((patientAddress) => (
						<Item key={patientAddress.id} variant="outline">
							<ItemContent>
								<ItemTitle>
									<p className="line-clamp-2 truncate font-medium text-pretty break-all">
										{patientAddress.address?.address}
									</p>
									{patientAddress.address?.postalCode && (
										<p className="text-muted-foreground text-xs">
											{patientAddress.address.postalCode}
										</p>
									)}
								</ItemTitle>
								{patientAddress.address?.location && (
									<ItemDescription className="text-pretty">
										{[
											patientAddress.address.location.city,
											patientAddress.address.location.state,
											patientAddress.address.location.country,
										]
											.filter(Boolean)
											.join(", ")}
									</ItemDescription>
								)}
							</ItemContent>
							<ItemActions>
								{patientAddress.active ? (
									<CheckCircleIcon className="text-primary shrink-0" />
								) : null}

								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											className="h-8 w-8 p-0 shrink-0"
										>
											<EllipsisVerticalIcon className="h-4 w-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end" side="bottom">
										<DropdownMenuItem
											onSelect={(e) => {
												e.preventDefault();
												e.stopPropagation();
												setSelectedAddress(patientAddress);
												setIsEditDrawerOpen(true);
											}}
										>
											<PencilIcon className="mr-2 h-4 w-4" />
											Edit
										</DropdownMenuItem>
										{!patientAddress.active && (
											<DropdownMenuItem
												onSelect={(e) => {
													e.preventDefault();
													e.stopPropagation();
													handleSetActiveAddress(patientAddress);
												}}
											>
												<CheckIcon className="mr-2 h-4 w-4" />
												Set as Active
											</DropdownMenuItem>
										)}
										{!patientAddress.active && (
											<DropdownMenuItem
												onSelect={(e) => {
													e.preventDefault();
													e.stopPropagation();
													handleDeleteAddress(patientAddress);
												}}
												className="text-destructive focus:text-destructive"
											>
												<Trash2 className="mr-2 h-4 w-4" />
												Delete
											</DropdownMenuItem>
										)}
										{patientAddress.active && (
											<DropdownMenuItem
												disabled
												className="opacity-50 cursor-not-allowed"
											>
												<CheckIcon className="mr-2 h-4 w-4" />
												Is Active
											</DropdownMenuItem>
										)}
									</DropdownMenuContent>
								</DropdownMenu>
							</ItemActions>
						</Item>
					))}
				</div>
			)}

			{/* Add New Address Section */}
			<AddAddressSection
				patient={patient}
				open={isAddAddressOpen}
				onOpenChange={setIsAddAddressOpen}
				onSuccess={() => {
					// Refresh the patient data to show the new address
					router.reload({ only: ["selectedPatient"] });
				}}
			/>

			{/* Nested Drawer for Address Edit */}
			<DrawerPrimitive.NestedRoot
				open={isEditDrawerOpen}
				onOpenChange={setIsEditDrawerOpen}
				setBackgroundColorOnScale
			>
				<DrawerContent
					onInteractOutside={(event) => {
						event.preventDefault();
					}}
				>
					<DrawerHeader className="w-full md:max-w-5xl mx-auto">
						<DrawerTitle>Edit Address</DrawerTitle>
						<DrawerDescription>
							Edit the address details for this patient.
						</DrawerDescription>
					</DrawerHeader>
					<div className="overflow-y-auto overflow-x-hidden max-h-[90dvh]">
						<div className="p-4 w-full md:max-w-5xl mx-auto">
							<Form {...addressForm}>
								<div className="space-y-4">
									<div className="grid md:grid-cols-2 gap-6">
										{/* Left Column */}
										<div className="space-y-4">
											<FormField
												control={addressForm.control}
												name="locationId"
												render={({ field }) => (
													<FormItem>
														<FormLabel>Region</FormLabel>
														<Popover
															modal
															open={locationPopoverOpen}
															onOpenChange={setLocationPopoverOpen}
														>
															<PopoverTrigger asChild>
																<FormControl>
																	<Button
																		variant="outline"
																		className={cn(
																			"w-full justify-between bg-input shadow-inner",
																			!field.value && "text-muted-foreground",
																		)}
																	>
																		{field.value
																			? flattenedLocations.find(
																					(location) =>
																						location.id === field.value,
																				)?.displayText || "Select region"
																			: "Select region"}
																	</Button>
																</FormControl>
															</PopoverTrigger>
															<PopoverContent
																className="w-[var(--radix-popover-trigger-width)] p-0"
																align="start"
															>
																<Command>
																	<CommandInput placeholder="Search region by city..." />
																	<CommandList>
																		<CommandEmpty>
																			No region found.
																		</CommandEmpty>

																		{Object.entries(groupedLocations).map(
																			([country, states]) => (
																				<div key={country}>
																					<div className="px-2 py-1.5 text-sm font-bold text-muted-foreground">
																						{country}
																					</div>
																					{Object.entries(states).map(
																						([state, locations]) => (
																							<CommandGroup
																								key={state}
																								heading={`└ ${state}`}
																							>
																								{locations.map((location) => (
																									<CommandItem
																										key={location.id}
																										value={location.city}
																										onSelect={() => {
																											handleFieldChangeWithWarning(
																												"locationId",
																												location.id,
																											);
																											setLocationPopoverOpen(
																												false,
																											);
																										}}
																									>
																										<span>{location.city}</span>

																										<CheckIcon
																											className={cn(
																												"ml-auto",
																												location.id ===
																													field.value
																													? "opacity-100"
																													: "opacity-0",
																											)}
																										/>
																									</CommandItem>
																								))}
																							</CommandGroup>
																						),
																					)}
																				</div>
																			),
																		)}
																	</CommandList>
																</Command>
															</PopoverContent>
														</Popover>
														<FormMessage />
													</FormItem>
												)}
											/>

											<FormField
												control={addressForm.control}
												name="postalCode"
												render={({ field }) => (
													<FormItem>
														<FormLabel>
															Postal Code{" "}
															<span className="text-sm italic font-light">
																- (optional)
															</span>
														</FormLabel>
														<FormControl>
															<Input
																{...field}
																onChange={(e) =>
																	handleFieldChangeWithWarning(
																		"postalCode",
																		e.target.value,
																	)
																}
																className="shadow-inner bg-input w-fit field-sizing-content"
																placeholder="Enter postal code"
															/>
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>

											<FormField
												control={addressForm.control}
												name="address"
												render={({ field }) => (
													<FormItem>
														<FormLabel>Address</FormLabel>
														<FormControl>
															<Textarea
																{...field}
																onChange={(e) =>
																	handleFieldChangeWithWarning(
																		"address",
																		e.target.value,
																	)
																}
																className="shadow-inner bg-input field-sizing-content min-h-32 resize-none py-1.75"
																placeholder="Enter complete address"
															/>
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>

											<FormField
												control={addressForm.control}
												name="notes"
												render={({ field }) => (
													<FormItem>
														<FormLabel>
															Notes{" "}
															<span className="text-sm italic font-light">
																- (optional)
															</span>
														</FormLabel>
														<FormControl>
															<Textarea
																{...field}
																className="shadow-inner bg-input field-sizing-content min-h-0 resize-none py-1.75"
																placeholder="Additional notes about this address"
															/>
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
										</div>

										{/* Right Column */}
										<div className="space-y-4">
											<div className="space-y-4">
												<div className="space-y-2">
													<div>
														<span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
															Coordinate
														</span>
													</div>

													<div className="flex items-center gap-2">
														<div className="flex items-center space-x-2 min-w-0">
															<Select
																value={latLngInputMethod}
																onValueChange={(value) =>
																	setLatLngInputMethod(
																		value as "manual" | "automatic",
																	)
																}
															>
																<SelectTrigger className="w-[140px] shadow-inner bg-input">
																	<SelectValue />
																</SelectTrigger>
																<SelectContent>
																	<SelectItem value="manual">Manual</SelectItem>
																	<SelectItem value="automatic">
																		Automatic
																	</SelectItem>
																</SelectContent>
															</Select>
														</div>

														<FormField
															control={addressForm.control}
															name="coordinate"
															render={({ field }) => (
																<FormItem className="flex-1 min-w-0">
																	<FormControl>
																		<Input
																			{...field}
																			value={field.value || ""}
																			onChange={(e) =>
																				field.onChange(e.target.value.trim())
																			}
																			className="shadow-inner bg-input"
																			placeholder="Coordinates (e.g., -6.1944,106.8229)"
																			readOnly={
																				latLngInputMethod === "automatic"
																			}
																			{...(latLngInputMethod ===
																				"automatic" && {
																				tabIndex: -1,
																			})}
																		/>
																	</FormControl>
																	<FormMessage />
																</FormItem>
															)}
														/>
													</div>
												</div>

												{latLngInputMethod === "automatic" && (
													<div className="flex gap-2">
														<Button
															type="button"
															variant="primary-outline"
															onClick={handleGeocoding}
															disabled={
																isGeocoding || !addressForm.getValues("address")
															}
															className="w-full"
														>
															{isGeocoding && (
																<LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
															)}
															{isGeocoding
																? "Geocoding..."
																: "Get Coordinates from Address"}
														</Button>

														{addressForm.getValues("coordinate") && (
															<>
																<Button
																	type="button"
																	variant="destructive-outline"
																	disabled={isGeocoding}
																	onClick={handleResetCoordinates}
																	className="flex-shrink-0"
																>
																	Reset
																</Button>

																<Button
																	type="button"
																	variant="outline"
																	disabled={isGeocoding}
																	onClick={handleViewOnGoogleMaps}
																	className="flex-shrink-0"
																>
																	View on Maps
																</Button>
															</>
														)}
													</div>
												)}

												{/* Here Map */}
												<div className="mt-4">
													{/* Geocoding Error Alert */}
													{geocodingError && (
														<Alert className="mb-4 border-red-200 bg-red-50">
															<AlertDescription className="text-red-800">
																{geocodingError}
															</AlertDescription>
														</Alert>
													)}

													<HereMap ref={hereMapRef} {...hereMapProps} />
												</div>
											</div>
										</div>
									</div>

									<DrawerFooter className="gap-4 lg:flex-row lg:gap-2 lg:justify-end px-0">
										<Button
											size="lg"
											type="button"
											disabled={isAddressFormLoading || isGeocoding}
											onClick={async (e) => {
												e.stopPropagation();
												// Manually trigger form validation and submission
												const isValid = await addressForm.trigger();
												if (isValid) {
													const data = addressForm.getValues();
													handleAddressSubmit(data);
												}
											}}
										>
											{isAddressFormLoading && (
												<LoaderIcon className="h-4 w-4 animate-spin" />
											)}
											Save Changes
										</Button>

										<DrawerClose asChild>
											<Button
												size="lg"
												variant="outline"
												className="shadow-none bg-card"
												type="button"
												disabled={isAddressFormLoading || isGeocoding}
											>
												{td("modal.close")}
											</Button>
										</DrawerClose>
									</DrawerFooter>
								</div>
							</Form>
						</div>
					</div>
				</DrawerContent>
			</DrawerPrimitive.NestedRoot>

			{/* Delete Address Confirmation Dialog */}
			<AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Address</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete this address? This action cannot
							be undone.
							<br />
							<br />
							<strong>Address:</strong> {addressToDelete?.address}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isAddressFormLoading}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmDeleteAddress}
							disabled={isAddressFormLoading}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{isAddressFormLoading && (
								<LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
							)}
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
});
