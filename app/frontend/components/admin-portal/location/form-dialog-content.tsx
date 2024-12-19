import { ResponsiveDialogButton } from "@/components/shared/responsive-dialog";
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
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import { getCitiesID, getStatesID } from "@/lib/locations";
import { cn } from "@/lib/utils";
import type { CityID, Location, StateID } from "@/types/admin-portal/location";
import type { GlobalPageProps, ResponsiveDialogMode } from "@/types/globals";
import { zodResolver } from "@hookform/resolvers/zod";
import { router, usePage } from "@inertiajs/react";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { type ComponentProps, useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

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
	const { props: globalProps } = usePage<
		GlobalPageProps & {
			errors: {
				locations: {
					index: number;
					messages: Record<keyof Location, string[]>;
				}[];
			};
		}
	>();
	const mode = useMemo(
		() => (selectedLocations?.length ? "edit" : "add"),
		[selectedLocations],
	);
	const [isLoading, setIsLoading] = useState(false);

	// get states and cities data
	const [states, setStates] = useState<StateID[]>([]);
	// ? when we get the cities data?
	// for edit mode, will be fetch while click select city button
	// for add mode, will be fetch while state/province data selected
	const [cities, setCities] = useState<CityID[]>([]);
	useEffect(() => {
		const getStatesIDData = async () => {
			const data = await getStatesID();
			setStates(data);
		};

		getStatesIDData();
	}, []);

	// form states data
	const buttonProps = useMemo<ResponsiveDialogButton>(() => {
		return { isLoading, forceMode };
	}, [isLoading, forceMode]);
	const formSchema = z.object({
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
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
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
	function onSubmit(values: z.infer<typeof formSchema>) {
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
			console.log("Locations successfully created...");
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
		console.log("Locations successfully updated...");
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
															<span>{locationField.countryCode}</span>
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
									name={`locations.${fieldIndex}.state`}
									render={({ field }) => (
										<FormItem className="grid !my-1">
											<FormLabel className="h-6">State/Province</FormLabel>
											<Popover modal>
												<PopoverTrigger asChild>
													<FormControl>
														<Button
															variant="outline"
															className={cn(
																"w-[200px] justify-between text-muted-foreground font-normal !mt-0 px-3",
																!field.value && "text-muted-foreground",
															)}
														>
															{field.value
																? states.find(
																		(state) => state.nama === field.value,
																	)?.nama || field.value
																: "Select state/province"}
															<ChevronsUpDown className="opacity-50" />
														</Button>
													</FormControl>
												</PopoverTrigger>
												<PopoverContent className="w-[200px] p-0">
													<Command>
														<CommandInput placeholder="Search state/province..." />
														<CommandList>
															<CommandEmpty>
																No state or province found.
															</CommandEmpty>
															<CommandGroup>
																{states.map((state) => (
																	<CommandItem
																		value={state.nama}
																		key={state.nama}
																		onSelect={async () => {
																			// set the state data selected
																			form.setValue(
																				`locations.${fieldIndex}.state`,
																				state.nama,
																			);

																			if (mode === "add") {
																				// get the cities data
																				const cities = await getCitiesID({
																					stateId: state.kode,
																				});
																				setCities(cities || []);
																			}
																		}}
																	>
																		{state.nama}
																		<Check
																			className={cn(
																				"ml-auto",
																				state.nama === field.value
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

								<FormField
									control={form.control}
									name={`locations.${fieldIndex}.city`}
									render={({ field }) => (
										<FormItem className="grid !my-1">
											<FormLabel className="h-6">City</FormLabel>
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
																"w-[200px] justify-between text-muted-foreground font-normal !mt-0 px-3",
																!field.value && "text-muted-foreground",
															)}
															onClick={async () => {
																if (mode === "edit") {
																	const stateName = form?.getValues(
																		`locations.${fieldIndex}.state`,
																	);
																	const stateCode = states.find(
																		(state) => state.nama === stateName,
																	)?.kode;

																	if (stateCode) {
																		// get the cities data
																		const cities = await getCitiesID({
																			stateId: stateCode,
																		});
																		setCities(cities || []);
																	}
																}
															}}
														>
															{field.value
																? cities.find(
																		(city) => city.nama === field.value,
																	)?.nama || field.value
																: "Select city"}
															<ChevronsUpDown className="opacity-50" />
														</Button>
													</FormControl>
												</PopoverTrigger>
												<PopoverContent className="w-[200px] p-0">
													<Command>
														<CommandInput placeholder="Search city..." />
														<CommandList>
															<CommandEmpty>No city found.</CommandEmpty>
															<CommandGroup>
																{cities.map((city) => (
																	<CommandItem
																		value={city.nama}
																		key={city.nama}
																		onSelect={() => {
																			form.setValue(
																				`locations.${fieldIndex}.city`,
																				city.nama,
																			);
																			form.trigger();
																		}}
																	>
																		{city.nama}
																		<Check
																			className={cn(
																				"ml-auto",
																				city.nama === field.value
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
						Add more location
					</Button>
				)}

				<ResponsiveDialogButton {...buttonProps} className="col-span-full" />
			</form>
		</Form>
	);
}
