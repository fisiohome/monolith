import {
	type ComponentProps,
	Fragment,
	memo,
	Suspense,
	useCallback,
	useMemo,
} from "react";
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
import { cn, generateInitials } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { getGenderIcon } from "@/hooks/use-gender";
import { format } from "date-fns";
import { useDateContext } from "@/components/providers/date-provider";
import {
	ArrowUpRight,
	Cake,
	Dot,
	Hash,
	Link,
	Mail,
	MapPinIcon,
	Phone,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import DotBadgeWithLabel, {
	type VariantDotBadge,
} from "@/components/shared/dot-badge";
import { getDotVariantStatus } from "@/lib/appointments/utils";
import { LoadingBasic } from "@/components/shared/loading";
import { getBrandBadgeVariant } from "@/lib/services";
import type { PatientIndexGlobalPageProps } from "@/pages/AdminPortal/Patient/Index";
import { router, usePage } from "@inertiajs/react";
import { deepTransformKeysToSnakeCase } from "@/hooks/use-change-case";
import { useIsMobile } from "@/hooks/use-mobile";

export interface DetailsContentProps {
	patient: NonNullable<PatientIndexGlobalPageProps["selectedPatient"]>;
	appts: PatientIndexGlobalPageProps["selectedPatientAppts"];
	open: boolean;
	onOpenChange?: ((open: boolean) => void) | undefined;
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

							<AddressCard patient={patient} />

							<Separator className="my-3 bg-border col-span-full" />

							<div className="grid gap-2 col-span-full">
								<p className="text-xs font-light uppercase">
									{tpl("appointments.label")}
								</p>

								<div className="p-3 border rounded-lg shadow-inner bg-card text-card-foreground border-border">
									{!appts?.length ? (
										<div>
											<p className="text-sm font-light text-center text-muted-foreground">
												{tpl("appointments.empty")}
											</p>
										</div>
									) : (
										appts.map((appt, index) => (
											<Fragment key={appt.id}>
												<Suspense
													fallback={<LoadingBasic columnBased={true} />}
												>
													<AppointmentCard
														appt={appt}
														className={appts.length > 1 ? "pb-4" : ""}
													/>

													{index !== 0 && (
														<Separator className="my-3 bg-border" />
													)}
												</Suspense>
											</Fragment>
										))
									)}
								</div>
							</div>
						</div>

						<DrawerFooter>
							<DrawerClose asChild>
								<Button variant="outline" className="bg-card">
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
		<div className="flex flex-col gap-2 col-span-full md:col-span-5 xl:col-span-4">
			<p className="text-xs font-light uppercase">{tpl("profile")}</p>

			<div className="flex flex-col h-full gap-4 p-3 border rounded-lg shadow-inner bg-card text-card-foreground border-border">
				<div className="flex items-center gap-2 text-sm text-left col-span-full">
					<Avatar className="border rounded-lg size-8 bg-muted">
						<AvatarImage src="#" alt={patient.name} />
						<AvatarFallback className="text-xs rounded-lg bg-muted">
							{initials}
						</AvatarFallback>
					</Avatar>
					<div className="flex-1 space-y-0.5 text-sm leading-tight text-left">
						<p className="font-bold uppercase truncate">{patient.name}</p>
					</div>
				</div>

				<div className="flow-root col-span-full">
					<dl className="-my-3 text-sm">
						<div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-3 sm:gap-4">
							<dt className="font-medium">{tpl("gender.label")}</dt>

							<dd className="sm:col-span-2">
								<Badge variant="outline">
									<span className="flex items-center gap-1 text-xs">
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
			</div>
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
		<div className="flex flex-col gap-2 col-span-full md:col-span-7 xl:col-span-8">
			<p className="text-xs font-light uppercase">{tpl("contact")}</p>

			<div className="flex flex-col h-full gap-4 p-3 border rounded-lg shadow-inner bg-card text-card-foreground border-border">
				<div className="flex items-center gap-2 text-sm text-left col-span-full">
					<Avatar className="border rounded-lg size-8 bg-muted">
						<AvatarImage src="#" alt={patient.contact?.contactName || "N/A"} />
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

				<div className="flow-root col-span-full">
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
			</div>
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

	return (
		<div className="flex flex-col gap-2 col-span-full">
			<p className="text-xs font-light uppercase">{tpl("addresses.label")}</p>

			<div className="flex flex-col h-full gap-4 p-3 border rounded-lg shadow-inner bg-card text-card-foreground border-border">
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
											<dt className="font-medium">
												{tpl("addresses.country")}
											</dt>

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
			</div>
		</div>
	);
});

