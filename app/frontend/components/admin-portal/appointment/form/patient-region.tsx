import { PulsatingOutlineShadowButton } from "@/components/shared/button-pulsating";
import HereMap from "@/components/shared/here-map";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "@/components/ui/command";
import {
	FormControl,
	FormDescription,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
	useMapRegion,
	usePatientRegion,
} from "@/hooks/admin-portal/appointment/use-appointment-utils";
import {
	type AppointmentBookingSchema,
	DEFAULT_VALUES_LOCATION,
} from "@/lib/appointments/form";
import { IS_DEKSTOP_MEDIA_QUERY } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Deferred } from "@inertiajs/react";
import { useMediaQuery } from "@uidotdev/usehooks";
import {
	AlertCircle,
	Check,
	ChevronsUpDown,
	LoaderIcon,
	MapPin,
	X,
} from "lucide-react";
import { Fragment, useMemo } from "react";
import { useFormContext } from "react-hook-form";

export default function PatientRegionForm() {
	const {
		locationsOption,
		groupedLocationsOption,
		selectedLocation,
		coordinate,
		coordinateText,
		mapAddress,
		coordinateError,
		isLoading,
		onFocusLocationField,
		onSelectLocation,
	} = usePatientRegion();
	const {
		mapRef,
		isMapButtonsDisabled,
		coordinateInput,
		setCoordinateInput,
		onCalculateCoordinate,
		onClickGMaps,
		onResetCoordinate,
	} = useMapRegion({ selectedLocation, coordinate });
	const form = useFormContext<AppointmentBookingSchema>();
	const isDekstop = useMediaQuery(IS_DEKSTOP_MEDIA_QUERY);

	// * to check the coordinate state
	const coordinateSource = useMemo(() => {
		return [
			{
				value:
					"manual" satisfies AppointmentBookingSchema["formOptions"]["coordinateSource"],
				text: "Manual",
			},
			{
				value:
					"automatic" satisfies AppointmentBookingSchema["formOptions"]["coordinateSource"],
				text: "Automatic",
			},
		];
	}, []);

	return (
		<Fragment>
			<p className="mb-2 text-xs tracking-wider uppercase text-muted-foreground col-span-full">
				Visit Location
			</p>

			<Deferred
				data={["locations"]}
				fallback={
					<div className="flex flex-col self-end gap-3">
						<Skeleton className="w-10 h-4 rounded-md" />
						<Skeleton className="relative w-full rounded-md h-9" />
					</div>
				}
			>
				<FormField
					control={form.control}
					name="patientDetails.location.city"
					render={({ field }) => (
						<FormItem>
							<FormLabel className="text-nowrap">Region</FormLabel>
							<Popover>
								<PopoverTrigger asChild>
									<FormControl>
										<Button
											variant="outline"
											className={cn(
												"relative w-full flex justify-between font-normal bg-sidebar shadow-inner",
												!field.value && "text-muted-foreground",
											)}
											onFocus={() => onFocusLocationField()}
										>
											<p>
												{field.value
													? locationsOption?.find(
															(location) => location.city === field.value,
														)?.city
													: "Select region"}
											</p>
											{field.value ? (
												<button
													type="button"
													className="cursor-pointer"
													onClick={(event) => {
														event.preventDefault();
														event.stopPropagation();

														onSelectLocation(DEFAULT_VALUES_LOCATION);
													}}
												>
													<X className="opacity-50" />
												</button>
											) : (
												<ChevronsUpDown className="opacity-50" />
											)}
										</Button>
									</FormControl>
								</PopoverTrigger>
								<PopoverContent
									className="p-0 w-[300px]"
									align="start"
									side="bottom"
								>
									<Command>
										<CommandInput
											placeholder="Search region..."
											className="h-9"
											autoComplete="address-level2"
										/>
										<CommandList>
											<CommandEmpty>No region found.</CommandEmpty>
											{isLoading.locations ? (
												<CommandItem value={undefined} disabled>
													<LoaderIcon className="animate-spin" />
													<span>Please wait...</span>
												</CommandItem>
											) : (
												groupedLocationsOption?.map((location) => (
													<Fragment key={location.country}>
														<span className="block px-2 py-2 text-xs font-bold text-primary-foreground bg-primary">
															{location.country}
														</span>
														{location.states.map((state, stateIndex) => (
															<CommandGroup
																key={state.name}
																heading={state.name}
															>
																{state.cities.map((city) => (
																	<CommandItem
																		key={city.name}
																		value={city.name}
																		onSelect={() => {
																			onSelectLocation({
																				id: String(city.id),
																				city: city.name,
																			});
																		}}
																	>
																		<span>{city.name}</span>
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
																{location.states.length !== stateIndex + 1 && (
																	<CommandSeparator className="mt-2" />
																)}
															</CommandGroup>
														))}
													</Fragment>
												))
											)}
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
				name="patientDetails.postalCode"
				render={({ field }) => (
					<FormItem>
						<FormLabel>
							Postal Code{" "}
							<span className="text-sm italic font-light">- (optional)</span>
						</FormLabel>
						<FormControl>
							<Input
								{...field}
								type="text"
								placeholder="Enter the postal code..."
								autoComplete="postal-code"
								className="shadow-inner w-fit field-sizing-content bg-sidebar"
							/>
						</FormControl>

						<FormMessage />
					</FormItem>
				)}
			/>

			<FormField
				control={form.control}
				name="patientDetails.address"
				render={({ field }) => (
					<FormItem className="col-span-full">
						<FormLabel>Address</FormLabel>
						<FormControl>
							<Textarea
								placeholder="Enter the address..."
								autoComplete="street-address"
								className="shadow-inner bg-sidebar"
								// className="resize-none"
								{...field}
							/>
						</FormControl>

						<FormMessage />
					</FormItem>
				)}
			/>

			<FormField
				control={form.control}
				name="patientDetails.addressNotes"
				render={({ field }) => (
					<FormItem className="col-span-full">
						<FormLabel>
							Address Notes{" "}
							<span className="text-sm italic font-light">- (optional)</span>
						</FormLabel>
						<FormControl>
							<Textarea
								{...field}
								placeholder="Enter the address notes..."
								className="shadow-inner bg-sidebar"
							/>
						</FormControl>

						<FormDescription>
							Any additional notes that are relevant to the location of the
							patient address, e.g. Google Maps link.
						</FormDescription>

						<FormMessage />
					</FormItem>
				)}
			/>

			{coordinateError && (
				<Alert variant="destructive" className="col-span-full">
					<AlertCircle className="size-4" />
					<AlertTitle className="text-xs">Error</AlertTitle>
					<AlertDescription className="text-xs">
						{coordinateError}
					</AlertDescription>
				</Alert>
			)}

			<FormField
				control={form.control}
				name="formOptions.coordinateSource"
				render={({ field }) => (
					<FormItem className="col-span-full">
						<FormLabel>Location Coordinate</FormLabel>
						<FormControl>
							<div className="flex items-center">
								<Select
									defaultValue={field.value}
									onValueChange={(value) => {
										onResetCoordinate();
										field.onChange(value);
									}}
								>
									<SelectTrigger className="border-r-0 rounded-r-none shadow-inner w-fit field-sizing-content focus:outline-hidden focus:ring-0 bg-sidebar">
										<SelectValue
											placeholder={
												coordinateSource?.find(
													(source) => source.value === field.value,
												)?.text || "Select coordinate source"
											}
										/>
									</SelectTrigger>
									<SelectContent>
										{coordinateSource.map((source) => (
											<SelectItem key={source.value} value={source.value}>
												{source.text}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								{field.value === "automatic" ? (
									<Input
										readOnly
										StartIcon={{
											isButton: false,
											icon: MapPin,
										}}
										value={coordinateText}
										placeholder="Calculated coordinate..."
										className="rounded-l-none shadow-inner grow -me-px focus-visible:rounded-l-none bg-sidebar"
									/>
								) : (
									<Input
										placeholder="e.g., -6.1944,106.8229"
										className="rounded-l-none shadow-inner grow -me-px focus-visible:rounded-l-none bg-sidebar"
										StartIcon={{
											isButton: false,
											icon: MapPin,
										}}
										value={coordinateInput}
										onChange={(event) => {
											const value =
												event?.target?.value?.replaceAll(/\s+/g, "") || "";
											setCoordinateInput(value);
										}}
									/>
								)}
							</div>
						</FormControl>

						<FormMessage />
					</FormItem>
				)}
			/>

			<div className="grid gap-4 md:gap-2 md:grid-cols-3 col-span-full">
				<PulsatingOutlineShadowButton
					size={!isDekstop ? "default" : "sm"}
					disabled={isMapButtonsDisabled.calculate}
					type="button"
					className="w-full"
					onClick={async (event) => {
						event.preventDefault();

						await onCalculateCoordinate();
					}}
				>
					Calculate Coordinate
				</PulsatingOutlineShadowButton>

				<Button
					size={!isDekstop ? "default" : "sm"}
					type="button"
					variant="destructive-outline"
					disabled={isMapButtonsDisabled.reset}
					onClick={(event) => {
						event.preventDefault();

						if (
							window.confirm(
								"Are you absolutely sure? \nThis action is irreversible. Resetting coordinates deletes the calculated latitude and longitude, so you must recalculate.",
							)
						) {
							onResetCoordinate();
						}
					}}
				>
					Reset Coordinate
				</Button>

				<Button
					size={!isDekstop ? "default" : "sm"}
					type="button"
					variant="accent-outline"
					disabled={isMapButtonsDisabled.gmaps}
					onClick={(event) => {
						event.preventDefault();

						onClickGMaps();
					}}
				>
					View on Google Maps
				</Button>
			</div>

			<HereMap
				ref={mapRef}
				coordinate={coordinate}
				address={{ ...mapAddress }}
				options={{ disabledEvent: true }}
				className="col-span-full"
			/>
		</Fragment>
	);
}
