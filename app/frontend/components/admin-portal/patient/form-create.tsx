import { zodResolver } from "@hookform/resolvers/zod";
import { router, usePage } from "@inertiajs/react";
import { LoaderIcon } from "lucide-react";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Drawer as DrawerPrimitive } from "vaul";
import { z } from "zod";
import HereMap, { type HereMapProps } from "@/components/shared/here-map";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
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
import { Textarea } from "@/components/ui/textarea";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import { MAP_DEFAULT_COORDINATE } from "@/lib/here-maps";
import { cn, populateQueryParams } from "@/lib/utils";
import type { PatientIndexGlobalPageProps } from "@/pages/AdminPortal/Patient/Index";

const ADDRESS_FORM_SCHEMA = z.object({
	address: z.string().min(1, "Address is required"),
	postalCode: z.string().optional(),
	coordinate: z.string().optional(),
	locationId: z.coerce.number().min(1, "Location is required"),
	notes: z.string().optional(),
});
type AddressFormSchema = z.infer<typeof ADDRESS_FORM_SCHEMA>;

export interface AddAddressSectionProps {
	patient: NonNullable<PatientIndexGlobalPageProps["selectedPatient"]>;
	onSuccess?: () => void;
}

const AddAddressSection = memo(function Component({
	patient,
	onSuccess,
}: AddAddressSectionProps) {
	const { t: td } = useTranslation("translation", { keyPrefix: "components" });
	const { props: globalProps, url: pageURL } =
		usePage<PatientIndexGlobalPageProps>();

	// ===== STATE MANAGEMENT =====
	const [isOpen, setIsOpen] = useState(false);
	const [isAddressFormLoading, setIsAddressFormLoading] = useState(false);
	const [locationPopoverOpen, setLocationPopoverOpen] = useState(false);
	const hereMapRef = useRef<any>(null);
	const [latLngInputMethod, setLatLngInputMethod] = useState<
		"manual" | "automatic"
	>("manual");
	const [isGeocoding, setIsGeocoding] = useState(false);
	const [geocodingError, setGeocodingError] = useState<string | null>(null);

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

	// ===== API HANDLERS =====
	const handleAddressSubmit = async (data: AddressFormSchema) => {
		setIsAddressFormLoading(true);
		try {
			console.log("Creating new address:", data);

			// Generate the submit URL
			const baseURL =
				globalProps.adminPortal.router.adminPortal.patientManagement.index;
			const submitURL = `${baseURL}/${patient.id}`;
			const { queryParams } = populateQueryParams(pageURL);
			const { fullUrl } = populateQueryParams(submitURL, queryParams);

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

			// Define the payload for creating new address
			const payload = deepTransformKeysToSnakeCase({
				patient: {
					profile: {
						id: patient.id,
						name: patient.name,
						dateOfBirth: patient.dateOfBirth,
						gender: patient.gender,
					},
					new_patient_address: {
						address: data.address,
						postalCode: data.postalCode,
						latitude,
						longitude,
						locationId: data.locationId,
						notes: data.notes,
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
					// Close the drawer
					setIsOpen(false);
					// Reset form
					addressForm.reset();
					// Call success callback
					onSuccess?.();
					// Show success toast
					toast.success("Address added successfully");
				},
				onError: (errors: any) => {
					console.error("Failed to add address:", errors);
					toast.error("Failed to add address");
				},
				onFinish: () => {
					// Always close drawer when request finishes
					setIsOpen(false);
				},
			} as any);

			console.log("Address creation submitted...");
		} catch (error) {
			console.error("Failed to add address:", error);
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

	// ===== GEOCODING =====
	const handleGeocoding = useCallback(async () => {
		const address = addressForm.getValues("address");
		const locationId = addressForm.getValues("locationId");

		// Clear any previous errors
		setGeocodingError(null);

		if (!address || address.trim() === "") {
			console.error("Address is required for geocoding");
			setGeocodingError("Please enter an address before geocoding");
			return;
		}

		if (!locationId) {
			console.error("Location is required for geocoding");
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
					const currentAddress = addressForm.getValues("address");

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
		<DrawerPrimitive.NestedRoot
			open={isOpen}
			onOpenChange={setIsOpen}
			setBackgroundColorOnScale
		>
			<DrawerContent
				onInteractOutside={(event) => {
					event.preventDefault();
				}}
				className="flex flex-col rounded-t-[10px] mt-24 max-h-[90%] fixed bottom-0 left-0 right-0 outline-none bg-card"
			>
				<DrawerHeader className="w-full md:max-w-5xl mx-auto">
					<DrawerTitle>Add New Address</DrawerTitle>
					<DrawerDescription>
						Add a new address for this patient.
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
																	<CommandEmpty>No region found.</CommandEmpty>

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
																		readOnly={latLngInputMethod === "automatic"}
																		{...(latLngInputMethod === "automatic" && {
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
										Add Address
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
	);
});

export default AddAddressSection;
