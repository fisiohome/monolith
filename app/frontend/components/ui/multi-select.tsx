import { Badge } from "@/components/ui/badge";
import {
	Command,
	CommandEmpty,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Command as CommandPrimitive } from "cmdk";
import { Check, X as RemoveIcon } from "lucide-react";
import React, {
	type KeyboardEvent,
	createContext,
	forwardRef,
	useCallback,
	useContext,
	useState,
} from "react";

interface MultiSelectorProps
	extends React.ComponentPropsWithoutRef<typeof CommandPrimitive> {
	values: string[];
	onValuesChange: (value: string[]) => void;
	loop?: boolean;
	maxShows?: number;
}

interface MultiSelectContextProps {
	value: string[];
	onValueChange: (value: any) => void;
	open: boolean;
	setOpen: (value: boolean) => void;
	inputValue: string;
	setInputValue: React.Dispatch<React.SetStateAction<string>>;
	activeIndex: number;
	setActiveIndex: React.Dispatch<React.SetStateAction<number>>;
	ref: React.RefObject<HTMLInputElement>;
	handleSelect: (e: React.SyntheticEvent<HTMLInputElement>) => void;
	maxShows: number;
}

const MultiSelectContext = createContext<MultiSelectContextProps | null>(null);

const useMultiSelect = () => {
	const context = useContext(MultiSelectContext);
	if (!context) {
		throw new Error("useMultiSelect must be used within MultiSelectProvider");
	}
	return context;
};

/**
 * MultiSelect Docs: {@link: https://shadcn-extension.vercel.app/docs/multi-select}
 */

// TODO : expose the visibility of the popup

const MultiSelector = ({
	values: value,
	onValuesChange: onValueChange,
	loop = false,
	className,
	children,
	dir,
	maxShows = -1,
	...props
}: MultiSelectorProps) => {
	const [inputValue, setInputValue] = useState("");
	const [open, setOpen] = useState<boolean>(false);
	const [activeIndex, setActiveIndex] = useState<number>(-1);
	const inputRef = React.useRef<HTMLInputElement>(null);
	const [isValueSelected, setIsValueSelected] = React.useState(false);
	const [selectedValue, setSelectedValue] = React.useState("");

	const onValueChangeHandler = useCallback(
		(val: string | string[]) => {
			if (Array.isArray(val)) {
				onValueChange(val);
				return;
			}

			if (value.includes(val)) {
				onValueChange(value.filter((item) => item !== val));
				return;
			}

			onValueChange([...value, val]);
		},
		[value, onValueChange],
	);

	const handleSelect = React.useCallback(
		(e: React.SyntheticEvent<HTMLInputElement>) => {
			e.preventDefault();
			const target = e.currentTarget;
			const selection = target.value.substring(
				target.selectionStart ?? 0,
				target.selectionEnd ?? 0,
			);

			setSelectedValue(selection);
			setIsValueSelected(selection === inputValue);
		},
		[inputValue],
	);

	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLDivElement>) => {
			e.stopPropagation();
			const target = inputRef.current;

			if (!target) return;

			const moveNext = () => {
				const nextIndex = activeIndex + 1;
				setActiveIndex(
					nextIndex > value.length - 1 ? (loop ? 0 : -1) : nextIndex,
				);
			};

			const movePrev = () => {
				const prevIndex = activeIndex - 1;
				setActiveIndex(prevIndex < 0 ? value.length - 1 : prevIndex);
			};

			const moveCurrent = () => {
				const newIndex =
					activeIndex - 1 <= 0
						? value.length - 1 === 0
							? -1
							: 0
						: activeIndex - 1;
				setActiveIndex(newIndex);
			};

			switch (e.key) {
				case "ArrowLeft":
					if (dir === "rtl") {
						if (value.length > 0 && (activeIndex !== -1 || loop)) {
							moveNext();
						}
					} else {
						if (value.length > 0 && target.selectionStart === 0) {
							movePrev();
						}
					}
					break;

				case "ArrowRight":
					if (dir === "rtl") {
						if (value.length > 0 && target.selectionStart === 0) {
							movePrev();
						}
					} else {
						if (value.length > 0 && (activeIndex !== -1 || loop)) {
							moveNext();
						}
					}
					break;

				case "Backspace":
				case "Delete":
					if (value.length > 0) {
						if (activeIndex !== -1 && activeIndex < value.length) {
							onValueChangeHandler(value[activeIndex]);
							moveCurrent();
						} else {
							if (target.selectionStart === 0) {
								if (selectedValue === inputValue || isValueSelected) {
									onValueChangeHandler(value[value.length - 1]);
								}
							}
						}
					}
					break;

				case "Enter":
					setOpen(true);
					break;

				case "Escape":
					if (activeIndex !== -1) {
						setActiveIndex(-1);
					} else if (open) {
						setOpen(false);
					}
					break;
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[
			value,
			inputValue,
			activeIndex,
			loop,
			dir,
			onValueChangeHandler,
			isValueSelected,
			open,
			selectedValue,
		],
	);

	return (
		<MultiSelectContext.Provider
			value={{
				value,
				onValueChange: onValueChangeHandler,
				open,
				setOpen,
				inputValue,
				setInputValue,
				activeIndex,
				setActiveIndex,
				ref: inputRef,
				handleSelect,
				maxShows,
			}}
		>
			<Command
				onKeyDown={handleKeyDown}
				className={cn(
					"overflow-visible bg-transparent flex flex-col",
					className,
				)}
				dir={dir}
				{...props}
			>
				{children}
			</Command>
		</MultiSelectContext.Provider>
	);
};

