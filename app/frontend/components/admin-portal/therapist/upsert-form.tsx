import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { type TherapistFormSchema, getFormSchema } from "@/lib/therapists";
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
import { router, usePage } from "@inertiajs/react";
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
import {
	type ComponentProps,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	type UseFieldArrayReturn,
	useFieldArray,
	useForm,
	useFormContext,
	useWatch,
} from "react-hook-form";
import type { FormMode } from "../../../pages/AdminPortal/Therapist/Upsert";

import HereMap, { type HereMaphandler } from "@/components/shared/here-map";
import { useMediaQuery } from "@uidotdev/usehooks";
import { toast } from "sonner";

// * for section container'
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

// * for account information form
interface AccountInformationFormProps {
	mode: FormMode;
}

function AccountInformationForm({ mode }: AccountInformationFormProps) {
	const form = useFormContext<TherapistFormSchema>();
	const [passwordVisibility, setPasswordVisibility] = useState({
		new: false,
		confirmation: false,
	});

	return (
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
											type={passwordVisibility.new ? "text" : "password"}
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
												passwordVisibility.confirmation ? "text" : "password"
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
													confirmation: !passwordVisibility.confirmation,
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
	);
}

// * for bank detail form
interface BankDetailFormProps {
	fieldIndex: number;
	bankDetailsForm: UseFieldArrayReturn<TherapistFormSchema>;
}

function BankDetailForm({ fieldIndex, bankDetailsForm }: BankDetailFormProps) {
	const form = useFormContext<TherapistFormSchema>();
	const [deleted, setDeleted] = useState(false);

	return (
		<div
			className={cn(
				"grid w-full gap-4",
				deleted
					? "motion-opacity-out-0"
					: "motion-translate-motion-scale-in-0 motion-opacity-in-0 motion-delay-100",
			)}
		>
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
											bankDetailsForm.fields.map((field, index) => {
												if (fieldIndex === index) return;
												bankDetailsForm.update(index, {
													...field,
													active: false,
												});
											});
											field.onChange(checked);
										}}
									/>
								</FormControl>
								<div className="space-y-1 leading-none">
									<FormLabel className="text-xs">Set as active bank</FormLabel>
								</div>
							</FormItem>
						)}
					/>
				</div>

				<Button
					type="button"
					size="xs"
					variant="destructive"
					onClick={(event) => {
						event.preventDefault();
						if (
							window.confirm(
								"Are you absolutely sure? \nThis action is irreversible. Deleting the data will permanently remove data from our servers and cannot b recovered.",
							)
						) {
							setDeleted(true);
							setTimeout(() => {
								bankDetailsForm?.remove(fieldIndex);
							}, 250);
						}
					}}
				>
					Delete
				</Button>
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
				bankDetailsForm?.fields?.length !== fieldIndex + 1 && (
					<Separator className="w-full mt-4 col-span-full lg:hidden" />
				)}
		</div>
	);
}

// * for contract detail form
interface ContractDetailFormProps {
	currentPath: string;
	services: Service[];
	employmentTypes: TherapistEmploymentType;
	employmentStatuses: TherapistEmploymentStatus;
}

function ContractDetailForm({
	currentPath,
	services,
	employmentTypes,
	employmentStatuses,
}: ContractDetailFormProps) {
	const form = useFormContext<TherapistFormSchema>();
	const [isLoading, setIsLoading] = useState({
		services: false,
		employmentStatuses: false,
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
		};
	});
	const fetchData = {
		getEmploymentStatuses: () => {
			router.get(
				currentPath,
				{},
				{
					only: ["employmentStatuses"],
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
				currentPath,
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
	};

	// for bank details array of fields
	const bankDetailsForm = useFieldArray({
		control: form.control,
		name: "bankDetails",
		rules: {
			required: true,
			minLength: 1,
		},
	});

	return (
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
													?.find((service) => service.name === field.value)
													?.name.replaceAll("_", " ") || field.value
											: "Select service"}
										<ChevronsUpDown className="opacity-50" />
									</Button>
								</FormControl>
							</PopoverTrigger>
							<PopoverContent align="start" className="w-[250px] p-0">
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
								) : selectCollections?.employmentStatuses?.length ? (
									selectCollections?.employmentStatuses.map((status) => (
										<SelectItem key={status.value} value={status.value}>
											<span className="flex items-center gap-2">
												<Dot
													className={status.color}
													width={10}
													height={10}
													strokeWidth={20}
												/>
												<span className="truncate">{status.label}</span>
											</span>
										</SelectItem>
									))
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
					bankDetailsForm?.fields?.map((bankDetail, fieldIndex) => {
						return (
							<BankDetailForm
								key={bankDetail.id}
								fieldIndex={fieldIndex}
								bankDetailsForm={bankDetailsForm}
							/>
						);
					})
				) : (
					<p className="w-10/12 mx-auto text-sm font-light text-center col-span-full lg:w-5/12">
						There's no bank details yet, click the add button to create data.
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
						form.trigger("bankDetails");
					}}
				>
					<Plus className="mr-0.5" />
					Add more bank
				</Button>
			</div>
		</>
	);
}