interface AppointmentCardProps extends ComponentProps<"div"> {
	appt: NonNullable<
		PatientIndexGlobalPageProps["selectedPatientAppts"]
	>[number];
}
const AppointmentCard = memo(function Component({
	appt,
	className,
}: AppointmentCardProps) {
	const { t: tappt } = useTranslation("appointments");
	const isMobile = useIsMobile();
	const { locale, tzDate, timeFormatDateFns } = useDateContext();
	const { props: globalProps } = usePage<PatientIndexGlobalPageProps>();
	const statusDotVariant = useMemo<VariantDotBadge["variant"]>(
		() => getDotVariantStatus(appt.status),
		[appt.status],
	);
	const startTimeLabel = useMemo(() => {
		return format(appt.appointmentDateTime, timeFormatDateFns, {
			locale,
			in: tzDate,
		});
	}, [appt.appointmentDateTime, locale, tzDate, timeFormatDateFns]);
	const dateLabel = useMemo(() => {
		return format(appt.appointmentDateTime, "PPP", {
			locale,
			in: tzDate,
		});
	}, [appt.appointmentDateTime, locale, tzDate]);
	const onClickDetails = useCallback(
		(registrationNumber: string) => {
			router.get(
				globalProps.adminPortal.router.adminPortal.appointment.index,
				deepTransformKeysToSnakeCase({ registrationNumber }),
				{
					only: ["adminPortal", "flash", "errors", "appointments"],
				},
			);
		},
		[globalProps.adminPortal.router.adminPortal.appointment.index],
	);

	return (
		<div className={cn("flex flex-col gap-2 text-sm", className)}>
			<div className="flex items-center justify-between">
				<Badge
					variant="outline"
					className={cn(
						"text-pretty font-bold",
						appt?.service?.code && getBrandBadgeVariant(appt.service.code),
					)}
				>
					<Hash className="size-3" />
					<span>{appt.registrationNumber}</span>
				</Badge>

				<p className="text-xs font-light text-pretty">
					<span>{startTimeLabel}</span>
					<span className="mx-2">&#x2022;</span>
					<span>{dateLabel}</span>
				</p>
			</div>

			<div className="flex justify-between gap-3">
				<div className="flex flex-col gap-2">
					<p className="font-medium text-pretty">
						<span>{appt?.service?.name?.replaceAll("_", " ") || "N/A"} </span>
						<span className="mx-2">&#x2022;</span>
						<span>{appt?.package?.name}</span>
						<span className="mx-1">-</span>
						<span className="italic font-light">
							{appt?.package?.numberOfVisit || "N/A"} visit(s)
						</span>
					</p>

					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<div className="mb-1 -mt-1">
									<DotBadgeWithLabel
										className="relative flex-shrink-0 text-left"
										variant={statusDotVariant}
										size="xs"
									>
										<span
											title={appt.status}
											className="flex-grow-0 tracking-wide text-nowrap text-[10px]"
										>
											{tappt(`statuses.${appt.status}`)}
										</span>
									</DotBadgeWithLabel>
								</div>
							</TooltipTrigger>
							<TooltipContent>
								<p className="uppercase">
									Status: {tappt(`statuses.${appt.status}`)}
								</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>

				{!isMobile && (
					<Button
						size="icon"
						variant="ghost"
						onClick={(event) => {
							event.preventDefault();
							event.stopPropagation();

							onClickDetails(appt.registrationNumber);
						}}
					>
						<ArrowUpRight />
					</Button>
				)}
			</div>

			{isMobile && (
				<Button
					size="xs"
					onClick={(event) => {
						event.preventDefault();
						event.stopPropagation();

						onClickDetails(appt.registrationNumber);
					}}
				>
					Details
				</Button>
			)}
		</div>
	);
});
