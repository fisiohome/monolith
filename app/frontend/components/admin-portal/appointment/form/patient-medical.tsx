import { Deferred, usePage } from "@inertiajs/react";
import { AlertCircle, Pencil } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import type { AppointmentBookingSchema } from "@/lib/appointments/form";
import type { AppointmentNewGlobalPageProps } from "@/pages/AdminPortal/Appointment/New";

export default function PatientMedicalForm() {
	const { t } = useTranslation("appointments-form");
	const { t: tpm } = useTranslation("appointments-form", {
		keyPrefix: "patient_medical",
	});
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
					{tpm("label")}
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
					{t("button.edit")}
				</Button>
			</div>

			{!!hasErrorForm && (
				<Alert variant="destructive" className="col-span-full">
					<AlertCircle className="size-4" />
					<AlertTitle className="text-xs">
						{tpm("alert_empty.title")}
					</AlertTitle>
					<AlertDescription className="text-xs">
						{tpm("alert_empty.description")}
					</AlertDescription>
				</Alert>
			)}

			<div className="grid grid-cols-1 gap-4 p-3 text-sm border rounded-md shadow-inner md:grid-cols-2 border-input bg-sidebar col-span-full">
				<div>
					<p className="font-light">{tpm("fields.condition.label")}:</p>
					<p className="text-pretty">{watchPatientDetailsValue.condition}</p>
				</div>
				<div>
					<p className="font-light">{tpm("fields.complaint.label")}:</p>
					<p className="text-pretty">
						{watchPatientDetailsValue.complaintDescription || "N/A"}
					</p>
				</div>
				<div>
					<p className="font-light">
						{tpm("fields.illness_onset_date.label")}:
					</p>
					<p className="text-pretty">
						{watchPatientDetailsValue?.illnessOnsetDate || "N/A"}
					</p>
				</div>
				<div>
					<p className="font-light">{tpm("fields.medical_history.label")}:</p>
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
							<SheetTitle>{tpm("modal.title")}</SheetTitle>
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
											<FormLabel className="capitalize">
												{tpm("fields.condition.label")}
											</FormLabel>
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
																	<span>
																		{tpm(
																			`fields.condition.options.${condition.title.toLowerCase()}.label`,
																		)}
																	</span>
																	<FormDescription>
																		{tpm(
																			`fields.condition.options.${condition.title.toLowerCase()}.description`,
																		)}
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
										<FormLabel className="capitalize">
											{tpm("fields.complaint.label")}
										</FormLabel>
										<FormControl>
											<Textarea
												{...field}
												placeholder={tpm("fields.complaint.placeholder")}
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
										<FormLabel className="capitalize">
											{tpm("fields.illness_onset_date.label")}{" "}
											<span className="text-sm italic font-light">
												- (optional)
											</span>
										</FormLabel>
										<FormControl>
											<Textarea
												{...field}
												placeholder={tpm(
													"fields.illness_onset_date.placeholder",
												)}
												className="shadow-inner bg-sidebar"
											/>
										</FormControl>

										<FormDescription>
											{tpm("fields.illness_onset_date.description")}
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
										<FormLabel className="capitalize">
											{tpm("fields.medical_history.label")}{" "}
											<span className="text-sm italic font-light">
												- (optional)
											</span>
										</FormLabel>
										<FormControl>
											<Textarea
												{...field}
												placeholder={tpm("fields.medical_history.placeholder")}
												className="shadow-inner bg-sidebar"
											/>
										</FormControl>

										<FormDescription>
											{tpm("fields.medical_history.description")}
										</FormDescription>

										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<SheetFooter className="sticky bottom-0 left-0 flex-none py-6 bg-background">
							<SheetClose asChild>
								<Button variant="primary-outline">
									{t("button.save.label")}
								</Button>
							</SheetClose>
						</SheetFooter>
					</div>
				</SheetContent>
			</Sheet>
		</Fragment>
	);
}
