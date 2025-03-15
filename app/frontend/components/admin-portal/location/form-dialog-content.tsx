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
import { Skeleton } from "@/components/ui/skeleton";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import { cn } from "@/lib/utils";
import type { LocationGlobalPageProps } from "@/pages/AdminPortal/Location/Index";
import type { Location, StateID } from "@/types/admin-portal/location";
import type { GlobalPageProps, ResponsiveDialogMode } from "@/types/globals";
import { zodResolver } from "@hookform/resolvers/zod";
import { Deferred, router, usePage } from "@inertiajs/react";
import { Check, ChevronsUpDown, LoaderIcon, Plus, X } from "lucide-react";
import { type ComponentProps, useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

const FORM_SCHEMA = z.object({
	locations: z
		.array(
			z.object({
				id: z.union([z.string(), z.number()]).optional(),
				country: z.string().min(3, { message: "Country is required" }),
				countryCode: z
					.string()
					.min(2, { message: "Country code is required" })
					.max(2, {
						message: "Country code follows the rules of ISO 1366-1 alpha-2",
					}),
				state: z.string().min(3, { message: "State is required" }),
				city: z.string().min(3, { message: "City is required" }),
			}),
		)
		.nonempty("At least input one Location"),
});

const INIT_LOCATION_DATA = {
	country: "INDONESIA",
	countryCode: "ID",
	state: "",
	city: "",
};

export interface FormUpsertLocationProps extends ComponentProps<"form"> {
	selectedLocations: Location[] | null;
	forceMode?: ResponsiveDialogMode;
	handleOpenChange?: (value: boolean) => void;
}

export function FormUpsertLocation({
	className,
	selectedLocations,
	forceMode,
}: FormUpsertLocationProps) {
	const { props: globalProps } = usePage<LocationGlobalPageProps>();
	const { t: tl } = useTranslation("translation", {
		keyPrefix: "locations.modal",
	});
	const mode = useMemo(
		() => (selectedLocations?.length ? "edit" : "add"),
		[selectedLocations],
	);
	const [isLoading, setIsLoading] = useState(false);

	// get states and cities data
	const states = useMemo<StateID[]>(
		() => globalProps.optionsData?.provinces || [],
		[globalProps.optionsData?.provinces],
	);
	// ? when we get the cities data?
	// for edit mode, will be fetch while click select city button
	// for add mode, will be fetch while state/province data selected
	const [cities, setCities] = useState<StateID[]>(
		globalProps.optionsData?.cities || [],
	);

	// form states data
	const buttonProps = useMemo<ResponsiveDialogButton>(() => {
		return { isLoading, forceMode };
	}, [isLoading, forceMode]);

	const form = useForm<z.infer<typeof FORM_SCHEMA>>({
		resolver: zodResolver(FORM_SCHEMA),
		defaultValues: {
			locations:
				mode === "edit" && selectedLocations?.length
					? selectedLocations
					: [INIT_LOCATION_DATA],
		},
		mode: "onBlur",
	});
	const locationsForm = useFieldArray({
		control: form.control,
		name: "locations",
		keyName: "uuid",
	});
	function onSubmit(values: z.infer<typeof FORM_SCHEMA>) {
		// for create location details
		if (mode === "add") {
			console.log("Submitting form to create the locations...");

			router.post(
				globalProps.adminPortal.router.adminPortal.locationManagement
					.createBulk,
				deepTransformKeysToSnakeCase({
					locations: values.locations,
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

			console.log("Finished process to create the locations...");
			return;
		}

		// for edit locations
		console.log("Submitting form to update the location details...");
		router.put(
			globalProps.adminPortal.router.adminPortal.locationManagement.updateBulk,
			deepTransformKeysToSnakeCase({
				locations: values.locations,
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
		console.log("Finished process to update the locations details...");
	}

	// side-effect for server validation
	useEffect(() => {
		if (!globalProps?.errors) return;

		// loop through the errors locations
		if (globalProps?.errors?.locations) {
			for (const errorObj of globalProps.errors.locations) {
				// get unique identifier
				const index = errorObj.index;

				for (const [field, messages] of Object.entries(errorObj.messages)) {
					const key = `locations.${index}.${field}` as const;

					// @ts-ignore
					form.setError(key, {
						type: "custom",
						message: (messages as string[]).join(", "),
					});
				}
			}
		}
	}, [globalProps.errors, form.setError]);

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className={cn("grid gap-4 items-start", className)}
			>
				<div className="grid gap-8">
					{locationsForm.fields.map((locationField, fieldIndex) => {
						const currentNumber = fieldIndex + 1;

						return (
							<div key={locationField.uuid} className="grid gap-4">
								{currentNumber !== 1 && locationsForm.fields.length > 1 && (
									<div className="flex justify-center align-center !my-2">
										<hr className="w-6/12 mt-2 bg-muted-foreground/25" />
										<Button
											type="button"
											variant="ghost"
											className="flex items-center gap-0.5 px-2 mx-4 text-xs font-semibold text-center transition-all border rounded-lg cursor-pointer border-primary text-nowrap text-primary hover:border-none hover:scale-110 justify-center !h-5"
											onClick={() => {
												locationsForm.remove(fieldIndex);
											}}
										>
											<X className="text-inherit size-4" />
											{`Location ${currentNumber}`}
										</Button>
										<hr className="w-6/12 mt-2 bg-muted-foreground/25" />
									</div>
								)}

								<FormField
									control={form.control}
									name={`locations.${fieldIndex}.country`}
									render={({ field }) => (
										<FormItem>
											<FormLabel>{tl("fields.country.label")}</FormLabel>
											<FormControl>
												<InputExtended
													{...field}
													readOnly
													type="text"
													placeholder={`${tl("fields.country.placeholder")}...`}
												>
													<InputExtended.Group>
														<InputExtended.RightIcon>
															<span>{locationField.countryCode}</span>
														</InputExtended.RightIcon>
													</InputExtended.Group>
												</InputExtended>
											</FormControl>

											<FormMessage />
										</FormItem>
									)}
								/>

								<Deferred
									data={["optionsData"]}
									fallback={
										<div className="flex flex-col self-end gap-3">
											<Skeleton className="w-10 h-4 rounded-md" />
											<Skeleton className="relative w-full rounded-md h-9" />
										</div>
									}
								>
									<FormField
										control={form.control}
										name={`locations.${fieldIndex}.state`}
										render={({ field }) => (
											<FormItem className="grid !my-1">
												<FormLabel className="h-6">
													{tl("fields.state.label")}
												</FormLabel>
												<Popover modal>
													<PopoverTrigger asChild>
														<FormControl>
															<Button
																variant="outline"
																className={cn(
																	"w-fit justify-between text-muted-foreground font-normal !mt-0 px-3",
																	!field.value && "text-muted-foreground",
																)}
															>
																{field.value
																	? states.find(
																			(state) => state.name === field.value,
																		)?.name || field.value
																	: `${tl("fields.state.placeholder")}...`}
																<ChevronsUpDown className="opacity-50" />
															</Button>
														</FormControl>
													</PopoverTrigger>
													<PopoverContent
														side="bottom"
														align="start"
														className="w-[200px] p-0"
													>
														<Command>
															<CommandInput
																placeholder={`${tl("fields.state.search")}...`}
															/>
															<CommandList>
																<CommandEmpty>
																	{tl("fields.state.empty_search")}
																</CommandEmpty>
																<CommandGroup>
																	{states.map((state) => (
																		<CommandItem
																			value={state.name}
																			key={state.name}
																			onSelect={async () => {
																				// set the state data selected
																				form.setValue(
																					`locations.${fieldIndex}.state`,
																					state.name,
																				);

																				// get the cities data
																				const cities =
																					globalProps.optionsData?.cities.filter(
																						(city) =>
																							city.code.includes(state.code),
																					) || [];
																				setCities(cities || []);

																				// reset the selected city
																				form.setValue(
																					`locations.${fieldIndex}.city`,
																					"",
																				);
																			}}
																		>
																			{state.name}
																			<Check
																				className={cn(
																					"ml-auto",
																					state.name === field.value
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

								<Deferred
									data={["optionsData"]}
									fallback={
										<div className="flex flex-col self-end gap-3">
											<Skeleton className="w-10 h-4 rounded-md" />
											<Skeleton className="relative w-full rounded-md h-9" />
										</div>
									}
								>
									<FormField
										control={form.control}
										name={`locations.${fieldIndex}.city`}
										render={({ field }) => (
											<FormItem className="grid !my-1">
												<FormLabel className="h-6">
													{tl("fields.city.label")}
												</FormLabel>
												<Popover modal>
													<PopoverTrigger asChild>
														<FormControl>
															<Button
																disabled={
																	!form?.getValues(
																		`locations.${fieldIndex}.state`,
																	)
																}
																variant="outline"
																className={cn(
																	"w-fit justify-between text-muted-foreground font-normal !mt-0 px-3",
																	!field.value && "text-muted-foreground",
																)}
																onClick={async () => {
																	if (mode === "edit") {
																		const stateName = form?.getValues(
																			`locations.${fieldIndex}.state`,
																		);
																		const stateCode = states.find(
																			(state) => state.name === stateName,
																		)?.code;

																		if (stateCode) {
																			// get the cities data
																			const cities =
																				globalProps.optionsData?.cities.filter(
																					(city) =>
																						city.code.includes(stateCode),
																				) || [];
																			setCities(cities || []);
																		}
																	}
																}}
															>
																{field.value
																	? globalProps.optionsData?.cities.find(
																			(city) => city.name === field.value,
																		)?.name || field.value
																	: `${tl("fields.city.placeholder")}...`}
																<ChevronsUpDown className="opacity-50" />
															</Button>
														</FormControl>
													</PopoverTrigger>
													<PopoverContent
														side="bottom"
														align="start"
														className="w-[200px] p-0"
													>
														<Command>
															<CommandInput
																placeholder={`${tl("fields.city.search")}...`}
															/>
															<CommandList>
																<CommandEmpty>
																	{tl("fields.city.empty_search")}
																</CommandEmpty>
																<CommandGroup>
																	{cities.map((city) => (
																		<CommandItem
																			value={city.name}
																			key={city.name}
																			onSelect={() => {
																				form.setValue(
																					`locations.${fieldIndex}.city`,
																					city.name,
																				);
																				form.trigger();
																			}}
																		>
																			{city.name}
																			<Check
																				className={cn(
																					"ml-auto",
																					city.name === field.value
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
							</div>
						);
					})}
				</div>

				{mode === "add" && (
					<Button
						type="button"
						className="mt-6"
						disabled={!form.formState.isValid}
						onClick={() => {
							locationsForm.append(INIT_LOCATION_DATA);
						}}
					>
						<Plus />
						{tl("buttons.add_more")}
					</Button>
				)}

				<ResponsiveDialogButton {...buttonProps} className="col-span-full" />
			</form>
		</Form>
	);
}

// for delete location use the alert dialog
export interface DeleteLocationAlertProps extends ComponentProps<"dialog"> {
	isOpen: boolean;
	onOpenChange?: (open: boolean) => void;
	selectedLocations: Location[];
}

export function DeleteLocationAlert({
	isOpen,
	onOpenChange,
	selectedLocations,
}: DeleteLocationAlertProps) {
	const { props: globalProps } = usePage<GlobalPageProps>();
	const { t: tl } = useTranslation("translation", { keyPrefix: "locations" });
	const [isLoading, setIsLoading] = useState(false);
	const form = useForm<z.infer<typeof FORM_SCHEMA>>({
		resolver: zodResolver(FORM_SCHEMA),
		defaultValues: {
			locations: selectedLocations,
		},
		mode: "onSubmit",
	});
	const onSubmit = (values: z.infer<typeof FORM_SCHEMA>) => {
		console.log("Deleting the locations...");

		const routeURL =
			globalProps.adminPortal.router.adminPortal.locationManagement.deleteBulk;
		router.delete(routeURL, {
			preserveScroll: true,
			preserveState: true,
			data: deepTransformKeysToSnakeCase({
				locations: values.locations,
			}),
			onStart: () => {
				setIsLoading(true);
			},
			onFinish: () => {
				setIsLoading(false);
			},
		});

		console.log("Finished process to delete the locations...");
	};

	return (
		<AlertDialog open={isOpen} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{tl("modal.delete.title")}</AlertDialogTitle>
					<AlertDialogDescription>
						{tl("modal.delete.description")}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)}>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<Button type="submit" variant="destructive" disabled={isLoading}>
								{isLoading ? (
									<>
										<LoaderIcon className="animate-spin" />
										<span>{`${tl("modal.delete.loading")}...`}</span>
									</>
								) : (
									<span>{tl("button.delete")}</span>
								)}
							</Button>
						</AlertDialogFooter>
					</form>
				</Form>
			</AlertDialogContent>
		</AlertDialog>
	);
}
