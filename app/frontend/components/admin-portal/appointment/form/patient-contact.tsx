import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetFooter,
	SheetClose,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import type { AppointmentBookingSchema } from "@/lib/appointments";
import { Pencil, AlertCircle, IdCard } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";

export default function PatientContactForm() {
	const isMobile = useIsMobile();
	const form = useFormContext<AppointmentBookingSchema>();
	const watchPatientContactValue = useWatch({
		control: form.control,
		name: "contactInformation",
	});
	const contactNameCard = useMemo(() => {
		const { contactName, contactPhone } = watchPatientContactValue;
		if (!contactName || !contactPhone) return "Fill in patient contact";

		return watchPatientContactValue.contactName;
	}, [watchPatientContactValue]);
	const [isOpenSheet, setIsOpenSheet] = useState(false);
	const hasFormErrors = useMemo(
		() => !!form?.formState?.errors?.contactInformation,
		[form?.formState?.errors?.contactInformation],
	);

	return (
		<Fragment>
			<div className="flex items-center justify-between col-span-full">
				<p className="mb-2 text-xs tracking-wider uppercase text-muted-foreground col-span-full">
					Patient Contact
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

			{hasFormErrors && (
				<Alert variant="destructive" className="col-span-full">
					<AlertCircle className="size-4" />
					<AlertTitle className="text-xs">Error</AlertTitle>
					<AlertDescription className="text-xs">
						There may be some data that is in need of correction.
					</AlertDescription>
				</Alert>
			)}

			<div className="p-3 border rounded-md shadow-inner border-input bg-sidebar col-span-full">
				<div className="flex items-center gap-3">
					<Avatar className="border rounded-lg border-black/10 bg-muted size-8">
						<AvatarImage src="#" />
						<AvatarFallback>
							<IdCard className="flex-shrink-0 size-4 text-muted-foreground/75" />
						</AvatarFallback>
					</Avatar>

					<div className="grid text-sm line-clamp-1">
						<p className="font-semibold uppercase truncate">
							{contactNameCard}
						</p>
					</div>
				</div>
			</div>

			<Sheet open={isOpenSheet} onOpenChange={setIsOpenSheet}>
				<SheetContent
					side={isMobile ? "bottom" : "right"}
					className="max-h-screen p-0 overflow-auto"
				>
					<div className="flex flex-col w-full h-full px-6">
						<SheetHeader className="flex-none py-6">
							<SheetTitle>Edit Patient Contact</SheetTitle>
						</SheetHeader>

						<div className="grid content-start flex-1 gap-4 py-4 overflow-y-auto text-sm">
							<FormField
								control={form.control}
								name="contactInformation.contactName"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Contact Name</FormLabel>
										<FormControl>
											<Input
												{...field}
												type="text"
												autoComplete="name"
												placeholder="Enter the contact name..."
												className="shadow-inner bg-sidebar"
											/>
										</FormControl>

										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="contactInformation.contactPhone"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Contact Phone Number</FormLabel>
										<FormControl>
											<PhoneInput
												{...field}
												international
												placeholder="Enter the contact phone number..."
												defaultCountry="ID"
												autoComplete="tel"
												className="shadow-inner bg-sidebar"
											/>
										</FormControl>

										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="contactInformation.email"
								render={({ field }) => (
									<FormItem className="col-span-1">
										<FormLabel>Email</FormLabel>
										<FormControl>
											<Input
												{...field}
												type="email"
												autoComplete="email"
												placeholder="Enter the email..."
												className="shadow-inner bg-sidebar"
											/>
										</FormControl>

										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="contactInformation.miitelLink"
								render={({ field }) => (
									<FormItem>
										<FormLabel>MiiTel Link</FormLabel>
										<FormControl>
											<Input
												{...field}
												type="url"
												placeholder="Enter the MiiTel link..."
												className="shadow-inner bg-sidebar"
											/>
										</FormControl>

										<FormMessage />
									</FormItem>
								)}
							/>
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
