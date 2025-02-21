/**
 * * Docs: https://github.com/Maliksidk19/shadcn-datetime-picker/tree/main
 */
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, ChevronLeft, ChevronRight, ChevronsUpDown } from "lucide-react";
import { Children, useMemo, useState } from "react";
import { DayPicker, type DropdownProps } from "react-day-picker";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "./command";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
// import {
// 	Select,
// 	SelectContent,
// 	SelectItem,
// 	SelectTrigger,
// 	SelectValue,
// } from "./select";
// import { ScrollArea } from "./scroll-area";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
	className,
	classNames,
	showOutsideDays = true,
	...props
}: CalendarProps) {
	return (
		<DayPicker
			showOutsideDays={showOutsideDays}
			className={cn("p-3", className)}
			classNames={{
				months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
				month: "space-y-4",
				vhidden: "vhidden hidden",
				caption: "flex justify-center pt-1 relative items-center",
				caption_label: "text-sm font-medium",
				caption_dropdowns: cn(
					"flex justify-between gap-2",
					props.captionLayout === "dropdown" && "w-full",
				),
				nav: "space-x-1 flex items-center",
				nav_button: cn(
					buttonVariants({ variant: "outline" }),
					"h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
				),
				nav_button_previous: "absolute left-1",
				nav_button_next: "absolute right-1",
				table: "w-full border-collapse space-y-1",
				head_row: "flex",
				head_cell:
					"text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
				row: "flex w-full mt-2",
				cell: cn(
					"relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected].day-range-end)]:rounded-r-md",
					props.mode === "range"
						? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
						: "[&:has([aria-selected])]:rounded-md",
				),
				day: cn(
					buttonVariants({ variant: "ghost" }),
					"h-8 w-8 p-0 font-normal aria-selected:opacity-100",
				),
				day_range_start: "day-range-start",
				day_range_end: "day-range-end",
				day_selected:
					"bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
				day_today:
					"text-accent border border-accent relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-accent after:rounded-full",
				day_outside:
					"day-outside text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
				day_disabled: "text-muted-foreground opacity-50",
				day_range_middle:
					"aria-selected:bg-accent aria-selected:text-accent-foreground",
				day_hidden: "invisible",
				...classNames,
			}}
			components={{
				Dropdown: ({ value, onChange, children }: DropdownProps) => {
					const [isOpen, setIsOpen] = useState(false);
					const options = Children.toArray(children) as React.ReactElement<
						React.HTMLProps<HTMLOptionElement>
					>[];
					const isMonth = useMemo(() => options.length <= 12, [options.length]);
					const selected = options.find((child) => child.props.value === value);
					const handleChange = (value: string) => {
						const changeEvent = {
							target: { value },
						} as React.ChangeEvent<HTMLSelectElement>;
						onChange?.(changeEvent);
					};

					return (
						// <Select
						// 	value={value?.toString()}
						// 	onValueChange={(value) => {
						// 		handleChange(value);
						// 	}}
						// >
						// 	<SelectTrigger className="pr-1.5 focus:ring-0">
						// 		<SelectValue>{selected?.props?.children}</SelectValue>
						// 	</SelectTrigger>
						// 	<SelectContent position="popper">
						// 		<ScrollArea className="h-80">
						// 			{options.map((option, id: number) => (
						// 				<SelectItem
						// 					key={`${option.props.value}-${id}`}
						// 					value={option.props.value?.toString() ?? ""}
						// 				>
						// 					{option.props.children}
						// 				</SelectItem>
						// 			))}
						// 		</ScrollArea>
						// 	</SelectContent>
						// </Select>

						<Popover open={isOpen} onOpenChange={setIsOpen}>
							<PopoverTrigger asChild>
								<Button
									variant="outline"
									className={cn(
										"w-full justify-between pl-3 focus:ring-0 capitalize",
										!selected?.props?.children && "text-muted-foreground",
									)}
								>
									{selected?.props?.children}
									<ChevronsUpDown className="w-4 h-4 ml-2 opacity-50 shrink-0" />
								</Button>
							</PopoverTrigger>
							<PopoverContent
								align="start"
								side="bottom"
								className={cn("p-0", isMonth ? "w-[175px]" : "w-[135px]")}
							>
								<Command>
									<CommandInput placeholder="Search..." />
									<CommandList>
										<CommandEmpty>
											{isMonth ? "No months found" : "No years found"}
										</CommandEmpty>
										<CommandGroup>
											{options.map((option, id: number) => (
												<CommandItem
													key={`${option.props.value}-${id}`}
													value={
														option?.props?.children?.toString() ||
														option?.props?.value?.toString() ||
														""
													}
													onSelect={(currentValue) => {
														// handle on select for month
														if (isMonth) {
															const selectedValue = options.find(
																(option) =>
																	option?.props?.children === currentValue,
															)?.props?.value;

															handleChange(String(selectedValue));
															return;
														}

														// handle on select for year
														handleChange(currentValue);
														// close the popover
														setIsOpen(false);
													}}
													className="capitalize"
												>
													<Check
														className={cn(
															value === option.props.value
																? "opacity-100"
																: "opacity-0",
														)}
													/>
													{option.props.children}
												</CommandItem>
											))}
										</CommandGroup>
									</CommandList>
								</Command>
							</PopoverContent>
						</Popover>
					);
				},
				IconLeft: () => <ChevronLeft className="w-4 h-4" />,
				IconRight: () => <ChevronRight className="w-4 h-4" />,
			}}
			{...props}
		/>
	);
}
Calendar.displayName = "Calendar";

export { Calendar };
