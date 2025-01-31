"use client";

import { motion } from "framer-motion";
import * as React from "react";

import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "../ui/button";

type PulsatingOutlineShadowButtonProps = ButtonProps & {
	glowColor?: string;
	transition?: {
		type: string;
		stiffness: number;
		damping: number;
	};
	filter?: string;
	pulseOnHover?: boolean;
};

const transitionDefault = {
	duration: 2.5,
	repeat: Number.POSITIVE_INFINITY,
	ease: "easeInOut",
};

export const PulsatingOutlineShadowButton = React.forwardRef<
	HTMLButtonElement,
	PulsatingOutlineShadowButtonProps
>(
	(
		{
			children,
			glowColor = "#714fe3",
			transition = transitionDefault,
			filter = "blur(4px)",
			pulseOnHover = true,
			disabled = false,
			className,
			...props
		},
		ref,
	) => {
		return (
			<motion.div
				className={`relative inline-block ${className}`}
				initial="initial"
				animate={!disabled ? "animate" : ""}
				whileHover={!disabled && pulseOnHover ? "hover" : ""}
			>
				{/* Animated Glow Effect (Only When Enabled) */}
				{!disabled && (
					<motion.div
						className="absolute inset-0 rounded-md"
						variants={{
							initial: {
								opacity: 0,
								scale: 1,
							},
							animate: {
								opacity: [0, 1, 0],
								scale: [1, 1.05, 1],
								transition: transition,
							},
							hover: pulseOnHover
								? { opacity: [0, 1, 0], scale: [1, 1.1, 1] }
								: { opacity: 0, scale: 1 },
						}}
						style={{
							backgroundColor: glowColor,
							filter: filter,
						}}
					/>
				)}
				<Button
					variant={"outline"}
					ref={ref}
					disabled={disabled}
					className={cn(
						`relative z-10 shadow-none border-2 border-[${glowColor}] hover:bg-[${glowColor}]/40`,
						disabled &&
							"opacity-50 cursor-not-allowed border-gray-400 hover:bg-transparent",
						className,
					)}
					{...props}
				>
					{children}
				</Button>
			</motion.div>
		);
	},
);

PulsatingOutlineShadowButton.displayName = "PulsatingOutlineShadowButton";
