import { ResponsiveDialogButton } from "@/components/shared/responsive-dialog";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CommandGroup, CommandSeparator } from "@/components/ui/command";
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
	MultiSelector,
	MultiSelectorContent,
	MultiSelectorInput,
	MultiSelectorItem,
	MultiSelectorList,
	MultiSelectorTrigger,
} from "@/components/ui/multi-select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import { groupLocationsByCountry } from "@/lib/locations";
import { cn } from "@/lib/utils";
import type { Location } from "@/types/admin-portal/location";
import type { Service } from "@/types/admin-portal/service";
import type { GlobalPageProps, ResponsiveDialogMode } from "@/types/globals";
import { zodResolver } from "@hookform/resolvers/zod";
import { router, usePage } from "@inertiajs/react";
import { Dot, LoaderIcon } from "lucide-react";
import {
	type ComponentProps,
	Fragment,
	useEffect,
	useMemo,
	useState,
} from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

export interface FormServiceDialogContentProps extends ComponentProps<"form"> {
	selectedService: Service | null;
	locations: Location[];
	forceMode?: ResponsiveDialogMode;
	handleOpenChange?: (value: boolean) => void;
}

export function FormServiceDialogContent({
	className,
	selectedService,
	locations,
	forceMode,
	handleOpenChange,
}: FormServiceDialogContentProps) {
	const { props: globalProps } = usePage<
		GlobalPageProps & {
			errors: Record<keyof Service, string[]> & { fullMessages: string[] };
		}
	>();
	const groupedLocations = useMemo(
		() => groupLocationsByCountry(locations),
		[locations],
	);

	// form management
	const mode = useMemo(
		() => (selectedService ? "edit" : "add"),
		[selectedService],
	);
	const [isLoading, setIsLoading] = useState(false);
	const buttonProps = useMemo<ResponsiveDialogButton>(() => {
		return { isLoading, forceMode };
	}, [isLoading, forceMode]);
	const formSchema = z.object({
		name: z.string().min(3, { message: "Service name is required" }),
		code: z
			.string()
			.min(1, { message: "Service code is required" })
			.max(3, { message: "Maximum service code is 3 characters" }),
		active: z.boolean(),
		locations: z
			.array(
				z.object({
					id: z.union([z.string(), z.number()]),
					city: z.string(),
					active: z.boolean(),
				}),
			)
			.nullish(),
		cities: z.array(z.string()).nullish(),
	});
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: selectedService?.name || "",
			code: selectedService?.code || "",
			active: !!selectedService?.active,
			locations:
				selectedService?.locations?.map((location) => ({
					id: location.id,
					city: location.city,
					active: !!location.active,
				})) || [],
			cities:
				selectedService?.locations?.map((location) => location.city) || [],
		},
		mode: "onBlur",
	});
	const locationsForm = useFieldArray({
		control: form.control,
		name: "locations",
	});
	const isActiveAllCities = useMemo(
		() => !!locationsForm?.fields?.every((location) => location.active),
		[locationsForm.fields],
	);
	function onSubmit(values: z.infer<typeof formSchema>) {
		const baseURL =
			globalProps.adminPortal.router.adminPortal.serviceManagement.index;
		const routeURL =
			mode === "add" ? baseURL : `${baseURL}/${selectedService?.id}`;

		if (mode === "add") {
			console.log("Submitting form to create the service...");
			router.post(
				routeURL,
				deepTransformKeysToSnakeCase({
					service: {
						name: values.name.toUpperCase(),
						code: values.code.toUpperCase(),
						active: values.active,
					},
				}),
				{
					preserveScroll: true,
					preserveState: true,
					onStart: () => {
						setIsLoading(true);
					},
					onSuccess: () => {
						if (handleOpenChange) {
							handleOpenChange(false);
						}
					},
					onFinish: () => {
						setIsLoading(false);
					},
				},
			);
			console.log("Service successfully created...");
			return;
		}

		console.log(
			`Submitting form to update the service with name ${values.name}...`,
		);
		router.put(
			routeURL,
			deepTransformKeysToSnakeCase({
				service: {
					name: values.name.toUpperCase(),
					code: values.code.toUpperCase(),
					active: values.active,
					locations: values?.locations?.length ? values.locations : null,
				},
			}),
			{
				preserveScroll: true,
				preserveState: true,
				onStart: () => {
					setIsLoading(true);
				},
				onFinish: () => {
					setIsLoading(false);
				},
			},
		);
		console.log(`Service with name ${values.name} successfully updated...`);
	}

	// watch the cities selected data
	const watchCities = useWatch({ control: form.control, name: "cities" });
	useEffect(() => {
		const cities = watchCities;
		const locationSelected =
			locations
				?.filter((location) => cities?.includes(location.city))
				?.map((location) => ({
					id: location.id,
					city: location.city,
					active: !!locationsForm?.fields?.find(
						(field) => field.city === location.city,
					)?.active,
				})) || [];

		form.setValue("locations", locationSelected);
	}, [watchCities, locations, locationsForm?.fields?.find, form.setValue]);

	// side-effect for server validation
	useEffect(() => {
		if (!globalProps?.errors) return;

		for (const [key, value] of Object.entries(globalProps?.errors)) {
			form.setError(key as any, {
				type: "custom",
				message: (value as string[]).join(", "),
			});
		}
	}, [globalProps.errors, form.setError]);

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className={cn(
					"grid gap-4 grid-cols-1 items-start",
					mode === "edit" && "lg:grid-cols-2",
					className,
				)}
			>
				<div className="grid gap-4">
					<FormField
						control={form.control}
						name="name"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Name</FormLabel>
								<FormControl>
									<Input
										{...field}
										autoFocus
										type="text"
										placeholder="Enter the service name..."
									/>
								</FormControl>

								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="code"
						render={({ field }) => (
							<FormItem className="w-100 lg:w-[50%]">
								<FormLabel>Code</FormLabel>
								<FormControl>
									<Input
										{...field}
										type="text"
										placeholder="Enter the service code..."
									/>
								</FormControl>

								<FormMessage />
							</FormItem>
						)}
					/>

					{mode === "edit" && (
						<FormField
							control={form.control}
							name="active"
							render={({ field }) => {
								const statuses = [
									{
										value: "active",
										label: "Active",
										color: "text-emerald-600",
									},
									{
										value: "inactive",
										label: "Inactive",
										color: "text-destructive",
									},
								];

								return (
									<FormItem className="w-100 lg:w-[75%]">
										<FormLabel>Status</FormLabel>
										<Select
											onValueChange={(value) => {
												field.onChange(value === "active");
											}}
											defaultValue={field.value ? "active" : "inactive"}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="Select a service status" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												{statuses.map((status) => (
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
												))}
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								);
							}}
						/>
					)}
				</div>

				{mode === "edit" && (
					<div className="grid gap-4">
						<Separator className="mt-4 lg:hidden" />

						<div className="space-y-1.5">
							<p className="font-semibold leading-none tracking-tighter">
								Setup Locations Availability
							</p>

							<p className="text-sm text-muted-foreground">
								Services can also be activated/inactivated to be available at
								each location.
							</p>
						</div>

						<FormField
							control={form.control}
							name="cities"
							render={({ field }) => (
								<FormItem>
									<MultiSelector
										onValuesChange={field.onChange}
										values={field?.value || []}
										maxShows={5}
									>
										<MultiSelectorTrigger>
											<MultiSelectorInput placeholder="Select the locations..." />
										</MultiSelectorTrigger>
										<MultiSelectorContent>
											<MultiSelectorList>
												{groupedLocations.map((location) => (
													<Fragment key={location.country}>
														<span className="px-2 text-sm font-medium text-muted-foreground">
															{location.country}
														</span>
														{location.states.map((state) => (
															<CommandGroup
																key={state.name}
																heading={state.name}
															>
																{state.cities.map((city) => (
																	<MultiSelectorItem
																		key={city.name}
																		value={city.name}
																	>
																		{city.name}
																	</MultiSelectorItem>
																))}
															</CommandGroup>
														))}
														<CommandSeparator />
													</Fragment>
												))}
											</MultiSelectorList>
										</MultiSelectorContent>
									</MultiSelector>

									<FormMessage />
								</FormItem>
							)}
						/>

						{!!locationsForm?.fields?.length && (
							<div className="flex flex-col gap-4 p-4 border rounded-md max-h-48">
								<div className="flex flex-col gap-4 pb-2 border-b">
									<FormItem className="flex flex-row items-start mb-1 space-x-3 space-y-0">
										<FormControl>
											<Checkbox
												checked={isActiveAllCities}
												onCheckedChange={(value) => {
													const updatedLocations = locationsForm.fields.map(
														(location) => ({ ...location, active: !!value }),
													);
													locationsForm.replace(updatedLocations);
												}}
											/>
										</FormControl>

										<FormLabel>
											Set active for {locationsForm.fields.length} selected
											cities
										</FormLabel>
									</FormItem>
								</div>

								<ScrollArea className="w-full h-full">
									<div className="grid gap-2">
										{locationsForm?.fields?.map((location, fieldIndex) => (
											<Fragment key={location.id}>
												<div className="flex">
													<FormField
														control={form.control}
														name={`locations.${fieldIndex}.active`}
														render={({ field }) => (
															<TooltipProvider>
																<Tooltip>
																	<TooltipTrigger asChild>
																		<FormItem className="flex flex-row items-start space-x-3 space-y-0">
																			<FormControl>
																				<Checkbox
																					checked={field.value}
																					onCheckedChange={field.onChange}
																				/>
																			</FormControl>

																			<FormLabel>{location.city}</FormLabel>
																		</FormItem>
																	</TooltipTrigger>
																	<TooltipContent side="left">
																		<p>
																			{field.value ? "Inactive" : "Active"} for
																			this city
																		</p>
																	</TooltipContent>
																</Tooltip>
															</TooltipProvider>
														)}
													/>
												</div>
											</Fragment>
										))}
									</div>
								</ScrollArea>
							</div>
						)}
					</div>
				)}

				<ResponsiveDialogButton {...buttonProps} className="col-span-full" />
			</form>
		</Form>
	);
}

