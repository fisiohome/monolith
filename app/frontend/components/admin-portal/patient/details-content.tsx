import { Fragment, memo, Suspense, useMemo } from "react";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { generateInitials } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { getGenderIcon } from "@/hooks/use-gender";
import { format } from "date-fns";
import { useDateContext } from "@/components/providers/date-provider";
import { Cake, Dot, Link, Mail, MapPinIcon, Phone } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { LoadingBasic } from "@/components/shared/loading";
import type { PatientIndexGlobalPageProps } from "@/pages/AdminPortal/Patient/Index";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import ApptCard from "@/components/shared/appt-card";

export interface DetailsContentProps {
	patient: NonNullable<PatientIndexGlobalPageProps["selectedPatient"]>;
	appts: PatientIndexGlobalPageProps["selectedPatientAppts"];
	open: boolean;
	onOpenChange?: (open: boolean) => void;
}

const DetailsContent = memo(function Component({
	patient,
	appts,
	open,
	onOpenChange,
}: DetailsContentProps) {
	const { t: td } = useTranslation("translation", { keyPrefix: "components" });
	const { t: tpl } = useTranslation("patients", { keyPrefix: "list" });
	const { t: tpd } = useTranslation("patients", { keyPrefix: "details" });

	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<DrawerContent className="flex flex-col rounded-t-[10px] mt-24 max-h-[90%] fixed bottom-0 left-0 right-0 outline-none">
				<div className="flex-1 overflow-y-auto">
					<div className="w-full max-w-sm mx-auto md:max-w-5xl">
						<DrawerHeader>
							<DrawerTitle>{tpd("title")}</DrawerTitle>
							<DrawerDescription className="max-w-xs">
								{tpd("description")}
							</DrawerDescription>
						</DrawerHeader>

						<div className="grid grid-cols-12 gap-4 p-4">
							<ContactCard patient={patient} />

							<ProfileCard patient={patient} />

							<div className="grid gap-4 col-span-full">
								<Card className="shadow-inner">
									<CardContent className="p-6">
										<Accordion type="single" collapsible className="w-full">
											<AccordionItem value="addresses" className="border-0">
												<AccordionTrigger className="p-0 uppercase">
													{tpl("addresses.label")}
												</AccordionTrigger>
												<AccordionContent className="flex flex-col gap-4 mt-4">
													<AddressCard patient={patient} />
												</AccordionContent>
											</AccordionItem>
										</Accordion>
									</CardContent>
								</Card>
							</div>

							<Separator className="my-3 bg-border col-span-full" />

							<div className="grid gap-4 col-span-full">
								<Card className="shadow-inner">
									<CardContent className="p-6">
										<Accordion type="single" collapsible className="w-full">
											<AccordionItem value="appointments" className="border-0">
												<AccordionTrigger className="p-0 uppercase">
													{tpl("appointments.label")}
												</AccordionTrigger>
												<AccordionContent className="flex flex-col gap-4 mt-4">
													{!appts?.length ? (
														<div>
															<p className="text-sm font-light text-center text-muted-foreground">
																{tpl("appointments.empty")}
															</p>
														</div>
													) : (
														appts.map((appt, index, array) => (
															<Fragment key={appt.id}>
																<Suspense
																	fallback={<LoadingBasic columnBased={true} />}
																>
																	<ApptCard appt={appt} />

																	{index < array.length - 1 && <Separator />}
																</Suspense>
															</Fragment>
														))
													)}
												</AccordionContent>
											</AccordionItem>
										</Accordion>
									</CardContent>
								</Card>
							</div>
						</div>

						<DrawerFooter>
							<DrawerClose asChild>
								<Button variant="outline" className="shadow-none bg-card">
									{td("modal.close")}
								</Button>
							</DrawerClose>
						</DrawerFooter>
					</div>
				</div>
			</DrawerContent>
		</Drawer>
	);
});
export default DetailsContent;

