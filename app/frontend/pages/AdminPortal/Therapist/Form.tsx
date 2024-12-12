import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { TagsInput } from "@/components/ui/tags-input";
import {
	EMPLOYMENT_STATUSES,
	EMPLOYMENT_TYPES,
	GENDERS,
} from "@/lib/constants";
import { goBackHandler } from "@/lib/utils";
import type {
	TherapistEmploymentStatus,
	TherapistEmploymentType,
	TherapistGender,
} from "@/types/admin-portal/therapist";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Eye, EyeClosed, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { isValidPhoneNumber } from "react-phone-number-input";
import { z } from "zod";

const formSchema = z
	.object({
		email: z.string().email().min(1, { message: "Email is required" }),
		password: z
			.string()
			.min(8, "Password must be at least 8 characters long")
			.max(64, "Password must be no more than 64 characters")
			.regex(/[A-Z]/, "Password must contain at least one uppercase letter")
			.regex(/\d/, "Password must contain at least one number")
			.regex(/[\W_]/, "Password must contain at least one symbol"),
		passwordConfirmation: z
			.string()
			.min(8, "Password confirmation must be at least 8 characters long")
			.max(64, "Password confirmation must be no more than 64 characters")
			.regex(
				/[A-Z]/,
				"Password confirmation must contain at least one uppercase letter",
			)
			.regex(/\d/, "Password confirmation must contain at least one number")
			.regex(/[\W_]/, "Password confirmation must contain at least one symbol"),
		name: z.string().min(3, { message: "Therapist name is required" }),
		batch: z.coerce
			.number({ message: "Invalid batch number" })
			.min(1, { message: "Batch number is required" })
			.nullable(),
		phoneNumber: z
			.string()
			.min(1, { message: "Phone Number is required" })
			.refine(isValidPhoneNumber, { message: "Invalid phone number" }),
		gender: z.enum(GENDERS).nullable(),
		employmentStatus: z.enum(EMPLOYMENT_STATUSES).nullable(),
		employmentType: z.enum(EMPLOYMENT_TYPES).nullable(),
		modality: z.array(z.string()).nonempty("At least input one modality"),
		specialization: z
			.array(z.string())
			.nonempty("At least input one specialization"),
		bankDetails: z
			.array(
				z.object({
					bankName: z.string().min(1, { message: "Bank name is required" }),
					accountNumber: z
						.string()
						.min(1, { message: "Account number is required" }),
					accountHolderName: z
						.string()
						.min(1, { message: "Account holder name is required" }),
					active: z.boolean().default(false),
				}),
			)
			.nonempty("At least input one bank detail"),
		addresses: z
			.array(
				z.object({
					country: z.string().min(1, { message: "Country is required" }),
					countryCode: z
						.string()
						.min(1, { message: "Country code is required" }),
					state: z.string().min(1, { message: "State is required" }),
					city: z.string().min(1, { message: "City is required" }),
				}),
			)
			.nonempty("At least input one address"),
	})
	.refine((data) => data.password === data.passwordConfirmation, {
		message: "Passwords don't match",
		path: ["passwordConfirmation"],
	});

export type FormTherapistValues = z.infer<typeof formSchema>;

export interface FormTherapistProps {
	therapist: any;
	genders: TherapistGender;
	employmentTypes: TherapistEmploymentType;
	employmentStatuses: TherapistEmploymentStatus;
	onSubmit: (values: FormTherapistValues) => void;
}

