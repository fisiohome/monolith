import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import type { AppointmentBookingSchema } from "@/lib/appointments";
import type { AppointmentNewGlobalPageProps } from "@/pages/AdminPortal/Appointment/New";
import { Deferred, usePage } from "@inertiajs/react";
import { AlertCircle, Pencil } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";

export default function PatientMedicalForm() {
	const isMobile = useIsMobile();
	const { props: globalProps } = usePage<AppointmentNewGlobalPageProps>();
	const form = useFormContext<AppointmentBookingSchema>();
	const patientConditionOptions = useMemo(
		() => globalProps.optionsData?.patientConditions || [],
		[globalProps.optionsData?.patientConditions],
	);
	const [isOpenSheet, setIsOpenSheet] = useState(false);
	const hasErrorForm = useMemo(() => {
		const formErrors = form?.formState?.errors?.patientDetails;
		const hasErrorComplaintDescription = formErrors?.complaintDescription;
		const hasErrorPatientCondition = formErrors?.condition;

		return !!hasErrorComplaintDescription || !!hasErrorPatientCondition;
	}, [form?.formState?.errors?.patientDetails]);
	const watchPatientDetailsValue = useWatch({
		control: form.control,
		name: "patientDetails",
	});

	return (
		<Fragment>
			<div className="flex items-center justify-between col-span-full">
				<p className="mb-2 text-xs tracking-wider uppercase text-muted-foreground col-span-full">
					Patient Medical Record
				</p>

				<Button
					variant="link"
					size="sm"
					effect="expandIcon"
					iconPlacement="left"
					type="button"
					icon={Pencil}
					onClick={(event) => {
						event.preventDefault();
						setIsOpenSheet((prev) => !prev);
					}}
				>
					Edit
				</Button>
			</div>

			{!!hasErrorForm && (
				<Alert variant="destructive" className="col-span-full">
					<AlertCircle className="size-4" />
					<AlertTitle className="text-xs">Error</AlertTitle>
					<AlertDescription className="text-xs">
						There may be some data that is in need of correction.
					</AlertDescription>
				</Alert>
			)}

			<div className="grid grid-cols-1 gap-4 p-3 text-sm border rounded-md shadow-inner md:grid-cols-2 border-input bg-sidebar col-span-full">
				<div>
					<p className="font-light">Current condition:</p>
					<p className="text-pretty">{watchPatientDetailsValue.condition}</p>
				</div>
				<div>
					<p className="font-light">Complaint description:</p>
					<p className="text-pretty">
						{watchPatientDetailsValue.complaintDescription || "N/A"}
					</p>
				</div>
				<div>
					<p className="font-light">Illness onset date:</p>
					<p className="text-pretty">
						{watchPatientDetailsValue?.illnessOnsetDate || "N/A"}
					</p>
				</div>
				<div>
					<p className="font-light">Medical history:</p>
					<p className="text-pretty">
						{watchPatientDetailsValue?.medicalHistory || "N/A"}
					</p>
				</div>
			</div>

			<Sheet open={isOpenSheet} onOpenChange={setIsOpenSheet}>
				<SheetContent
					side={isMobile ? "bottom" : "right"}
					className="max-h-screen p-0 overflow-auto"
				>
					<div className="flex flex-col w-full h-full px-6">
						<SheetHeader className="flex-none py-6">
							<SheetTitle>Edit Patient Medical Record</SheetTitle>
						</SheetHeader>

						<div className="grid content-start flex-1 gap-4 py-4 overflow-y-auto text-sm">
							<Deferred
								data={["optionsData"]}
								fallback={
									<div className="flex flex-col self-end gap-3 col-span-full">
										<Skeleton className="w-10 h-4 rounded-md" />
										<div className="grid grid-cols-1 gap-4">
											<Skeleton className="relative w-full rounded-md h-9" />
											<Skeleton className="relative w-full rounded-md h-9" />
											<Skeleton className="relative w-full rounded-md h-9" />
										</div>
									</div>
								}
							>
								<FormField
									control={form.control}
									name="patientDetails.condition"
									render={({ field }) => (
										<FormItem className="space-y-3 col-span-full">
											<FormLabel>Current Condition</FormLabel>
											<FormControl>
												<RadioGroup
													onValueChange={field.onChange}
													defaultValue={field.value}
													orientation="horizontal"
													className="flex flex-col gap-3"
												>
													{patientConditionOptions.map((condition) => (
														<Fragment key={condition.title}>
															<FormItem className="flex items-start p-4 space-x-3 space-y-0 border rounded-md shadow-inner border-input bg-sidebar">
																<FormControl>
																	<RadioGroupItem value={condition.title} />
																</FormControl>
																<FormLabel className="w-full space-y-1 font-normal capitalize">
																	<span>{condition.title.toLowerCase()}</span>
																	<FormDescription>
																		{condition.description}
																	</FormDescription>
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

							<FormField
								control={form.control}
								name="patientDetails.complaintDescription"
								render={({ field }) => (
									<FormItem className="col-span-full">
										<FormLabel>Complaint Description</FormLabel>
										<FormControl>
											<Textarea
												{...field}
												placeholder="Enter the complaint description..."
												className="shadow-inner bg-sidebar"
											/>
										</FormControl>

										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="patientDetails.illnessOnsetDate"
								render={({ field }) => (
									<FormItem className="col-span-full">
										<FormLabel>
											Illness Onset Date{" "}
											<span className="text-sm italic font-light">
												- (optional)
											</span>
										</FormLabel>
										<FormControl>
											<Textarea
												{...field}
												placeholder="Enter the illness onset date..."
												className="shadow-inner bg-sidebar"
											/>
										</FormControl>

										<FormDescription>
											Enter the date when the illness first began. You can use
											an exact date if known, or an estimate if unsure.
										</FormDescription>

										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="patientDetails.medicalHistory"
								render={({ field }) => (
									<FormItem className="col-span-full">
										<FormLabel>
											Medical History{" "}
											<span className="text-sm italic font-light">
												- (optional)
											</span>
										</FormLabel>
										<FormControl>
											<Textarea
												{...field}
												placeholder="Enter the medical history..."
												className="shadow-inner bg-sidebar"
											/>
										</FormControl>

										<FormDescription>
											Provide an overview of the patient’s medical history
											including allergies, chronic conditions, and any past
											medical events or treatments relevant to the current
											complaint.
										</FormDescription>

										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<SheetFooter className="sticky bottom-0 left-0 flex-none py-6">
							<SheetClose asChild>
								<Button variant="primary-outline">Save</Button>
							</SheetClose>
						</SheetFooter>
					</div>
				</SheetContent>
			</Sheet>
		</Fragment>
	);
}