// for delete service alert dialog
export interface DeleteServiceAlertDialogProps
	extends ComponentProps<"dialog"> {
	isOpen: boolean;
	onOpenChange?: (open: boolean) => void;
	selectedService: Service | null;
}

export function DeleteServiceAlertDialog({
	isOpen,
	onOpenChange,
	selectedService,
}: DeleteServiceAlertDialogProps) {
	const { props: globalProps } = usePage<GlobalPageProps>();
	const [isLoading, setIsLoading] = useState(false);
	const handler = () => {
		console.log(`Deleting the Service with name: ${selectedService?.name}...`);
		const routeURL = `${globalProps.adminPortal.router.adminPortal.serviceManagement.index}/${selectedService?.id}`;
		router.delete(routeURL, {
			preserveScroll: true,
			preserveState: true,
			onStart: () => {
				setIsLoading(true);
			},
			onFinish: () => {
				setIsLoading(false);
			},
		});
		console.log(
			`Successfully to deleted the Service with name:  ${selectedService?.name}...`,
		);
	};

	return (
		<AlertDialog open={isOpen} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
					<AlertDialogDescription>
						This action is irreversible. Deleting actions will permanently
						remove data from our servers and cannot be recovered.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<Button
						variant="destructive"
						disabled={isLoading}
						onClick={(event) => {
							event.preventDefault();
							handler();
						}}
					>
						{isLoading ? (
							<>
								<LoaderIcon className="animate-spin" />
								<span>Deleting...</span>
							</>
						) : (
							<span>Delete</span>
						)}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

// for activate/inactive the service
export interface ActivateServiceDialog extends ComponentProps<"form"> {
	selectedService: Service | null;
	forceMode?: ResponsiveDialogMode;
	handleOpenChange?: (value: boolean) => void;
}

export function ActivateServiceDialog({
	className,
	selectedService,
}: ActivateServiceDialog) {
	const { props: globalProps } = usePage<GlobalPageProps>();
	const [isLoading, setIsLoading] = useState(false);
	const formSchema = z.object({
		name: z.string(),
		code: z.string(),
		active: z.boolean(),
	});
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: selectedService?.name || "",
			code: selectedService?.code || "",
			active: !!selectedService?.active,
		},
		mode: "onBlur",
	});
	function onSubmit(values: z.infer<typeof formSchema>) {
		console.log(
			`Update the status of the service with service name: ${values.name}...`,
		);
		const routeURL =
			globalProps.adminPortal.router.adminPortal.serviceManagement.updateStatus;
		router.put(
			routeURL,
			deepTransformKeysToSnakeCase({ id: selectedService?.id }),
			{
				preserveScroll: true,
				preserveState: true,
				onStart: () => {
					setIsLoading(true);
				},
				onFinish: () => {
					setIsLoading(false);
				},
			},
		);
		console.log(
			`Successfully to update the status of the service with service name: ${values.name}...`,
		);
	}

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className={cn("grid gap-4", className)}
			>
				<FormField
					control={form.control}
					name="name"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Name</FormLabel>
							<FormControl>
								<Input
									{...field}
									readOnly
									type="text"
									placeholder="Enter the service name..."
								/>
							</FormControl>
							<FormDescription>
								This service is currently{" "}
								<b>{selectedService?.active ? "active" : "inactive"}</b>.
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>

				<div className="flex w-full">
					<Button
						type="submit"
						variant={selectedService?.active ? "destructive" : "default"}
						className="w-full"
						disabled={isLoading}
					>
						{isLoading ? (
							<>
								<LoaderIcon className="animate-spin" />
								<span>Please wait...</span>
							</>
						) : (
							<span>{selectedService?.active ? "Inactive" : "Activate"}</span>
						)}
					</Button>
				</div>
			</form>
		</Form>
	);
}