const ProfileCard = memo(function Component({
	patient,
}: { patient: NonNullable<PatientIndexGlobalPageProps["selectedPatient"]> }) {
	const { locale, tzDate } = useDateContext();
	const { t: tpl } = useTranslation("patients", { keyPrefix: "list" });
	const initials = useMemo(
		() => generateInitials(patient.name),
		[patient.name],
	);

	return (
		<div
			title={tpl("profile")}
			className="flex flex-col gap-2 col-span-full md:col-span-5 xl:col-span-4"
		>
			<Card className="h-full shadow-inner">
				<CardHeader>
					<div className="flex items-center w-full gap-2 text-left">
						<Avatar className="border rounded-lg size-8 bg-muted">
							<AvatarImage src="#" alt={patient?.name || "N/A"} />
							<AvatarFallback className="text-xs rounded-lg bg-muted">
								{initials}
							</AvatarFallback>
						</Avatar>
						<div className="flex-1 space-y-0.5 text-sm leading-tight text-left">
							<p className="font-bold uppercase truncate">
								{patient.name || "N/A"}
							</p>
						</div>
					</div>
				</CardHeader>

				<CardContent className="grid gap-4">
					<div className="flow-root ">
						<dl className="-my-3 text-sm">
							<div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-3 sm:gap-4">
								<dt className="font-medium">{tpl("gender.label")}</dt>

								<dd className="sm:col-span-2">
									<Badge variant="outline">
										<span className="flex items-center gap-1 text-xs uppercase">
											{getGenderIcon(patient.gender, "size-3.5")}
											{tpl(`gender.${patient.gender.toLowerCase()}`)}
										</span>
									</Badge>
								</dd>
							</div>
							<div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-3 sm:gap-4">
								<dt className="font-medium">{tpl("age.label")}</dt>

								<dd className="sm:col-span-2">
									<Badge variant="outline">
										<p className="flex items-center gap-1">
											<Cake className="size-3" />
											<span>
												{patient.age} {tpl("age.years")}
											</span>
										</p>
									</Badge>
								</dd>
							</div>
							<div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-3 sm:gap-4">
								<dt className="font-medium">{tpl("dob")}</dt>

								<dd className="sm:col-span-2">
									<span>
										{format(new Date(String(patient.dateOfBirth)), "PP", {
											locale,
											in: tzDate,
										})}
									</span>
								</dd>
							</div>
							<div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-3 sm:gap-4">
								<dt className="font-medium">{tpl("registered_at")}</dt>

								<dd className="sm:col-span-2">
									<span>
										{format(new Date(String(patient.createdAt)), "PP", {
											locale,
											in: tzDate,
										})}
									</span>
								</dd>
							</div>
						</dl>
					</div>
				</CardContent>
			</Card>
		</div>
	);
});

const ContactCard = memo(function Component({
	patient,
}: { patient: NonNullable<PatientIndexGlobalPageProps["selectedPatient"]> }) {
	const { t: tpl } = useTranslation("patients", { keyPrefix: "list" });
	const initialsContact = useMemo(() => {
		if (!patient.contact?.contactName) return "N/A";

		return generateInitials(patient.contact.contactName);
	}, [patient.contact?.contactName]);

	return (
		<div
			title={tpl("contact")}
			className="flex flex-col gap-2 col-span-full md:col-span-7 xl:col-span-8"
		>
			<Card className="h-full shadow-inner">
				<CardHeader>
					<div className="flex items-center w-full gap-2 text-left">
						<Avatar className="border rounded-lg size-8 bg-muted">
							<AvatarImage
								src="#"
								alt={patient.contact?.contactName || "N/A"}
							/>
							<AvatarFallback className="text-xs rounded-lg bg-muted">
								{initialsContact}
							</AvatarFallback>
						</Avatar>
						<div className="flex-1 space-y-0.5 text-sm leading-tight text-left">
							<p className="font-bold uppercase truncate">
								{patient.contact?.contactName || "N/A"}
							</p>
						</div>
					</div>
				</CardHeader>

				<CardContent className="grid gap-4">
					<div className="flow-root">
						<dl className="-my-3 text-sm">
							<div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-3 sm:gap-4">
								<dt className="font-medium">{tpl("contact_phone")}</dt>

								<dd className="sm:col-span-2">
									<span className="flex items-center gap-1">
										<Phone className="size-3.5" />
										{patient.contact?.contactPhone || "N/A"}
									</span>
								</dd>
							</div>
							<div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-3 sm:gap-4">
								<dt className="font-medium">Email</dt>

								<dd className="sm:col-span-2">
									<span className="flex items-center gap-1">
										<Mail className="size-3.5" />
										{patient.contact?.email || "N/A"}
									</span>
								</dd>
							</div>
							<div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-3 sm:gap-4">
								<dt className="font-medium">MiiTel Link</dt>

								<dd className="sm:col-span-2">
									<span className="flex items-center gap-1">
										<Link className="size-3.5" />
										{patient.contact?.miitelLink || "N/A"}
									</span>
								</dd>
							</div>
						</dl>
					</div>
				</CardContent>
			</Card>
		</div>
	);
});

