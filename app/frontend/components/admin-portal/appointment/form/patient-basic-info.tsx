import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	FormField,
	FormItem,
	FormLabel,
	FormControl,
	FormMessage,
	FormDescription,
} from "@/components/ui/form";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { usePatientDateOfBirth } from "@/hooks/admin-portal/appointment/use-appointment-utils";
import { getGenderIcon } from "@/hooks/use-gender";
import type { AppointmentBookingSchema } from "@/lib/appointments";
import { cn } from "@/lib/utils";
import type { AppointmentNewGlobalPageProps } from "@/pages/AdminPortal/Appointment/New";
import { usePage, Deferred } from "@inertiajs/react";
import { format } from "date-fns";
import { X, CalendarIcon, Pencil, AlertCircle, User, Cake } from "lucide-react";
import { type ComponentProps, Fragment, memo, useMemo, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "react-i18next";
import { useDateContext } from "@/components/providers/date-provider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type { GENDERS } from "@/lib/constants";

export interface CardPatientBasicInfoFormProps extends ComponentProps<"div"> {
	isNotCompletedForm: boolean;
	details: {
		fullName: string;
		age: number;
		dateOfBirth: Date;
		gender: (typeof GENDERS)[number];
	};
	fallbackText?: string;
}

export const CardPatientBasicInfoForm = memo(function Component({
	isNotCompletedForm,
	details: { fullName, age, dateOfBirth, gender },
	fallbackText = "Fill in the patient basic information",
	className,
	children,
}: CardPatientBasicInfoFormProps) {
	const { locale, tzDate } = useDateContext();
	const { t } = useTranslation("translation", { keyPrefix: "appointments" });

	return (
		<div
			className={cn(
				"p-3 text-sm border rounded-md shadow-inner border-input bg-sidebar",
				className,
			)}
		>
			<div className="flex items-center gap-3">
				<Avatar className="border rounded-lg border-black/10 bg-muted size-12">
					<AvatarImage src="#" />
					<AvatarFallback>
						<User className="flex-shrink-0 size-5 text-muted-foreground/75" />
					</AvatarFallback>
				</Avatar>

				<div className="grid text-sm line-clamp-1">
					<p className="font-semibold uppercase truncate">
						{!isNotCompletedForm ? fullName : fallbackText}
					</p>

					{!isNotCompletedForm && (
						<div className="flex items-center gap-3 mt-2">
							<div className="flex items-center gap-1 text-xs">
								<Cake className="size-3 text-muted-foreground" />
								<p className="font-light text-pretty">
									<span>
										{age || "N/A"} {t("list.years")}
									</span>
									<span className="mx-1">&#x2022;</span>
									<span>
										{dateOfBirth
											? format(dateOfBirth, "PP", {
													locale,
													in: tzDate,
												})
											: "N/A"}
									</span>
								</p>
							</div>

							<Separator orientation="vertical" className="bg-black/10" />

							<Badge
								variant="outline"
								className="flex items-center gap-1 text-xs bg-background"
							>
								{gender &&
									getGenderIcon(gender, "size-3 text-muted-foreground")}
								<p className="font-light">{gender || "N/A"}</p>
							</Badge>
						</div>
					)}
				</div>
			</div>

			{children}
		</div>
	);
});

export default function PatientBasicInfoForm() {
	const isMobile = useIsMobile();
	const { props: globalProps } = usePage<AppointmentNewGlobalPageProps>();
	const form = useFormContext<AppointmentBookingSchema>();
	const { dateOfBirthCalendarProps } = usePatientDateOfBirth();
	const watchPatientDetailsValue = useWatch({
		control: form.control,
		name: "patientDetails",
	});
	const isNotCompletedForm = useMemo(() => {
		const { fullName, age, dateOfBirth, gender } = watchPatientDetailsValue;
		return !fullName || !age || !dateOfBirth || !gender;
	}, [watchPatientDetailsValue]);
	const patientGenderOptions = useMemo(
		() => globalProps.optionsData?.patientGenders || [],
		[globalProps.optionsData?.patientGenders],
	);
	const hasErrorForm = useMemo(() => {
		const formErrors = form?.formState?.errors?.patientDetails;
		const hasErrorName = formErrors?.fullName;
		const hasErrorDateOfBirth = formErrors?.dateOfBirth;
		const hasErrorAge = formErrors?.age;
		const hasErrorGender = formErrors?.gender;

		return (
			!!hasErrorName || !!hasErrorDateOfBirth || hasErrorGender || !!hasErrorAge
		);
	}, [form?.formState?.errors?.patientDetails]);
	const [isOpenSheet, setIsOpenSheet] = useState(false);

	return (
		<Fragment>
			<div className="flex items-center justify-between col-span-full">
				<p className="mb-2 text-xs tracking-wider uppercase text-muted-foreground col-span-full">
					Basic Information
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

			<CardPatientBasicInfoForm
				isNotCompletedForm={isNotCompletedForm}
				details={{
					fullName: watchPatientDetailsValue.fullName,
					gender: watchPatientDetailsValue.gender,
					age: watchPatientDetailsValue.age,
					dateOfBirth: watchPatientDetailsValue.dateOfBirth,
				}}
				className="col-span-full"
			/>

			<Sheet open={isOpenSheet} onOpenChange={setIsOpenSheet}>
				<SheetContent
					side={isMobile ? "bottom" : "right"}
					className="max-h-screen p-0 overflow-auto"
				>
					<div className="flex flex-col w-full h-full px-6">
						<SheetHeader className="flex-none py-6">
							<SheetTitle>Edit Patient Information</SheetTitle>
						</SheetHeader>

						<div className="grid content-start flex-1 gap-4 py-4 overflow-y-auto text-sm">
							<FormField
								control={form.control}
								name="patientDetails.fullName"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Full Name</FormLabel>
										<FormControl>
											<Input
												{...field}
												type="text"
												autoComplete="name"
												placeholder="Enter the full name..."
												className="shadow-inner bg-sidebar"
											/>
										</FormControl>

										<FormMessage />
									</FormItem>
								)}
							/>

							<div className="flex flex-wrap gap-3">
								<FormField
									control={form.control}
									name="patientDetails.dateOfBirth"
									render={({ field }) => (
										<FormItem className="flex-1">
											<FormLabel>Date of birth</FormLabel>
											<Popover>
												<PopoverTrigger asChild>
													<FormControl>
														<Button
															variant={"outline"}
															className={cn(
																"relative w-full flex justify-between font-normal shadow-inner bg-sidebar",
																!field.value && "text-muted-foreground",
															)}
														>
															<p>
																{field.value
																	? `${format(field.value, "PPP")}`
																	: "Pick a date of birth"}
															</p>

															{field.value ? (
																// biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
																<div
																	className="cursor-pointer"
																	onClick={(event) => {
																		event.preventDefault();
																		event.stopPropagation();

																		form.setValue(
																			"patientDetails.dateOfBirth",
																			null as unknown as Date,
																		);
																	}}
																>
																	<X className="opacity-50" />
																</div>
															) : (
																<CalendarIcon className="w-4 h-4 ml-auto opacity-75" />
															)}
														</Button>
													</FormControl>
												</PopoverTrigger>
												<PopoverContent
													className="w-auto p-0"
													align="start"
													side="bottom"
												>
													<Calendar
														{...dateOfBirthCalendarProps}
														initialFocus
														mode="single"
														captionLayout="dropdown"
														selected={new Date(field.value)}
														onSelect={field.onChange}
														defaultMonth={field.value}
													/>
												</PopoverContent>
											</Popover>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="patientDetails.age"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Age</FormLabel>
											<FormControl>
												<Input
													{...field}
													readOnly
													type="number"
													min={0}
													value={field?.value || ""}
													placeholder="Enter the age..."
													className="shadow-inner w-fit field-sizing-content bg-sidebar"
												/>
											</FormControl>

											<FormMessage />
										</FormItem>
									)}
								/>
								<FormDescription className="flex-none">
									Your date of birth is used to calculate your age.
								</FormDescription>
							</div>

							<Deferred
								data={["optionsData"]}
								fallback={
									<div className="flex flex-col self-end gap-3 col-span-full">
										<Skeleton className="w-10 h-4 rounded-md" />
										<div className="grid grid-cols-2 gap-4">
											<Skeleton className="relative w-full rounded-md h-9" />
											<Skeleton className="relative w-full rounded-md h-9" />
										</div>
									</div>
								}
							>
								<FormField
									control={form.control}
									name="patientDetails.gender"
									render={({ field }) => (
										<FormItem className="space-y-3 col-span-full">
											<FormLabel>Gender</FormLabel>
											<FormControl>
												<RadioGroup
													onValueChange={field.onChange}
													defaultValue={field.value}
													orientation="horizontal"
													className="grid grid-cols-2 gap-4"
												>
													{patientGenderOptions.map((gender) => (
														<Fragment key={gender}>
															<FormItem className="flex items-start p-3 space-x-3 space-y-0 border rounded-md shadow-inner border-input bg-sidebar">
																<FormControl>
																	<RadioGroupItem value={gender} />
																</FormControl>
																<FormLabel className="flex items-center gap-1 font-normal capitalize">
																	{getGenderIcon(gender)}
																	<span>{gender.toLowerCase()}</span>
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
						</div>

						<SheetFooter className="sticky bottom-0 left-0 flex-none py-6 bg-background">
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
