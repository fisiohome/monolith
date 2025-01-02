import { LoadingBasic } from "@/components/shared/loading";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { Input as InputExtended } from "@/components/ui/extended/input";
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
import { PhoneInput } from "@/components/ui/phone-input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { TagsInput } from "@/components/ui/tags-input";
import { Textarea } from "@/components/ui/textarea";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import { groupLocationsByCountry } from "@/lib/locations";
import { cn, goBackHandler } from "@/lib/utils";
import type { Location } from "@/types/admin-portal/location";
import type { Service } from "@/types/admin-portal/service";
import type {
	Therapist,
	TherapistEmploymentStatus,
	TherapistEmploymentType,
	TherapistGender,
} from "@/types/admin-portal/therapist";
import type { GlobalPageProps } from "@/types/globals";
import { zodResolver } from "@hookform/resolvers/zod";
import { Deferred, router, usePage } from "@inertiajs/react";
import {
	AlertCircle,
	Check,
	ChevronsUpDown,
	CreditCard,
	Dot,
	Eye,
	EyeClosed,
	LoaderIcon,
	MapPinHouse,
	Plus,
} from "lucide-react";
import { type ComponentProps, useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import type { FormMode } from "./Upsert";
import { getFormSchema, type TherapistFormSchema } from "@/lib/therapists";

interface FormSectionContainerProps extends ComponentProps<"div"> {
	number: string | number;
	title: string;
}

function FormSectionContainer({
	number,
	title,
	className,
	children,
}: FormSectionContainerProps) {
	return (
		<div
			className={cn("grid w-full gap-4 grid-cols-1 lg:grid-cols-2", className)}
		>
			<div className="flex items-center space-x-1.5 font-semibold col-span-full">
				<div className="flex items-center justify-center border rounded-full size-5 bg-primary text-primary-foreground">
					<span className="text-xs leading-none">{number}</span>
				</div>
				<h2 className="tracking-tight">{title}</h2>
			</div>

			{children}
		</div>
	);
}

export interface FormTherapistProps {
	mode: FormMode;
	therapist: Partial<Therapist>;
	genders: TherapistGender;
	employmentTypes: TherapistEmploymentType;
	employmentStatuses: TherapistEmploymentStatus;
	services: Service[];
	locations: Location[];
}

export default function FormTherapist({
	mode,
	therapist,
	genders,
	employmentTypes,
	employmentStatuses,
	services,
	locations,
}: FormTherapistProps) {
	const { props: globalProps } = usePage<
		GlobalPageProps & {
			errors: {
				fullMessages?: string;
			};
		}
	>();
	const [isLoading, setIsLoading] = useState({
		submit: false,
		services: false,
		employmentStatuses: false,
		states: false,
		cities: false,
	});
	const sections = useMemo(
		() =>
			[
				"Account Information",
				"Personal Information",
				"Contract Detail",
			] as const,
		[],
	);
	const [passwordVisibility, setPasswordVisibility] = useState({
		new: false,
		confirmation: false,
	});
	// the list items for select options
	const [selectCollections, setSelectCollections] = useState(() => {
		const employmentStatusList =
			employmentStatuses?.map((status) => {
				return {
					value: status.toUpperCase(),
					label: status.charAt(0).toUpperCase() + status.slice(1).toLowerCase(),
					color:
						status === "ACTIVE"
							? "text-emerald-600"
							: status === "INACTIVE"
								? "text-destructive"
								: "text-yellow-600",
				};
			}) || [];

		return {
			employmentStatuses: employmentStatusList as {
				value: string;
				label: string;
				color: string;
			}[],
			states: [] as string[],
			cities: [] as string[],
		};
	});
	const fetchData = {
		getEmploymentStatuses: () => {
			router.get(
				globalProps.adminPortal.router.adminPortal.therapistManagement.new,
				{},
				{
					only: ["employment_statuses"],
					preserveState: true,
					preserveScroll: true,
					onStart: () => {
						setIsLoading((prev) => ({
							...prev,
							employmentStatuses: true,
						}));
					},
					onSuccess: () => {
						const employmentStatusList = employmentStatuses.map((status) => {
							return {
								value: status.toUpperCase(),
								label:
									status.charAt(0).toUpperCase() +
									status.slice(1).toLowerCase(),
								color:
									status === "ACTIVE"
										? "text-emerald-600"
										: status === "INACTIVE"
											? "text-destructive"
											: "text-yellow-600",
							};
						});

						setSelectCollections((prev) => ({
							...prev,
							employmentStatuses: employmentStatusList,
						}));
					},
					onFinish: () => {
						setTimeout(() => {
							setIsLoading((prev) => ({
								...prev,
								employmentStatuses: false,
							}));
						}, 250);
					},
				},
			);
		},
		getServices: () => {
			router.get(
				globalProps.adminPortal.router.adminPortal.therapistManagement.new,
				{},
				{
					only: ["services"],
					preserveState: true,
					preserveScroll: true,
					onStart: () => {
						setIsLoading((prev) => ({
							...prev,
							services: true,
						}));
					},
					onFinish: () => {
						setTimeout(() => {
							setIsLoading((prev) => ({
								...prev,
								services: false,
							}));
						}, 250);
					},
				},
			);
		},
		getLocations: (query: {
			country?: string | null;
			state?: string | null;
			city?: string | null;
		}) => {
			router.get(
				globalProps.adminPortal.router.adminPortal.therapistManagement.new,
				query,
				{
					preserveState: true,
					preserveScroll: true,
					onStart: () => {
						setIsLoading((prev) => ({
							...prev,
							states: !!query?.country,
							cities: !!query?.state,
						}));
					},
					onSuccess: () => {
						// setup the states list
						if (query?.country) {
							const states =
								groupLocationsByCountry(locations)
									?.filter((location) => location.country === query.country)
									?.flatMap((location) =>
										location.states.map((state) => state.name),
									) || [];
							setSelectCollections((prev) => ({ ...prev, states }));
						}

						// setup the cities list
						if (query?.state) {
							const cities =
								locations
									?.filter((location) => location.state === query.state)
									?.map((location) => location.city) || [];
							setSelectCollections((prev) => ({ ...prev, cities }));
						}
					},
					onFinish: () => {
						setTimeout(() => {
							setIsLoading((prev) => ({
								...prev,
								states: false,
								cities: false,
							}));
						}, 250);
					},
				},
			);
		},
	};
	const form = useForm<TherapistFormSchema>({
		resolver: zodResolver(getFormSchema(mode)),
		defaultValues: {
			user: {
				email: therapist?.user?.email || "",
				password: "Therapist123!",
				passwordConfirmation: "Therapist123!",
			},
			name: therapist.name || "",
			batch: therapist.batch || 1,
			phoneNumber: therapist.phoneNumber || "+62",
			gender: therapist.gender || "MALE",
			employmentType: therapist.employmentType || "FLAT",
			employmentStatus: therapist.employmentStatus || "INACTIVE",
			modalities: therapist.modalities || [],
			specializations: therapist.specializations || [],
			bankDetails: therapist.bankDetails || [],
			service: therapist?.service || {},
			addresses:
				therapist.addresses?.map((addressItem) => ({
					active: addressItem.active,
					address: addressItem.address,
					id: addressItem.id,
					postalCode: addressItem.postalCode,
					country: addressItem.location.country,
					countryCode: addressItem.location.countryCode,
					state: addressItem.location.state,
					city: addressItem.location.city,
				})) || [],
		},
		mode: "onBlur",
	});
	// for bank details array of fields
	const bankDetailsForm = useFieldArray({
		control: form.control,
		name: "bankDetails",
		rules: {
			required: true,
			minLength: 1,
		},
	});
	// for addresses array of fields
	const addressesForm = useFieldArray({
		control: form.control,
		name: "addresses",
		rules: {
			required: true,
			minLength: 1,
		},
	});
	// * will be shown if there is no one bank details & addresses yet
	const formAlertErrors = useMemo(() => {
		const bankDetailsError =
			form.formState.errors.bankDetails?.root?.message ||
			form.formState.errors.bankDetails?.message;
		const addressesError =
			form.formState.errors.addresses?.root?.message ||
			form.formState.errors.addresses?.message;
		const errorMessage = globalProps?.errors?.fullMessages;

		return [bankDetailsError, addressesError, errorMessage].filter(
			(error): error is string => error !== undefined,
		);
	}, [form.formState.errors, globalProps?.errors?.fullMessages]);
	// * will be shown if there is an error from server validation
	useEffect(() => {
		const errorMessage = globalProps?.errors?.fullMessages;
		if (errorMessage?.includes("Email")) {
			form.setError("user.email", {
				type: "server",
				message: errorMessage,
			});
		}

		if (errorMessage?.includes("Phone")) {
			form.setError("phoneNumber", {
				type: "server",
				message: errorMessage,
			});
		}
	}, [form, globalProps?.errors?.fullMessages]);
	const onSubmit = (values: TherapistFormSchema) => {
		const isUpdate = mode === "update";
		console.log(
			`Submitting form to ${isUpdate ? "update" : "create"} the therapist...`,
		);

		const submitURL = `${globalProps.adminPortal.router.adminPortal.therapistManagement.index}${isUpdate ? `/${therapist.id}` : ""}`;
		const submitConfig = {
			preserveScroll: true,
			preserveState: true,
			onStart: () => setIsLoading((prev) => ({ ...prev, submit: true })),
			onFinish: () =>
				setTimeout(
					() => setIsLoading((prev) => ({ ...prev, submit: false })),
					250,
				),
		};
		const { user, ...restValues } = values;
		const payload = deepTransformKeysToSnakeCase({
			therapist: isUpdate ? { ...restValues } : { ...restValues, user },
		});

		if (isUpdate) {
			router.put(submitURL, payload, submitConfig);
		} else {
			router.post(submitURL, payload, submitConfig);
		}

		console.log(
			`Therapist successfully ${isUpdate ? "updated" : "created"}...`,
		);
	};

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className="grid items-baseline gap-10"
			>
				{!!formAlertErrors?.length && (
					<Alert variant="destructive" className="col-span-full">
						<AlertCircle className="w-4 h-4" />
						<AlertTitle>Error</AlertTitle>
						<AlertDescription>
							<ul>
								{formAlertErrors.map((error) => (
									<li key={error}>{error}</li>
								))}
							</ul>
						</AlertDescription>
					</Alert>
				)}

				{sections.map((section, sectionIndex) => {
					return (
						<FormSectionContainer
							key={section}
							number={sectionIndex + 1}
							title={section}
						>
							{section === "Personal Information" && (
								<>
									<FormField
										control={form.control}
										name="name"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Name</FormLabel>
												<FormControl>
													<Input
														{...field}
														type="text"
														autoComplete="name"
														placeholder="Enter the therapist name..."
													/>
												</FormControl>

												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="phoneNumber"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Phone Number</FormLabel>
												<FormControl>
													<PhoneInput
														{...field}
														placeholder="Enter the therapist phone number..."
														defaultCountry="ID"
														international
													/>
												</FormControl>

												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="gender"
										render={({ field }) => (
											<FormItem className="col-span-full">
												<FormLabel>Gender</FormLabel>
												<Select
													onValueChange={field.onChange}
													defaultValue={field?.value || ""}
												>
													<FormControl>
														<SelectTrigger
															className={`w-[50%] md:w-[35%] lg:w-[25%] xl:w-[25%] ${!field?.value ? "text-muted-foreground" : ""}`}
														>
															<SelectValue placeholder="Select a therapist gender..." />
														</SelectTrigger>
													</FormControl>
													<SelectContent>
														{genders?.length &&
															genders?.map((gender) => (
																<SelectItem key={gender} value={gender}>
																	{gender}
																</SelectItem>
															))}
													</SelectContent>
												</Select>

												<FormMessage />
											</FormItem>
										)}
									/>

									<div className="grid grid-cols-1 gap-6 mt-4 col-span-full">
										<div className="grid gap-4">
											<div className="flex items-center gap-2">
												<MapPinHouse className="size-4" />
												<p className="text-sm font-semibold tracking-tight">
													Addresses
												</p>
											</div>

											<Separator />
										</div>

										{addressesForm?.fields?.length ? (
											addressesForm.fields.map((address, fieldIndex) => {
												return (
													<div
														key={address.id}
														className="grid w-full gap-4 lg:grid-cols-2"
													>
														<div className="flex items-center justify-between w-full col-span-full">
															<div className="flex flex-row items-center space-x-3">
																<span className="text-sm font-bold">
																	Address #{Number(fieldIndex) + 1}
																</span>

																<Separator
																	orientation="vertical"
																	className="h-4 bg-muted-foreground/25"
																/>

																<FormField
																	control={form.control}
																	name={`addresses.${fieldIndex}.active`}
																	render={({ field }) => (
																		<FormItem className="flex flex-row items-center space-x-2 space-y-0">
																			<FormControl>
																				<Checkbox
																					checked={field.value}
																					onCheckedChange={(checked) => {
																						if (!checked) return;

																						// if enabling addresses, will automatically disable other
																						addressesForm.fields.map(
																							(field, index) => {
																								if (fieldIndex === index)
																									return;
																								addressesForm.update(index, {
																									...field,
																									active: false,
																								});
																							},
																						);
																						field.onChange(checked);
																					}}
																				/>
																			</FormControl>
																			<div className="space-y-1 leading-none">
																				<FormLabel className="text-xs">
																					Set as active address
																				</FormLabel>
																			</div>
																		</FormItem>
																	)}
																/>
															</div>

															<AlertDialog>
																<AlertDialogTrigger asChild>
																	<Button size="xs" variant="destructive">
																		Delete
																	</Button>
																</AlertDialogTrigger>
																<AlertDialogContent>
																	<AlertDialogHeader>
																		<AlertDialogTitle>
																			Are you absolutely sure?
																		</AlertDialogTitle>
																		<AlertDialogDescription>
																			This action is irreversible. Deleting the
																			data will permanently remove data from our
																			servers and cannot be recovered.
																		</AlertDialogDescription>
																	</AlertDialogHeader>
																	<AlertDialogFooter>
																		<AlertDialogCancel>
																			Cancel
																		</AlertDialogCancel>
																		<Button
																			variant="destructive"
																			onClick={(event) => {
																				event.preventDefault();
																				addressesForm?.remove(fieldIndex);
																			}}
																		>
																			Delete
																		</Button>
																	</AlertDialogFooter>
																</AlertDialogContent>
															</AlertDialog>
														</div>

														<FormField
															control={form.control}
															name={`addresses.${fieldIndex}.country`}
															render={({ field }) => (
																<FormItem>
																	<FormLabel>Country Name</FormLabel>
																	<FormControl>
																		<InputExtended
																			{...field}
																			readOnly
																			type="text"
																			placeholder="Enter the country name..."
																		>
																			<InputExtended.Group>
																				<InputExtended.RightIcon>
																					<span>{address.countryCode}</span>
																				</InputExtended.RightIcon>
																			</InputExtended.Group>
																		</InputExtended>
																	</FormControl>

																	<FormMessage />
																</FormItem>
															)}
														/>

														<Deferred
															data="locations"
															fallback={<LoadingBasic />}
														>
															<FormField
																control={form.control}
																name={`addresses.${fieldIndex}.state`}
																render={({ field }) => (
																	<FormItem className="grid !mt-1 self-end">
																		<FormLabel className="h-6">
																			State/Province
																		</FormLabel>
																		<Popover modal>
																			<PopoverTrigger asChild>
																				<FormControl>
																					<Button
																						variant="outline"
																						className={cn(
																							"w-[75%] md:w-[50%] lg:w-[75%] xl:w-[75%] justify-between text-muted-foreground font-normal !mt-0 px-3",
																							!field.value &&
																								"text-muted-foreground",
																						)}
																						onClick={() =>
																							fetchData.getLocations({
																								country: address.country,
																							})
																						}
																					>
																						<span className="truncate">
																							{field.value
																								? selectCollections?.states?.find(
																										(state) =>
																											state === field.value,
																									) || field.value
																								: "Select state/province"}
																						</span>
																						<ChevronsUpDown className="opacity-50" />
																					</Button>
																				</FormControl>
																			</PopoverTrigger>
																			<PopoverContent
																				align="start"
																				className="w-[250px] p-0"
																			>
																				<Command>
																					<CommandInput
																						disabled={isLoading.states}
																						placeholder="Search state/province..."
																					/>
																					<CommandList>
																						<CommandEmpty>
																							No state or province found.
																						</CommandEmpty>

																						<CommandGroup>
																							{isLoading.states ? (
																								<CommandItem
																									value={undefined}
																									disabled
																								>
																									<LoaderIcon className="animate-spin" />
																									<span>Please wait...</span>
																								</CommandItem>
																							) : (
																								selectCollections?.states?.map(
																									(state) => (
																										<CommandItem
																											value={state}
																											key={state}
																											onSelect={async () => {
																												// set the state data selected
																												form.setValue(
																													`addresses.${fieldIndex}.state`,
																													state,
																												);
																												form.trigger(
																													`addresses.${fieldIndex}.state`,
																												);
																											}}
																										>
																											{state}
																											<Check
																												className={cn(
																													"ml-auto",
																													state === field.value
																														? "opacity-100"
																														: "opacity-0",
																												)}
																											/>
																										</CommandItem>
																									),
																								)
																							)}
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
															name={`addresses.${fieldIndex}.city`}
															render={({ field }) => (
																<FormItem className="grid !mt-1 self-end">
																	<FormLabel className="h-6">City</FormLabel>
																	<Popover modal>
																		<PopoverTrigger asChild>
																			<FormControl>
																				<Button
																					variant="outline"
																					className={cn(
																						"w-[75%] md:w-[50%] lg:w-[75%] xl:w-[75%] justify-between text-muted-foreground font-normal !mt-0 px-3",
																						!field.value &&
																							"text-muted-foreground",
																					)}
																					onClick={() => {
																						fetchData.getLocations({
																							state: form.getValues(
																								`addresses.${fieldIndex}.state`,
																							),
																						});
																					}}
																				>
																					<span className="truncate">
																						{field.value
																							? selectCollections?.cities?.find(
																									(city) =>
																										city === field.value,
																								) || field.value
																							: "Select city"}
																					</span>
																					<ChevronsUpDown className="opacity-50" />
																				</Button>
																			</FormControl>
																		</PopoverTrigger>
																		<PopoverContent
																			align="start"
																			className="w-[250px] p-0"
																		>
																			<Command>
																				<CommandInput
																					disabled={isLoading.cities}
																					placeholder="Search city..."
																				/>
																				<CommandList>
																					<CommandEmpty>
																						No city found.
																					</CommandEmpty>

																					<CommandGroup>
																						{isLoading.cities ? (
																							<CommandItem
																								value={undefined}
																								disabled
																							>
																								<LoaderIcon className="animate-spin" />
																								<span>Please wait...</span>
																							</CommandItem>
																						) : (
																							selectCollections?.cities?.map(
																								(city) => (
																									<CommandItem
																										value={city}
																										key={city}
																										onSelect={async () => {
																											// set the city data selected
																											form.setValue(
																												`addresses.${fieldIndex}.city`,
																												city,
																											);
																											form.trigger(
																												`addresses.${fieldIndex}.city`,
																											);
																										}}
																									>
																										{city}
																										<Check
																											className={cn(
																												"ml-auto",
																												city === field.value
																													? "opacity-100"
																													: "opacity-0",
																											)}
																										/>
																									</CommandItem>
																								),
																							)
																						)}
																					</CommandGroup>
																				</CommandList>
																			</Command>
																		</PopoverContent>
																	</Popover>

																	<FormMessage />
																</FormItem>
															)}
														/>

														<FormField
															control={form.control}
															name={`addresses.${fieldIndex}.postalCode`}
															render={({ field }) => (
																<FormItem>
																	<FormLabel>Postal Code</FormLabel>
																	<FormControl>
																		<Input
																			{...field}
																			type="text"
																			placeholder="Enter the postal code..."
																			className="w-[50%] md:w-[35%] lg:w-[50%] xl:w-[50%]"
																		/>
																	</FormControl>

																	<FormMessage />
																</FormItem>
															)}
														/>

														<FormField
															control={form.control}
															name={`addresses.${fieldIndex}.address`}
															render={({ field }) => (
																<FormItem className="col-span-full">
																	<FormLabel>Address</FormLabel>
																	<FormControl>
																		<Textarea
																			placeholder="Enter the address..."
																			className="resize-none"
																			{...field}
																		/>
																	</FormControl>

																	<FormMessage />
																</FormItem>
															)}
														/>

														{addressesForm?.fields?.length > 1 &&
															addressesForm?.fields?.length !==
																fieldIndex + 1 && (
																<Separator className="w-full mt-4 col-span-full lg:hidden" />
															)}
													</div>
												);
											})
										) : (
											<p className="w-10/12 mx-auto text-sm text-center col-span-full lg:w-5/12">
												There's no address yet, click the add button to create
												data.
											</p>
										)}

										<Button
											disabled={
												!!form.formState.errors?.addresses &&
												!!addressesForm.fields?.length
											}
											size="sm"
											type="button"
											className="w-full mx-auto col-span-full lg:w-6/12"
											onClick={() => {
												addressesForm?.append({
													country: "INDONESIA",
													countryCode: "ID",
													state: "",
													city: "",
													postalCode: "",
													address: "",
													active: false,
												});
											}}
										>
											<Plus className="mr-0.5" />
											Add more address
										</Button>
									</div>
								</>
							)}

							{section === "Account Information" && (
								<>
									<FormField
										control={form.control}
										name="user.email"
										render={({ field }) => (
											<FormItem className="col-span-1">
												<FormLabel>Email</FormLabel>
												<FormControl>
													<Input
														{...field}
														autoFocus={mode === "create"}
														type="email"
														autoComplete="email"
														readOnly={mode === "update"}
														placeholder="Enter the email..."
													/>
												</FormControl>

												<FormMessage />
											</FormItem>
										)}
									/>

									{mode === "create" && (
										<>
											<FormField
												control={form.control}
												name="user.password"
												render={({ field }) => (
													<FormItem className="col-start-1">
														<FormLabel>Password</FormLabel>
														<FormControl>
															<div className="relative">
																<Input
																	{...field}
																	type={
																		passwordVisibility.new ? "text" : "password"
																	}
																	placeholder="Enter the password..."
																	autoComplete="new-password"
																/>
																<Button
																	type="button"
																	variant="ghost"
																	size="icon"
																	className="absolute -translate-y-1/2 right-1 top-1/2 h-7 w-7 text-muted-foreground"
																	onClick={() => {
																		setPasswordVisibility({
																			...passwordVisibility,
																			new: !passwordVisibility.new,
																		});
																	}}
																>
																	{!passwordVisibility.new ? (
																		<Eye className="size-4" />
																	) : (
																		<EyeClosed className="size-4" />
																	)}
																	<span className="sr-only">
																		Toggle Password Visibility
																	</span>
																</Button>
															</div>
														</FormControl>
														<FormDescription>
															You can change this default password if necessary.
														</FormDescription>
														<FormMessage />
													</FormItem>
												)}
											/>

											<FormField
												control={form.control}
												name="user.passwordConfirmation"
												render={({ field }) => (
													<FormItem>
														<FormLabel>Password Confirmation</FormLabel>
														<FormControl>
															<div className="relative">
																<Input
																	{...field}
																	type={
																		passwordVisibility.confirmation
																			? "text"
																			: "password"
																	}
																	placeholder="Enter the password confirmation..."
																	autoComplete="new-password"
																/>
																<Button
																	type="button"
																	variant="ghost"
																	size="icon"
																	className="absolute -translate-y-1/2 right-1 top-1/2 h-7 w-7 text-muted-foreground"
																	onClick={() => {
																		setPasswordVisibility({
																			...passwordVisibility,
																			confirmation:
																				!passwordVisibility.confirmation,
																		});
																	}}
																>
																	{!passwordVisibility.confirmation ? (
																		<Eye className="size-4" />
																	) : (
																		<EyeClosed className="size-4" />
																	)}
																	<span className="sr-only">
																		Toggle Password Visibility
																	</span>
																</Button>
															</div>
														</FormControl>

														<FormMessage />
													</FormItem>
												)}
											/>
										</>
									)}
								</>
							)}

							{section === "Contract Detail" && (
								<>
									<FormField
										control={form.control}
										name="batch"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Batch</FormLabel>
												<FormControl>
													<Input
														{...field}
														type="number"
														min={0}
														value={field?.value || ""}
														placeholder="Enter the batch..."
														className="w-[35%] md:w-[25%] lg:w-[35%] xl:w-[35%]"
													/>
												</FormControl>

												<FormMessage />
											</FormItem>
										)}
									/>

									<Deferred data="services" fallback={<LoadingBasic />}>
										<FormField
											control={form.control}
											name="service.name"
											render={({ field }) => (
												<FormItem className="grid !mt-1 self-end">
													<FormLabel className="h-6">Service</FormLabel>
													<Popover>
														<PopoverTrigger asChild>
															<FormControl>
																<Button
																	variant="outline"
																	className={cn(
																		"w-[75%] md:w-[50%] lg:w-[75%] xl:w-[75%] justify-between text-muted-foreground font-normal !mt-0 px-3",
																		!field.value && "text-muted-foreground",
																	)}
																	onClick={() => {
																		fetchData.getServices();
																	}}
																>
																	{field.value
																		? services
																				?.find(
																					(service) =>
																						service.name === field.value,
																				)
																				?.name.replaceAll("_", " ") ||
																			field.value
																		: "Select service"}
																	<ChevronsUpDown className="opacity-50" />
																</Button>
															</FormControl>
														</PopoverTrigger>
														<PopoverContent
															align="start"
															className="w-[250px] p-0"
														>
															<Command>
																<CommandInput placeholder="Search service..." />
																<CommandList>
																	<CommandEmpty>No service found.</CommandEmpty>
																	<CommandGroup>
																		{isLoading.services ? (
																			<CommandItem value={undefined} disabled>
																				<LoaderIcon className="animate-spin" />
																				<span>Please wait...</span>
																			</CommandItem>
																		) : (
																			services?.map((service) => (
																				<CommandItem
																					value={String(service.id)}
																					key={service.id}
																					onSelect={() => {
																						const { id, name, code } = service;
																						form.setValue("service", {
																							id,
																							name,
																							code,
																						});
																					}}
																				>
																					<Check
																						className={cn(
																							"mr-2 h-4 w-4",
																							service.name === field.value
																								? "opacity-100"
																								: "opacity-0",
																						)}
																					/>
																					{service.name.replaceAll("_", " ")}
																				</CommandItem>
																			))
																		)}
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
										name="employmentType"
										render={({ field }) => (
											<FormItem className="col-start-1">
												<FormLabel>Employment Type</FormLabel>
												<Select
													onValueChange={field.onChange}
													defaultValue={field?.value || ""}
												>
													<FormControl>
														<SelectTrigger
															className={`w-[50%] md:w-[35%] lg:w-[50%] xl:w-[50%] ${!field?.value ? "text-muted-foreground" : ""}`}
														>
															<SelectValue placeholder="Select a employment type..." />
														</SelectTrigger>
													</FormControl>
													<SelectContent>
														{!!employmentTypes?.length &&
															employmentTypes.map((type) => (
																<SelectItem key={type} value={type}>
																	{type}
																</SelectItem>
															))}
													</SelectContent>
												</Select>

												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="employmentStatus"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Employment Status</FormLabel>
												<Select
													onValueChange={field.onChange}
													defaultValue={field?.value || ""}
													onOpenChange={(value) => {
														if (value) {
															fetchData.getEmploymentStatuses();
														}
													}}
												>
													<FormControl>
														<SelectTrigger
															className={`w-[50%] md:w-[35%] lg:w-[50%] xl:w-[50%] ${!field?.value ? "text-muted-foreground" : ""}`}
														>
															<SelectValue placeholder="Select a employment status..." />
														</SelectTrigger>
													</FormControl>
													<SelectContent>
														{isLoading.employmentStatuses ? (
															<SelectItem value="loading" disabled>
																<LoaderIcon className="animate-spin" />
																<span>Please wait...</span>
															</SelectItem>
														) : selectCollections?.employmentStatuses
																?.length ? (
															selectCollections.employmentStatuses.map(
																(status) => (
																	<SelectItem
																		key={status.value}
																		value={status.value}
																	>
																		<span className="flex items-center gap-2">
																			<Dot
																				className={status.color}
																				width={10}
																				height={10}
																				strokeWidth={20}
																			/>
																			<span className="truncate">
																				{status.label}
																			</span>
																		</span>
																	</SelectItem>
																),
															)
														) : (
															<SelectItem value="no items" disabled>
																No employment status found.
															</SelectItem>
														)}
													</SelectContent>
												</Select>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="modalities"
										render={({ field }) => (
											<FormItem className="col-span-full">
												<FormLabel>Modality</FormLabel>
												<FormControl>
													<TagsInput
														value={field.value}
														onValueChange={field.onChange}
														placeholder="Enter the therapist modality..."
													/>
												</FormControl>

												<FormDescription>
													Press the <b>"Enter"</b> key to input the value
												</FormDescription>

												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="specializations"
										render={({ field }) => (
											<FormItem className="col-span-full">
												<FormLabel>Specialization</FormLabel>
												<FormControl>
													<TagsInput
														value={field.value}
														onValueChange={field.onChange}
														placeholder="Enter the therapist specialization..."
													/>
												</FormControl>

												<FormDescription>
													Press the <b>"Enter"</b> key to input the value
												</FormDescription>

												<FormMessage />
											</FormItem>
										)}
									/>

									<div className="grid grid-cols-1 gap-6 mt-4 col-span-full lg:grid-cols-2">
										<div className="grid gap-4 col-span-full">
											<div className="flex items-center gap-2">
												<CreditCard className="size-4" />
												<p className="text-sm font-semibold tracking-tight">
													Bank Accounts
												</p>
											</div>

											<Separator />
										</div>

										{bankDetailsForm?.fields?.length ? (
											bankDetailsForm?.fields?.map((detail, fieldIndex) => {
												return (
													<div key={detail.id} className="grid w-full gap-4">
														<div className="flex items-center justify-between w-full col-span-full">
															<div className="flex flex-row items-center space-x-3">
																<span className="text-sm font-bold">
																	Bank #{Number(fieldIndex) + 1}
																</span>

																<Separator
																	orientation="vertical"
																	className="h-4 bg-muted-foreground/25"
																/>

																<FormField
																	control={form.control}
																	name={`bankDetails.${fieldIndex}.active`}
																	render={({ field }) => (
																		<FormItem className="flex flex-row items-center space-x-2 space-y-0">
																			<FormControl>
																				<Checkbox
																					checked={field.value}
																					onCheckedChange={(checked) => {
																						if (!checked) return;

																						// if enabling bank details, will automatically disable other
																						bankDetailsForm.fields.map(
																							(field, index) => {
																								if (fieldIndex === index)
																									return;
																								bankDetailsForm.update(index, {
																									...field,
																									active: false,
																								});
																							},
																						);
																						field.onChange(checked);
																					}}
																				/>
																			</FormControl>
																			<div className="space-y-1 leading-none">
																				<FormLabel className="text-xs">
																					Set as active bank
																				</FormLabel>
																			</div>
																		</FormItem>
																	)}
																/>
															</div>

															<AlertDialog>
																<AlertDialogTrigger asChild>
																	<Button size="xs" variant="destructive">
																		Delete
																	</Button>
																</AlertDialogTrigger>
																<AlertDialogContent>
																	<AlertDialogHeader>
																		<AlertDialogTitle>
																			Are you absolutely sure?
																		</AlertDialogTitle>
																		<AlertDialogDescription>
																			This action is irreversible. Deleting the
																			data will permanently remove data from our
																			servers and cannot be recovered.
																		</AlertDialogDescription>
																	</AlertDialogHeader>
																	<AlertDialogFooter>
																		<AlertDialogCancel>
																			Cancel
																		</AlertDialogCancel>
																		<Button
																			variant="destructive"
																			onClick={(event) => {
																				event.preventDefault();
																				bankDetailsForm?.remove(fieldIndex);
																			}}
																		>
																			Delete
																		</Button>
																	</AlertDialogFooter>
																</AlertDialogContent>
															</AlertDialog>
														</div>

														<FormField
															control={form.control}
															name={`bankDetails.${fieldIndex}.bankName`}
															render={({ field }) => (
																<FormItem>
																	<FormLabel>Bank Name</FormLabel>
																	<FormControl>
																		<Input
																			{...field}
																			type="text"
																			placeholder="Enter the bank name..."
																		/>
																	</FormControl>

																	<FormMessage />
																</FormItem>
															)}
														/>

														<FormField
															control={form.control}
															name={`bankDetails.${fieldIndex}.accountNumber`}
															render={({ field }) => (
																<FormItem>
																	<FormLabel>Account Number</FormLabel>
																	<FormControl>
																		<Input
																			{...field}
																			type="number"
																			min={0}
																			placeholder="Enter the account number..."
																		/>
																	</FormControl>

																	<FormMessage />
																</FormItem>
															)}
														/>

														<FormField
															control={form.control}
															name={`bankDetails.${fieldIndex}.accountHolderName`}
															render={({ field }) => (
																<FormItem>
																	<FormLabel>Account Holder Name</FormLabel>
																	<FormControl>
																		<Input
																			{...field}
																			type="text"
																			placeholder="Enter the account holder name..."
																		/>
																	</FormControl>

																	<FormMessage />
																</FormItem>
															)}
														/>

														{bankDetailsForm?.fields?.length > 1 &&
															bankDetailsForm?.fields?.length !==
																fieldIndex + 1 && (
																<Separator className="w-full mt-4 col-span-full lg:hidden" />
															)}
													</div>
												);
											})
										) : (
											<p className="w-10/12 mx-auto text-sm text-center col-span-full lg:w-5/12">
												There's no bank details yet, click the add button to
												create data.
											</p>
										)}

										<Button
											disabled={
												!!form.formState.errors?.bankDetails &&
												!!bankDetailsForm.fields?.length
											}
											size="sm"
											type="button"
											className="w-full mx-auto col-span-full lg:w-6/12"
											onClick={() => {
												bankDetailsForm?.append({
													bankName: "",
													accountNumber: "",
													accountHolderName: "",
													active: false,
												});
											}}
										>
											<Plus className="mr-0.5" />
											Add more bank
										</Button>
									</div>
								</>
							)}
						</FormSectionContainer>
					);
				})}

				<div className="!mt-10 lg:!mt-6 gap-4 lg:gap-2 w-full flex flex-col md:flex-row lg:col-span-full md:justify-between">
					<Button
						type="button"
						variant="outline"
						className="w-full lg:w-auto"
						onClick={goBackHandler}
					>
						{mode === "create" ? "Back" : "Cancel"}
					</Button>

					<Button
						type="submit"
						disabled={isLoading.submit}
						className={cn("w-full order-first md:order-last lg:w-auto")}
					>
						{isLoading.submit ? (
							<>
								<LoaderIcon className="animate-spin" />
								<span>
									{mode === "create" ? "Please wait..." : "Updating..."}
								</span>
							</>
						) : (
							<span>{mode === "create" ? "Create" : "Save"}</span>
						)}
					</Button>
				</div>
			</form>
		</Form>
	);
}
