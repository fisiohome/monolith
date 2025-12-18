import { zodResolver } from "@hookform/resolvers/zod";
import { Head, router, usePage } from "@inertiajs/react";
import { Dot, LoaderIcon, Plus } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import {
	FormPageContainer,
	FormPageHeader,
} from "@/components/admin-portal/shared/page-layout";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
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
import { CommandGroup, CommandSeparator } from "@/components/ui/command";
import { Input as InputExtended } from "@/components/ui/extended/input";
import {
	Form,
	FormControl,
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
import { Textarea } from "@/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import { groupLocationsByCountry } from "@/lib/locations";
import { goBackHandler } from "@/lib/utils";
import type { Location } from "@/types/admin-portal/location";
import type { Service } from "@/types/admin-portal/service";
import type { GlobalPageProps } from "@/types/globals";

export interface EditPageProps {
	service: Service;
	locations: Location[];
	packages: [];
}

export default function Edit({ service, locations }: EditPageProps) {
	const { props: globalProps } = usePage<
		GlobalPageProps & {
			errors: Record<keyof Service, string[]> & { fullMessages: string[] };
		}
	>();
	const groupedLocations = useMemo(
		() => groupLocationsByCountry(locations),
		[locations],
	);

	// form state management
	const [isLoading, setIsLoading] = useState({
		submit: false,
	});
	const formHeader = useMemo(() => {
		const title = "Update Brand";
		const description = "Update brands that are available on the system.";

		return { title, description };
	}, []);
	const formSchema = z.object({
		name: z.string().min(3, { message: "Brand name is required" }),
		description: z.string(),
		code: z
			.string()
			.min(1, { message: "Brand code is required" })
			.max(3, { message: "Maximum Brand code is 3 characters" }),
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
		packages: z.array(
			z.object({
				id: z.union([z.string(), z.number()]).optional(),
				active: z.boolean(),
				name: z.string().min(3, { message: "Package name is required" }),
				currency: z.string().min(3, { message: "Currency is required" }),
				numberOfVisit: z.coerce
					.number({ message: "Number of visit must be numerical value" })
					.min(1, { message: "Number of visit must be greater than 0" })
					.nonnegative(),
				pricePerVisit: z.coerce
					.number({ message: "Price per visit must be numerical value" })
					.nonnegative(),
				discount: z.coerce
					.number({ message: "Discount must be numerical value" })
					.nonnegative()
					.optional(),
				feePerVisit: z.coerce
					.number({ message: "Fee per visit must be numerical value" })
					.nonnegative(),
			}),
		),
	});
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: service?.name?.replaceAll("_", " ") || "",
			description: service?.description || "",
			code: service?.code || "",
			active: !!service?.active,
			locations:
				service?.locations?.map(({ id, city, active }) => ({
					id,
					city,
					active,
				})) || [],
			cities: service?.locations?.map((location) => location.city) || [],
			packages:
				service?.packages?.list?.map(
					({
						id,
						active,
						name,
						currency,
						numberOfVisit,
						pricePerVisit,
						feePerVisit,
						discount,
					}) => ({
						id,
						active,
						name,
						currency,
						numberOfVisit,
						pricePerVisit: Number(pricePerVisit),
						feePerVisit: Number(feePerVisit),
						discount: Number(discount),
					}),
				) || [],
		},
		mode: "onBlur",
	});
	function onSubmit(values: z.infer<typeof formSchema>) {
		const baseURL =
			globalProps.adminPortal.router.adminPortal.serviceManagement.index;
		const routeURL = `${baseURL}/${service?.id}`;

		console.log(
			`Submitting form to update the brand with name ${values.name}...`,
		);
		router.put(
			routeURL,
			deepTransformKeysToSnakeCase({
				service: {
					name: values.name.toUpperCase(),
					description: values.description,
					code: values.code.toUpperCase(),
					active: values.active,
					locations: values?.locations?.length ? values.locations : null,
					packages: values?.packages?.length ? values.packages : null,
				},
			}),
			{
				preserveScroll: true,
				preserveState: true,
				onStart: () => {
					setIsLoading((prev) => ({ ...prev, submit: true }));
				},
				onFinish: () => {
					setIsLoading((prev) => ({ ...prev, submit: false }));
				},
			},
		);
		console.log(`Brand with name ${values.name} successfully updated...`);
	}

	// form type field array for locations
	const locationsForm = useFieldArray({
		control: form.control,
		name: "locations",
	});
	const isActiveAllCities = useMemo(
		() => !!locationsForm?.fields?.every((location) => location.active),
		[locationsForm.fields],
	);

	// form type field array for packages
	const [accordionActive, setAccordionActive] = useState("");
	const packagesForm = useFieldArray({
		control: form.control,
		name: "packages",
		rules: {
			required: true,
			minLength: 1,
		},
	});
	const watchPackages = useWatch({ control: form.control, name: "packages" });

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

	// * side-effect for server validation
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
		<>
			<Head title={formHeader.title} />

			<FormPageContainer>
				<section className="flex flex-col justify-center gap-4 mx-auto w-12/12 lg:w-8/12 xl:w-4/12">
					<FormPageHeader
						title={formHeader.title}
						description={formHeader.description}
					/>

					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(onSubmit)}
							className="grid items-start grid-cols-1 gap-4"
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
													placeholder="Enter the brand name..."
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
										<FormItem>
											<FormLabel>Code</FormLabel>
											<FormControl>
												<Input
													{...field}
													type="text"
													placeholder="Enter the brand code..."
													className="w-[35%]"
												/>
											</FormControl>

											<FormMessage />
										</FormItem>
									)}
								/>

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
											<FormItem>
												<FormLabel>Status</FormLabel>
												<Select
													onValueChange={(value) => {
														field.onChange(value === "active");
													}}
													defaultValue={field.value ? "active" : "inactive"}
												>
													<FormControl>
														<SelectTrigger className="w-[50%]">
															<SelectValue placeholder="Select a brand status" />
														</SelectTrigger>
													</FormControl>
													<SelectContent>
														{statuses.map((status) => (
															<SelectItem
																key={status.value}
																value={status.value}
															>
																<span className="flex items-baseline gap-2">
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
														))}
													</SelectContent>
												</Select>
												<FormMessage />
											</FormItem>
										);
									}}
								/>

								<FormField
									control={form.control}
									name="description"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												Description{" "}
												<span className="text-sm italic font-light">
													- (optional)
												</span>
											</FormLabel>
											<FormControl>
												<Textarea
													placeholder="Enter the brand description..."
													// className="resize-none"
													{...field}
												/>
											</FormControl>

											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<div className="grid gap-4">
								<Separator className="mt-4" />

								<div className="space-y-1.5">
									<p className="font-semibold leading-none tracking-tighter">
										Setup Packages
									</p>

									<p className="text-sm text-muted-foreground">
										Brands can offer multiple packages.
									</p>
								</div>

								{packagesForm?.fields?.length ? (
									<Accordion
										type="single"
										collapsible
										className="w-full"
										value={accordionActive}
										onValueChange={(value) => {
											setAccordionActive(value);
										}}
									>
										{packagesForm.fields.map((packageField, fieldIndex) => (
											<AccordionItem
												key={packageField.name}
												value={`${packageField.name}-${fieldIndex}`}
											>
												<AccordionTrigger>
													<div className="flex items-center space-x-1.5">
														<div className="flex items-center justify-center border rounded-full size-5 bg-primary text-primary-foreground">
															<span className="text-xs leading-none">
																{Number(fieldIndex) + 1}
															</span>
														</div>
														<span>{packageField.name}</span>
													</div>
												</AccordionTrigger>

												<AccordionContent>
													<div className="grid w-full grid-cols-1 gap-4 p-2">
														<div className="flex items-center justify-between pb-2 border-b w-fullcol-span-full">
															<FormField
																control={form.control}
																name={`packages.${fieldIndex}.active`}
																render={({ field }) => (
																	<FormItem className="flex flex-row items-center space-x-2 space-y-0">
																		<FormControl>
																			<Checkbox
																				checked={field.value}
																				onCheckedChange={(checked) => {
																					field.onChange(checked);
																				}}
																			/>
																		</FormControl>
																		<div className="space-y-1 leading-none">
																			<FormLabel className="text-xs">
																				Set as active package
																			</FormLabel>
																		</div>
																	</FormItem>
																)}
															/>

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
																				packagesForm?.remove(fieldIndex);
																				setAccordionActive(
																					watchPackages.at(-2)?.name || "",
																				);
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
															name={`packages.${fieldIndex}.name`}
															render={({ field }) => (
																<FormItem>
																	<FormLabel>Name</FormLabel>
																	<FormControl>
																		<Input
																			{...field}
																			type="text"
																			placeholder="Enter the name..."
																		/>
																	</FormControl>

																	<FormMessage />
																</FormItem>
															)}
														/>

														<FormField
															control={form.control}
															name={`packages.${fieldIndex}.currency`}
															render={({ field }) => (
																<FormItem>
																	<FormLabel>Currency</FormLabel>
																	<FormControl>
																		<Input
																			{...field}
																			type="text"
																			placeholder="Enter the currency..."
																			autoComplete="transaction-currency"
																			className="w-[35%] md:w-[25%] lg:w-[35%] xl:w-[35%]"
																		/>
																	</FormControl>

																	<FormMessage />
																</FormItem>
															)}
														/>

														<FormField
															control={form.control}
															name={`packages.${fieldIndex}.numberOfVisit`}
															render={({ field }) => (
																<FormItem>
																	<FormLabel>Number of Visit</FormLabel>
																	<FormControl>
																		<Input
																			{...field}
																			type="number"
																			min={0}
																			step="0.5"
																			value={field?.value || ""}
																			placeholder="Enter the number of visit..."
																			className="w-[35%] md:w-[25%] lg:w-[35%] xl:w-[35%]"
																		/>
																	</FormControl>

																	<FormMessage />
																</FormItem>
															)}
														/>

														<FormField
															control={form.control}
															name={`packages.${fieldIndex}.pricePerVisit`}
															render={({ field }) => (
																<FormItem>
																	<FormLabel>Price per Visit</FormLabel>
																	<FormControl>
																		<InputExtended
																			{...field}
																			type="number"
																			min={0}
																			step="0.5"
																			autoComplete="transaction-amount"
																			placeholder="Enter the price per visit..."
																		>
																			<InputExtended.Group>
																				<InputExtended.RightIcon>
																					<span>{packageField.currency}</span>
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
															name={`packages.${fieldIndex}.discount`}
															render={({ field }) => (
																<FormItem>
																	<FormLabel>Discount</FormLabel>
																	<FormControl>
																		<InputExtended
																			{...field}
																			type="number"
																			min={0}
																			step="0.5"
																			autoComplete="transaction-amount"
																			placeholder="Enter the discount..."
																		>
																			<InputExtended.Group>
																				<InputExtended.RightIcon>
																					<span>{packageField.currency}</span>
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
															name={`packages.${fieldIndex}.feePerVisit`}
															render={({ field }) => (
																<FormItem>
																	<FormLabel>Fee per Visit</FormLabel>
																	<FormControl>
																		<InputExtended
																			{...field}
																			type="number"
																			min={0}
																			step="0.5"
																			autoComplete="transaction-amount"
																			placeholder="Enter the fee per visit..."
																		>
																			<InputExtended.Group>
																				<InputExtended.RightIcon>
																					<span>{packageField.currency}</span>
																				</InputExtended.RightIcon>
																			</InputExtended.Group>
																		</InputExtended>
																	</FormControl>

																	<FormMessage />
																</FormItem>
															)}
														/>
													</div>
												</AccordionContent>
											</AccordionItem>
										))}
									</Accordion>
								) : (
									<p className="w-8/12 mx-auto text-sm font-light text-center col-span-full lg:w-7/12">
										There's no packages yet, click the add button to create
										data.
									</p>
								)}

								<Button
									size="sm"
									type="button"
									disabled={
										!!form.formState.errors?.packages &&
										!!packagesForm.fields?.length
									}
									onClick={() => {
										const name = "New Package";
										packagesForm?.append({
											name,
											currency: "",
											active: false,
											numberOfVisit: 1,
											pricePerVisit: 0,
											feePerVisit: 0,
											discount: 0,
										});
										form.trigger("packages");
										setAccordionActive(name);
									}}
								>
									<Plus />
									Add more package
								</Button>
							</div>

							<div className="grid gap-4">
								<Separator className="mt-4" />

								<div className="space-y-1.5">
									<p className="font-semibold leading-none tracking-tighter">
										Setup Locations Availability
									</p>

									<p className="text-sm text-muted-foreground">
										Brands can also be activated/inactivated to be available at
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
																		<CommandSeparator className="mt-2" />
																	</CommandGroup>
																))}
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
									<div className="flex flex-col gap-4 p-4 border rounded-md max-h-64 lg:max-h-52">
										<div className="flex flex-col gap-4 pb-2 border-b">
											<FormItem className="flex flex-row items-start mb-1 space-x-3 space-y-0">
												<FormControl>
													<Checkbox
														checked={isActiveAllCities}
														onCheckedChange={(value) => {
															const updatedLocations = locationsForm.fields.map(
																(location) => ({
																	...location,
																	active: !!value,
																}),
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
											<div className="grid gap-4 lg:gap-2">
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
																					{field.value ? "Inactive" : "Active"}{" "}
																					for this city
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

							<div className="!mt-10 lg:!mt-6 gap-4 lg:gap-2 w-full flex flex-col md:flex-row lg:col-span-full md:justify-between">
								<Button
									type="button"
									variant="outline"
									className="w-full lg:w-auto"
									onClick={goBackHandler}
								>
									Cancel
								</Button>

								<Button
									type="submit"
									disabled={isLoading.submit}
									className="order-first w-full md:order-last lg:w-auto"
								>
									{isLoading.submit ? (
										<>
											<LoaderIcon className="animate-spin" />
											<span>Updating...</span>
										</>
									) : (
										<span>Save</span>
									)}
								</Button>
							</div>
						</form>
					</Form>
				</section>
			</FormPageContainer>
		</>
	);
}