const MultiSelectorTrigger = forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
	const { value, onValueChange, activeIndex, maxShows } = useMultiSelect();

	const mousePreventDefault = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
	}, []);

	return (
		<div
			ref={ref}
			className={cn(
				"flex flex-wrap items-center gap-1 px-3 py-1 ring-1 ring-muted border border-input rounded-md bg-background shadow-sm text-sm transition-colors ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm min-h-9",
				{
					"ring-1 focus-within:ring-ring": activeIndex === -1,
				},
				className,
			)}
			{...props}
		>
			{value.map((item, index) => {
				if (index > maxShows && maxShows !== -1) return;

				if (index === maxShows && maxShows !== -1) {
					return (
						<Badge
							key={`${item}-rest-badge`}
							className={cn(
								"px-1 rounded-sm flex items-center gap-1",
								activeIndex === index && "ring-2 ring-muted-foreground",
								value?.length === index + 1 && "mr-3",
							)}
							variant={"secondary"}
						>
							<span className="text-xs">+ {value.length - 5} items</span>
							<button
								aria-label="Remove all option"
								aria-roledescription="button to remove all option"
								type="button"
								onMouseDown={mousePreventDefault}
								onClick={() => onValueChange(value.slice(0, 5))}
							>
								<span className="sr-only">Remove all option</span>
								<RemoveIcon className="w-4 h-4 hover:stroke-destructive" />
							</button>
						</Badge>
					);
				}

				return (
					<Badge
						key={`${item}-badge`}
						className={cn(
							"px-1 rounded-sm flex items-center gap-1",
							activeIndex === index && "ring-2 ring-muted-foreground",
							value?.length === index + 1 && "mr-3",
						)}
						variant={"secondary"}
					>
						<span className="text-xs">{item}</span>
						<button
							aria-label={`Remove ${item} option`}
							aria-roledescription="button to remove option"
							type="button"
							onMouseDown={mousePreventDefault}
							onClick={() => onValueChange(item)}
						>
							<span className="sr-only">Remove {item} option</span>
							<RemoveIcon className="w-4 h-4 hover:stroke-destructive" />
						</button>
					</Badge>
				);
			})}
			{children}
		</div>
	);
});

MultiSelectorTrigger.displayName = "MultiSelectorTrigger";

const MultiSelectorInput = forwardRef<
	React.ElementRef<typeof CommandPrimitive.Input>,
	React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, _ref) => {
	const {
		setOpen,
		inputValue,
		setInputValue,
		activeIndex,
		setActiveIndex,
		handleSelect,
		ref: inputRef,
	} = useMultiSelect();

	return (
		<CommandPrimitive.Input
			{...props}
			tabIndex={0}
			ref={inputRef}
			value={inputValue}
			onValueChange={activeIndex === -1 ? setInputValue : undefined}
			onSelect={handleSelect}
			onBlur={() => setOpen(false)}
			onFocus={() => setOpen(true)}
			onClick={() => setActiveIndex(-1)}
			className={cn(
				"bg-transparent outline-none placeholder:text-muted-foreground flex border-none h-6 py-0 w-full text-sm border-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm px-0",
				className,
				activeIndex !== -1 && "caret-transparent",
			)}
		/>
	);
});

MultiSelectorInput.displayName = "MultiSelectorInput";

const MultiSelectorContent = forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ children }, ref) => {
	const { open } = useMultiSelect();
	return (
		<div ref={ref} className="relative">
			{open && children}
		</div>
	);
});

MultiSelectorContent.displayName = "MultiSelectorContent";

const MultiSelectorList = forwardRef<
	React.ElementRef<typeof CommandPrimitive.List>,
	React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, children }, ref) => {
	return (
		<CommandList
			ref={ref}
			className={cn(
				"mt-2 p-2 flex flex-col gap-2 rounded-md scrollbar-thin scrollbar-track-transparent transition-colors scrollbar-thumb-muted-foreground dark:scrollbar-thumb-muted scrollbar-thumb-rounded-lg w-full absolute bg-background shadow-md z-10 border border-muted top-0",
				className,
			)}
		>
			{children}
			<CommandEmpty>
				<span className="text-muted-foreground">No results found</span>
			</CommandEmpty>
		</CommandList>
	);
});

MultiSelectorList.displayName = "MultiSelectorList";

const MultiSelectorItem = forwardRef<
	React.ElementRef<typeof CommandPrimitive.Item>,
	{ value: string } & React.ComponentPropsWithoutRef<
		typeof CommandPrimitive.Item
	>
>(({ className, value, children, ...props }, ref) => {
	const { value: Options, onValueChange, setInputValue } = useMultiSelect();

	const mousePreventDefault = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
	}, []);

	const isIncluded = Options.includes(value);
	return (
		<CommandItem
			ref={ref}
			{...props}
			onSelect={() => {
				onValueChange(value);
				setInputValue("");
			}}
			className={cn(
				"rounded-md cursor-pointer px-2 py-1 transition-colors flex justify-between ",
				className,
				isIncluded && "opacity-50 cursor-default",
				props.disabled && "opacity-50 cursor-not-allowed",
			)}
			onMouseDown={mousePreventDefault}
		>
			{children}
			{isIncluded && <Check className="w-4 h-4" />}
		</CommandItem>
	);
});

MultiSelectorItem.displayName = "MultiSelectorItem";

export {
	MultiSelector,
	MultiSelectorTrigger,
	MultiSelectorInput,
	MultiSelectorContent,
	MultiSelectorList,
	MultiSelectorItem,
};