export default function FormTherapist({
	therapist,
	genders,
	employmentTypes,
	employmentStatuses,
	onSubmit,
}: FormTherapistProps) {
	const [passwordVisibility, setPasswordVisibility] = useState({
		new: false,
		confirmation: false,
	});
	const form = useForm<FormTherapistValues>({
		resolver: zodResolver(formSchema),
		// defaultValues: {
		// 	email: "",
		// 	password: "",
		// 	passwordConfirmation: "",
		// 	name: "",
		// 	batch: undefined,
		// 	phoneNumber: "",
		// 	gender: undefined,
		// 	employmentType: undefined,
		// 	employmentStatus: "ACTIVE",
		// 	modality: [],
		// 	specialization: [],
		// 	bankDetails: [],
		// },
		defaultValues: {
			email: "dendydharmawanq@gmail.com",
			password: "Fisiohome123!",
			passwordConfirmation: "Fisiohome123!",
			name: "Dendy Dharmawan",
			batch: 1,
			phoneNumber: "+62895615461125",
			gender: "MALE",
			employmentType: "KARPIS",
			employmentStatus: "ACTIVE",
			modality: ["IR", "TENS", "US"],
			specialization: ["Muskuloskeletal", "Neuromuskuler"],
			bankDetails: [
				{
					bankName: "BCA",
					accountNumber: "5010560685",
					accountHolderName: "Adi Krismawan",
					active: false,
				},
			],
		},
		mode: "all",
	});
	const bankDetailsForm = useFieldArray({
		control: form.control,
		name: "bankDetails",
		rules: {
			required: true,
			minLength: 1,
		},
	});
	const bankDetailsError = useMemo(
		() =>
			form.formState.errors.bankDetails?.root?.message ||
			form.formState.errors.bankDetails?.message,
		[form.formState.errors.bankDetails],
	);
	const formHandler = (values: FormTherapistValues) => {
		console.log("Submitting form to create the therapist...");
		console.log(values);
		console.log("Therapist successfully created...");
	};

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(formHandler)}
				className="grid items-baseline grid-cols-1 gap-10 lg:grid-cols-2"
			>
				{bankDetailsError && (
					<Alert variant="destructive" className="col-span-full">
						<AlertCircle className="w-4 h-4" />
						<AlertTitle>Error</AlertTitle>
						<AlertDescription>{bankDetailsError}</AlertDescription>
					</Alert>
				)}

				<div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
					<h2 className="text-lg font-semibold col-span-full">
						Personal Information
					</h2>

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
							<FormItem>
								<FormLabel>Gender</FormLabel>
								<Select
									onValueChange={field.onChange}
									defaultValue={field?.value || ""}
								>
									<FormControl>
										<SelectTrigger
											className={`w-[50%] md:w-[75%] lg:w-[50%] xl:w-[75%] ${!field?.value ? "text-muted-foreground" : ""}`}
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
				</div>

				<div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
					<h2 className="text-lg font-semibold col-span-full">
						Account Information
					</h2>

					<FormField
						control={form.control}
						name="email"
						render={({ field }) => (
							<FormItem className="col-span-1">
								<FormLabel>Email</FormLabel>
								<FormControl>
									<Input
										{...field}
										type="email"
										autoComplete="email"
										placeholder="Enter the email..."
									/>
								</FormControl>

								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="password"
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

								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="passwordConfirmation"
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
													new: !passwordVisibility.confirmation,
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
				</div>

				<div className="grid flex-none w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
					<h2 className="text-lg font-semibold col-span-full">
						Contract Detail
					</h2>

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
										className="w-[35%] md:w-[50%] lg:w-[35%] xl:w-[50%]"
									/>
								</FormControl>

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
											className={`w-[50%] md:w-[75%] lg:w-[50%] xl:w-[75%] ${!field?.value ? "text-muted-foreground" : ""}`}
										>
											<SelectValue placeholder="Select a employment type..." />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										{employmentTypes?.length &&
											employmentTypes?.map((type) => (
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
								>
									<FormControl>
										<SelectTrigger
											className={`w-[50%] md:w-[75%] lg:w-[50%] xl:w-[75%] ${!field?.value ? "text-muted-foreground" : ""}`}
										>
											<SelectValue placeholder="Select a employment status..." />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										{employmentStatuses?.length &&
											employmentStatuses?.map((status) => (
												<SelectItem key={status} value={status}>
													{status}
												</SelectItem>
											))}
									</SelectContent>
								</Select>

								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				<div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
					<h2 className="text-lg font-semibold col-span-full">
						Professional Detail
					</h2>

					<FormField
						control={form.control}
						name="modality"
						render={({ field }) => (
							<FormItem>
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
						name="specialization"
						render={({ field }) => (
							<FormItem>
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
				</div>

				<div className="flex flex-col w-full gap-4">
					<h2 className="flex justify-between w-full text-lg font-semibold">
						Bank Details
						<Button
							size="sm"
							onClick={(event) => {
								event.preventDefault();
								bankDetailsForm?.append({
									bankName: "",
									accountNumber: "",
									accountHolderName: "",
									active: false,
								});
							}}
						>
							<Plus className="mr-0.5" />
							Add
						</Button>
					</h2>

					<div className="flex flex-col gap-6 mt-4">
						{bankDetailsForm?.fields?.length ? (
							bankDetailsForm?.fields?.map((detail, fieldIndex) => {
								return (
									<div
										key={detail.id}
										className="grid w-full grid-cols-2 gap-4"
									>
										<div className="flex items-center justify-between w-full col-span-full">
											<div className="flex flex-row items-center space-x-3">
												<span className="text-base font-bold">
													Bank #{Number(fieldIndex) + 1}
												</span>

												<Separator
													orientation="vertical"
													className="h-4 bg-muted-foreground"
												/>

												<FormField
													control={form.control}
													name={`bankDetails.${fieldIndex}.active`}
													render={({ field }) => (
														<FormItem className="flex flex-row items-start space-x-2 space-y-0">
															<FormControl>
																<Checkbox
																	checked={field.value}
																	onCheckedChange={(checked) => {
																		if (!checked) return;

																		// if enabling bank details, will automatically disable other
																		bankDetailsForm.fields.map(
																			(field, index) => {
																				if (fieldIndex === index) return;
																				bankDetailsForm.update(index, {
																					...field,
																					active: false,
																				});
																			},
																		);
																		field.onChange(checked);
																	}}
																/>
															</FormControl>
															<div className="space-y-1 leading-none">
																<FormLabel>Set as active bank</FormLabel>
															</div>
														</FormItem>
													)}
												/>
											</div>

											<AlertDialog>
												<AlertDialogTrigger asChild>
													<Button size="sm" variant="destructive">
														Delete
													</Button>
												</AlertDialogTrigger>
												<AlertDialogContent>
													<AlertDialogHeader>
														<AlertDialogTitle>
															Are you absolutely sure?
														</AlertDialogTitle>
														<AlertDialogDescription>
															This action is irreversible. Deleting the data
															will permanently remove data from our servers and
															cannot be recovered.
														</AlertDialogDescription>
													</AlertDialogHeader>
													<AlertDialogFooter>
														<AlertDialogCancel>Cancel</AlertDialogCancel>
														<Button
															variant="destructive"
															onClick={(event) => {
																event.preventDefault();
																bankDetailsForm?.remove(fieldIndex);
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

										{bankDetailsForm?.fields?.length && (
											<Separator className="w-full mt-4 col-span-full" />
										)}
									</div>
								);
							})
						) : (
							<p>
								There's no bank details yet, click the plus button to add them
								first.
							</p>
						)}
					</div>
				</div>

				<div className="!mt-10 lg:!mt-6 gap-4 lg:gap-2 w-full flex flex-col md:flex-row lg:col-span-full lg:justify-end">
					<Button
						type="button"
						variant="outline"
						className="w-full lg:w-auto"
						onClick={goBackHandler}
					>
						Back
					</Button>

					<Button type="submit" className="w-full lg:w-auto">
						Create
					</Button>
				</div>
			</form>
		</Form>
	);
}
