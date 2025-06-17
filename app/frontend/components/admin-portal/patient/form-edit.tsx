import {
	Fragment,
	memo,
	Suspense,
	useCallback,
	useMemo,
	useState,
} from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
import { Drawer as DrawerPrimitive } from "vaul";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import type { PatientIndexGlobalPageProps } from "@/pages/AdminPortal/Patient/Index";
import { useForm, useFormContext, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isValidPhoneNumber } from "react-phone-number-input";
import { GENDERS } from "@/lib/constants";
import { idSchema } from "@/lib/validation";
import { Deferred, router, usePage } from "@inertiajs/react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
	AlertCircle,
	CalendarIcon,
	IdCard,
	LoaderIcon,
	SquarePen,
	X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { LoadingBasic } from "@/components/shared/loading";
import { PhoneInput } from "@/components/ui/phone-input";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { calculateAge, cn, populateQueryParams } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar, type CalendarProps } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { getGenderIcon } from "@/hooks/use-gender";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";

const FORM_SCHEMA = z.object({
	contact: z.object({
		id: idSchema,
		contactName: z
			.string()
			.min(3, "Contact name is required with minimum 3 characters"),
		contactPhone: z
			.string()
			.min(1, { message: "Contact phone number is required" })
			.refine(isValidPhoneNumber, { message: "Invalid phone number" }),
		email: z.string().email("Invalid email").optional(),
		miitelLink: z.string().url("MiiTel link must be a valid URL").optional(),
	}),
	profile: z.object({
		id: idSchema,
		fullName: z
			.string()
			.min(3, "Patient full name is required with minimum 3 characters"),
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

	// * for form management state
	const [isLoading, setIsLoading] = useState(false);
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
	const errorsServerValidation = useMemo(
		() => (globalProps?.errors?.fullMessages as unknown as string[]) || null,
		[globalProps?.errors?.fullMessages],
	);

	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<DrawerContent className="flex flex-col rounded-t-[10px] mt-24 max-h-[90%] fixed bottom-0 left-0 right-0 outline-none bg-card">
				<div className="flex-1 overflow-y-auto">
					<div className="w-full max-w-sm mx-auto">
						<DrawerHeader>
							<DrawerTitle>{tpef("title")}</DrawerTitle>
							<DrawerDescription className="max-w-xs">
								{tpef("description")}
							</DrawerDescription>
						</DrawerHeader>

						<Form {...form}>
							<form onSubmit={form.handleSubmit(onSubmit)}>
								<Suspense fallback={<LoadingBasic columnBased={true} />}>
									<div className={"grid gap-2 p-4"}>
										<ContactSection />

										<Separator className="my-4" />

										<ProfileSection />

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

								<DrawerFooter>
									<Button
										type="submit"
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

	const [isLoading, setIsLoading] = useState(false);
	const [isOpen, setisOpen] = useState(false);
	const form = useFormContext<FormSchema>();
	const watchContact = useWatch({ control: form.control, name: "contact" });
	const onSave = useCallback(() => {
		setIsLoading(true);

		try {
			form.setValue("contact", watchContact);
		} finally {
			setTimeout(() => setIsLoading(false), 250);
			setTimeout(() => setisOpen(false), 350);
		}
	}, [watchContact, form.setValue]);

	return (
		<div className="grid gap-2">
			<div className="flex items-center justify-between">
				<p className="text-xs font-light uppercase">{tpl("contact")}</p>

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
				<DrawerContent className="flex flex-col rounded-t-[10px] mt-24 max-h-[85%] fixed bottom-0 left-0 right-0 outline-none bg-card">
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
											<FormLabel>{tpc("fields.email.label")}</FormLabel>
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
											<FormLabel>{tpc("fields.miitel_link.label")}</FormLabel>
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

							<DrawerFooter>
								<Button
									type="button"
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
							</DrawerFooter>
						</div>
					</div>
				</DrawerContent>
			</DrawerPrimitive.NestedRoot>
		</div>
	);
});

const ProfileSection = memo(function Component() {
	const { t: tpl } = useTranslation("patients", { keyPrefix: "list" });
	const { t: tpp } = useTranslation("appointments-form", {
		keyPrefix: "patient_profile",
	});
	const { props: globalProps } = usePage<PatientIndexGlobalPageProps>();

	const form = useFormContext<FormSchema>();
	const dateOfBirthCalendarProps = useMemo<CalendarProps>(() => {
		return {
			// Show 100 years range
			fromYear: new Date().getFullYear() - 100,
			toYear: new Date().getFullYear(),
			// Disable future dates
			disabled: (date) => date >= new Date(),
		};
	}, []);
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
	const patientGenderOptions = useMemo(
		() => globalProps.optionsData?.patientGenders || [],
		[globalProps.optionsData?.patientGenders],
	);

	return (
		<div className="grid gap-2">
			<p className="text-xs font-light uppercase">{tpl("profile")}</p>

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

				<div className="flex flex-wrap gap-3">
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
													// biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
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
