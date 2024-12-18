import { cn } from "@/lib/utils";
import type { ResponsiveDialogMode } from "@/types/globals";
import { useMediaQuery } from "@uidotdev/usehooks";
import { Loader2, type LucideIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { Button } from "../ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "../ui/dialog";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from "../ui/drawer";
import { ScrollArea } from "../ui/scroll-area";

const DIALOG_MODE: ResponsiveDialogMode = "dialog";

export interface ResponsiveDialogProps extends ComponentProps<"dialog"> {
	title: string;
	description: string;
	isOpen: boolean;
	dialogWidth?: string;
	onOpenChange?: (open: boolean) => void;
	forceMode?: ResponsiveDialogMode;
}

export const ResponsiveDialog = ({
	children,
	title,
	description,
	isOpen,
	onOpenChange,
	dialogWidth = "380px",
	forceMode,
}: ResponsiveDialogProps) => {
	const isDekstop = useMediaQuery("(min-width: 768px)");

	if (isDekstop || forceMode === "dialog") {
		return (
			<Dialog open={isOpen} onOpenChange={onOpenChange}>
				<DialogContent
					onInteractOutside={(event) => {
						event.preventDefault();
					}}
					style={{ maxWidth: dialogWidth }}
				>
					<DialogHeader>
						<DialogTitle>{title}</DialogTitle>
						<DialogDescription>{description}</DialogDescription>
					</DialogHeader>
					<ScrollArea className="max-h-[75dvh]">{children}</ScrollArea>
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Drawer modal open={isOpen} onOpenChange={onOpenChange}>
			<DrawerContent
				onInteractOutside={(event) => {
					event.preventDefault();
				}}
			>
				<div className="w-full max-w-sm mx-auto">
					<DrawerHeader className="px-0 text-left ">
						<DrawerTitle>{title}</DrawerTitle>
						<DrawerDescription>{description}</DrawerDescription>
					</DrawerHeader>
					{children}
					<DrawerFooter className="px-0 pt-4">
						<DrawerClose asChild className="p-0">
							<Button variant="outline">Cancel</Button>
						</DrawerClose>
					</DrawerFooter>
				</div>
			</DrawerContent>
		</Drawer>
	);
};

export interface ResponsiveDialogButton extends ComponentProps<"div"> {
	forceMode?: ResponsiveDialogMode;
	LoaderIcon?: LucideIcon;
	isLoading: boolean;
	cancelButton?: boolean;
	cancelText?: string;
	loaderText?: string;
	submitText?: string;
	classSubmitButton?: string;
}

export const ResponsiveDialogButton = ({
	className,
	LoaderIcon = Loader2,
	forceMode = DIALOG_MODE,
	isLoading,
	cancelButton = true,
	cancelText = "Cancel",
	loaderText = "Please wait...",
	submitText = "Save",
}: ResponsiveDialogButton) => {
	const isDekstop = useMediaQuery("(min-width: 768px)");

	return (
		<div
			className={cn(
				"w-full flex justify-end !mt-6 gap-2",
				forceMode === "drawer" ? "w-full" : "",
				className,
			)}
		>
			{forceMode === "dialog" && isDekstop && cancelButton && (
				<DialogClose asChild>
					<Button variant="ghost">{cancelText}</Button>
				</DialogClose>
			)}

			<Button
				type="submit"
				disabled={isLoading}
				className={cn(
					"w-full md:w-auto order-first md:order-last",
					forceMode === "drawer" ? "w-full md:w-full" : "",
				)}
			>
				{isLoading ? (
					<>
						<LoaderIcon className="animate-spin" />
						<span>{loaderText}</span>
					</>
				) : (
					<span>{submitText}</span>
				)}
			</Button>
		</div>
	);
};
