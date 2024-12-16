import { cn } from "@/lib/utils";
import { useMediaQuery } from "@uidotdev/usehooks";
import {
	AnimatePresence,
	MotionConfig,
	type Variants,
	motion,
} from "framer-motion";
import type React from "react";
import {
	createContext,
	useContext,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";

const TRANSITION = {
	type: "spring",
	bounce: 0.1,
	duration: 0.4,
};

interface FloatingPanelContextType {
	isOpen: boolean;
	openFloatingPanel: (rect: DOMRect) => void;
	closeFloatingPanel: () => void;
	uniqueId: string;
	note: string;
	setNote: (note: string) => void;
	triggerRect: DOMRect | null;
	title: string;
	setTitle: (title: string) => void;
}

const FloatingPanelContext = createContext<
	FloatingPanelContextType | undefined
>(undefined);

function useFloatingPanel() {
	const context = useContext(FloatingPanelContext);
	if (!context) {
		throw new Error(
			"useFloatingPanel must be used within a FloatingPanelProvider",
		);
	}
	return context;
}

function useFloatingPanelLogic() {
	const uniqueId = useId();
	const [isOpen, setIsOpen] = useState(false);
	const [note, setNote] = useState("");
	const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);
	const [title, setTitle] = useState("");

	const openFloatingPanel = (rect: DOMRect) => {
		setTriggerRect(rect);
		setIsOpen(true);
	};
	const closeFloatingPanel = () => {
		setIsOpen(false);
		setNote("");
	};

	return {
		isOpen,
		openFloatingPanel,
		closeFloatingPanel,
		uniqueId,
		note,
		setNote,
		triggerRect,
		title,
		setTitle,
	};
}

interface FloatingPanelRootProps {
	children: React.ReactNode;
	className?: string;
}

export function FloatingPanelRoot({
	children,
	className,
}: FloatingPanelRootProps) {
	const floatingPanelLogic = useFloatingPanelLogic();

	return (
		<FloatingPanelContext.Provider value={floatingPanelLogic}>
			<MotionConfig transition={TRANSITION}>
				<div className={cn("relative", className)}>{children}</div>
			</MotionConfig>
		</FloatingPanelContext.Provider>
	);
}

interface FloatingPanelTriggerProps {
	children: React.ReactNode;
	className?: string;
	title: string;
}

export function FloatingPanelTrigger({
	children,
	className,
	title,
}: FloatingPanelTriggerProps) {
	const { openFloatingPanel, uniqueId, setTitle } = useFloatingPanel();
	const triggerRef = useRef<HTMLButtonElement>(null);

	const handleClick = () => {
		if (triggerRef.current) {
			openFloatingPanel(triggerRef.current.getBoundingClientRect());
			setTitle(title);
		}
	};

	return (
		<motion.button
			ref={triggerRef}
			layoutId={`floating-panel-trigger-${uniqueId}`}
			className={cn(
				"flex items-center px-2 py-1 rounded-md transition-colors bg-primary text-accent-foreground hover:bg-primary/90",
				className,
			)}
			onClick={handleClick}
			whileHover={{ scale: 1.05 }}
			whileTap={{ scale: 0.95 }}
			aria-haspopup="dialog"
			aria-expanded={false}
		>
			<motion.div
				layoutId={`floating-panel-label-container-${uniqueId}`}
				className="flex items-center"
			>
				<motion.span
					layoutId={`floating-panel-label-${uniqueId}`}
					className="text-sm font-semibold leading-none"
				>
					{children}
				</motion.span>
			</motion.div>
		</motion.button>
	);
}

interface FloatingPanelContentProps {
	children: React.ReactNode;
	className?: string;
}