// * for address form
interface AddressFormProps {
	currentPath: string;
	fieldIndex: number;
	locations: Location[];
	addressesForm: UseFieldArrayReturn<TherapistFormSchema>;
}

function AddressForm({
	currentPath,
	fieldIndex,
	locations,
	addressesForm,
}: AddressFormProps) {
	const form = useFormContext<TherapistFormSchema>();
	const [isLoading, setIsLoading] = useState({
		states: false,
		cities: false,
	});
	const [deleted, setDeleted] = useState(false);

	// the list items for select options
	const [selectCollections, setSelectCollections] = useState(() => {
		return {
			states: [] as string[],
			cities: [] as string[],
		};
	});
	const fetchData = {
		getLocations: (query: {
			country?: string | null;
			state?: string | null;
			city?: string | null;
		}) => {
			router.get(currentPath, query, {
				only: ["locations"],
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
			});
		},
	};

	// for addresses array of fields
	const watchAddresses = useWatch({ name: "addresses" });
	const address = useMemo<TherapistFormSchema["addresses"][number]>(
		() => watchAddresses?.[fieldIndex],
		[watchAddresses?.[fieldIndex], fieldIndex],
	);
	const coordinate = useMemo(
		() => [address.lat, address.lng],
		[address.lat, address.lng],
	);
	const isCalcCoordinatesDisabled = useMemo(() => {
		return (
			!address?.address ||
			!address?.city ||
			!address?.country ||
			!address?.postalCode ||
			!address?.state
		);
	}, [address]);

	// for map state management
	const mapRef = useRef<(H.Map & HereMaphandler) | null>(null);
	const calculateCoordinate = useCallback(async () => {
		try {
			// Fetch geocode result
			const geocodeResult = await mapRef.current?.geocodeAddress();

			// Validate geocode result
			if (
				!geocodeResult ||
				!geocodeResult?.position?.lat ||
				!geocodeResult?.position?.lng
			) {
				console.error("Address cannot be found!");

				// Set error message for the form
				const errorMessage =
					"The address cannot be found. Ensure the province, city, postal code, and address line are entered correctly.";
				form.setError(`addresses.${fieldIndex}.address`, {
					message: errorMessage,
					type: "custom",
				});
				return;
			}

			// Update form values with latitude and longitude
			const { lat, lng } = geocodeResult.position;
			form.setValue(`addresses.${fieldIndex}.lat`, lat);
			form.setValue(`addresses.${fieldIndex}.lng`, lng);

			// Add markers to the map
			mapRef.current?.addMarkers([geocodeResult]);

			// revalidate the form status
			form.trigger("addresses");
		} catch (error) {
			console.error("An unexpected error occurred:", error);

			// Handle unexpected errors
			form.setError(`addresses.${fieldIndex}.address`, {
				message:
					"An unexpected error occurred while calculating the coordinates from the address.",
				type: "custom",
			});
		}
	}, [fieldIndex, form.setError, form.setValue, form.trigger]);

	return (
		<div
			className={cn(
				"grid w-full gap-4 lg:grid-cols-2",
				deleted
					? "motion-opacity-out-0"
					: "motion-translate-motion-scale-in-0 motion-opacity-in-0 motion-delay-100",
			)}
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
											addressesForm.fields.map((field, index) => {
												if (fieldIndex === index) return;
												addressesForm.update(index, {
													...field,
													active: false,
												});
											});
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

				<Button
					type="button"
					size="xs"
					variant="destructive"
					onClick={(event) => {
						event.preventDefault();
						if (
							window.confirm(
								"Are you absolutely sure? \nThis action is irreversible. Deleting the data will permanently remove data from our servers and cannot b recovered.",
							)
						) {
							setDeleted(true);
							setTimeout(() => {
								addressesForm.remove(fieldIndex);
							}, 250);
						}
					}}
				>
					Delete
				</Button>
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
								autoComplete="country-name"
							>
								<InputExtended.Group>
									<InputExtended.RightIcon>
										<span>{watchAddresses?.[fieldIndex]?.countryCode}</span>
									</InputExtended.RightIcon>
								</InputExtended.Group>
							</InputExtended>
						</FormControl>

						<FormMessage />
					</FormItem>
				)}
			/>

			<FormField
				control={form.control}
				name={`addresses.${fieldIndex}.state`}
				render={({ field }) => (
					<FormItem className="grid !mt-1 self-end">
						<FormLabel className="h-6">State/Province</FormLabel>
						<Popover modal>
							<PopoverTrigger asChild>
								<FormControl>
									<Button
										variant="outline"
										className={cn(
											"w-[75%] md:w-[50%] lg:w-[75%] xl:w-[75%] justify-between text-muted-foreground font-normal !mt-0 px-3",
											!field.value && "text-muted-foreground",
										)}
										onClick={() => {
											fetchData.getLocations({
												country: watchAddresses?.[fieldIndex]?.country,
											});
										}}
									>
										<span className="truncate">
											{field.value
												? selectCollections?.states?.find(
														(state) => state === field.value,
													) || field.value
												: "Select state/province"}
										</span>
										<ChevronsUpDown className="opacity-50" />
									</Button>
								</FormControl>
							</PopoverTrigger>
							<PopoverContent align="start" className="w-[250px] p-0">
								<Command>
									<CommandInput
										disabled={isLoading.states}
										placeholder="Search state/province..."
										autoComplete="address-level1"
									/>
									<CommandList>
										<CommandEmpty>No state or province found.</CommandEmpty>

										<CommandGroup>
											{isLoading.states ? (
												<CommandItem value={undefined} disabled>
													<LoaderIcon className="animate-spin" />
													<span>Please wait...</span>
												</CommandItem>
											) : (
												selectCollections?.states?.map((state) => (
													<CommandItem
														value={state}
														key={state}
														onSelect={async () => {
															// set the state data selected
															form.setValue(
																`addresses.${fieldIndex}.state`,
																state,
															);
															form.trigger(`addresses.${fieldIndex}.state`);
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
											!field.value && "text-muted-foreground",
										)}
										onClick={() => {
											fetchData.getLocations({
												state: form.getValues(`addresses.${fieldIndex}.state`),
											});
										}}
									>
										<span className="truncate">
											{field.value
												? selectCollections?.cities?.find(
														(city) => city === field.value,
													) || field.value
												: "Select city"}
										</span>
										<ChevronsUpDown className="opacity-50" />
									</Button>
								</FormControl>
							</PopoverTrigger>
							<PopoverContent align="start" className="w-[250px] p-0">
								<Command>
									<CommandInput
										disabled={isLoading.cities}
										placeholder="Search city..."
										autoComplete="address-level2"
									/>
									<CommandList>
										<CommandEmpty>No city found.</CommandEmpty>

										<CommandGroup>
											{isLoading.cities ? (
												<CommandItem value={undefined} disabled>
													<LoaderIcon className="animate-spin" />
													<span>Please wait...</span>
												</CommandItem>
											) : (
												selectCollections?.cities?.map((city) => (
													<CommandItem
														value={city}
														key={city}
														onSelect={async () => {
															// set the city data selected
															form.setValue(
																`addresses.${fieldIndex}.city`,
																city,
															);
															form.trigger(`addresses.${fieldIndex}.city`);
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
								autoComplete="postal-code"
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
								autoComplete="street-address"
								// className="resize-none"
								{...field}
							/>
						</FormControl>

						<FormMessage />
					</FormItem>
				)}
			/>

			<Button
				size="sm"
				type="button"
				disabled={isCalcCoordinatesDisabled}
				className={cn(
					"",
					!address?.lat && !address?.lng ? "animate-pulse" : "",
				)}
				onClick={async (event) => {
					event.preventDefault();

					await calculateCoordinate();
				}}
			>
				Calculate Coordinate
			</Button>

			<HereMap
				ref={mapRef}
				coordinate={coordinate}
				address={{
					country: address.country,
					state: address.state,
					city: address.city,
					postalCode: address.postalCode,
					address: address.address,
				}}
				className="col-span-full"
			/>

			{addressesForm?.fields?.length > 1 &&
				addressesForm?.fields?.length !== fieldIndex + 1 && (
					<Separator className="w-full mt-4 col-span-full" />
				)}
		</div>
	);
}

// * for personal information form
interface PersonalInformationFormProps {
	currentPath: string;
	genders: TherapistGender;
	locations: Location[];
}

function PersonalInformationForm({
	currentPath,
	genders,
	locations,
}: PersonalInformationFormProps) {
	const form = useFormContext<TherapistFormSchema>();

	// for addresses array of fields
	const addressesForm = useFieldArray({
		control: form.control,
		name: "addresses",
		rules: {
			required: true,
			minLength: 1,
		},
	});

	return (
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
								autoComplete="tel"
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
						<p className="text-sm font-semibold tracking-tight">Addresses</p>
					</div>

					<Separator />
				</div>

				{addressesForm?.fields?.length ? (
					addressesForm.fields.map((addressItem, fieldIndex) => {
						return (
							<AddressForm
								key={addressItem.id}
								currentPath={currentPath}
								locations={locations}
								fieldIndex={fieldIndex}
								addressesForm={addressesForm}
							/>
						);
					})
				) : (
					<p className="w-10/12 mx-auto text-sm font-light text-center col-span-full lg:w-5/12">
						There's no address yet, click the add button to create data.
					</p>
				)}

				<Button
					disabled={
						!!form.formState.errors?.addresses && !!addressesForm.fields?.length
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
							lat: 0,
							lng: 0,
						});
						form.trigger("addresses");
					}}
				>
					<Plus className="mr-0.5" />
					Add more address
				</Button>
			</div>
		</>
	);
}

// * for the core therapist form
export interface FormTherapistProps {
	currentPath: string;
	mode: FormMode;
	therapist: Partial<Therapist>;
	genders: TherapistGender;
	employmentTypes: TherapistEmploymentType;
	employmentStatuses: TherapistEmploymentStatus;
	services: Service[];
	locations: Location[];
}

export default function FormTherapist({
	currentPath,
	mode,
	therapist,
	genders,
	employmentTypes,
	employmentStatuses,
	services,
	locations,
}: FormTherapistProps) {
	const isDekstop = useMediaQuery("(min-width: 768px)");
	const { props: globalProps } = usePage<
		GlobalPageProps & {
			errors: {
				fullMessages?: string;
			};
		}
	>();
	const [isLoading, setIsLoading] = useState({
		submit: false,
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
				therapist.addresses?.map(
					({
						active,
						address,
						id,
						postalCode,
						longitude,
						latitude,
						location: { country, countryCode, city, state },
					}) => ({
						active,
						address,
						id,
						postalCode,
						country,
						countryCode,
						state,
						city,
						lat: latitude,
						lng: longitude,
					}),
				) || [],
		},
		mode: "onBlur",
	});

	// Computes form alert errors based on bank details, addresses, server validation, and coordinates errors
	const formAlertErrors = useMemo(() => {
		const serverErrors = globalProps?.errors?.fullMessages;
		const formErrors = form?.formState?.errors;
		console.log("Zod form errors: ", formErrors);

		const getErrorMessage = (fieldError: any) =>
			fieldError?.root?.message || fieldError?.message;

		const bankDetailsError = getErrorMessage(formErrors?.bankDetails);
		const addressesError = getErrorMessage(formErrors?.addresses);

		// Check for coordinate errors (specific lat/lng validations)
		const coordinateError =
			Array.isArray(formErrors?.addresses) &&
			formErrors.addresses.some((address) => address?.lat || address?.lng)
				? "You need to calculate the coordinates first"
				: undefined;

		// Collect all non-null, non-undefined errors
		return [
			bankDetailsError,
			addressesError,
			serverErrors,
			coordinateError,
		].filter(Boolean);
	}, [form.formState.errors, globalProps?.errors?.fullMessages]);

	/**
	 * Display error messages using top alert form or toast notifications.
	 * It handles server validation errors and alerts for form-specific issues.
	 */
	useEffect(() => {
		const serverErrors = globalProps?.errors?.fullMessages;

		// Map server validation errors to specific form fields
		if (serverErrors?.includes("Email")) {
			form.setError("user.email", {
				type: "server",
				message: serverErrors,
			});
		}

		if (serverErrors?.includes("Phone")) {
			form.setError("phoneNumber", {
				type: "server",
				message: serverErrors,
			});
		}

		// Show the first available error in a toast notification
		if (formAlertErrors.length) {
			toast.error(formAlertErrors[0], {
				position: !isDekstop ? "top-center" : "bottom-right",
			});
		}
	}, [form, globalProps?.errors?.fullMessages, formAlertErrors, isDekstop]);

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
		console.log(`Payload data: ${payload}`);

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
								<PersonalInformationForm
									currentPath={currentPath}
									genders={genders}
									locations={locations}
								/>
							)}

							{section === "Account Information" && (
								<AccountInformationForm mode={mode} />
							)}

							{section === "Contract Detail" && (
								<ContractDetailForm
									currentPath={currentPath}
									services={services}
									employmentTypes={employmentTypes}
									employmentStatuses={employmentStatuses}
								/>
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