const AddressCard = memo(function Component({
	patient,
}: { patient: NonNullable<PatientIndexGlobalPageProps["selectedPatient"]> }) {
	const { t: tpl } = useTranslation("patients", { keyPrefix: "list" });
	const addresses = useMemo(
		() => patient?.patientAddresses || [],
		[patient?.patientAddresses],
	);

	if (!addresses.length) {
		return (
			<p className="text-sm font-light text-center text-muted-foreground">
				{tpl("addresses.empty")}
			</p>
		);
	}

	return (
		<Accordion type="single" collapsible>
			{addresses.map((a) => (
				<AccordionItem key={a.id} value={String(a.id)}>
					<AccordionTrigger>
						<div className="flex items-center">
							<p className="flex-1 font-medium">
								{a.address.location.state} - {a.address.location.city}
							</p>
							{a.active && (
								<Dot
									className="ml-3 mr-1 shrink-0 text-emerald-600"
									width={10}
									height={10}
									strokeWidth={20}
								/>
							)}
						</div>
					</AccordionTrigger>

					<AccordionContent>
						<div className="flow-root col-span-full">
							<dl className="-my-3 text-sm ">
								<div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-3 sm:gap-4">
									<dt className="font-medium">{tpl("addresses.country")}</dt>

									<dd className="sm:col-span-2">
										<span>
											{a.address.location.countryCode} -{" "}
											{a.address.location.country}
										</span>
									</dd>
								</div>
								<div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-3 sm:gap-4">
									<dt className="font-medium">
										{tpl("addresses.state")} - {tpl("addresses.city")}
									</dt>

									<dd className="sm:col-span-2">
										<span>
											{a.address.location.state} - {a.address.location.city}
										</span>
									</dd>
								</div>
								<div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-3 sm:gap-4">
									<dt className="font-medium">{tpl("addresses.postal")}</dt>

									<dd className="sm:col-span-2">
										<span>{a.address.postalCode || "N/A"}</span>
									</dd>
								</div>
								<div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-3 sm:gap-4">
									<dt className="font-medium">
										{tpl("addresses.address_line")}
									</dt>

									<dd className="sm:col-span-2">
										<p className="text-pretty">{a.address.address}</p>
										<p className="italic">
											{tpl("addresses.notes")}: {a.address.notes || "N/A"}
										</p>
										<Button
											type="button"
											variant="primary-outline"
											size="sm"
											className="mt-2"
											onClick={(event) => {
												event.preventDefault();
												event.stopPropagation();
												window.open(
													`https://www.google.com/maps/search/?api=1&query=${a.address?.coordinates[0]},${a.address?.coordinates[1]}`,
												);
											}}
										>
											<MapPinIcon />
											{tpl("addresses.view_on_google_maps")}
										</Button>
									</dd>
								</div>
							</dl>
						</div>
					</AccordionContent>
				</AccordionItem>
			))}
		</Accordion>
	);
});