export function FloatingPanelContent({
	children,
	className,
}: FloatingPanelContentProps) {
	const { isOpen, closeFloatingPanel, uniqueId, triggerRect, title } =
		useFloatingPanel();
	const contentRef = useRef<HTMLDivElement>(null);
	const isDekstopLG = useMediaQuery("(min-width: 1024px)");

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				contentRef.current &&
				!contentRef.current.contains(event.target as Node)
			) {
				closeFloatingPanel();
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [closeFloatingPanel]);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") closeFloatingPanel();
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [closeFloatingPanel]);

	const variants: Variants = {
		hidden: { opacity: 0, scale: 0.9, y: 10 },
		visible: { opacity: 1, scale: 1, y: 0 },
	};

	return (
		<AnimatePresence>
			{isOpen && (
				<>
					<motion.div
						initial={{ backdropFilter: "blur(0px)" }}
						animate={{ backdropFilter: "blur(4px)" }}
						exit={{ backdropFilter: "blur(0px)" }}
						className="fixed inset-0 z-40"
					/>
					<motion.div
						ref={contentRef}
						layoutId={`floating-panel-${uniqueId}`}
						className={cn(
							"fixed z-50 overflow-hidden border rounded-md shadow outline-none transform ",
							isDekstopLG
								? "origin-top-left !-translate-x-[100%] xl:!-translate-x-[0%]"
								: "left-[0%] top-[25%]  translate-y-[50%] md:left-[50%] md:top-[50%] md:!-translate-x-[50%] md:!-translate-y-[50%]",
							className,
						)}
						style={
							isDekstopLG && triggerRect
								? {
										left: triggerRect.left,
										top: triggerRect.bottom + 8,
									}
								: undefined
						}
						initial="hidden"
						animate="visible"
						exit="hidden"
						variants={variants}
						aria-modal="true"
						aria-labelledby={`floating-panel-title-${uniqueId}`}
					>
						<FloatingPanelTitle>{title}</FloatingPanelTitle>
						{children}
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
}

interface FloatingPanelTitleProps {
	children: React.ReactNode;
}

function FloatingPanelTitle({ children }: FloatingPanelTitleProps) {
	const { uniqueId } = useFloatingPanel();

	return (
		<motion.div
			layoutId={`floating-panel-label-container-${uniqueId}`}
			className="px-6 py-6 border-b md:p-3 bg-background"
		>
			<motion.div
				layoutId={`floating-panel-label-${uniqueId}`}
				className="text-sm font-semibold"
				id={`floating-panel-title-${uniqueId}`}
			>
				{children}
			</motion.div>
		</motion.div>
	);
}

interface FloatingPanelFormProps {
	children: React.ReactNode;
	onSubmit?: (note: string) => void;
	className?: string;
}

export function FloatingPanelForm({
	children,
	onSubmit,
	className,
}: FloatingPanelFormProps) {
	const { note, closeFloatingPanel } = useFloatingPanel();

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSubmit?.(note);
		closeFloatingPanel();
	};

	return (
		<form
			className={cn("flex h-full flex-col", className)}
			onSubmit={handleSubmit}
		>
			{children}
		</form>
	);
}

interface FloatingPanelLabelProps {
	children: React.ReactNode;
	htmlFor: string;
	className?: string;
}

export function FloatingPanelLabel({
	children,
	htmlFor,
	className,
}: FloatingPanelLabelProps) {
	const { note } = useFloatingPanel();

	return (
		<motion.label
			htmlFor={htmlFor}
			style={{ opacity: note ? 0 : 1 }}
			className={cn("block mb-2 text-sm font-medium", className)}
		>
			{children}
		</motion.label>
	);
}

interface FloatingPanelTextareaProps {
	className?: string;
	id?: string;
}

export function FloatingPanelTextarea({
	className,
	id,
}: FloatingPanelTextareaProps) {
	const { note, setNote } = useFloatingPanel();

	return (
		<textarea
			id={id}
			className={cn(
				"h-full w-full resize-none rounded-md bg-transparent px-4 py-3 text-sm outline-none",
				className,
			)}
			value={note}
			onChange={(e) => setNote(e.target.value)}
		/>
	);
}

interface FloatingPanelHeaderProps {
	children: React.ReactNode;
	className?: string;
}

export function FloatingPanelHeader({
	children,
	className,
}: FloatingPanelHeaderProps) {
	return (
		<motion.div
			className={cn("px-4 py-2 font-semibold", className)}
			initial={{ opacity: 0, y: -10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.1 }}
		>
			{children}
		</motion.div>
	);
}

interface FloatingPanelBodyProps {
	children: React.ReactNode;
	className?: string;
}

export function FloatingPanelBody({
	children,
	className,
}: FloatingPanelBodyProps) {
	return (
		<motion.div
			className={cn("px-6 py-6 border-b md:p-3 bg-background", className)}
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.2 }}
		>
			{children}
		</motion.div>
	);
}

interface FloatingPanelFooterProps {
	children: React.ReactNode;
	className?: string;
}

export function FloatingPanelFooter({
	children,
	className,
}: FloatingPanelFooterProps) {
	return (
		<motion.div
			className={cn(
				"flex justify-end px-6 py-6 border-b md:p-3 bg-background border-t",
				className,
			)}
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.3 }}
		>
			{children}
		</motion.div>
	);
}

interface FloatingPanelCloseButtonProps {
	className?: string;
}

export function FloatingPanelCloseButton({
	className,
}: FloatingPanelCloseButtonProps) {
	const { closeFloatingPanel } = useFloatingPanel();

	return (
		<motion.button
			type="button"
			className={cn(
				"hover:bg-accent hover:text-accent-foreground rounded-md px-2 py-1",
				className,
			)}
			onClick={closeFloatingPanel}
			aria-label="Close floating panel"
			whileHover={{ scale: 1.1 }}
			whileTap={{ scale: 0.9 }}
		>
			{/* <ArrowLeftIcon size={16} className="hover:text-primary-foreground" /> */}
			<span>Close</span>
		</motion.button>
	);
}

interface FloatingPanelSubmitButtonProps {
	className?: string;
}

export function FloatingPanelSubmitButton({
	className,
}: FloatingPanelSubmitButtonProps) {
	return (
		<motion.button
			className={cn(
				"relative ml-1 flex h-8 shrink-0 scale-100 select-none appearance-none items-center justify-center rounded-md border bg-transparent px-2 text-sm transition-colors focus-visible:ring-2 active:scale-[0.98]",
				className,
			)}
			type="submit"
			aria-label="Submit note"
			whileHover={{ scale: 1.05 }}
			whileTap={{ scale: 0.95 }}
		>
			Submit Note
		</motion.button>
	);
}

interface FloatingPanelButtonProps {
	children: React.ReactNode;
	onClick?: () => void;
	className?: string;
}

export function FloatingPanelButton({
	children,
	onClick,
	className,
}: FloatingPanelButtonProps) {
	return (
		<motion.button
			className={cn(
				"flex w-full items-center gap-2 rounded-md px-1 py-1 space-x-1 text-left text-sm transition-colors",
				className,
			)}
			onClick={onClick}
			whileHover={{ backgroundColor: "rgba(0, 0, 0, 0.05)" }}
			whileTap={{ scale: 0.98 }}
		>
			{children}
		</motion.button>
	);
}
